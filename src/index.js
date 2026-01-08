#!/usr/bin/env node

/**
 * Slack Task MCP Server
 *
 * Claude Code用のSlackタスク管理MCPサーバー
 * - Slackスレッドの取得
 * - タスクのJSON永続化
 */

import fs from "node:fs/promises";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { WebClient } from "@slack/web-api";
import { z } from "zod";
import { getTasksPath } from "./paths.js";
import {
  getCredentialsByDomain,
  getFirstCredentials,
  listWorkspaces,
  ensureDataDir,
} from "./credentials.js";
import { analyzeRequest } from "./agents/analyze.js";
import { draftReply } from "./agents/draft-reply.js";

// ============================================
// ツールパラメータ用 Zodスキーマ
// ※ 分析/添削の結果スキーマはagents/配下に移動
// ============================================

const TaskTypeSchema = z.enum(["report", "confirm", "request"]);
const ToneSchema = z.enum(["formal", "casual"]);

// ============================================
// search_slack 用 Zodスキーマ
// ============================================

const _SearchParamsSchema = z.object({
  query: z.string().min(1).describe("検索クエリ（Slack検索構文対応: from:@user, in:#channel等）"),
  count: z.number().min(1).max(100).optional().describe("最大件数（デフォルト10）"),
  channel: z.string().optional().describe("チャンネル名で絞り込み（#なし）"),
});

// Slack クライアントのキャッシュ（team_domain -> WebClient）
const slackClients = new Map();

/**
 * URLからteam_domainを抽出
 * @param {string} slackUrl - Slack URL（例: https://myworkspace.slack.com/archives/C123/p456）
 * @returns {string|null} team_domain または null
 */
function extractTeamDomain(slackUrl) {
  const match = slackUrl.match(/https:\/\/([^.]+)\.slack\.com/);
  return match ? match[1] : null;
}

/**
 * team_domain用のSlackクライアントを取得
 * @param {string} teamDomain - ワークスペースのドメイン
 * @returns {Promise<WebClient|null>}
 */
async function getSlackClient(teamDomain) {
  // キャッシュにあればそれを返す
  if (slackClients.has(teamDomain)) {
    return slackClients.get(teamDomain);
  }

  // 認証情報を取得
  const credentials = await getCredentialsByDomain(teamDomain);
  if (!credentials?.access_token) {
    return null;
  }

  // クライアントを作成してキャッシュ
  const client = new WebClient(credentials.access_token);
  slackClients.set(teamDomain, client);
  return client;
}

/**
 * 最初のワークスペースのSlackクライアントを取得（フォールバック用）
 * @returns {Promise<WebClient|null>}
 */
async function getDefaultSlackClient() {
  const credentials = await getFirstCredentials();
  if (!credentials?.access_token) {
    return null;
  }

  // キャッシュにあればそれを返す
  if (slackClients.has(credentials.team_domain)) {
    return slackClients.get(credentials.team_domain);
  }

  const client = new WebClient(credentials.access_token);
  slackClients.set(credentials.team_domain, client);
  return client;
}

/**
 * タスクデータを読み込み
 */
async function loadTasks() {
  try {
    const data = await fs.readFile(getTasksPath(), "utf-8");
    return JSON.parse(data);
  } catch (_err) {
    return { tasks: [] };
  }
}

/**
 * タスクデータを保存
 */
async function saveTasks(data) {
  await ensureDataDir();
  await fs.writeFile(getTasksPath(), JSON.stringify(data, null, 2));
}

/**
 * SlackのURLからチャンネルIDとメッセージTSを抽出
 */
