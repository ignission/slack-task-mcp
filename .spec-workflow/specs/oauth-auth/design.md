# Design: OAuth Authentication

## Technical Context

- **Language/Version**: Node.js (ES Modules)
- **Primary Dependencies**: @modelcontextprotocol/sdk, zod, open
- **Storage**: ~/.slack-task-mcp/credentials.json
- **Target Platform**: Claude Code / Claude Desktop

## Architecture

### OAuth 2.0 フロー

```
┌─────────────┐     1. auth コマンド      ┌─────────────┐
│   CLI       │ ─────────────────────────▶│ Local Server│
│             │                           │ :3000       │
└─────────────┘                           └─────────────┘
      │                                         │
      │ 2. ブラウザを開く                        │
      ▼                                         │
┌─────────────┐                                 │
│  Browser    │                                 │
│             │ ─── 3. Slack OAuth ───▶ Slack   │
│             │ ◀── 4. Redirect ────── /callback│
└─────────────┘                                 │
                                                │
      ┌─────────────────────────────────────────┘
      │ 5. Authorization Code
      ▼
┌─────────────┐     6. Exchange Code    ┌─────────────┐
│ Local Server│ ──────────────────────▶ │ Slack API   │
│             │ ◀────────────────────── │             │
└─────────────┘     7. Access Token     └─────────────┘
      │
      │ 8. Save Token
      ▼
┌─────────────┐
│ credentials │
│ .json       │
└─────────────┘
```

### CLI 構成

```
npx slack-task-mcp [command] [options]

Commands:
  auth              OAuth 認証を開始
  auth status       認証状態を確認
  auth logout       ログアウト
  (なし)            MCP サーバーとして起動（既存動作）
```

### ファイル構成

```
src/
├── index.js             # MCP サーバー本体（トークン読み込みを修正）
├── cli.js               # CLI エントリーポイント
└── auth.js              # OAuth 認証ロジック

~/.slack-task-mcp/
├── credentials.json     # OAuth トークン（パーミッション 600）
└── tasks.json           # タスクデータ（既存）
```

## Data Model

### credentials.json 形式

```json
{
  "access_token": "xoxp-...",
  "refresh_token": "xoxr-...",
  "token_type": "user",
  "scope": "channels:history,groups:history,...",
  "user_id": "U12345678",
  "team_id": "T12345678",
  "team_name": "My Workspace",
  "user_name": "yamada.taro",
  "expires_at": "2025-12-19T10:00:00Z"
}
```

### Slack App 設定

| 項目 | 値 |
|------|-----|
| OAuth Redirect URL | `http://localhost:3000/callback` |
| User Token Scopes | `channels:history`, `groups:history`, `im:history`, `mpim:history`, `users:read`, `search:read` |

## Token Loading Priority

```javascript
async function getSlackToken() {
  // 1. credentials.json を優先
  const credentials = await loadCredentials();
  if (credentials?.access_token) {
    return credentials.access_token;
  }

  // 2. 環境変数（レガシー）
  if (process.env.SLACK_USER_TOKEN) {
    return process.env.SLACK_USER_TOKEN;
  }

  return null;
}
```

## Implementation Notes

### 実装方式の変更

当初はローカルサーバーでのOAuth認証を予定していたが、**Cloudflare Workers を使った OAuth 認証**として実装された。

```
oauth-worker/
└── src/
    └── index.js    # Cloudflare Workers OAuth handler
```

これにより：
- ローカルポート競合の問題を回避
- より安全なトークン交換（サーバーサイド）
- セットアップの簡素化

## Status

✅ **実装完了**
