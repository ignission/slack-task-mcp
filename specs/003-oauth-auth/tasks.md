# Tasks: OAuth Authentication

**Feature**: 003-oauth-auth
**Branch**: `003-oauth-auth`
**Date**: 2025-12-18
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Overview

User Token の手動設定を廃止し、OAuth 2.0 によるブラウザベースの認証フローを実装する。

## Task List

### Phase 1: Setup

| # | Task | File | Estimate | Dependencies |
|---|------|------|----------|--------------|
| 1.1 | open パッケージを追加 | package.json | 2分 | - |
| 1.2 | bin フィールドを追加 | package.json | 2分 | - |

### Phase 2: Auth Module

| # | Task | File | Estimate | Dependencies |
|---|------|------|----------|--------------|
| 2.1 | auth.js スケルトン作成 | src/auth.js | 5分 | 1.1 |
| 2.2 | credentials 読み込み関数 | src/auth.js | 5分 | 2.1 |
| 2.3 | credentials 保存関数 | src/auth.js | 5分 | 2.2 |
| 2.4 | OAuth URL 生成関数 | src/auth.js | 5分 | 2.3 |
| 2.5 | ローカルサーバー実装 | src/auth.js | 10分 | 2.4 |
| 2.6 | トークン交換処理 | src/auth.js | 10分 | 2.5 |
| 2.7 | 認証フロー統合 | src/auth.js | 5分 | 2.6 |

### Phase 3: CLI

| # | Task | File | Estimate | Dependencies |
|---|------|------|----------|--------------|
| 3.1 | cli.js エントリーポイント | src/cli.js | 5分 | 2.7 |
| 3.2 | auth コマンド実装 | src/cli.js | 5分 | 3.1 |
| 3.3 | auth status 実装 | src/cli.js | 5分 | 3.2 |
| 3.4 | auth logout 実装 | src/cli.js | 5分 | 3.3 |
| 3.5 | MCP サーバー起動モード | src/cli.js | 3分 | 3.4 |

### Phase 4: Integration

| # | Task | File | Estimate | Dependencies |
|---|------|------|----------|--------------|
| 4.1 | index.js でトークン読み込み修正 | src/index.js | 10分 | 2.2 |
| 4.2 | 認証エラーメッセージ改善 | src/index.js | 5分 | 4.1 |

### Phase 5: Testing

| # | Task | File | Estimate | Dependencies |
|---|------|------|----------|--------------|
| 5.1 | 手動テスト: auth コマンド | - | 10分 | 4.2 |
| 5.2 | 手動テスト: auth status | - | 5分 | 5.1 |
| 5.3 | 手動テスト: auth logout | - | 5分 | 5.2 |
| 5.4 | 手動テスト: MCP ツール動作確認 | - | 5分 | 5.3 |

---

## Progress Tracking

| Phase | Status | Completed |
|-------|--------|-----------|
| Phase 1: Setup | ⬜ Pending | 0/2 |
| Phase 2: Auth Module | ⬜ Pending | 0/7 |
| Phase 3: CLI | ⬜ Pending | 0/5 |
| Phase 4: Integration | ⬜ Pending | 0/2 |
| Phase 5: Testing | ⬜ Pending | 0/4 |

**Total**: 0/20 tasks completed

---

## Acceptance Criteria

- [ ] `npx slack-task-mcp auth` で OAuth 認証が完了する
- [ ] `npx slack-task-mcp auth status` で認証状態が表示される
- [ ] `npx slack-task-mcp auth logout` でログアウトできる
- [ ] credentials.json にトークンが保存される
- [ ] MCP ツールが credentials.json のトークンで動作する
- [ ] 環境変数方式も引き続き動作する