function parseSlackUrl(url) {
  // https://xxx.slack.com/archives/C12345678/p1234567890123456
  // https://xxx.slack.com/archives/C12345678/p1234567890123456?thread_ts=1234567890.123456
  const archivesMatch = url.match(/archives\/([A-Z0-9]+)\/p(\d+)/);
  if (archivesMatch) {
    const channel = archivesMatch[1];
    const tsRaw = archivesMatch[2];
    // p1234567890123456 -> 1234567890.123456
    const ts = `${tsRaw.slice(0, 10)}.${tsRaw.slice(10)}`;

    // thread_tsがある場合
    const threadMatch = url.match(/thread_ts=([\d.]+)/);
    const threadTs = threadMatch ? threadMatch[1] : ts;

    return { channel, ts, threadTs };
  }

  return null;
}

/**
 * スレッドのメッセージを取得（ページネーション対応）
 */
async function getThreadMessages(slackClient, channel, threadTs) {
  if (!slackClient) {
    throw new Error(
      "Slack認証されていません。`npx @ignission/slack-task-mcp auth login` を実行して認証してください。",
    );
  }

  const allMessages = [];
  let cursor;

  // ページネーションで全メッセージを取得
  do {
    const result = await slackClient.conversations.replies({
      channel,
      ts: threadTs,
      limit: 200,
      cursor,
    });

    if (!result.ok) {
      throw new Error(`Slack API error: ${result.error}`);
    }

    if (result.messages) {
      allMessages.push(...result.messages);
    }

    cursor = result.response_metadata?.next_cursor;
  } while (cursor);

  return allMessages;
}

/**
 * ユーザー情報を取得
 */
async function getUserInfo(slackClient, userId) {
  if (!slackClient) return { name: userId, real_name: userId };

  try {
    const result = await slackClient.users.info({ user: userId });
    return result.user || { name: userId, real_name: userId };
  } catch {
    return { name: userId, real_name: userId };
  }
}

/**
 * Slackメッセージを検索
 */
async function searchSlackMessages(slackClient, query, count = 10) {
  if (!slackClient) {
    throw new Error("Slack client not initialized");
  }

  const result = await slackClient.search.messages({
    query: query,
    count: count,
    sort: "timestamp",
    sort_dir: "desc",
  });

  if (!result.ok) {
    throw new Error(`Slack API error: ${result.error}`);
  }

  return {
    messages: result.messages?.matches || [],
    total: result.messages?.total || 0,
  };
}

/**
 * 検索結果をMarkdown形式にフォーマット
 */
async function formatSearchResults(slackClient, messages, total, _requestedCount) {
  if (messages.length === 0) {
    return "🔍 該当するメッセージはありません";
  }

  const userCache = {};
  const lines = [];

  // ヘッダー
  const remaining = total - messages.length;
  if (remaining > 0) {
    lines.push(`## 🔍 検索結果 (${messages.length}件 / 全${total}件)\n`);
  } else {
    lines.push(`## 🔍 検索結果 (${messages.length}件)\n`);
  }

  // 各メッセージ
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];

    // ユーザー名を取得（キャッシュ）
    let userName = msg.user || msg.username || "不明";
    if (msg.user && !userCache[msg.user]) {
      const userInfo = await getUserInfo(slackClient, msg.user);
      userCache[msg.user] = userInfo.real_name || userInfo.name || msg.user;
    }
    if (msg.user) {
      userName = userCache[msg.user];
    }

    // タイムスタンプを日時に変換
    const timestamp = new Date(parseFloat(msg.ts) * 1000).toLocaleString("ja-JP");

    // チャンネル名
    const channelName = msg.channel?.name || "DM";

    lines.push("---\n");
    lines.push(`### ${i + 1}. #${channelName} - ${timestamp}`);
    lines.push(`**${userName}**`);
    lines.push(msg.text || "(内容なし)");
    lines.push(`📎 ${msg.permalink}`);
    lines.push("");
  }

  // 残りの件数
  if (remaining > 0) {
    lines.push("---\n");
    lines.push(`💡 他に ${remaining} 件の結果があります。\`count\` パラメータで件数を増やせます。`);
  }

  // 使い方ヒント
  lines.push("\n💡 スレッド全体を見るには: `get_slack_thread` に📎のURLを渡してください");

  return lines.join("\n");
}

