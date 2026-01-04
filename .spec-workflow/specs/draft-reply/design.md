# Design: draft_reply

## Technical Context

- **Language/Version**: Node.js (ES Modules)
- **Primary Dependencies**: @modelcontextprotocol/sdk, zod
- **Storage**: なし（結果は返すのみ、永続化しない）
- **Target Platform**: Claude Code / Claude Desktop

## Architecture

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

## Data Model

### TaskType

| Value | Description |
|-------|-------------|
| report | 報告系 |
| confirm | 確認系 |
| request | 依頼系 |

### Tone

| Value | Description |
|-------|-------------|
| formal | 丁寧 |
| casual | カジュアル |

### ChangeType

| Value | Description |
|-------|-------------|
| structure | 構造の変更 |
| simplify | 簡潔化 |
| clarify | 明確化 |
| tone | トーン調整 |
| logic | 論理の補強 |
| add | 追加 |

### ReplyStructure

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| conclusion | string | Yes | 結論（何を伝えたいか）最大500文字 |
| reasoning | string | No | 根拠（なぜそう言えるか） |
| action | string | No | アクション |

### Change

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | ChangeType | Yes | 変更の種類 |
| description | string | Yes | 変更内容の説明（最大200文字） |
| reason | string | Yes | 変更の理由（最大200文字） |

### EditedReply

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| task_type | TaskType | Yes | タスクタイプ |
| after | string | Yes | 添削後のテキスト |
| structure | ReplyStructure | Yes | 構造化された返信 |
| changes | Change[] | Yes | 変更ポイント |
| tone | Tone | Yes | 適用されたトーン |

## Output Format

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

## Zod Schemas

```javascript
const TaskTypeSchema = z.enum(["report", "confirm", "request"]);
const ToneSchema = z.enum(["formal", "casual"]);
const ChangeTypeSchema = z.enum(["structure", "simplify", "clarify", "tone", "logic", "add"]);

const ChangeSchema = z.object({
  type: ChangeTypeSchema,
  description: z.string().max(200),
  reason: z.string().max(200),
});

const ReplyStructureSchema = z.object({
  conclusion: z.string().max(500),
  reasoning: z.string().nullable().optional(),
  action: z.string().nullable().optional(),
});

const EditedReplySchema = z.object({
  task_type: TaskTypeSchema,
  after: z.string(),
  structure: ReplyStructureSchema,
  changes: z.array(ChangeSchema),
  tone: ToneSchema,
});
```

## Status

✅ **実装完了**
