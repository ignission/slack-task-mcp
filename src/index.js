#!/usr/bin/env node

/**
 * Slack Task MCP Server
 * 
 * Claude Code用のSlackタスク管理MCPサーバー
 * - Slackスレッドの取得
 * - タスクのJSON永続化
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { WebClient } from "@slack/web-api";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { loadCredentials } from "./auth.js";

// データ保存先
const DATA_DIR = path.join(os.homedir(), ".slack-task-mcp");
const TASKS_FILE = path.join(DATA_DIR, "tasks.json");

// ============================================
// analyze_request 用 Zodスキーマ
// ============================================

const UnclearPointSchema = z.object({
  question: z.string().max(200).describe("確認すべき質問"),
  impact: z.string().max(200).describe("この点が不明だと何が困るか"),
  suggested_options: z.array(z.string()).optional().describe("想定される選択肢"),
});

const NextActionSchema = z.object({
  action: z.string().max(200).describe("具体的なアクション内容"),
  estimated_time: z.number().min(1).max(30).describe("推定所要時間（分）"),
  reason: z.string().nullable().optional().describe("なぜこれが最初のアクションなのか"),
});

const PrioritySchema = z.enum(["high", "medium", "low"]);

const AnalysisResultSchema = z.object({
  purpose: z.string().max(500).describe("依頼の目的（1文で言語化）"),
  deliverable: z.string().nullable().optional().describe("成果物"),
  deadline: z.string().nullable().optional().describe("期限"),
  unclear_points: z.array(UnclearPointSchema).describe("不明点のリスト"),
  confirmation_message: z.string().nullable().optional().describe("確認メッセージ案"),
  next_action: NextActionSchema.describe("ネクストアクション"),
  priority: PrioritySchema.describe("優先度"),
});

// ============================================
// draft_reply 用 Zodスキーマ
// ============================================

const TaskTypeSchema = z.enum(["report", "confirm", "request"]);
const ToneSchema = z.enum(["formal", "casual"]);
const ChangeTypeSchema = z.enum(["structure", "simplify", "clarify", "tone", "logic", "add"]);

const ChangeSchema = z.object({
  type: ChangeTypeSchema.describe("変更の種類"),
  description: z.string().max(200).describe("変更内容の説明"),
  reason: z.string().max(200).describe("変更の理由"),
});

const ReplyStructureSchema = z.object({
  conclusion: z.string().max(500).describe("結論（何を伝えたいか）"),
  reasoning: z.string().nullable().optional().describe("根拠（なぜそう言えるか）"),
  action: z.string().nullable().optional().describe("アクション"),
});

const EditedReplySchema = z.object({
  task_type: TaskTypeSchema.describe("タスクタイプ"),
  after: z.string().describe("添削後のテキスト"),
  structure: ReplyStructureSchema.describe("構造化された返信"),
  changes: z.array(ChangeSchema).describe("変更ポイント"),
  tone: ToneSchema.describe("適用されたトーン"),
});

// ============================================
// search_slack 用 Zodスキーマ
// ============================================

const SearchParamsSchema = z.object({
  query: z.string().min(1).describe("検索クエリ（Slack検索構文対応: from:@user, in:#channel等）"),
  count: z.number().min(1).max(100).optional().describe("最大件数（デフォルト10）"),
  channel: z.string().optional().describe("チャンネル名で絞り込み（#なし）"),
});

// Slack クライアント（User Token使用）
let slackClient = null;

/**
 * データディレクトリを初期化
 */
async function initDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (err) {
    // 既に存在する場合は無視
  }
}

/**
 * タスクデータを読み込み
 */