/**
 * メッセージをフォーマット
 */
async function formatMessages(slackClient, messages) {
  const formatted = [];
  const userCache = {};

  for (const msg of messages) {
    // ユーザー名を取得（キャッシュ）
    let userName = msg.user;
    if (msg.user && !userCache[msg.user]) {
      const userInfo = await getUserInfo(slackClient, msg.user);
      userCache[msg.user] = userInfo.real_name || userInfo.name || msg.user;
    }
    userName = userCache[msg.user] || msg.user;

    // タイムスタンプを日時に変換
    const timestamp = new Date(parseFloat(msg.ts) * 1000).toLocaleString("ja-JP");

    formatted.push({
      user: userName,
      text: msg.text,
      timestamp,
      ts: msg.ts,
    });
  }

  return formatted;
}

// MCPサーバーを作成
const server = new McpServer({
  name: "slack-task-mcp",
  version: "1.0.0",
});

// ツール: Slackスレッドを取得
server.tool(
  "get_slack_thread",
  "SlackスレッドのURLからメッセージを取得します",
  {
    url: z
      .string()
      .describe(
        "SlackスレッドのURL（例: https://xxx.slack.com/archives/C12345678/p1234567890123456）",
      ),
  },
  async ({ url }) => {
    const parsed = parseSlackUrl(url);
    if (!parsed) {
      return {
        content: [
          { type: "text", text: "無効なSlack URLです。archives形式のURLを指定してください。" },
        ],
      };
    }

    // URLからワークスペースを特定
    const teamDomain = extractTeamDomain(url);
    if (!teamDomain) {
      return {
        content: [
          { type: "text", text: "URLからワークスペースを特定できませんでした。" },
        ],
      };
    }

    // 該当ワークスペースのクライアントを取得
    const slackClient = await getSlackClient(teamDomain);
    if (!slackClient) {
      const workspaces = await listWorkspaces();
      const workspaceList = workspaces.length > 0
        ? `\n認証済み: ${workspaces.map(w => w.team_domain).join(", ")}`
        : "";
      return {
        content: [
          {
            type: "text",
            text: `❌ ワークスペース「${teamDomain}」は認証されていません。\n\n\`npx @ignission/slack-task-mcp auth login\` で認証してください。${workspaceList}`,
          },
        ],
      };
    }

    const { channel, threadTs } = parsed;
    const messages = await getThreadMessages(slackClient, channel, threadTs);
    const formatted = await formatMessages(slackClient, messages);

    // 読みやすい形式でテキスト化
    const text = formatted.map((m) => `[${m.timestamp}] ${m.user}:\n${m.text}`).join("\n\n---\n\n");

    return {
      content: [
        {
          type: "text",
          text: `## スレッド内容 (${formatted.length}件のメッセージ)\n\n${text}`,
        },
      ],
    };
  },
);

// ツール: タスクを保存
server.tool(
  "save_task",
  "タスクを保存します",
  {
    title: z.string().describe("タスクのタイトル"),
    purpose: z.string().describe("タスクの目的"),
    steps: z
      .array(
        z.object({
          text: z.string().describe("ステップの内容"),
          estimate_min: z.number().describe("推定時間（分）"),
        }),
      )
      .describe("タスクのステップ"),
    source_url: z.string().optional().describe("元のSlack URL"),
  },
  async ({ title, purpose, steps, source_url }) => {
    await ensureDataDir();
    const data = await loadTasks();

    const task = {
      id: Date.now().toString(),
      title,
      purpose,
      steps: steps.map((s, i) => ({
        order: i + 1,
        text: s.text,
        estimate_min: s.estimate_min,
        status: "pending",
      })),
      source_url,
      status: "active",
      created_at: new Date().toISOString(),
    };

    data.tasks.push(task);
    await saveTasks(data);

    return {
      content: [
        {
          type: "text",
          text: `✅ タスクを保存しました\n\nID: ${task.id}\nタイトル: ${title}\nステップ数: ${steps.length}`,
        },
      ],
    };
  },
);

