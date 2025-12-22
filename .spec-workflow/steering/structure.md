# Structure Document

## ディレクトリ構成

```
slack-task-mcp/
├── src/                      # メインソースコード
│   ├── index.js             # MCPサーバー本体・ツール定義
│   ├── auth.js              # OAuth認証モジュール
│   └── cli.js               # CLIエントリーポイント
│
├── oauth-worker/            # Cloudflare Workers (OAuth Broker)
│   ├── src/
│   │   └── index.js         # Workerハンドラー
│   ├── wrangler.toml        # Wrangler設定
│   └── README.md            # Worker用ドキュメント
│
├── specs/                   # 機能仕様ドキュメント
│   ├── 001-analyze-request/ # 依頼分析ツール仕様
│   ├── 002-draft-reply/     # 返信添削ツール仕様
│   └── 003-oauth-auth/      # OAuth認証仕様
│
├── .spec-workflow/          # 仕様策定ワークフロー
│   ├── steering/            # ステアリングドキュメント
│   │   ├── product.md       # プロダクト定義
│   │   ├── tech.md          # 技術仕様
│   │   └── structure.md     # 構造ドキュメント（本ファイル）
│   ├── templates/           # 各種テンプレート
│   ├── specs/               # 仕様策定中のドキュメント
│   ├── approvals/           # 承認済み仕様
│   ├── archive/             # アーカイブ
│   └── user-templates/      # ユーザーテンプレート
│
├── .claude/                 # Claude Code設定
│   └── commands/            # カスタムコマンド（speckit等）
│
├── .specify/                # Specify設定
│   ├── templates/           # テンプレート
│   └── memory/              # メモリファイル
│
├── node_modules/            # 依存パッケージ
├── package.json             # npm設定
├── package-lock.json        # 依存ロックファイル
├── mise.toml                # miseツール設定
├── .gitignore               # Git除外設定
├── .mcp.json                # MCP開発用設定
├── CLAUDE.md                # Claude Code向けプロジェクト説明
└── README.md                # プロジェクトREADME
```

## モジュール構成

### src/index.js

MCPサーバーのメインモジュール。以下を含む:

| セクション | 説明 |
|-----------|------|
| Zodスキーマ定義 | analyze_request / draft_reply 用の型定義 |
| ユーティリティ関数 | データ永続化、Slack URL解析、メッセージフォーマット |
| MCPサーバー初期化 | McpServer インスタンス作成 |
| ツール定義 | 6つのMCPツール登録 |
| エントリーポイント | main() 関数でサーバー起動 |

```javascript
// ツール登録パターン
server.tool(
  "tool_name",           // ツール名
  "description",         // 説明
  { /* Zodスキーマ */ }, // パラメータ定義
  async (params) => {}   // ハンドラー
);
```

### src/auth.js

OAuth認証モジュール。エクスポート:

| 関数 | 説明 |
|------|------|
| `loadCredentials()` | credentials.json読み込み |
| `authenticate(options)` | OAuth認証フロー実行 |
| `showStatus()` | 認証状態表示 |
| `logout()` | ログアウト（認証情報削除） |

### src/cli.js

CLIエントリーポイント。コマンドルーティング:

| コマンド | 処理 |
|---------|------|
| `auth` | OAuth認証開始 |
| `auth status` | 認証状態確認 |
| `auth logout` | ログアウト |
| (なし) | MCPサーバー起動 |

## データフロー

### スレッド取得フロー

```
URL入力
    ↓
parseSlackUrl() - チャンネルID・TSを抽出
    ↓
getThreadMessages() - Slack API呼び出し（ページネーション対応）
    ↓
formatMessages() - ユーザー名解決・日時変換
    ↓
Markdown形式で出力
```

### タスク管理フロー

```
save_task呼び出し
    ↓
loadTasks() - 既存データ読み込み
    ↓
新規タスク作成（ID = Date.now()）
    ↓
saveTasks() - JSONファイル書き込み
    ↓
確認メッセージ返却

complete_step呼び出し
    ↓
loadTasks() - 既存データ読み込み
    ↓
ステップステータス更新
    ↓
全完了チェック → 自動アーカイブ
    ↓
saveTasks() - JSONファイル書き込み
    ↓
次ステップ提示
```

### OAuth認証フロー

```
CLI                    CF Worker               Slack
 │                        │                      │
 │── sessionId生成        │                      │
 │                        │                      │
 │── /auth?session_id ───→│                      │
 │                        │── OAuth redirect ───→│
 │                        │                      │
 │                        │←── callback with code│
 │                        │                      │
 │                        │── token exchange ───→│
 │                        │←── access_token ─────│
 │                        │                      │
 │── /poll (polling) ────→│                      │
 │←── token ──────────────│                      │
 │                        │                      │
 │── credentials.json保存 │                      │
```

## 設定ファイル

### package.json

```json
{
  "name": "slack-task-mcp",
  "type": "module",           // ES Modules
  "main": "src/index.js",     // MCPサーバー
  "bin": {
    "slack-task-mcp": "./src/cli.js"  // CLI
  }
}
```

### .mcp.json

開発用のMCP設定:

```json
{
  "mcpServers": {
    "slack-task": {
      "command": "node",
      "args": ["src/index.js"]
    }
  }
}
```

### mise.toml

```toml
[tools]
node = "22"
```

## 命名規則

### ファイル・ディレクトリ

- kebab-case: `slack-task-mcp`, `oauth-worker`
- 仕様フォルダ: `NNN-feature-name` (連番付き)

### JavaScript

- camelCase: 変数・関数名
- PascalCase: Zodスキーマ名 (`AnalysisResultSchema`)
- UPPER_SNAKE_CASE: 定数 (`DATA_DIR`, `AUTH_TIMEOUT`)

### ツール名

- snake_case: MCP ツール名 (`get_slack_thread`, `analyze_request`)

## 拡張ガイド

### 新規ツール追加

1. `src/index.js` に Zod スキーマ定義
2. `server.tool()` でツール登録
3. CLAUDE.md に使用例追加
4. specs/ に仕様ドキュメント作成

### 新規モジュール追加

1. `src/` に新規ファイル作成
2. ES Modules の export/import 使用
3. 必要に応じて cli.js からルーティング追加
