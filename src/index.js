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