// ツール: タスク一覧を取得
server.tool("list_tasks", "保存されているタスクの一覧を取得します", {}, async () => {
  await ensureDataDir();
  const data = await loadTasks();

  if (data.tasks.length === 0) {
    return {
      content: [{ type: "text", text: "📋 タスクはありません" }],
    };
  }

  const activeTasks = data.tasks.filter((t) => t.status === "active");

  if (activeTasks.length === 0) {
    const archivedCount = data.tasks.filter((t) => t.status === "archived").length;
    const message =
      archivedCount > 0
        ? `📋 アクティブなタスクはありません（アーカイブ: ${archivedCount}件）\n\n💡 過去のタスクは search_tasks で検索できます`
        : "📋 タスクはありません";
    return {
      content: [{ type: "text", text: message }],
    };
  }

  const text = activeTasks
    .map((task) => {
      const completedSteps = task.steps.filter((s) => s.status === "done").length;
      const totalSteps = task.steps.length;
      const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

      const stepsText = task.steps
        .map((s) => {
          const checkbox = s.status === "done" ? "☑️" : "☐";
          const stepText = s.status === "done" ? `~~${s.text}~~` : s.text;
          return `  ${checkbox} ${s.order}. ${stepText} (${s.estimate_min}分)`;
        })
        .join("\n");

      const sourceUrlText = task.source_url ? `\n📎 元スレッド: ${task.source_url}` : "";

      return `### ${task.title}\n進捗: ${completedSteps}/${totalSteps} (${progress}%)${sourceUrlText}\n\n${stepsText}`;
    })
    .join("\n\n---\n\n");

  return {
    content: [{ type: "text", text: `## 📋 タスク一覧 (${activeTasks.length}件)\n\n${text}` }],
  };
});

// ツール: タスクを検索（アーカイブ含む）
server.tool(
  "search_tasks",
  "キーワードや日付でタスクを検索します（アーカイブ済みタスクも含む）",
  {
    keyword: z.string().optional().describe("検索キーワード（タイトル・目的・ステップ内容を検索）"),
    status: z
      .enum(["all", "active", "archived"])
      .optional()
      .describe("ステータスでフィルタ（デフォルト: all）"),
    days: z.number().optional().describe("過去N日以内に作成/完了したタスク"),
  },
  async ({ keyword, status = "all", days }) => {
    await ensureDataDir();
    const data = await loadTasks();

    if (data.tasks.length === 0) {
      return {
        content: [{ type: "text", text: "📋 タスクはありません" }],
      };
    }

    let results = data.tasks;

    // ステータスフィルタ
    if (status !== "all") {
      results = results.filter((t) => t.status === status);
    }

    // 日付フィルタ
    if (days) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      results = results.filter((t) => {
        const taskDate = new Date(t.completed_at || t.created_at);
        return taskDate >= cutoff;
      });
    }

    // キーワード検索
    if (keyword) {
      const lowerKeyword = keyword.toLowerCase();
      results = results.filter((t) => {
        const searchText = [t.title, t.purpose, ...t.steps.map((s) => s.text)]
          .join(" ")
          .toLowerCase();
        return searchText.includes(lowerKeyword);
      });
    }

    if (results.length === 0) {
      return {
        content: [{ type: "text", text: "🔍 条件に一致するタスクはありません" }],
      };
    }

    // 新しい順にソート
    results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const text = results
      .map((task) => {
        const statusIcon = task.status === "active" ? "🔵" : "📦";
        const dateStr = task.completed_at
          ? `完了: ${new Date(task.completed_at).toLocaleDateString("ja-JP")}`
          : `作成: ${new Date(task.created_at).toLocaleDateString("ja-JP")}`;

        const stepsText = task.steps
          .map((s) => {
            const checkbox = s.status === "done" ? "☑️" : "☐";
            return `  ${checkbox} ${s.order}. ${s.text}`;
          })
          .join("\n");

        const sourceUrlText = task.source_url ? `\n📎 ${task.source_url}` : "";

        return `### ${statusIcon} ${task.title}\n${dateStr}${sourceUrlText}\n\n${stepsText}`;
      })
      .join("\n\n---\n\n");

    return {
      content: [{ type: "text", text: `## 🔍 検索結果 (${results.length}件)\n\n${text}` }],
    };
  },
);

