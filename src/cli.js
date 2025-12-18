#!/usr/bin/env node

/**
 * CLI エントリーポイント
 *
 * npx slack-task-mcp [command] [options]
 */

import { authenticate, showStatus, logout } from "./auth.js";

// コマンドライン引数を解析
const args = process.argv.slice(2);
const command = args[0];
const subCommand = args[1];

// オプションを解析
function parseOptions(args) {
  const options = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--port" && args[i + 1]) {
      options.port = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === "--no-browser") {
      options.noBrowser = true;
    }
  }
  return options;
}

// ヘルプを表示
function showHelp() {
  console.log(`
Slack Task MCP Server

Usage:
  npx slack-task-mcp [command] [options]

Commands:
  auth              Slack OAuth 認証を開始
  auth status       認証状態を表示
  auth logout       ログアウト
  (なし)            MCP サーバーとして起動

Options:
  --port <number>   コールバックサーバーのポート (default: 3000)
  --no-browser      ブラウザを自動で開かない
  --help, -h        ヘルプを表示

Examples:
  npx slack-task-mcp auth
  npx slack-task-mcp auth status
  npx slack-task-mcp auth logout
  npx slack-task-mcp auth --port 3001
  npx slack-task-mcp auth --no-browser
`);
}

// メイン処理
async function main() {
  // ヘルプ
  if (args.includes("--help") || args.includes("-h")) {
    showHelp();
    process.exit(0);
  }

  // auth コマンド
  if (command === "auth") {
    if (subCommand === "status") {
      await showStatus();
      process.exit(0);
    } else if (subCommand === "logout") {
      const success = await logout();
      process.exit(success ? 0 : 1);
    } else {
      // 認証フロー
      const options = parseOptions(args);
      const success = await authenticate(options);
      process.exit(success ? 0 : 1);
    }
  }

  // コマンドなし → MCP サーバー起動
  if (!command) {
    // MCP サーバーをインポートして起動
    await import("./index.js");
  } else {
    console.error(`❌ 不明なコマンド: ${command}`);
    console.error("");
    console.error("ヘルプを表示するには: npx slack-task-mcp --help");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`❌ エラー: ${err.message}`);
  process.exit(1);
});
