# Requirements Checklist: OAuth Authentication

**Feature**: 003-oauth-auth
**Date**: 2025-12-18

## Functional Requirements

| ID | Requirement | Status | Notes |
|----|-------------|--------|-------|
| FR-001 | 認証コマンド | ⬜ | `npx slack-task-mcp auth` |
| FR-002 | コールバック処理 | ⬜ | localhost サーバー |
| FR-003 | トークン保存 | ⬜ | credentials.json |
| FR-004 | トークン読み込み | ⬜ | MCP サーバー起動時 |
| FR-005 | ステータス確認 | ⬜ | `auth status` |
| FR-006 | ログアウト | ⬜ | `auth logout` |
| FR-007 | トークン自動更新 | ⬜ | Token Rotation 対応時 |

## Non-Functional Requirements

| ID | Requirement | Status | Notes |
|----|-------------|--------|-------|
| NFR-001 | セキュリティ | ⬜ | パーミッション 600, state パラメータ |
| NFR-002 | UX | ⬜ | 30秒以内、エラーメッセージ |
| NFR-003 | 互換性 | ⬜ | 環境変数サポート維持 |

## User Stories

| ID | Story | Status | Notes |
|----|-------|--------|-------|
| P1 | 初回認証 | ⬜ | ワンコマンドで完了 |
| P2 | 認証状態確認 | ⬜ | ユーザー名・WS 表示 |
| P3 | ログアウト | ⬜ | トークン削除 |
| P4 | トークン自動更新 | ⬜ | 将来対応 |

## Edge Cases

| ID | Case | Status | Notes |
|----|------|--------|-------|
| EC-001 | ブラウザが開けない | ⬜ | --no-browser |
| EC-002 | ポート使用中 | ⬜ | 自動で別ポート |
| EC-003 | 認証キャンセル | ⬜ | エラーハンドリング |
| EC-004 | 複数ワークスペース | ⬜ | 将来対応 |

## Success Criteria

| ID | Criterion | Status |
|----|-----------|--------|
| SC-001 | auth コマンドで認証完了 | ⬜ |
| SC-002 | MCP ツールが正常動作 | ⬜ |
| SC-003 | トークンが安全に保存される | ⬜ |
| SC-004 | 環境変数方式も動作 | ⬜ |
| SC-005 | エラー時に適切なメッセージ | ⬜ |

## Files to Create/Modify

| File | Action | Status |
|------|--------|--------|
| src/cli.js | 新規作成 | ⬜ |
| src/auth.js | 新規作成 | ⬜ |
| src/index.js | 修正 | ⬜ |
| package.json | 修正 | ⬜ |
| README.md | 更新 | ⬜ |