// ツール: ステップを完了にする
server.tool(
  "complete_step",
  "タスクのステップを完了にします",
  {
    task_id: z.string().optional().describe("タスクID（省略時は最初のアクティブタスク）"),
    step_number: z.number().describe("完了するステップ番号"),
  },
  async ({ task_id, step_number }) => {
    await ensureDataDir();
    const data = await loadTasks();

    // タスクを検索
    let task;
    if (task_id) {
      task = data.tasks.find((t) => t.id === task_id);
    } else {
      task = data.tasks.find((t) => t.status === "active");
    }

    if (!task) {
      return {
        content: [{ type: "text", text: "❌ タスクが見つかりません" }],
      };
    }

    // ステップを完了に
    const step = task.steps.find((s) => s.order === step_number);
    if (!step) {
      return {
        content: [{ type: "text", text: `❌ ステップ ${step_number} が見つかりません` }],
      };
    }

    step.status = "done";
    step.completed_at = new Date().toISOString();

    // 全ステップ完了ならタスクをアーカイブ
    const allDone = task.steps.every((s) => s.status === "done");
    if (allDone) {
      task.status = "archived";
      task.completed_at = new Date().toISOString();
    }

    await saveTasks(data);

    // 次のステップを取得
    const nextStep = task.steps.find((s) => s.status !== "done");

    let responseText = `✅ ステップ ${step_number} を完了しました！\n\n~~${step.text}~~`;

    if (allDone) {
      responseText += `\n\n🎉 タスク「${task.title}」を全て完了しました！（アーカイブ済み）`;
    } else if (nextStep) {
      responseText += `\n\n📌 次のステップ: ${nextStep.order}. ${nextStep.text} (${nextStep.estimate_min}分)`;
    }

    return {
      content: [{ type: "text", text: responseText }],
    };
  },
);

// ============================================
// ツール: 依頼を分析
// ============================================

/**
 * 優先度をアイコン付きラベルに変換
 */
function formatPriority(priority) {
  const map = {
    high: "🔴 高（他の人をブロック/期限近い）",
    medium: "🟡 中（今日〜今週中）",
    low: "🟢 低（いつでもいい）",
  };
  return map[priority] || priority;
}

/**
 * 分析結果をMarkdown形式にフォーマット
 */
function formatAnalysisResult(analysis) {
  const lines = [];

  // ヘッダー
  lines.push("## 依頼の分析\n");

  // 把握した内容
  lines.push("### 把握した内容");
  lines.push(`- **目的**: ${analysis.purpose}`);
  if (analysis.deliverable) {
    lines.push(`- **成果物**: ${analysis.deliverable}`);
  }
  if (analysis.deadline) {
    lines.push(`- **期限**: ${analysis.deadline}`);
  }
  lines.push(`- **優先度**: ${formatPriority(analysis.priority)}`);
  lines.push("");

  // 不明点
  if (analysis.unclear_points && analysis.unclear_points.length > 0) {
    lines.push("### 不明点");
    for (const point of analysis.unclear_points) {
      lines.push(`- ❓ **${point.question}**`);
      lines.push(`  - 影響: ${point.impact}`);
      if (point.suggested_options && point.suggested_options.length > 0) {
        lines.push(`  - 選択肢: ${point.suggested_options.join(" / ")}`);
      }
    }
    lines.push("");
  } else {
    lines.push("### 不明点");
    lines.push("なし（依頼内容は明確です）");
    lines.push("");
  }

  // 確認メッセージ案
  if (analysis.confirmation_message) {
    lines.push("### 確認メッセージ案");
    lines.push(`「${analysis.confirmation_message}」`);
    lines.push("");
  }

  // ネクストアクション
  lines.push("### ネクストアクション");
  const na = analysis.next_action;
  lines.push(`📌 **${na.action}（${na.estimated_time}分）**`);
  if (na.reason) {
    lines.push(`   理由: ${na.reason}`);
  }

  return lines.join("\n");
}

