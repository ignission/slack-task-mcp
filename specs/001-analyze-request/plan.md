# Implementation Plan: analyze_request

**Branch**: `001-analyze-request` | **Date**: 2025-12-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-analyze-request/spec.md`

## Summary

Slackスレッドの依頼を分析し、目的・不明点・確認メッセージ案・ネクストアクションを構造化して出力するMCPツール `analyze_request` を実装する。分析ロジック自体はClaudeの推論能力を活用し、MCPツールは入出力の構造化と永続化を担当する。

## Technical Context

**Language/Version**: Node.js (ES Modules)
**Primary Dependencies**: @modelcontextprotocol/sdk, zod
**Storage**: ローカルファイル (`~/.slack-task-mcp/tasks.json`)
**Testing**: 手動テスト（将来的にMCP統合テストを追加）
**Target Platform**: Claude Code / Claude Desktop (macOS, Linux, Windows)
**Project Type**: Single project (MCP Server)
**Performance Goals**: レスポンス5秒以内
**Constraints**: シンプルな単一ファイル構成を維持
**Scale/Scope**: 個人利用、1タスクあたり1-3件の依頼

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Lower the Barrier to Start | ✅ Pass | 目的明確化・不明点洗い出し・確認メッセージ案・ネクストアクションを提供 |
| II. Slack as Context DB | ✅ Pass | スレッド内容を分析結果と共に保存 |
| III. Incremental Achievement | ✅ Pass | ネクストアクションで最初の一歩を提示 |
| IV. Logical Communication Support | ✅ Pass | 確認メッセージ案を構造化して提供 |
| V. MCP Protocol Compliance | ✅ Pass | Zodでスキーマ定義、JSON-RPC 2.0準拠 |
| VI. Data Persistence & Privacy | ✅ Pass | tasks.jsonに保存、トークンはハードコードしない |
| VII. Simplicity & Maintainability | ✅ Pass | src/index.jsに追加、依存関係増加なし |

**Result**: All gates passed. No violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/001-analyze-request/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── analyze_request.schema.json
├── checklists/
│   └── requirements.md  # Quality checklist
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
└── index.js             # MCPサーバー本体（analyze_requestツールを追加）
```

**Structure Decision**: 既存の単一ファイル構成を維持。src/index.js に analyze_request ツールのハンドラーとZodスキーマを追加する。

## Implementation Approach

### ツールの責務

```
┌─────────────────────────────────────────────────────────────┐
│ Claude (推論)                                               │
│  - スレッド内容を分析                                        │
│  - 目的・不明点・確認メッセージ・ネクストアクションを生成      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ analyze_request (MCPツール)                                 │
│  - 入力バリデーション（Zod）                                 │
│  - 分析結果の構造化                                          │
│  - 結果の表示用フォーマット生成                              │
└─────────────────────────────────────────────────────────────┘
```

### ワークフロー

1. ユーザーがSlackスレッドURLを提供
2. Claude が `get_slack_thread` でスレッド取得
3. Claude が内容を分析（CLAUDE.mdのルールに従う）
4. Claude が `analyze_request` を呼び出し、分析結果を構造化
5. ユーザーが確認後、`save_task` でタスク保存

## Complexity Tracking

> No constitution violations. This section is not needed.

## Artifacts Generated

| Artifact | Path | Description |
|----------|------|-------------|
| research.md | specs/001-analyze-request/research.md | 技術調査結果 |
| data-model.md | specs/001-analyze-request/data-model.md | エンティティ定義 |
| contracts/ | specs/001-analyze-request/contracts/ | ツールスキーマ（JSON Schema） |
| quickstart.md | specs/001-analyze-request/quickstart.md | 使用例とワークフロー |

## Next Steps

1. `/speckit.tasks` でタスクリストを生成
2. タスクに従って src/index.js に実装
3. 手動テストで動作確認
4. CLAUDE.md / README.md は既に更新済み
