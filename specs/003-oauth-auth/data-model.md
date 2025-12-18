# Data Model: OAuth Authentication

**Feature**: 003-oauth-auth
**Date**: 2025-12-18

## Entities

### Credentials

OAuth 認証情報を格納するエンティティ。

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| access_token | string | Yes | Slack アクセストークン (xoxp-...) |
| refresh_token | string | No | リフレッシュトークン (Token Rotation 有効時) |
| token_type | string | Yes | トークンタイプ ("user") |
| scope | string | Yes | 付与されたスコープ（カンマ区切り） |
| user_id | string | Yes | Slack ユーザー ID (U...) |
| team_id | string | Yes | Slack ワークスペース ID (T...) |
| team_name | string | Yes | ワークスペース名 |
| user_name | string | No | ユーザー名 |
| expires_at | string | No | トークン有効期限 (ISO 8601) |
| created_at | string | Yes | 認証日時 (ISO 8601) |

### AuthState

OAuth フロー中の一時的な状態。

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| state | string | Yes | CSRF 対策用ランダム文字列 |
| code_verifier | string | No | PKCE 用（将来対応） |
| created_at | number | Yes | 生成時刻（タイムスタンプ） |

## Storage Format

### credentials.json

`~/.slack-task-mcp/credentials.json`:

```json
{
  "access_token": "xoxp-1234567890-1234567890-1234567890-abcdef1234567890abcdef1234567890",
  "refresh_token": null,
  "token_type": "user",
  "scope": "channels:history,groups:history,im:history,mpim:history,users:read",
  "user_id": "U12345678",
  "team_id": "T12345678",
  "team_name": "My Workspace",
  "user_name": "yamada.taro",
  "expires_at": null,
  "created_at": "2025-12-18T10:00:00Z"
}
```

### File Permissions

| File | Permission | Description |
|------|------------|-------------|
| credentials.json | 600 | Owner のみ読み書き |

## Validation Rules

### Credentials

- `access_token`: 空文字不可、`xoxp-` または `xoxe-` で始まる
- `token_type`: "user" のみ許可
- `scope`: 空文字不可
- `user_id`: `U` で始まる
- `team_id`: `T` で始まる
- `created_at`: 有効な ISO 8601 形式

### AuthState

- `state`: 32文字以上のランダム文字列
- `created_at`: 5分以内（タイムアウト）

## State Transitions

### 認証フロー

```
[未認証] ─── auth コマンド ──▶ [認証中] ─── 成功 ──▶ [認証済み]
                                  │
                                  └─── 失敗/キャンセル ──▶ [未認証]
```

### トークン更新フロー（Token Rotation 有効時）

```
[認証済み] ─── 期限切れ間近 ──▶ [更新中] ─── 成功 ──▶ [認証済み]
                                   │
                                   └─── 失敗 ──▶ [要再認証]
```

## CLI Commands

### auth

```bash
npx slack-task-mcp auth [subcommand] [options]
```

| Subcommand | Description |
|------------|-------------|
| (なし) | OAuth 認証を開始 |
| status | 認証状態を表示 |
| logout | ログアウト（トークン削除） |

### Options

| Option | Description | Default |
|--------|-------------|---------|
| --port | コールバックサーバーのポート | 3000 |
| --no-browser | ブラウザを自動で開かない | false |

## Error Cases

| Error | Message | Action |
|-------|---------|--------|
| 未認証 | "認証されていません。`npx slack-task-mcp auth` を実行してください" | auth コマンドを案内 |
| トークン無効 | "トークンが無効です。再認証してください" | auth コマンドを案内 |
| ポート使用中 | "ポート 3000 は使用中です。--port オプションで別のポートを指定してください" | 別ポートを案内 |
| 認証キャンセル | "認証がキャンセルされました" | - |
| タイムアウト | "認証がタイムアウトしました（5分）" | 再実行を案内 |
