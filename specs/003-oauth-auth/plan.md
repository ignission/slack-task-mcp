# Implementation Plan: OAuth Authentication

**Branch**: `003-oauth-auth` | **Date**: 2025-12-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-oauth-auth/spec.md`

## Summary

User Token の手動設定を廃止し、OAuth 2.0 によるブラウザベースの認証フローを実装する。`npx slack-task-mcp auth` コマンドで認証を完了でき、トークンは自動で管理される。

## Technical Context

**Language/Version**: Node.js (ES Modules)
**Primary Dependencies**: @modelcontextprotocol/sdk, zod, open (新規追加)
**Storage**: ~/.slack-task-mcp/credentials.json
**Testing**: 手動テスト
**Target Platform**: Claude Code / Claude Desktop (macOS, Linux, Windows)
**Project Type**: Single project (MCP Server + CLI)
**Constraints**: シンプルな構成を維持しつつ CLI 機能を追加

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Lower the Barrier to Start | ✅ Pass | 手動トークン設定が不要になり、セットアップが簡単に |
| II. Slack as Context DB | ✅ Pass | 認証機能、スレッド取得には影響なし |
| III. Incremental Achievement | ✅ Pass | 認証→利用開始の小ステップ |
| IV. Logical Communication Support | N/A | 認証機能のため対象外 |
| V. MCP Protocol Compliance | ✅ Pass | MCP サーバー自体には変更なし |
| VI. Data Persistence & Privacy | ✅ Pass | credentials.json をパーミッション 600 で保存 |
| VII. Simplicity & Maintainability | ✅ Pass | CLI を別ファイル（src/cli.js）に分離 |

**Result**: All gates passed.

## Project Structure

### Documentation (this feature)

```text
specs/003-oauth-auth/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── checklists/
│   └── requirements.md  # Quality checklist
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
src/
├── index.js             # MCP サーバー本体（トークン読み込みを修正）
├── cli.js               # CLI エントリーポイント（新規）
└── auth.js              # OAuth 認証ロジック（新規）
```

### File Changes

| File | Action | Description |
|------|--------|-------------|
| src/cli.js | 新規 | CLI エントリーポイント |
| src/auth.js | 新規 | OAuth 認証ロジック |
| src/index.js | 修正 | credentials.json からトークン読み込み |
| package.json | 修正 | bin フィールド追加、open パッケージ追加 |

## Implementation Approach

### CLI 構成

```
npx slack-task-mcp [command] [options]

Commands:
  auth              OAuth 認証を開始
  auth status       認証状態を確認
  auth logout       ログアウト
  (なし)            MCP サーバーとして起動（既存動作）
```

### OAuth フロー図

```
┌──────────┐  1. auth   ┌──────────┐
│  CLI     │ ─────────▶ │  auth.js │
└──────────┘            └──────────┘
                              │
                   2. localhost:3000 起動
                              │
                   3. ブラウザで Slack OAuth
                              │
                   4. コールバック受信
                              │
                   5. トークン交換
                              │
                   6. credentials.json 保存
                              ▼
                        ┌──────────┐
                        │ 完了表示  │
                        └──────────┘
```

### トークン読み込み優先順位

```javascript
// src/index.js での読み込み
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

## Dependencies

### 新規追加

```json
{
  "dependencies": {
    "open": "^10.0.0"
  }
}
```

### package.json 修正

```json
{
  "bin": {
    "slack-task-mcp": "./src/cli.js"
  }
}
```

## Artifacts Generated

| Artifact | Path | Description |
|----------|------|-------------|
| research.md | specs/003-oauth-auth/research.md | 技術調査結果 |
| data-model.md | specs/003-oauth-auth/data-model.md | エンティティ定義 |
| quickstart.md | specs/003-oauth-auth/quickstart.md | 使用例とセットアップ手順 |

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| ポート競合 | 認証失敗 | 自動で別ポートを試行、--port オプション |
| ブラウザが開けない | 認証できない | --no-browser オプションで URL 表示 |
| Slack App 未設定 | 認証失敗 | 詳細なエラーメッセージ、quickstart.md で手順説明 |

## Next Steps

1. `/speckit.tasks` でタスクリストを生成
2. タスクに従って実装
3. Slack App を作成してテスト
4. README.md 更新
