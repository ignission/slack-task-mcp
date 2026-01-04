# Slack Task MCP Server

Claude Code / Claude Desktop用のSlackタスク管理MCPサーバーです。

## こんな人向け

- Slackのメンションがたまると、どこから手を付けていいか迷う
- 難しい依頼が来ると、何を聞けばいいかわからず固まる
- 返信を書くのに時間がかかる、伝わるか不安になる
- タスクを分解しても、途中で集中が切れて諦めてしまう

## 解決するフロー

```
メンション来た
    ↓
「何求められてる？」が曖昧で固まる → 目的の明確化
    ↓
「何聞けばいい？」がわからない   → 不明点の洗い出し + 確認メッセージ案
    ↓
「どう返せばいい？」で時間かかる → 返信メッセージの添削・構造化
    ↓
「次何する？」で迷う            → ネクストアクション提示
```

## 機能

| ツール | 機能 | 状態 |
|--------|------|------|
| `get_slack_thread` | SlackスレッドのURLからメッセージを取得 | ✅ 実装済み |
| `analyze_request` | 依頼を分析し、目的・不明点・確認案を生成 | 🚧 実装予定 |
| `draft_reply` | 返信を添削し、ロジカルに構造化 | 🚧 実装予定 |
| `save_task` | タスクを保存（ステップ付き） | ✅ 実装済み |
| `list_tasks` | タスク一覧を表示 | ✅ 実装済み |
| `complete_step` | ステップを完了にする | ✅ 実装済み |

## セットアップ

### 1. OAuth認証

```bash
cd /path/to/slack-task-mcp
npx slack-task-mcp auth
```

ブラウザが開き、Slackの認証画面が表示されます。認証が完了すると、トークンは `~/.slack-task-mcp/credentials.json` に保存されます。

### 2. Claude Code / Claude Desktopの設定

`~/.claude/claude_desktop_config.json`（または該当する設定ファイル）に追加：

```json
{
  "mcpServers": {
    "slack-task": {
      "command": "node",
      "args": ["/path/to/slack-task-mcp/packages/mcp-server/src/index.js"]
    }
  }
}
```

**注意**: `/path/to/slack-task-mcp` は実際のパスに置き換えてください。

### 3. 再起動

設定を反映するためにClaude Code / Claude Desktopを再起動してください。

### 認証コマンド

```bash
npx slack-task-mcp auth          # 認証を開始
npx slack-task-mcp auth status   # 認証状態を確認
npx slack-task-mcp auth logout   # ログアウト
```

## 使い方

### 基本的なワークフロー

```
1. スレッドを取得
   「このスレッドを分析して: https://xxx.slack.com/archives/C12345678/p1234567890」

2. 分析結果を確認
   - 目的: 〇〇
   - 不明点: △△
   - 確認メッセージ案: 「□□について確認させてください」

3. 不明点を確認したら、タスクとして保存
   「分解してタスクとして保存して」

4. ステップを1つずつ完了
   「ステップ1完了」

5. 返信を書いたら添削
   「この返信添削して: 〇〇の件、完了しました...」
```

### コマンド例

#### スレッドを取得・分析

```
このSlackスレッドを分析して: https://xxx.slack.com/archives/C12345678/p1234567890123456
```

#### タスクを保存

```
このタスクを5分以内のステップに分解して保存して
```

#### タスク一覧を確認

```
タスク一覧を見せて
```

#### ステップを完了

```
ステップ1を完了にして
```

#### 返信を添削

```
この返信を添削して「レポートできました。添付します。確認お願いします。」
```

## 特徴

### Slackを文脈DBとして活用

- スレッドの内容はタスクと紐づけて保存
- 「あの話どうなったっけ」をClaudeに聞ける
- スレッドを読み直す必要なし（ワーキングメモリ節約）

### ADHDフレンドリー

- 5分以内で終わるステップに分解
- 最初のステップは最も簡単なものに
- 途中で止めてもOKな区切りを明示
- 達成感を可視化

### 返信添削

- 結論→根拠→アクションの構造化
- 冗長な表現を簡潔に
- 論理の飛躍をチェック

## データ保存先

タスクデータは以下に保存されます：

```
~/.slack-task-mcp/tasks.json
```

## トラブルシューティング

### Slack APIエラー

- `npx slack-task-mcp auth status` で認証状態を確認
- 認証が切れている場合は `npx slack-task-mcp auth` で再認証

### MCPサーバーが認識されない

- 設定ファイルのパスが正しいか確認
- Claude Code / Claude Desktopを再起動したか確認
- `node packages/mcp-server/src/index.js` が単体で動作するか確認

### プライベートチャンネルが読めない

- あなたが参加しているチャンネルのみ読み取り可能です
- チャンネルに参加しているか確認してください

## プロジェクト構造

```
slack-task-mcp/
├── packages/
│   ├── mcp-server/          # MCPサーバー本体
│   │   └── src/
│   │       ├── index.js     # サーバーエントリーポイント
│   │       ├── auth.js      # OAuth認証
│   │       └── cli.js       # CLIコマンド
│   └── oauth-worker/        # Cloudflare Workers (OAuth)
│       └── src/index.js
├── pnpm-workspace.yaml      # pnpmモノレポ設定
└── package.json
```

## 技術スタック

- **Runtime**: Node.js (ES Modules)
- **Protocol**: MCP (Model Context Protocol)
- **Package Manager**: pnpm (monorepo)
- **Dependencies**:
  - `@modelcontextprotocol/sdk`
  - `@slack/web-api`
  - `zod`

## ライセンス

ISC
