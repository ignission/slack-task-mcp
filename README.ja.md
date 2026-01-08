<p align="center">
  <h1 align="center">Slack Task MCP</h1>
</p>

<p align="center">
  <strong>メンションから着手までの摩擦をゼロに</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@ignission/slack-task-mcp"><img src="https://img.shields.io/npm/v/@ignission/slack-task-mcp" alt="npm version"></a>
  <a href="https://opensource.org/licenses/ISC"><img src="https://img.shields.io/badge/License-ISC-blue.svg" alt="License: ISC"></a>
</p>

<p align="center">
  ADHDの特性を持つユーザー向けに設計されたMCPサーバー
</p>

<p align="center">
  <a href="README.md">English</a>
</p>

---

## なぜ作ったか

Slackでメンションがたまると、どこから手を付けていいか迷う。難しい依頼は固まってしまう。返信を書くのに時間がかかる。心当たりはありませんか？

| 課題 | 解決策 |
|:-----|:-------|
| 「何を求められてる？」が曖昧 | 目的を明確化 |
| 「何を聞けばいい？」がわからない | 不明点の洗い出し + 確認メッセージ案 |
| 「どう返せばいい？」で時間がかかる | 返信メッセージの添削・構造化 |
| 「次何する？」で迷う | ネクストアクション提示 |

---

## アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│  Claude Desktop / Claude Code                               │
│  └── MCP Client                                             │
└──────────────────────────┬──────────────────────────────────┘
                           │ MCP Protocol
┌──────────────────────────▼──────────────────────────────────┐
│  Slack Task MCP Server                                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  MCP Tools                                             │ │
│  │  • get_slack_thread  • save_task     • analyze_request │ │
│  │  • search_slack      • list_tasks    • draft_reply     │ │
│  │                      • complete_step                   │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Agent SDK Layer (AI分析)                              │ │
│  │  • analyze.js → 依頼分析                               │ │
│  │  • draft-reply.js → 返信添削                           │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           │
          ┌────────────────┴────────────────┐
          ▼                                 ▼
   ┌─────────────┐                   ┌─────────────┐
   │  Slack API  │                   │  Claude API │
   │ (User Token)│                   │ (Agent SDK) │
   └─────────────┘                   └─────────────┘
```

---

## 機能

| ツール | 説明 | Agent SDK |
|--------|------|:---------:|
| `get_slack_thread` | SlackスレッドURLからメッセージを取得 | - |
| `analyze_request` | 依頼を分析し、目的・不明点を特定 | ✅ |
| `draft_reply` | 返信を添削し、論理的に構造化 | ✅ |
| `save_task` | タスクを保存（5分以内のステップに分解） | - |
| `list_tasks` | アクティブなタスク一覧を表示 | - |
| `search_tasks` | キーワード・日付でタスクを検索 | - |
| `complete_step` | ステップを完了にする | - |
| `search_slack` | Slackメッセージをキーワード検索 | - |

---

## クイックスタート

### 1. Slack認証

```bash
npx -y @ignission/slack-task-mcp auth login
```

ブラウザが開きSlack認証が行われます。複数ワークスペースも対応可能です。

### 2. Claude Code / Claude Desktop の設定

**Claude Code（ターミナル）**:

```bash
claude mcp add slack-task -- npx -y @ignission/slack-task-mcp
```

**Claude Desktop** (`~/.claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "slack-task": {
      "command": "npx",
      "args": ["-y", "@ignission/slack-task-mcp"]
    }
  }
}
```

### 3. 再起動

Claude Code / Claude Desktop を再起動して設定を反映します。

---

## 使い方

### 基本ワークフロー

```
1. get_slack_thread  →  スレッド取得（文脈DB化）
2. analyze_request   →  目的・不明点・確認メッセージ案を生成
3. draft_reply       →  返信の下書きを添削・構造化
4. save_task         →  タスクとして保存
5. complete_step     →  進捗管理
```

### 使用例

#### スレッドを取得して分析

```
このSlackスレッドを分析して:
https://xxx.slack.com/archives/C12345678/p1234567890123456
```

#### タスクを保存

```
これを5分以内のステップに分解して保存して
```

#### 返信を添削

```
この返信を添削して: 「レポートできました。添付します。確認お願いします。」
```

#### タスク一覧を表示

```
タスク一覧を見せて
```

#### ステップを完了

```
ステップ1を完了にして
```

---

## ADHD向け設計

- **5分以内のステップに分解** — 小さな達成感を積み上げる
- **最初のステップは最も簡単に** — 着手のハードルを下げる
- **明確な区切り** — 途中で止めても再開しやすい
- **Slackを文脈DBとして活用** — 「あの話どうなったっけ」をClaudeに聞ける

---

## 技術スタック

| 技術 | 用途 |
|------|------|
| **Node.js** (ES Modules) | ランタイム |
| **MCP Protocol** | Claude Code/Desktop との通信 |
| **Claude Agent SDK** | AI による依頼分析・返信添削 |
| **Slack Web API** | Slack連携（User Token） |
| **Zod** | スキーマバリデーション |
| **Cloudflare Workers** | OAuth認証（トークン交換） |

---

## プロジェクト構成

```
slack-task-mcp/
├── src/
│   ├── index.js         # MCPサーバーエントリーポイント
│   ├── cli.js           # CLIコマンド
│   ├── auth.js          # OAuth認証（ハイブリッド）
│   ├── credentials.js   # 認証情報管理
│   ├── paths.js         # パス管理（XDG準拠）
│   └── agents/          # Agent SDKエージェント
│       ├── index.js     # 共通設定
│       ├── analyze.js   # 依頼分析
│       └── draft-reply.js # 返信添削
├── worker/              # Cloudflare Workers（トークン交換）
│   ├── index.js
│   └── wrangler.toml
└── package.json
```

---

## データ保存場所

XDG Base Directory Specification に準拠:

```
~/.local/share/slack-task-mcp/
├── credentials/
│   ├── T01234567.json     # ワークスペースごとの認証情報
│   └── T98765432.json
└── tasks.json              # タスクデータ
```

`XDG_DATA_HOME` が設定されている場合はそちらを使用します。

---

## トラブルシューティング

### Slack APIエラー

```bash
npx -y @ignission/slack-task-mcp auth status              # 認証状態を確認
npx -y @ignission/slack-task-mcp auth login               # 新規ワークスペースを認証
npx -y @ignission/slack-task-mcp auth logout              # 全ワークスペースからログアウト
npx -y @ignission/slack-task-mcp auth logout -w mycompany # 特定ワークスペースからログアウト
```

### MCPサーバーが認識されない

- 設定ファイルのパスが正しいか確認
- Claude Code / Claude Desktop を再起動

### プライベートチャンネルが読めない

- 自分が参加しているチャンネルのみ読み取り可能です

---

## コントリビューション

Issue や PR を歓迎します！

---

## ライセンス

[ISC](LICENSE)