server.tool(
  "analyze_request",
  "Slackスレッドの依頼をAgent SDKで分析し、目的・不明点・確認メッセージ案・ネクストアクションを構造化して返す。結果を元にユーザーに選択肢を提示する場合は、テキストではなくAskUserQuestionツールを使って選択UIを表示すること",
  {
    thread_content: z.string().describe("分析対象のSlackスレッド内容（get_slack_threadの出力）"),
    thread_url: z.string().optional().describe("SlackスレッドのURL（参照用）"),
  },
  async ({ thread_content, thread_url }) => {
    try {
      // Agent SDKで分析を実行
      const analysis = await analyzeRequest(thread_content, thread_url);

      // 分析結果をフォーマット
      const formatted = formatAnalysisResult(analysis);

      return {
        content: [
          {
            type: "text",
            text: formatted,
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: `❌ 分析中にエラーが発生しました: ${err.message}`,
          },
        ],
      };
    }
  },
);

// ============================================
// ツール: 返信を添削
// ============================================

/**
 * タスクタイプをラベルに変換
 */
function formatTaskType(taskType) {
  const map = {
    report: "📝 報告",
    confirm: "❓ 確認",
    request: "🙏 依頼",
  };
  return map[taskType] || taskType;
}

/**
 * トーンをラベルに変換
 */
function formatTone(tone) {
  const map = {
    formal: "丁寧",
    casual: "カジュアル",
  };
  return map[tone] || tone;
}

/**
 * 変更タイプをラベルに変換
 */
function formatChangeType(changeType) {
  const map = {
    structure: "構造化",
    simplify: "簡潔化",
    clarify: "明確化",
    tone: "トーン調整",
    logic: "論理補強",
    add: "追加",
  };
  return map[changeType] || changeType;
}

/**
 * 添削結果をMarkdown形式にフォーマット
 */
function formatEditedReply(draftText, editedReply) {
  const lines = [];

  // ヘッダー
  lines.push("## 添削結果\n");

  // タイプとトーン
  lines.push(
    `**タイプ**: ${formatTaskType(editedReply.task_type)} | **トーン**: ${formatTone(editedReply.tone)}`,
  );
  lines.push("");

  // Before
  lines.push("### Before");
  lines.push(`「${draftText}」`);
  lines.push("");

  // After
  lines.push("### After");
  lines.push(`「${editedReply.after}」`);
  lines.push("");

  // 構造
  lines.push("### 構造");
  lines.push(`- **結論**: ${editedReply.structure.conclusion}`);
  if (editedReply.structure.reasoning) {
    lines.push(`- **根拠**: ${editedReply.structure.reasoning}`);
  }
  if (editedReply.structure.action) {
    lines.push(`- **アクション**: ${editedReply.structure.action}`);
  }
  lines.push("");

  // 変更ポイント
  if (editedReply.changes && editedReply.changes.length > 0) {
    lines.push("### 変更ポイント");
    editedReply.changes.forEach((change, index) => {
      lines.push(`${index + 1}. **${formatChangeType(change.type)}**: ${change.description}`);
      lines.push(`   - 理由: ${change.reason}`);
    });
    lines.push("");
  }

  // コピー用
  lines.push("---");
  lines.push("📋 **コピー用**");
  lines.push(editedReply.after);

  return lines.join("\n");
}

