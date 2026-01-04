# Tasks: OAuth Authentication

## Overview

User Token の手動設定を廃止し、OAuth 2.0 によるブラウザベースの認証フローを実装する。

## Task List

### Phase 1: Setup

- [x] 1.1 open パッケージを追加
- [x] 1.2 bin フィールドを追加

### Phase 2: Auth Module

- [x] 2.1 auth.js スケルトン作成
- [x] 2.2 credentials 読み込み関数
- [x] 2.3 credentials 保存関数
- [x] 2.4 OAuth URL 生成関数
- [x] 2.5 ローカルサーバー実装 → Cloudflare Workers に変更
- [x] 2.6 トークン交換処理
- [x] 2.7 認証フロー統合

### Phase 3: CLI

- [x] 3.1 cli.js エントリーポイント
- [x] 3.2 auth コマンド実装
- [x] 3.3 auth status 実装
- [x] 3.4 auth logout 実装
- [x] 3.5 MCP サーバー起動モード

### Phase 4: Integration

- [x] 4.1 index.js でトークン読み込み修正
- [x] 4.2 認証エラーメッセージ改善

### Phase 5: Testing

- [x] 5.1 手動テスト: auth コマンド
- [x] 5.2 手動テスト: auth status
- [x] 5.3 手動テスト: auth logout
- [x] 5.4 手動テスト: MCP ツール動作確認

## Progress

**Total**: 20/20 tasks completed ✅

## Implementation Notes

- 当初計画したローカルサーバー方式から **Cloudflare Workers** を使った OAuth 認証に変更
- `oauth-worker/` ディレクトリに実装

## Acceptance Criteria

- [x] `npx slack-task-mcp auth` で OAuth 認証が完了する
- [x] `npx slack-task-mcp auth status` で認証状態が表示される
- [x] `npx slack-task-mcp auth logout` でログアウトできる
- [x] credentials.json にトークンが保存される
- [x] MCP ツールが credentials.json のトークンで動作する
- [x] 環境変数方式も引き続き動作する
