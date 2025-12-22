# Technical Document

## 技術スタック

### ランタイム

- **Node.js** (ES Modules)
- バージョン管理: mise

### コアライブラリ

| ライブラリ | バージョン | 用途 |
|-----------|-----------|------|
| `@modelcontextprotocol/sdk` | ^1.25.1 | MCP サーバー実装 |
| `@slack/web-api` | ^7.13.0 | Slack API クライアント |
| `zod` | ^4.2.1 | スキーマ定義・バリデーション |
| `open` | ^10.1.0 | ブラウザ自動起動（OAuth用） |

### 認証インフラ

- **Cloudflare Workers**: OAuth 認証フロー処理
- **Wrangler**: Workers のデプロイ管理

## アーキテクチャ

### 全体構成

```
┌─────────────────────────────────────────────────────────────┐
│                    Claude Code / Desktop                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ MCP (stdio)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  slack-task-mcp (Node.js)                    │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐                │
│  │  Tools    │  │  Storage  │  │   Auth    │                │
│  │ (6 tools) │  │  (JSON)   │  │ (OAuth)   │                │
│  └───────────┘  └───────────┘  └───────────┘                │
└─────────────────────────────────────────────────────────────┘
        │                 │                 │
        ▼                 ▼                 ▼
   ┌─────────┐     ┌───────────────┐   ┌─────────────────┐
   │  Slack  │     │ ~/.slack-task │   │ CF Workers      │
   │   API   │     │ -mcp/         │   │ (OAuth Broker)  │
   └─────────┘     └───────────────┘   └─────────────────┘
```

### MCPツール設計

Claudeが呼び出す各ツールは、**構造化されたパラメータを受け取り、フォーマット済みのテキストを返す**設計。

| ツール | 入力 | 出力 |
|--------|------|------|
| `get_slack_thread` | URL | Markdown形式のスレッド内容 |
| `analyze_request` | thread_content, analysis | Markdown形式の分析結果 |
| `draft_reply` | draft_text, edited_reply | Markdown形式の添削結果 |
| `save_task` | title, purpose, steps | 保存確認メッセージ |
| `list_tasks` | なし | Markdown形式のタスク一覧 |
| `search_tasks` | keyword?, status?, days? | Markdown形式の検索結果 |
| `complete_step` | task_id?, step_number | 完了確認と次ステップ |

### Zodスキーマ活用

ツールパラメータの型定義とバリデーションに Zod を活用:

```javascript
const AnalysisResultSchema = z.object({
  purpose: z.string().max(500),
  deliverable: z.string().nullable().optional(),
  deadline: z.string().nullable().optional(),
  unclear_points: z.array(UnclearPointSchema),
  confirmation_message: z.string().nullable().optional(),
  next_action: NextActionSchema,
  priority: z.enum(["high", "medium", "low"]),
});
```

## データ永続化

### ストレージ設計

```
~/.slack-task-mcp/
├── tasks.json        # タスクデータ
└── credentials.json  # OAuth認証情報 (mode: 0o600)
```

### タスクデータ構造

```json
{
  "tasks": [
    {
      "id": "1734567890123",
      "title": "週次レポート作成",
      "purpose": "チームの進捗を共有する",
      "steps": [
        {
          "order": 1,
          "text": "先週のSlackを振り返る",
          "estimate_min": 5,
          "status": "done",
          "completed_at": "2024-12-19T..."
        }
      ],
      "source_url": "https://xxx.slack.com/...",
      "status": "active",
      "created_at": "2024-12-19T...",
      "completed_at": null
    }
  ]
}
```

## 認証設計

### OAuth フロー

```
1. CLI: セッションID生成
2. CLI: Worker の /auth?session_id=xxx を開く
3. Worker: Slack OAuth 画面にリダイレクト
4. ユーザー: Slackで許可
5. Worker: callback でトークン取得、KV に保存
6. CLI: /poll でトークンをポーリング取得
7. CLI: credentials.json に保存
```

### Token優先順位

```javascript
// 1. credentials.json を優先
const credentials = await loadCredentials();
if (credentials?.access_token) {
  token = credentials.access_token;
}

// 2. 環境変数（レガシー）
if (!token && process.env.SLACK_USER_TOKEN) {
  token = process.env.SLACK_USER_TOKEN;
}
```

## 開発原則

### 1. 認知負荷を意識した設計

- ツールの出力は Markdown 形式で読みやすく
- ステップは5分以内で完了できる粒度
- 次のアクションを明示

### 2. シンプルさ優先

- 外部DBを使わずローカルJSONで永続化
- 最小限の依存関係
- ES Modules による明確なモジュール構造

### 3. プライバシー重視

- User Token を使用（Bot Token ではない）
- 認証情報はローカルに保存（モード 0o600）
- ユーザーが参加しているチャンネルのみアクセス可能

### 4. MCP準拠

- stdio トランスポート
- 構造化ツール定義（Zodスキーマ）
- テキストコンテンツレスポンス

## エラーハンドリング

- Slack APIエラー: ユーザーに原因を明示
- 認証エラー: `auth` コマンドへの誘導
- ファイル操作エラー: ディレクトリ自動作成でリカバリー
- ネットワークエラー: ポーリング時は無視して継続

## 将来の拡張ポイント

1. **リマインダー機能**: 未完了タスクの通知
2. **チーム機能**: 複数ユーザーでのタスク共有
3. **分析の高度化**: 過去の依頼パターン学習
4. **Slack投稿機能**: 添削した返信を直接投稿
