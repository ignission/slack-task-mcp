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

## Before / After

```
❌ Before
メンション来る → 「何求められてる？」 → 固まる → 後回し → 忘れる

✅ After
メンション来る → スレッドURLを渡す → 目的・不明点・次のアクションが整理される → すぐ着手
```

---

## こんな人におすすめ

- 💭 Slackのメッセージを何度読んでも、どこから手を付けていいかわからない
- 📝 返信を書くのに時間がかかる（言い回しを考えすぎる）
- 🔄 難しい依頼は後回しにして、結局忘れてしまう
- 🧠 ADHDの特性があり、タスクの着手が苦手

---

## ユースケース

### 1. 曖昧な依頼を分解する

> 「四半期レポートお願いできる？」

**このツールがやること:**
- 「お願い」の意味を明確化（作成？レビュー？プレゼン？）
- 不明点を特定（期限は？フォーマットは？誰向け？）
- 適切な確認メッセージを生成
- 明確になったら5分単位のステップに分解

### 2. 雑な返信を構造化する

> 「できました。添付します。確認お願いします。」

**添削後:**
> 「四半期レポートが完成しましたので添付いたします。お手すきの際にご確認いただけますでしょうか。修正点があればお知らせください。」

- 結論 → 根拠 → アクション の構造
- 丁寧だけど簡潔なトーン

### 3. 中断後に作業を再開する

> 「あのクライアントの依頼、どこまでやったっけ？」

**このツールがやること:**
- 過去のSlackスレッドを検索
- タスクの進捗と次のステップを表示
- スレッドを読み直す必要なし

### 4. 大量のメンションをトリアージ

未読メンションが10件以上あるとき:
- 各スレッドを素早く分析
- 優先度を特定（誰かをブロックしてる？期限近い？）
- 不明確なものは確認メッセージを生成
- タスクとして保存し、1つずつ片付ける

---

## デモ

```
あなた: このスレッドを分析して https://xxx.slack.com/archives/C123/p456

Claude: ## 依頼の分析

### 把握した内容
- **目的**: Q4の売上レポートを作成
- **成果物**: グラフ付きPDFレポート
- **期限**: 来週金曜日

### 不明点
- ❓ どの指標を含めるか？
  - 影響: これがわからないと着手できない
  - 選択肢: 売上のみ / 売上+コスト / 完全なP&L

### 確認メッセージ案
「ご依頼ありがとうございます！確認させてください。
売上のみで良いでしょうか、それともP&L全体を含めますか？
また、Q3と同じテンプレートで良いでしょうか？」

### ネクストアクション
📌 確認メッセージを送る（2分）

---

あなた: P&L全体で、テンプレートは同じでいいって。分解して保存して。

Claude: ✅ タスクを保存しました！

### Q4売上レポート
1. ☐ Q3テンプレートを開いて複製（2分）
2. ☐ ダッシュボードからQ4データをエクスポート（3分）
3. ☐ 売上数値を貼り付け（5分）
4. ☐ コスト数値を貼り付け（5分）
5. ☐ グラフを更新（5分）
6. ☐ サマリー文を書く（5分）
7. ☐ PDFでエクスポートして送信（2分）

📌 まずステップ1から - たった2分です！
```

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