server.tool(
  "draft_reply",
  "返信の下書きをAgent SDKで添削し、結論→根拠→アクションの構造に整理して返す。ユーザーに確認や選択を求める場合は、テキストではなくAskUserQuestionツールを使って選択UIを表示すること",
  {
    draft_text: z.string().max(2000).describe("添削対象の下書きテキスト"),
    task_type: TaskTypeSchema.optional().describe("タスクタイプ（省略時は自動判定）"),
    tone: ToneSchema.optional().describe("トーン（デフォルト: formal）"),
    thread_content: z.string().optional().describe("文脈用のスレッド内容"),
  },
  async ({ draft_text, task_type, tone = "formal", thread_content }) => {
    try {
      // Agent SDKで添削を実行
      const editedReply = await draftReply(draft_text, thread_content, task_type, tone);

      // 添削結果をフォーマット
      const formatted = formatEditedReply(draft_text, editedReply);

      return {
        content: [
          {
            type: "text",
            text: formatted,
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: `❌ 添削中にエラーが発生しました: ${err.message}`,
          },
        ],
      };
    }
  },
);

// ============================================
// ツール: Slack検索
// ============================================

server.tool(
  "search_slack",
  "Slackメッセージをキーワードで検索します（search:readスコープが必要）",
  {
    query: z.string().min(1).describe("検索クエリ（Slack検索構文対応: from:@user, in:#channel等）"),
    count: z.number().min(1).max(100).optional().describe("最大件数（デフォルト10）"),
    channel: z.string().optional().describe("チャンネル名で絞り込み（#なし）"),
  },
  async ({ query, count = 10, channel }) => {
    // デフォルトのSlackクライアントを取得
    const slackClient = await getDefaultSlackClient();

    if (!slackClient) {
      return {
        content: [
          {
            type: "text",
            text: "❌ Slack認証されていません。\n\n`npx @ignission/slack-task-mcp auth login` を実行して認証してください。",
          },
        ],
      };
    }

    try {
      // チャンネル指定時はクエリに追加
      const fullQuery = channel ? `${query} in:#${channel}` : query;

      // 検索実行
      const { messages, total } = await searchSlackMessages(slackClient, fullQuery, count);

      // 結果をフォーマット
      const formatted = await formatSearchResults(slackClient, messages, total, count);

      return {
        content: [
          {
            type: "text",
            text: formatted,
          },
        ],
      };
    } catch (err) {
      // search:read スコープ不足の場合
      if (err.message?.includes("missing_scope") || err.message?.includes("not_allowed")) {
        return {
          content: [
            {
              type: "text",
              text: "❌ 検索権限がありません。\n\n`search:read` スコープが必要です。\n`npx @ignission/slack-task-mcp auth login` で再認証してください。",
            },
          ],
        };
      }

      // レート制限
      if (err.message?.includes("ratelimited")) {
        return {
          content: [
            {
              type: "text",
              text: "❌ APIレート制限に達しました。\n\nしばらく待ってから再試行してください。",
            },
          ],
        };
      }

      // その他のエラー
      return {
        content: [
          {
            type: "text",
            text: `❌ 検索中にエラーが発生しました: ${err.message}`,
          },
        ],
      };
    }
  },
);

// サーバー起動
async function main() {
  // データディレクトリを初期化
  await ensureDataDir();

  // 認証状態を確認（起動時のログ）
  const workspaces = await listWorkspaces();
  if (workspaces.length === 0) {
    console.error("❌ Slack認証されていません。");
    console.error("   `npx @ignission/slack-task-mcp auth login` を実行して認証してください。");
  } else {
    console.error(`✅ ${workspaces.length} ワークスペース認証済み: ${workspaces.map(w => w.team_domain).join(", ")}`);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
