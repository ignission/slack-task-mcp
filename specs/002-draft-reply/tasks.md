# Tasks: draft_reply

**Feature**: 002-draft-reply
**Branch**: `002-draft-reply`
**Date**: 2025-12-18
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Overview

返信の下書きを添削し、「結論→根拠→アクション」の構造に整理する `draft_reply` MCPツールを実装する。

## Task List

### Phase 1: Foundation - Zodスキーマ定義

| # | Task | File | Estimate | Dependencies |
|---|------|------|----------|--------------|
| 1.1 | TaskType/Tone/ChangeType 列挙型を定義 | src/index.js | 3分 | - |
| 1.2 | Change Zodスキーマを定義 | src/index.js | 3分 | 1.1 |
| 1.3 | ReplyStructure Zodスキーマを定義 | src/index.js | 3分 | - |
| 1.4 | EditedReply Zodスキーマを定義 | src/index.js | 5分 | 1.1, 1.2, 1.3 |

### Phase 2: Tool Implementation

| # | Task | File | Estimate | Dependencies |
|---|------|------|----------|--------------|
| 2.1 | draft_reply ツールのスケルトン作成 | src/index.js | 5分 | 1.4 |
| 2.2 | 入力バリデーション実装 | src/index.js | 5分 | 2.1 |

### Phase 3: Output Formatting

| # | Task | File | Estimate | Dependencies |
|---|------|------|----------|--------------|
| 3.1 | TaskType/Tone ラベル変換関数 | src/index.js | 3分 | 2.2 |
| 3.2 | ChangeType ラベル変換関数 | src/index.js | 3分 | 2.2 |
| 3.3 | Before/After 表示フォーマット | src/index.js | 5分 | 3.1 |
| 3.4 | 構造（結論/根拠/アクション）表示 | src/index.js | 5分 | 3.3 |
| 3.5 | 変更ポイントリスト表示 | src/index.js | 5分 | 3.2, 3.4 |
| 3.6 | コピー用テキスト出力 | src/index.js | 3分 | 3.5 |

### Phase 4: Integration

| # | Task | File | Estimate | Dependencies |
|---|------|------|----------|--------------|
| 4.1 | 全体出力フォーマットの組み立て | src/index.js | 5分 | 3.6 |
| 4.2 | エラーレスポンスの整形 | src/index.js | 3分 | 4.1 |

### Phase 5: Testing

| # | Task | File | Estimate | Dependencies |
|---|------|------|----------|--------------|
| 5.1 | 手動テスト: 報告系 | - | 5分 | 4.2 |
| 5.2 | 手動テスト: 確認系 | - | 5分 | 5.1 |
| 5.3 | 手動テスト: 依頼系 | - | 5分 | 5.2 |
| 5.4 | 手動テスト: カジュアルトーン | - | 5分 | 5.3 |

---

## Task Details

### 1.1 TaskType/Tone/ChangeType 列挙型を定義

```javascript
const TaskTypeSchema = z.enum(["report", "confirm", "request"]);
const ToneSchema = z.enum(["formal", "casual"]);
const ChangeTypeSchema = z.enum(["structure", "simplify", "clarify", "tone", "logic", "add"]);
```

### 1.2 Change Zodスキーマを定義

```javascript
const ChangeSchema = z.object({
  type: ChangeTypeSchema.describe("変更の種類"),
  description: z.string().max(200).describe("変更内容の説明"),
  reason: z.string().max(200).describe("変更の理由"),
});
```

### 1.3 ReplyStructure Zodスキーマを定義

```javascript
const ReplyStructureSchema = z.object({
  conclusion: z.string().max(500).describe("結論（何を伝えたいか）"),
  reasoning: z.string().nullable().optional().describe("根拠（なぜそう言えるか）"),
  action: z.string().nullable().optional().describe("アクション"),
});
```

### 1.4 EditedReply Zodスキーマを定義

```javascript
const EditedReplySchema = z.object({
  task_type: TaskTypeSchema.describe("タスクタイプ"),
  after: z.string().describe("添削後のテキスト"),
  structure: ReplyStructureSchema.describe("構造化された返信"),
  changes: z.array(ChangeSchema).describe("変更ポイント"),
  tone: ToneSchema.describe("適用されたトーン"),
});
```

### 2.1 draft_reply ツールのスケルトン作成

```javascript
server.tool(
  "draft_reply",
  "返信の下書きを添削し、結論→根拠→アクションの構造に整理して返す",
  {
    draft_text: z.string().max(2000).describe("添削対象の下書きテキスト"),
    task_type: TaskTypeSchema.optional().describe("タスクタイプ（省略時は自動判定）"),
    tone: ToneSchema.optional().describe("トーン（デフォルト: formal）"),
    thread_content: z.string().optional().describe("文脈用のスレッド内容"),
    edited_reply: EditedReplySchema.describe("Claudeが生成した添削結果"),
  },
  async ({ draft_text, task_type, tone, thread_content, edited_reply }) => {
    // 実装
  }
);
```

### 4.1 全体出力フォーマットの組み立て

期待される出力形式:

```markdown
## 添削結果

### Before
「{draft_text}」

### After
「{after}」

### 構造
- **結論**: {conclusion}
- **根拠**: {reasoning}
- **アクション**: {action}

### 変更ポイント
1. **{type_label}**: {description}
   - 理由: {reason}

---
📋 **コピー用**
{after}
```

---

## Progress Tracking

| Phase | Status | Completed |
|-------|--------|-----------|
| Phase 1: Foundation | ⬜ Pending | 0/4 |
| Phase 2: Tool Implementation | ⬜ Pending | 0/2 |
| Phase 3: Output Formatting | ⬜ Pending | 0/6 |
| Phase 4: Integration | ⬜ Pending | 0/2 |
| Phase 5: Testing | ⬜ Pending | 0/4 |

**Total**: 0/18 tasks completed

---

## Acceptance Criteria

- [ ] `draft_reply` ツールが Claude Desktop / Claude Code で認識される
- [ ] Before/After形式で添削結果が表示される
- [ ] 構造（結論/根拠/アクション）が明示される
- [ ] 変更ポイントと理由が具体的に表示される
- [ ] コピー用テキストがそのまま貼り付けられる

## Notes

- 添削ロジックはClaudeが担当、ツールは構造化と表示フォーマットのみ
- CLAUDE.md の「返信添削のルール」がClaudeへのガイダンスとなる
- テストはMCP Inspector または Claude Desktop で手動実行
