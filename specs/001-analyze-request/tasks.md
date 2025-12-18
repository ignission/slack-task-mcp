# Tasks: analyze_request

**Feature**: 001-analyze-request
**Branch**: `001-analyze-request`
**Date**: 2025-12-18
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Overview

Slackスレッドの依頼を分析し、目的・不明点・確認メッセージ案・ネクストアクションを構造化して出力する `analyze_request` MCPツールを実装する。

## Task List

### Phase 1: Foundation - Zodスキーマ定義

| # | Task | File | Estimate | Dependencies |
|---|------|------|----------|--------------|
| 1.1 | UnclearPoint Zodスキーマを定義 | src/index.js | 5分 | - |
| 1.2 | NextAction Zodスキーマを定義 | src/index.js | 3分 | - |
| 1.3 | Priority Zodスキーマを定義 | src/index.js | 2分 | - |
| 1.4 | AnalysisResult Zodスキーマを定義 | src/index.js | 5分 | 1.1, 1.2, 1.3 |

### Phase 2: User Story P1 - 目的の明確化

| # | Task | File | Estimate | Dependencies |
|---|------|------|----------|--------------|
| 2.1 | analyze_request ツールのスケルトン作成 | src/index.js | 5分 | 1.4 |
| 2.2 | 入力バリデーション実装 | src/index.js | 5分 | 2.1 |
| 2.3 | 目的表示のフォーマット実装 | src/index.js | 5分 | 2.2 |

### Phase 3: User Story P2 - 不明点の洗い出し

| # | Task | File | Estimate | Dependencies |
|---|------|------|----------|--------------|
| 3.1 | 不明点リストのフォーマット実装 | src/index.js | 5分 | 2.3 |
| 3.2 | 影響度・選択肢の表示追加 | src/index.js | 5分 | 3.1 |

### Phase 4: User Story P3 - 確認メッセージ案

| # | Task | File | Estimate | Dependencies |
|---|------|------|----------|--------------|
| 4.1 | 確認メッセージ案の表示実装 | src/index.js | 5分 | 3.2 |
| 4.2 | 不明点なしの場合の分岐処理 | src/index.js | 3分 | 4.1 |

### Phase 5: User Story P4 - ネクストアクション

| # | Task | File | Estimate | Dependencies |
|---|------|------|----------|--------------|
| 5.1 | ネクストアクションの表示実装 | src/index.js | 5分 | 4.2 |
| 5.2 | 推定時間・理由の表示追加 | src/index.js | 3分 | 5.1 |

### Phase 6: Integration & Output

| # | Task | File | Estimate | Dependencies |
|---|------|------|----------|--------------|
| 6.1 | 優先度アイコン表示実装 | src/index.js | 3分 | 5.2 |
| 6.2 | 全体出力フォーマットの組み立て | src/index.js | 5分 | 6.1 |
| 6.3 | 成功/エラーレスポンスの整形 | src/index.js | 5分 | 6.2 |

### Phase 7: Testing & Polish

| # | Task | File | Estimate | Dependencies |
|---|------|------|----------|--------------|
| 7.1 | 手動テスト: 曖昧な依頼 | - | 5分 | 6.3 |
| 7.2 | 手動テスト: 明確な依頼 | - | 5分 | 7.1 |
| 7.3 | 手動テスト: 複数依頼混在 | - | 5分 | 7.2 |
| 7.4 | エッジケース確認 | - | 5分 | 7.3 |

---

## Task Details

### 1.1 UnclearPoint Zodスキーマを定義

```javascript
// src/index.js に追加
const UnclearPointSchema = z.object({
  question: z.string().max(200).describe("確認すべき質問"),
  impact: z.string().max(200).describe("この点が不明だと何が困るか"),
  suggested_options: z.array(z.string()).optional().describe("想定される選択肢"),
});
```

### 1.2 NextAction Zodスキーマを定義

```javascript
const NextActionSchema = z.object({
  action: z.string().max(200).describe("具体的なアクション内容"),
  estimated_time: z.number().min(1).max(30).describe("推定所要時間（分）"),
  reason: z.string().optional().describe("なぜこれが最初のアクションなのか"),
});
```

### 1.3 Priority Zodスキーマを定義

```javascript
const PrioritySchema = z.enum(["high", "medium", "low"]);
```

### 1.4 AnalysisResult Zodスキーマを定義

```javascript
const AnalysisResultSchema = z.object({
  purpose: z.string().max(500).describe("依頼の目的（1文で言語化）"),
  deliverable: z.string().nullable().optional().describe("成果物"),
  deadline: z.string().nullable().optional().describe("期限"),
  unclear_points: z.array(UnclearPointSchema).describe("不明点のリスト"),
  confirmation_message: z.string().nullable().optional().describe("確認メッセージ案"),
  next_action: NextActionSchema.describe("ネクストアクション"),
  priority: PrioritySchema.describe("優先度"),
});
```

### 2.1 analyze_request ツールのスケルトン作成

```javascript
// server.tool() の形式で追加
server.tool(
  "analyze_request",
  "Slackスレッドの依頼を分析し、目的・不明点・確認メッセージ案・ネクストアクションを構造化して返す",
  {
    thread_content: z.string().describe("分析対象のSlackスレッド内容"),
    thread_url: z.string().optional().describe("SlackスレッドのURL（参照用）"),
    analysis: AnalysisResultSchema.describe("Claudeが生成した分析結果"),
  },
  async ({ thread_content, thread_url, analysis }) => {
    // 実装
  }
);
```

### 6.2 全体出力フォーマットの組み立て

期待される出力形式:

```markdown
## 依頼の分析

### 把握した内容
- **目的**: {purpose}
- **成果物**: {deliverable}
- **期限**: {deadline}
- **優先度**: {priority_icon} {priority_label}

### 不明点
- ❓ **{question}**
  - 影響: {impact}
  - 選択肢: {options}

### 確認メッセージ案
「{confirmation_message}」

### ネクストアクション
📌 **{action}（{estimated_time}分）**
   理由: {reason}
```

---

## Progress Tracking

| Phase | Status | Completed |
|-------|--------|-----------|
| Phase 1: Foundation | ⬜ Pending | 0/4 |
| Phase 2: P1 - 目的明確化 | ⬜ Pending | 0/3 |
| Phase 3: P2 - 不明点 | ⬜ Pending | 0/2 |
| Phase 4: P3 - 確認メッセージ | ⬜ Pending | 0/2 |
| Phase 5: P4 - ネクストアクション | ⬜ Pending | 0/2 |
| Phase 6: Integration | ⬜ Pending | 0/3 |
| Phase 7: Testing | ⬜ Pending | 0/4 |

**Total**: 0/20 tasks completed

---

## Acceptance Criteria

- [ ] `analyze_request` ツールが Claude Desktop / Claude Code で認識される
- [ ] 分析結果が構造化されたMarkdown形式で出力される
- [ ] 不明点がある場合は確認メッセージ案が提示される
- [ ] ネクストアクションが5分以内の具体的な行動として提示される
- [ ] 優先度がアイコン付きで表示される

## Notes

- 分析ロジックはClaudeが担当、ツールは構造化と表示フォーマットのみ
- CLAUDE.md の「依頼分析のルール」がClaudeへのガイダンスとなる
- テストはMCP Inspector または Claude Desktop で手動実行
