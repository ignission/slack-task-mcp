# Design: analyze_request

## Technical Context

- **Language/Version**: Node.js (ES Modules)
- **Primary Dependencies**: @modelcontextprotocol/sdk, zod
- **Storage**: ローカルファイル (`~/.slack-task-mcp/tasks.json`)
- **Target Platform**: Claude Code / Claude Desktop

## Architecture

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

## Data Model

### AnalysisResult

分析結果を格納するメインエンティティ。

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| purpose | string | Yes | 依頼の目的（1文で言語化） |
| deliverable | string | No | 成果物（不明な場合は null） |
| deadline | string | No | 期限（不明な場合は null） |
| unclear_points | UnclearPoint[] | Yes | 不明点のリスト（空配列可） |
| confirmation_message | string | No | 確認メッセージ案 |
| next_action | NextAction | Yes | ネクストアクション |
| priority | Priority | Yes | 優先度 |

### UnclearPoint

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| question | string | Yes | 確認すべき質問（最大200文字） |
| impact | string | Yes | この点が不明だと何が困るか（最大200文字） |
| suggested_options | string[] | No | 想定される選択肢 |

### NextAction

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| action | string | Yes | 具体的なアクション内容（最大200文字） |
| estimated_time | number | Yes | 推定所要時間（1〜30分） |
| reason | string | No | なぜこれが最初のアクションなのか |

### Priority

| Value | Description | Criteria |
|-------|-------------|----------|
| high | 🔴 高優先度 | 他の人をブロックしている、期限が近い |
| medium | 🟡 中優先度 | 今日〜今週中にやるべき |
| low | 🟢 低優先度 | いつでもいい |

## Output Format

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

## Zod Schemas

```javascript
const UnclearPointSchema = z.object({
  question: z.string().max(200),
  impact: z.string().max(200),
  suggested_options: z.array(z.string()).optional(),
});

const NextActionSchema = z.object({
  action: z.string().max(200),
  estimated_time: z.number().min(1).max(30),
  reason: z.string().optional(),
});

const PrioritySchema = z.enum(["high", "medium", "low"]);

const AnalysisResultSchema = z.object({
  purpose: z.string().max(500),
  deliverable: z.string().nullable().optional(),
  deadline: z.string().nullable().optional(),
  unclear_points: z.array(UnclearPointSchema),
  confirmation_message: z.string().nullable().optional(),
  next_action: NextActionSchema,
  priority: PrioritySchema,
});
```

## Status

✅ **実装完了**
