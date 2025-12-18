# Feature Specification: OAuth Authentication

**Feature ID**: 003-oauth-auth
**Date**: 2025-12-18
**Status**: Draft

## Overview

User Token (xoxp-) の手動設定を廃止し、OAuth 2.0 によるブラウザベースの認証フローを実装する。ユーザーはコマンド一つで認証でき、トークンは自動で管理される。

## Problem Statement

現状の課題：

1. **セットアップが複雑**: Slack App 設定画面から User Token を手動でコピーする必要がある
2. **トークン管理が不便**: 環境変数や設定ファイルに手動で設定
3. **セキュリティリスク**: トークンが平文で `.mcp.json` に書かれる可能性
4. **更新が面倒**: トークン期限切れ時に手動で再取得

## Goals

- ワンコマンドで認証完了（`npx slack-task-mcp auth`）
- トークンの安全な保存（暗号化 or OS キーチェーン）
- リフレッシュトークンによる自動更新
- 認証状態の確認・ログアウト機能

## User Stories

### P1: 初回認証

```
As a 新規ユーザー
I want to コマンド一つで Slack 認証を完了したい
So that 面倒な設定なしですぐに使い始められる
```

**Acceptance Criteria**:
- `npx slack-task-mcp auth` で認証フロー開始
- ブラウザが自動で開き Slack ログイン画面へ
- 認証成功後、トークンが自動保存される
- 成功メッセージが表示される

### P2: 認証状態の確認

```
As a ユーザー
I want to 現在の認証状態を確認したい
So that トークンが有効か、誰としてログインしているかわかる
```

**Acceptance Criteria**:
- `npx slack-task-mcp auth status` で状態確認
- ログイン中のユーザー名・ワークスペースを表示
- トークンの有効期限を表示
- 未認証の場合はその旨を表示

### P3: ログアウト

```
As a ユーザー
I want to ログアウトしたい
So that 別アカウントで再認証できる
```

**Acceptance Criteria**:
- `npx slack-task-mcp auth logout` でログアウト
- 保存されたトークンを削除
- 確認メッセージを表示

### P4: トークン自動更新

```
As a ユーザー
I want to トークンが自動で更新されてほしい
So that 期限切れを気にせず使い続けられる
```

**Acceptance Criteria**:
- アクセストークン期限切れ時に自動でリフレッシュ
- リフレッシュ失敗時は再認証を促すメッセージ
- バックグラウンドで透過的に動作

## Technical Design

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

### 必要な Slack App 設定

| 項目 | 値 |
|------|-----|
| OAuth Redirect URL | `http://localhost:3000/callback` |
| User Token Scopes | `channels:history`, `groups:history`, `im:history`, `mpim:history`, `users:read` |

### ファイル構成

```
~/.slack-task-mcp/
├── credentials.json    # OAuth トークン（暗号化推奨）
└── tasks.json          # タスクデータ（既存）
```

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

## Functional Requirements

### FR-001: 認証コマンド
- `npx slack-task-mcp auth` で OAuth フロー開始
- localhost:3000 で一時サーバー起動
- デフォルトブラウザを自動で開く

### FR-002: コールバック処理
- `/callback?code=xxx` で認可コードを受け取る
- Slack API でトークン交換
- 成功/失敗をブラウザに表示

### FR-003: トークン保存
- `~/.slack-task-mcp/credentials.json` に保存
- ファイルパーミッション 600（owner のみ読み書き）
- 将来的に OS キーチェーン対応を検討

### FR-004: トークン読み込み
- MCP サーバー起動時に credentials.json を読み込み
- 環境変数 `SLACK_USER_TOKEN` より credentials.json を優先
- トークンなしの場合はエラーメッセージで認証を促す

### FR-005: ステータス確認
- `npx slack-task-mcp auth status` で現在の状態表示
- ユーザー名、ワークスペース、有効期限を表示

### FR-006: ログアウト
- `npx slack-task-mcp auth logout` でトークン削除
- 確認プロンプトを表示

### FR-007: トークン自動更新
- リクエスト前にトークン期限をチェック
- 期限切れ間近（5分前）なら自動リフレッシュ
- リフレッシュ失敗時は再認証を促す

## Non-Functional Requirements

### NFR-001: セキュリティ
- credentials.json のパーミッションは 600
- state パラメータで CSRF 対策
- PKCE 対応（推奨）

### NFR-002: UX
- 認証完了まで 30 秒以内
- エラー時は具体的な対処法を表示
- ブラウザが開けない環境用に URL 手動コピーオプション

### NFR-003: 互換性
- 既存の `SLACK_USER_TOKEN` 環境変数も引き続きサポート
- credentials.json があれば優先

## Edge Cases

### EC-001: ブラウザが開けない
- URL を表示して手動でアクセスを案内
- `--no-browser` オプションで URL のみ表示

### EC-002: ポート 3000 が使用中
- 別ポート（3001, 3002...）を自動で試行
- または `--port` オプションで指定可能

### EC-003: 認証キャンセル
- ユーザーが Slack で拒否した場合のハンドリング
- タイムアウト（5分）でサーバー自動終了

### EC-004: 複数ワークスペース
- 現状は単一ワークスペースのみサポート
- 将来的にマルチワークスペース対応を検討

## Out of Scope

- OS キーチェーン統合（将来検討）
- マルチワークスペース対応（将来検討）
- Bot Token 対応（User Token のみ）
- Electron/GUI アプリ化

## Dependencies

- Slack App の作成（OAuth Redirect URL 設定）
- `open` パッケージ（ブラウザ起動）
- `http` モジュール（ローカルサーバー）

## Migration Plan

1. **Phase 1**: OAuth 認証機能を追加（新機能）
2. **Phase 2**: ドキュメント更新、README に認証手順追加
3. **Phase 3**: 環境変数方式を「レガシー」として非推奨化
4. **Phase 4**: （将来）環境変数サポート削除

## Success Criteria

1. `npx slack-task-mcp auth` で認証が完了する
2. 認証後、MCP ツールが正常に動作する
3. トークンが安全に保存される（パーミッション 600）
4. 既存の環境変数方式も引き続き動作する
5. エラー時に適切なメッセージが表示される
