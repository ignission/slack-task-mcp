<p align="center">
  <h1 align="center">🧠 Slack Task MCP</h1>
</p>

<p align="center">
  <strong>メンションから着手までの摩擦をゼロに</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@ignission/slack-task-mcp"><img src="https://img.shields.io/npm/v/@ignission/slack-task-mcp" alt="npm version"></a>
  <a href="https://opensource.org/licenses/ISC"><img src="https://img.shields.io/badge/License-ISC-blue.svg" alt="License: ISC"></a>
</p>

<p align="center">
  ADHDの特性を持つユーザーのために設計されたMCPサーバー
</p>

---

## Why

Slackのメンションがたまると、どこから手を付けていいか迷う。難しい依頼が来ると、何を聞けばいいかわからず固まる。返信を書くのに時間がかかる——そんな経験はありませんか？

<p align="center">

| 😵 困りごと | ➡️ | 🎯 解決 |
|:---:|:---:|:---:|
| 「何求められてる？」が曖昧で固まる | → | 目的の明確化 |
| 「何聞けばいい？」がわからない | → | 不明点の洗い出し + 確認メッセージ案 |
| 「どう返せばいい？」で時間かかる | → | 返信メッセージの添削・構造化 |
| 「次何する？」で迷う | → | ネクストアクション提示 |

</p>

---

## Architecture

```mermaid
graph TB
    subgraph Client ["Claude Desktop / Claude Code"]
        MCP["MCP Client"]
    end

    subgraph Core ["Slack Task MCP"]
        Server["MCP Server<br/>(stdio transport)"]

        subgraph Tools ["MCPツール"]
            SlackTools["🔗 Slack連携<br/>get_slack_thread<br/>search_slack"]
            TaskTools["📋 タスク管理<br/>save/list/search<br/>complete_step"]
            AITools["🤖 AI支援<br/>analyze_request<br/>draft_reply"]
        end

        subgraph AgentSDK ["Agent SDK Layer"]
            Analyze["analyze.js<br/>依頼分析"]
            Draft["draft-reply.js<br/>返信添削"]
        end
    end

    subgraph External ["外部サービス"]
        SlackAPI["Slack API"]
        ClaudeAPI["Claude API"]
    end

    MCP -->|MCP Protocol| Server
    Server --> Tools
    AITools --> AgentSDK
    Analyze -->|query| ClaudeAPI
    Draft -->|query| ClaudeAPI
    SlackTools -->|User Token| SlackAPI
```

**ポイント:**
- **MCP Server**: Slack APIとのやり取り、タスク管理を担当
- **Agent SDK Layer**: Claude APIを使った高度な分析・添削処理を担当

---

## Features

| ツール | 機能 | Agent SDK |
|--------|------|:---------:|
| `get_slack_thread` | SlackスレッドのURLからメッセージを取得 | - |
| `analyze_request` | 依頼を分析し、目的・不明点・確認案を生成 | ✅ |
| `draft_reply` | 返信を添削し、ロジカルに構造化 | ✅ |
| `save_task` | タスクを保存（5分以内のステップに分解） | - |
| `list_tasks` | アクティブなタスク一覧を表示 | - |
| `search_tasks` | キーワード・日付でタスクを検索 | - |
| `complete_step` | ステップを完了にする | - |
| `search_slack` | Slackメッセージをキーワードで検索 | - |

---

## Quick Start

### 1. Slack認証

```bash
npx @ignission/slack-task-mcp auth login
```

ブラウザが開き、Slackの認証画面が表示されます。複数のワークスペースを認証する場合は、このコマンドを繰り返し実行してください。

### 2. Claude Code / Claude Desktop の設定

**Claude Code (ターミナル)**:

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

設定を反映するためにClaude Code / Claude Desktopを再起動してください。

---

## Usage

### 基本ワークフロー

```
1. get_slack_thread  →  スレッド取得（文脈DB化）
2. analyze_request   →  目的・不明点・確認案を生成
3. draft_reply       →  返信の下書きを添削・構造化
4. save_task         →  タスクとして保存
5. complete_step     →  進捗管理
```

### 使用例

#### スレッドを取得・分析

```
このSlackスレッドを分析して:
https://xxx.slack.com/archives/C12345678/p1234567890123456
```

#### タスクを保存

```
このタスクを5分以内のステップに分解して保存して
```

#### 返信を添削

```
この返信を添削して「レポートできました。添付します。確認お願いします。」
```

#### タスク一覧を確認

```
タスク一覧を見せて
```

#### ステップを完了

```
ステップ1を完了にして
```

---

## ADHDフレンドリー設計

- **5分以内で終わるステップに分解** — 小さな達成感を積み重ねる
- **最初のステップは最も簡単なものに** — 着手のハードルを下げる
- **途中で止めてもOKな区切りを明示** — 中断しても再開しやすい
- **Slackを文脈DBとして活用** — 「あの話どうなったっけ」をClaudeに聞ける

---

## Tech Stack

| 技術 | 用途 |
|------|------|
| **Node.js** (ES Modules) | ランタイム |
| **MCP Protocol** | Claude Code / Desktop との通信 |
| **Claude Agent SDK** | 依頼分析・返信添削の AI 処理 |
| **Slack Web API** | Slack連携（User Token使用） |
| **Zod** | スキーマバリデーション |
| **Cloudflare Workers** | OAuth認証サーバー |

---

## Project Structure

```
slack-task-mcp/
├── packages/
│   ├── core/                    # MCPサーバー本体
│   │   └── src/
│   │       ├── index.js         # サーバーエントリポイント
│   │       ├── cli.js           # CLIコマンド
│   │       ├── auth.js          # OAuth認証
│   │       └── agents/          # Agent SDK エージェント
│   │           ├── index.js     # 共通設定
│   │           ├── analyze.js   # 依頼分析
│   │           └── draft-reply.js # 返信添削
│   └── oauth-worker/            # Cloudflare Workers (OAuth)
│       └── src/index.js
├── pnpm-workspace.yaml
└── package.json
```

---

## Data Storage

XDG Base Directory Specification に準拠した場所にデータを保存します:

```
~/.local/share/slack-task-mcp/
├── credentials/
│   ├── T01234567.json     # ワークスペースごとの認証情報
│   └── T98765432.json
└── tasks.json              # タスクデータ
```

環境変数 `XDG_DATA_HOME` が設定されている場合は、そのパスが使用されます。

---

## Troubleshooting

### Slack APIエラー

```bash
npx @ignission/slack-task-mcp auth status                # 認証状態を確認
npx @ignission/slack-task-mcp auth login                 # 新しいワークスペースを認証
npx @ignission/slack-task-mcp auth logout                # 全ワークスペースからログアウト
npx @ignission/slack-task-mcp auth logout -w mycompany   # 特定のワークスペースのみログアウト
```

### MCPサーバーが認識されない

- 設定ファイルのパスが正しいか確認
- Claude Code / Claude Desktopを再起動したか確認

### プライベートチャンネルが読めない

- あなたが参加しているチャンネルのみ読み取り可能です

---

## Contributing

Issue や PR は歓迎です！

---

## License

[ISC](LICENSE)
