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
 * スレッドのメッセージを取得
 */
async function getThreadMessages(channel, threadTs) {
  if (!slackClient) {
    throw new Error("Slack client not initialized. Set SLACK_USER_TOKEN environment variable.");
  }
  
  const result = await slackClient.conversations.replies({
    channel,
    ts: threadTs,
    limit: 100,
  });
  
  if (!result.ok) {
    throw new Error(`Slack API error: ${result.error}`);
  }
  
  return result.messages || [];
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
    
    const activeTasks = data.tasks.filter(t => t.status !== "done");
    
    const text = activeTasks.map(task => {
      const completedSteps = task.steps.filter(s => s.status === "done").length;
      const totalSteps = task.steps.length;
      const progress = totalSteps > 0 ? Math.round(completedSteps / totalSteps * 100) : 0;
      
      const stepsText = task.steps.map(s => {
        const checkbox = s.status === "done" ? "☑️" : "☐";
        const stepText = s.status === "done" ? `~~${s.text}~~` : s.text;
        return `  ${checkbox} ${s.order}. ${stepText} (${s.estimate_min}分)`;
      }).join("\n");
      
      return `### ${task.title}\n進捗: ${completedSteps}/${totalSteps} (${progress}%)\n\n${stepsText}`;
    }).join("\n\n---\n\n");
    
    return {
      content: [{ type: "text", text: `## 📋 タスク一覧 (${activeTasks.length}件)\n\n${text}` }],
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
    
    // 全ステップ完了ならタスクも完了
    const allDone = task.steps.every(s => s.status === "done");
    if (allDone) {
      task.status = "done";
      task.completed_at = new Date().toISOString();
    }
    
    await saveTasks(data);
    
    // 次のステップを取得
    const nextStep = task.steps.find(s => s.status !== "done");
    
    let responseText = `✅ ステップ ${step_number} を完了しました！\n\n~~${step.text}~~`;
    
    if (allDone) {
      responseText += "\n\n🎉 タスク「" + task.title + "」を全て完了しました！";
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

// サーバー起動
async function main() {
  // Slack User Tokenを環境変数から取得
  const token = process.env.SLACK_USER_TOKEN;
  if (token) {
    slackClient = new WebClient(token);
  } else {
    console.error("Warning: SLACK_USER_TOKEN not set. Slack features will not work.");
  }
  
  await initDataDir();
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