async function loadTasks() {
  try {
    const data = await fs.readFile(TASKS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    return { tasks: [] };
  }
}

/**
 * タスクデータを保存
 */
async function saveTasks(data) {
  await fs.writeFile(TASKS_FILE, JSON.stringify(data, null, 2));
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
    const ts = tsRaw.slice(0, 10) + "." + tsRaw.slice(10);
    
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
async function getThreadMessages(channel, threadTs) {
  if (!slackClient) {
    throw new Error("Slack client not initialized. Set SLACK_USER_TOKEN environment variable.");
  }

  const allMessages = [];
  let cursor = undefined;

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
async function getUserInfo(userId) {
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
async function searchSlackMessages(query, count = 10) {
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
async function formatSearchResults(messages, total, requestedCount) {
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
      const userInfo = await getUserInfo(msg.user);
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
async function formatMessages(messages) {
  const formatted = [];
  const userCache = {};
  
  for (const msg of messages) {
    // ユーザー名を取得（キャッシュ）
    let userName = msg.user;
    if (msg.user && !userCache[msg.user]) {
      const userInfo = await getUserInfo(msg.user);
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
    url: z.string().describe("SlackスレッドのURL（例: https://xxx.slack.com/archives/C12345678/p1234567890123456）"),
  },
  async ({ url }) => {
    const parsed = parseSlackUrl(url);
    if (!parsed) {
      return {
        content: [{ type: "text", text: "無効なSlack URLです。archives形式のURLを指定してください。" }],
      };
    }
    
    const { channel, threadTs } = parsed;
    const messages = await getThreadMessages(channel, threadTs);
    const formatted = await formatMessages(messages);
    
    // 読みやすい形式でテキスト化
    const text = formatted.map(m => 
      `[${m.timestamp}] ${m.user}:\n${m.text}`
    ).join("\n\n---\n\n");
    
    return {
      content: [{ 
        type: "text", 
        text: `## スレッド内容 (${formatted.length}件のメッセージ)\n\n${text}` 
      }],
    };
  }
);

// ツール: タスクを保存
server.tool(
  "save_task",
  "タスクを保存します",
  {
    title: z.string().describe("タスクのタイトル"),
    purpose: z.string().describe("タスクの目的"),
    steps: z.array(z.object({
      text: z.string().describe("ステップの内容"),
      estimate_min: z.number().describe("推定時間（分）"),
    })).describe("タスクのステップ"),
    source_url: z.string().optional().describe("元のSlack URL"),
  },
  async ({ title, purpose, steps, source_url }) => {
    await initDataDir();
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
      content: [{ 
        type: "text", 
        text: `✅ タスクを保存しました\n\nID: ${task.id}\nタイトル: ${title}\nステップ数: ${steps.length}` 
      }],
    };
  }
);

// ツール: タスク一覧を取得
server.tool(
  "list_tasks",
  "保存されているタスクの一覧を取得します",
  {},
  async () => {
    await initDataDir();
    const data = await loadTasks();
    
    if (data.tasks.length === 0) {
      return {
        content: [{ type: "text", text: "📋 タスクはありません" }],
      };
    }
    
    const activeTasks = data.tasks.filter(t => t.status === "active");

    if (activeTasks.length === 0) {
      const archivedCount = data.tasks.filter(t => t.status === "archived").length;
      const message = archivedCount > 0
        ? `📋 アクティブなタスクはありません（アーカイブ: ${archivedCount}件）\n\n💡 過去のタスクは search_tasks で検索できます`
        : "📋 タスクはありません";
      return {
        content: [{ type: "text", text: message }],
      };
    }

    const text = activeTasks.map(task => {
      const completedSteps = task.steps.filter(s => s.status === "done").length;
      const totalSteps = task.steps.length;
      const progress = totalSteps > 0 ? Math.round(completedSteps / totalSteps * 100) : 0;

      const stepsText = task.steps.map(s => {
        const checkbox = s.status === "done" ? "☑️" : "☐";
        const stepText = s.status === "done" ? `~~${s.text}~~` : s.text;
        return `  ${checkbox} ${s.order}. ${stepText} (${s.estimate_min}分)`;
      }).join("\n");

      const sourceUrlText = task.source_url ? `\n📎 元スレッド: ${task.source_url}` : "";

      return `### ${task.title}\n進捗: ${completedSteps}/${totalSteps} (${progress}%)${sourceUrlText}\n\n${stepsText}`;
    }).join("\n\n---\n\n");
    
    return {
      content: [{ type: "text", text: `## 📋 タスク一覧 (${activeTasks.length}件)\n\n${text}` }],
    };
  }
);

// ツール: タスクを検索（アーカイブ含む）
server.tool(
  "search_tasks",
  "キーワードや日付でタスクを検索します（アーカイブ済みタスクも含む）",
  {
    keyword: z.string().optional().describe("検索キーワード（タイトル・目的・ステップ内容を検索）"),
    status: z.enum(["all", "active", "archived"]).optional().describe("ステータスでフィルタ（デフォルト: all）"),
    days: z.number().optional().describe("過去N日以内に作成/完了したタスク"),
  },
  async ({ keyword, status = "all", days }) => {
    await initDataDir();
    const data = await loadTasks();

    if (data.tasks.length === 0) {
      return {
        content: [{ type: "text", text: "📋 タスクはありません" }],
      };
    }

    let results = data.tasks;

    // ステータスフィルタ
    if (status !== "all") {
      results = results.filter(t => t.status === status);
    }

    // 日付フィルタ
    if (days) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      results = results.filter(t => {
        const taskDate = new Date(t.completed_at || t.created_at);
        return taskDate >= cutoff;
      });
    }

    // キーワード検索
    if (keyword) {
      const lowerKeyword = keyword.toLowerCase();
      results = results.filter(t => {
        const searchText = [
          t.title,
          t.purpose,
          ...t.steps.map(s => s.text),
        ].join(" ").toLowerCase();
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

    const text = results.map(task => {
      const statusIcon = task.status === "active" ? "🔵" : "📦";
      const dateStr = task.completed_at
        ? `完了: ${new Date(task.completed_at).toLocaleDateString("ja-JP")}`
        : `作成: ${new Date(task.created_at).toLocaleDateString("ja-JP")}`;

      const stepsText = task.steps.map(s => {
        const checkbox = s.status === "done" ? "☑️" : "☐";
        return `  ${checkbox} ${s.order}. ${s.text}`;
      }).join("\n");

      const sourceUrlText = task.source_url ? `\n📎 ${task.source_url}` : "";

      return `### ${statusIcon} ${task.title}\n${dateStr}${sourceUrlText}\n\n${stepsText}`;
    }).join("\n\n---\n\n");

    return {
      content: [{ type: "text", text: `## 🔍 検索結果 (${results.length}件)\n\n${text}` }],
    };
  }
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
    await initDataDir();
    const data = await loadTasks();
    
    // タスクを検索
    let task;
    if (task_id) {
      task = data.tasks.find(t => t.id === task_id);
    } else {
      task = data.tasks.find(t => t.status === "active");
    }
    
    if (!task) {
      return {
        content: [{ type: "text", text: "❌ タスクが見つかりません" }],
      };
    }
    
    // ステップを完了に
    const step = task.steps.find(s => s.order === step_number);
    if (!step) {
      return {
        content: [{ type: "text", text: `❌ ステップ ${step_number} が見つかりません` }],
      };
    }
    
    step.status = "done";
    step.completed_at = new Date().toISOString();
    
    // 全ステップ完了ならタスクをアーカイブ
    const allDone = task.steps.every(s => s.status === "done");
    if (allDone) {
      task.status = "archived";
      task.completed_at = new Date().toISOString();
    }
    
    await saveTasks(data);
    
    // 次のステップを取得
    const nextStep = task.steps.find(s => s.status !== "done");
    
    let responseText = `✅ ステップ ${step_number} を完了しました！\n\n~~${step.text}~~`;
    
    if (allDone) {
      responseText += "\n\n🎉 タスク「" + task.title + "」を全て完了しました！（アーカイブ済み）";
    } else if (nextStep) {
      responseText += `\n\n📌 次のステップ: ${nextStep.order}. ${nextStep.text} (${nextStep.estimate_min}分)`;
    }
    
    return {
      content: [{ type: "text", text: responseText }],
    };
  }
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
  "Slackスレッドの依頼を分析し、目的・不明点・確認メッセージ案・ネクストアクションを構造化して返す",
  {
    thread_content: z.string().describe("分析対象のSlackスレッド内容（get_slack_threadの出力）"),
    thread_url: z.string().optional().describe("SlackスレッドのURL（参照用）"),
    analysis: AnalysisResultSchema.describe("Claudeが生成した分析結果"),
  },
  async ({ thread_content, thread_url, analysis }) => {
    try {
      // 分析結果をフォーマット
      const formatted = formatAnalysisResult(analysis);

      return {
        content: [{
          type: "text",
          text: formatted,
        }],
      };
    } catch (err) {
      return {
        content: [{
          type: "text",
          text: `❌ 分析結果の処理中にエラーが発生しました: ${err.message}`,
        }],
      };
    }
  }
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
  lines.push(`**タイプ**: ${formatTaskType(editedReply.task_type)} | **トーン**: ${formatTone(editedReply.tone)}`);
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
  "返信の下書きを添削し、結論→根拠→アクションの構造に整理して返す",
  {
    draft_text: z.string().max(2000).describe("添削対象の下書きテキスト"),
    task_type: TaskTypeSchema.optional().describe("タスクタイプ（省略時は自動判定）"),
    tone: ToneSchema.optional().describe("トーン（デフォルト: formal）"),
    thread_content: z.string().optional().describe("文脈用のスレッド内容"),
    edited_reply: EditedReplySchema.describe("Claudeが生成した添削結果"),
  },
  async ({ draft_text, task_type, tone, thread_content, edited_reply }) => {
    try {
      // 添削結果をフォーマット
      const formatted = formatEditedReply(draft_text, edited_reply);

      return {
        content: [{
          type: "text",
          text: formatted,
        }],
      };
    } catch (err) {
      return {
        content: [{
          type: "text",
          text: `❌ 添削結果の処理中にエラーが発生しました: ${err.message}`,
        }],
      };
    }
  }
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
    // 未認証チェック
    if (!slackClient) {
      return {
        content: [{
          type: "text",
          text: "❌ Slack認証されていません。\n\n`npx slack-task-mcp auth` を実行して認証してください。",
        }],
      };
    }

    try {
      // チャンネル指定時はクエリに追加
      const fullQuery = channel ? `${query} in:#${channel}` : query;

      // 検索実行
      const { messages, total } = await searchSlackMessages(fullQuery, count);

      // 結果をフォーマット
      const formatted = await formatSearchResults(messages, total, count);

      return {
        content: [{
          type: "text",
          text: formatted,
        }],
      };
    } catch (err) {
      // search:read スコープ不足の場合
      if (err.message?.includes("missing_scope") || err.message?.includes("not_allowed")) {
        return {
          content: [{
            type: "text",
            text: "❌ 検索権限がありません。\n\n`search:read` スコープが必要です。\n`npx slack-task-mcp auth` で再認証してください。",
          }],
        };
      }

      // レート制限
      if (err.message?.includes("ratelimited")) {
        return {
          content: [{
            type: "text",
            text: "❌ APIレート制限に達しました。\n\nしばらく待ってから再試行してください。",
          }],
        };
      }

      // その他のエラー
      return {
        content: [{
          type: "text",
          text: `❌ 検索中にエラーが発生しました: ${err.message}`,
        }],
      };
    }
  }
);

// サーバー起動
async function main() {
  // Slack User Token を取得（優先順位: credentials.json > 環境変数）
  let token = null;

  // 1. credentials.json を優先
  const credentials = await loadCredentials();
  if (credentials?.access_token) {
    token = credentials.access_token;
  }

  // 2. 環境変数（レガシー）
  if (!token && process.env.SLACK_USER_TOKEN) {
    token = process.env.SLACK_USER_TOKEN;
  }

  if (token) {
    slackClient = new WebClient(token);
  } else {
    console.error("Warning: Slack認証されていません。");
    console.error("  `npx slack-task-mcp auth` を実行して認証するか、");
    console.error("  SLACK_USER_TOKEN 環境変数を設定してください。");
  }

  await initDataDir();

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
