# Slack Task MCP Server

Claude Code用のSlackタスク管理MCPサーバーです。

## 機能

- **get_slack_thread**: SlackスレッドのURLからメッセージを取得
- **save_task**: タスクを保存（ステップ付き）
- **list_tasks**: タスク一覧を表示
- **complete_step**: ステップを完了にする

## セットアップ

### 1. Slack User Tokenを取得

GAS版で作成したSlack Appから取得できます。

1. [Slack API](https://api.slack.com/apps) → アプリを選択
2. 「OAuth & Permissions」
3. 「User OAuth Token」（`xoxp-...`）をコピー

### 2. Claude Codeの設定

`~/.claude/claude_desktop_config.json`（または該当する設定ファイル）に追加：

```json
{
  "mcpServers": {
    "slack-task": {
      "command": "node",
      "args": ["/path/to/slack-task-mcp/src/index.js"],
      "env": {
        "SLACK_USER_TOKEN": "xoxp-your-token-here"
      }
    }
  }
}
```

**注意**: `/path/to/slack-task-mcp` は実際のパスに置き換えてください。

### 3. Claude Codeを再起動

設定を反映するためにClaude Codeを再起動してください。

## 使い方

### スレッドを取得

```
このSlackスレッドの内容を教えて: https://xxx.slack.com/archives/C12345678/p1234567890123456
```

### タスクを分析・分解

```
このスレッドの依頼を分析して、5分以内のステップに分解してタスクとして保存して
```

### タスク一覧を確認

```
タスク一覧を見せて
```

### ステップを完了

```
ステップ1を完了にして
```

## データ保存先

タスクデータは以下に保存されます：

```
~/.slack-task-mcp/tasks.json
```

## プロンプトのカスタマイズ

Claude Codeでタスク分解を依頼する際、以下のような指示を追加できます：

```
以下のルールでタスクを分解して：
- 1ステップは5分以内で完了できる粒度
- 最初のステップは最も簡単なものにする
- 各ステップは具体的な動作で記述する
```

プロンプトはその場で調整できるので、GAS版のような再デプロイは不要です。

## トラブルシューティング

### Slack APIエラー

- User Tokenが正しく設定されているか確認
- トークンに必要なスコープ（`channels:history`, `groups:history`等）があるか確認

### MCPサーバーが認識されない

- 設定ファイルのパスが正しいか確認
- Claude Codeを再起動したか確認
- `node src/index.js` が単体で動作するか確認
