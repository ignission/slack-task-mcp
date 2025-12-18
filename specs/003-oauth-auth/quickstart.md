# Quickstart: OAuth Authentication

**Feature**: 003-oauth-auth
**Date**: 2025-12-18

## 概要

`slack-task-mcp auth` コマンドで Slack OAuth 認証を行い、トークンを自動管理します。

## セットアップ（初回のみ）

### 1. Slack App の作成

1. https://api.slack.com/apps にアクセス
2. "Create New App" → "From scratch"
3. App Name: `Slack Task MCP`（任意）
4. Workspace: 使用するワークスペースを選択

### 2. OAuth 設定

1. 左メニュー "OAuth & Permissions" を選択
2. "Redirect URLs" に追加:
   ```
   http://localhost:3000/callback
   ```
3. "User Token Scopes" に以下を追加:
   - `channels:history`
   - `groups:history`
   - `im:history`
   - `mpim:history`
   - `users:read`

### 3. Client ID / Secret の取得

1. 左メニュー "Basic Information" を選択
2. "App Credentials" から以下をコピー:
   - Client ID
   - Client Secret

### 4. 環境変数の設定

```bash
export SLACK_CLIENT_ID=your-client-id
export SLACK_CLIENT_SECRET=your-client-secret
```

## 基本的な使い方

### 認証する

```bash
npx slack-task-mcp auth
```

出力:
```
🔐 Slack OAuth 認証を開始します...
ブラウザで Slack ログイン画面を開いています...

（ブラウザが開く → Slack でログイン → 許可）

✅ 認証が完了しました！
   ユーザー: yamada.taro
   ワークスペース: My Workspace
   トークンは ~/.slack-task-mcp/credentials.json に保存されました
```

### 認証状態を確認

```bash
npx slack-task-mcp auth status
```

出力:
```
📋 認証状態

状態: ✅ 認証済み
ユーザー: yamada.taro (U12345678)
ワークスペース: My Workspace (T12345678)
認証日時: 2025-12-18 10:00:00
トークン: 有効（期限なし）
```

### ログアウト

```bash
npx slack-task-mcp auth logout
```

出力:
```
🚪 ログアウトしますか？ (y/N): y

✅ ログアウトしました。
   credentials.json を削除しました。
```

## オプション

### ポートを変更

ポート 3000 が使用中の場合:

```bash
npx slack-task-mcp auth --port 3001
```

### ブラウザを手動で開く

ブラウザが自動で開けない環境の場合:

```bash
npx slack-task-mcp auth --no-browser
```

出力:
```
🔐 Slack OAuth 認証を開始します...

以下の URL をブラウザで開いてください:
https://slack.com/oauth/v2/authorize?client_id=xxx&scope=xxx&redirect_uri=xxx

認証が完了するまで待機中...
```

## ワークフロー

```
┌─────────────────────────────────────────────────────────┐
│ 初回セットアップ                                         │
│                                                         │
│  1. Slack App 作成（api.slack.com）                     │
│  2. OAuth 設定（Redirect URL, Scopes）                  │
│  3. 環境変数に Client ID/Secret を設定                   │
│  4. npx slack-task-mcp auth で認証                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 日常利用                                                 │
│                                                         │
│  - Claude Code / Claude Desktop で MCP ツールを利用      │
│  - トークンは自動で読み込まれる                           │
│  - 再認証は不要（トークン期限なし）                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## エラー対処

### "認証されていません"

```bash
npx slack-task-mcp auth
```
を実行して認証してください。

### "ポートが使用中です"

```bash
npx slack-task-mcp auth --port 3001
```
別のポートを指定してください。

### "トークンが無効です"

```bash
npx slack-task-mcp auth logout
npx slack-task-mcp auth
```
ログアウトしてから再認証してください。

## 既存ユーザー向け

### 環境変数からの移行

既に `SLACK_USER_TOKEN` を使用している場合:

1. `npx slack-task-mcp auth` で OAuth 認証
2. 認証成功後、環境変数は不要になります
3. credentials.json が優先されます

### 優先順位

```
1. ~/.slack-task-mcp/credentials.json（OAuth）
2. 環境変数 SLACK_USER_TOKEN（レガシー）
```

両方設定されている場合は credentials.json が優先されます。
