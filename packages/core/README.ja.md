# slack-task-mcp

Slack タスク管理 MCP サーバー for Claude Code / Claude Desktop

[![npm version](https://badge.fury.io/js/slack-task-mcp.svg)](https://www.npmjs.com/package/slack-task-mcp)

[English](https://github.com/ignission/slack-task-mcp/blob/main/packages/core/README.md)

## こんな人向け

- Slackのメンションがたまると、どこから手を付けていいか迷う
- 難しい依頼が来ると、何を聞けばいいかわからず固まる
- 返信を書くのに時間がかかる
- タスクを分解しても、途中で集中が切れて諦めてしまう

## インストール

```bash
# 認証（初回のみ）
npx slack-task-mcp auth

# 認証状態を確認
npx slack-task-mcp auth status
```

## Claude Desktop 設定

### macOS

`~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "slack-task": {
      "command": "npx",
      "args": ["-y", "slack-task-mcp"]
    }
  }
}
```

### Windows

`%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "slack-task": {
      "command": "npx.cmd",
      "args": ["-y", "slack-task-mcp"]
    }
  }
}
```

設定後、Claude Desktopを再起動してください。

## 機能

| ツール | 説明 |
|--------|------|
| `get_slack_thread` | SlackスレッドURLからメッセージを取得 |
| `analyze_request` | 依頼を分析し、目的・不明点・確認案を生成 |
| `draft_reply` | 返信を添削し、ロジカルに構造化 |
| `save_task` | タスクを保存（5分以内のステップに分解） |
| `list_tasks` | タスク一覧を表示 |
| `search_tasks` | キーワード・日付でタスクを検索 |
| `complete_step` | ステップを完了にする |
| `search_slack` | Slackメッセージをキーワードで検索 |

## 使い方

### Slackスレッドを分析

```
このスレッドを分析して: https://xxx.slack.com/archives/C12345678/p1234567890
```

### タスクとして保存

```
5分以内のステップに分解して保存して
```

### 返信を添削

```
この返信を添削して「レポートできました。確認お願いします。」
```

## CLIコマンド

```bash
npx slack-task-mcp auth          # 認証
npx slack-task-mcp auth status   # 認証状態を確認
npx slack-task-mcp auth logout   # ログアウト
npx slack-task-mcp --help        # ヘルプ
```

## データ保存先

```
~/.slack-task-mcp/
├── credentials.json  # 認証情報
└── tasks.json        # タスクデータ
```

## ライセンス

MIT
