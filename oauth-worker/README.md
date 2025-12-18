# Slack Task MCP OAuth Worker

Cloudflare Workers で動作する OAuth サーバーです。

## 前提条件

- Cloudflare アカウント
- Wrangler CLI (`npm install -g wrangler`)
- Slack App (OAuth 用)

## セットアップ手順

### 1. Slack App を作成

1. [Slack API](https://api.slack.com/apps) にアクセス
2. 「Create New App」→「From scratch」
3. App 名と Workspace を選択
4. 「OAuth & Permissions」で以下の User Token Scopes を追加:
   - `channels:history`
   - `groups:history`
   - `im:history`
   - `mpim:history`
   - `users:read`
5. Client ID と Client Secret をメモ

### 2. Cloudflare KV Namespace を作成

```bash
cd oauth-worker
wrangler kv:namespace create AUTH_SESSIONS
```

出力された ID をメモしてください：
```
{ binding = "AUTH_SESSIONS", id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" }
```

### 3. wrangler.toml を更新

`wrangler.toml` の `id` を実際の値に置き換え:

```toml
[[kv_namespaces]]
binding = "AUTH_SESSIONS"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"  # ← 実際の ID
```

### 4. Secrets を設定

```bash
wrangler secret put SLACK_CLIENT_ID
# プロンプトで Client ID を入力

wrangler secret put SLACK_CLIENT_SECRET
# プロンプトで Client Secret を入力
```

### 5. デプロイ

```bash
wrangler deploy
```

デプロイ後の URL をメモ:
```
https://slack-task-mcp-oauth.YOUR_SUBDOMAIN.workers.dev
```

### 6. Slack App の Redirect URL を設定

1. Slack App の「OAuth & Permissions」に移動
2. 「Redirect URLs」に追加:
   ```
   https://slack-task-mcp-oauth.YOUR_SUBDOMAIN.workers.dev/callback
   ```

## CLI での使用

### 環境変数を設定 (オプション)

デフォルト以外の Worker URL を使用する場合:

```bash
export OAUTH_WORKER_URL=https://slack-task-mcp-oauth.YOUR_SUBDOMAIN.workers.dev
```

### 認証を開始

```bash
npx slack-task-mcp auth
```

ブラウザが開き、Slack 認証が完了すると `~/.slack-task-mcp/credentials.json` にトークンが保存されます。

## エンドポイント

| パス | 説明 |
|------|------|
| `/` | サーバー情報 |
| `/auth?session_id=xxx` | OAuth 開始（Slack にリダイレクト）|
| `/callback` | Slack からのコールバック |
| `/poll?session_id=xxx` | CLI からのポーリング |

## セキュリティ

- セッションは 5 分で自動削除
- トークン取得後、セッションは即座に削除
- KV に保存されるのはセッション ID とトークンのみ

## トラブルシューティング

### 「セッションが無効または期限切れです」

認証を最初からやり直してください:
```bash
npx slack-task-mcp auth
```

### Worker URL が見つからない

OAUTH_WORKER_URL 環境変数を確認してください。
