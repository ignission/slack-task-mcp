# Implementation Plan: draft_reply

**Branch**: `002-draft-reply` | **Date**: 2025-12-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-draft-reply/spec.md`

## Summary

返信の下書きを添削し、「結論→根拠→アクション」の構造に整理するMCPツール `draft_reply` を実装する。添削ロジック自体はClaudeの推論能力を活用し、MCPツールは入出力の構造化と表示を担当する。

## Technical Context

**Language/Version**: Node.js (ES Modules)
**Primary Dependencies**: @modelcontextprotocol/sdk, zod
**Storage**: なし（結果は返すのみ、永続化しない）
**Testing**: 手動テスト
**Target Platform**: Claude Code / Claude Desktop (macOS, Linux, Windows)
**Project Type**: Single project (MCP Server)
**Performance Goals**: レスポンス5秒以内
**Constraints**: シンプルな単一ファイル構成を維持
**Scale/Scope**: 個人利用

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Lower the Barrier to Start | ✅ Pass | 「どう返せばいい？」の解消、コピペで返信完了 |
| II. Slack as Context DB | ✅ Pass | thread_content で文脈参照可能 |
| III. Incremental Achievement | ✅ Pass | 下書き→添削→送信の小ステップ |
| IV. Logical Communication Support | ✅ Pass | 結論→根拠→アクションの構造化 |
| V. MCP Protocol Compliance | ✅ Pass | Zodでスキーマ定義、JSON-RPC 2.0準拠 |
| VI. Data Persistence & Privacy | ✅ Pass | 永続化なし、入力のみ処理 |
| VII. Simplicity & Maintainability | ✅ Pass | src/index.jsに追加、依存関係増加なし |

**Result**: All gates passed. No violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/002-draft-reply/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── draft_reply.schema.json
├── checklists/
│   └── requirements.md  # Quality checklist
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
src/
└── index.js             # MCPサーバー本体（draft_replyツールを追加）
```

**Structure Decision**: 既存の単一ファイル構成を維持。src/index.js に draft_reply ツールのハンドラーとZodスキーマを追加する。

## Implementation Approach

### ツールの責務

```
┌─────────────────────────────────────────────────────────────┐
│ Claude (推論)                                               │
│  - 下書きを分析                                             │
│  - タスクタイプを判定                                       │
│  - 構造化・添削を実行                                       │
│  - 変更ポイントを生成                                       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ draft_reply (MCPツール)                                     │
│  - 入力バリデーション（Zod）                                │
│  - 添削結果の構造化                                         │
│  - Before/After/Changes のフォーマット生成                  │
│  - コピー用テキストの出力                                   │
└─────────────────────────────────────────────────────────────┘
```

### ワークフロー

1. ユーザーが下書きテキストを提供
2. Claude が内容を分析（タスクタイプ判定）
3. Claude が添削を実行（CLAUDE.mdのルールに従う）
4. Claude が `draft_reply` を呼び出し、結果を構造化
5. ユーザーがコピー用テキストをSlackに貼り付け

## Artifacts Generated

| Artifact | Path | Description |
|----------|------|-------------|
| research.md | specs/002-draft-reply/research.md | 技術調査結果 |
| data-model.md | specs/002-draft-reply/data-model.md | エンティティ定義 |
| contracts/ | specs/002-draft-reply/contracts/ | ツールスキーマ（JSON Schema） |
| quickstart.md | specs/002-draft-reply/quickstart.md | 使用例とワークフロー |

## Next Steps

1. `/speckit.tasks` でタスクリストを生成
2. タスクに従って src/index.js に実装
3. 手動テストで動作確認
4. CLAUDE.md の「返信添削のルール」は既に定義済み
