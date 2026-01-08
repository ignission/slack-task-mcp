#!/usr/bin/env node

/**
 * CLI エントリーポイント
 *
 * npx @ignission/slack-task-mcp [command] [options]
 */

import { authenticate, logout, showStatus } from "./auth.js";

// コマンドライン引数を解析
const args = process.argv.slice(2);
const command = args[0];
const subCommand = args[1];

// オプションを解析
function parseOptions(args) {
  const options = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--no-browser") {
      options.noBrowser = true;
    }
    if (args[i] === "--workspace" || args[i] === "-w") {
      options.workspace = args[i + 1];
      i++;
    }
  }
  return options;
}

// ヘルプを表示
function showHelp() {
  console.log(`
Slack Task MCP Server

Usage:
  npx @ignission/slack-task-mcp [command] [options]

Commands:
  auth login              新しいワークスペースを認証
  auth status             認証状態を表示
  auth logout             全ワークスペースからログアウト
  auth logout -w <name>   指定ワークスペースのみログアウト
  (なし)                  MCP サーバーとして起動

Options:
  --no-browser            ブラウザを自動で開かない
  -w, --workspace <name>  ワークスペースを指定（ドメイン名）
  --help, -h              ヘルプを表示

Examples:
  npx @ignission/slack-task-mcp auth login
  npx @ignission/slack-task-mcp auth login --no-browser
  npx @ignission/slack-task-mcp auth status
  npx @ignission/slack-task-mcp auth logout
  npx @ignission/slack-task-mcp auth logout --workspace mycompany
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
    const options = parseOptions(args);

    if (subCommand === "login") {
      // 認証フロー
      const success = await authenticate(options);
      process.exit(success ? 0 : 1);
    } else if (subCommand === "status") {
      await showStatus();
      process.exit(0);
    } else if (subCommand === "logout") {
      const success = await logout(options);
      process.exit(success ? 0 : 1);
    } else if (!subCommand) {
      // auth 単体は非推奨メッセージを表示してloginへ
      console.log("⚠️  `auth` コマンドは `auth login` に変更されました");
      console.log("");
      const success = await authenticate(options);
      process.exit(success ? 0 : 1);
    } else {
      console.error(`❌ 不明なサブコマンド: auth ${subCommand}`);
      console.error("");
      console.error("使用可能なサブコマンド: login, status, logout");
      process.exit(1);
    }
  }

  // コマンドなし → MCP サーバー起動
  if (!command) {
    // MCP サーバーをインポートして起動
    await import("./index.js");
  } else {
    console.error(`❌ 不明なコマンド: ${command}`);
    console.error("");
    console.error("ヘルプを表示するには: npx @ignission/slack-task-mcp --help");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`❌ エラー: ${err.message}`);
  process.exit(1);
});
