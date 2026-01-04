# Requirements: OAuth Authentication

## Introduction

User Token (xoxp-) の手動設定を廃止し、OAuth 2.0 によるブラウザベースの認証フローを実装する。ユーザーはコマンド一つで認証でき、トークンは自動で管理される。

## Problem Statement

現状の課題：

1. **セットアップが複雑**: Slack App 設定画面から User Token を手動でコピーする必要がある
2. **トークン管理が不便**: 環境変数や設定ファイルに手動で設定
3. **セキュリティリスク**: トークンが平文で `.mcp.json` に書かれる可能性
4. **更新が面倒**: トークン期限切れ時に手動で再取得

## Goals

- ワンコマンドで認証完了（`npx slack-task-mcp auth`）
- トークンの安全な保存（パーミッション 600）
- リフレッシュトークンによる自動更新
- 認証状態の確認・ログアウト機能

## Requirements

### Requirement 1: 初回認証 (P1)

**User Story:** 新規ユーザーとして、コマンド一つで Slack 認証を完了し、面倒な設定なしですぐに使い始めたい。

#### Acceptance Criteria

1. WHEN `npx slack-task-mcp auth` を実行 THEN システム SHALL 認証フローを開始する
2. WHEN 認証フロー開始 THEN システム SHALL ブラウザを自動で開き Slack ログイン画面へ遷移する
3. WHEN 認証成功 THEN システム SHALL トークンを自動保存し成功メッセージを表示する

### Requirement 2: 認証状態の確認 (P2)

**User Story:** ユーザーとして、現在の認証状態を確認したい。

#### Acceptance Criteria

1. WHEN `npx slack-task-mcp auth status` を実行 THEN システム SHALL ログイン中のユーザー名・ワークスペースを表示する
2. IF トークンの有効期限が設定されている THEN システム SHALL 有効期限を表示する
3. IF 未認証 THEN システム SHALL 未認証である旨を表示する

### Requirement 3: ログアウト (P3)

**User Story:** ユーザーとして、ログアウトして別アカウントで再認証したい。

#### Acceptance Criteria

1. WHEN `npx slack-task-mcp auth logout` を実行 THEN システム SHALL 保存されたトークンを削除する
2. WHEN トークン削除完了 THEN システム SHALL 確認メッセージを表示する

### Requirement 4: トークン自動更新 (P4)

**User Story:** ユーザーとして、トークンが自動で更新されてほしい。

#### Acceptance Criteria

1. WHEN アクセストークン期限切れ THEN システム SHALL 自動でリフレッシュする
2. IF リフレッシュ失敗 THEN システム SHALL 再認証を促すメッセージを表示する

## Non-Functional Requirements

### Security
- credentials.json のパーミッションは 600（owner のみ読み書き）
- state パラメータで CSRF 対策
- PKCE 対応（推奨）

### UX
- 認証完了まで 30 秒以内
- エラー時は具体的な対処法を表示
- ブラウザが開けない環境用に URL 手動コピーオプション

### Compatibility
- 既存の `SLACK_USER_TOKEN` 環境変数も引き続きサポート
- credentials.json があれば優先

## Edge Cases

- **ブラウザが開けない**: URL を表示して手動でアクセスを案内
- **ポート 3000 が使用中**: 別ポートを自動で試行、または `--port` オプション
- **認証キャンセル**: タイムアウト（5分）でサーバー自動終了
- **複数ワークスペース**: 現状は単一ワークスペースのみサポート

## Out of Scope

- OS キーチェーン統合（将来検討）
- マルチワークスペース対応（将来検討）
- Bot Token 対応（User Token のみ）

## Status

✅ **実装完了**（Cloudflare Workers を使った OAuth 認証として実装）
