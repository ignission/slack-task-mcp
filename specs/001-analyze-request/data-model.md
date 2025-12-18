# Data Model: analyze_request

**Feature**: 001-analyze-request
**Date**: 2025-12-18

## Entities

### AnalysisResult

分析結果を格納するメインエンティティ。

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| purpose | string | Yes | 依頼の目的（1文で言語化） |
| deliverable | string | No | 成果物（不明な場合は null） |
| deadline | string | No | 期限（不明な場合は null） |
| unclear_points | UnclearPoint[] | Yes | 不明点のリスト（空配列可） |
| confirmation_message | string | No | 確認メッセージ案（不明点がない場合は null） |
| next_action | NextAction | Yes | ネクストアクション |
| priority | Priority | Yes | 優先度 |

### UnclearPoint

不明点を表すエンティティ。

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| question | string | Yes | 確認すべき質問 |
| impact | string | Yes | この点が不明だと何が困るか |
| suggested_options | string[] | No | 想定される選択肢 |

### NextAction

ネクストアクションを表すエンティティ。

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| action | string | Yes | 具体的なアクション内容 |
| estimated_time | number | Yes | 推定所要時間（分） |
| reason | string | No | なぜこれが最初のアクションなのか |

### Priority

優先度を表す列挙型。

| Value | Description | Criteria |
|-------|-------------|----------|
| high | 高優先度 | 他の人をブロックしている、期限が近い |
| medium | 中優先度 | 今日〜今週中にやるべき |
| low | 低優先度 | いつでもいい |

## Relationships

```
Task (既存)
  └── analysis: AnalysisResult (1:1)
        ├── unclear_points: UnclearPoint[] (1:N)
        └── next_action: NextAction (1:1)
```

## Validation Rules

### AnalysisResult

- `purpose`: 空文字不可、最大500文字
- `unclear_points`: 配列（空配列許可）
- `priority`: "high" | "medium" | "low" のいずれか
- `confirmation_message`: unclear_points が空でない場合は必須

### UnclearPoint

- `question`: 空文字不可、最大200文字
- `impact`: 空文字不可、最大200文字
- `suggested_options`: 各要素は空文字不可

### NextAction

- `action`: 空文字不可、最大200文字
- `estimated_time`: 1以上、30以下（5分以内を推奨だが、最大30分まで許容）

## State Transitions

AnalysisResult は状態を持たない（作成後は不変）。

タスクとの関連:
1. `analyze_request` 実行 → AnalysisResult 作成
2. `save_task` 実行 → Task に AnalysisResult を紐づけて保存
3. タスク更新時も AnalysisResult は変更されない（新しい分析が必要な場合は再実行）

## Storage Format

`~/.slack-task-mcp/tasks.json` での保存形式:

```json
{
  "tasks": [
    {
      "id": "task_001",
      "title": "週次レポート作成",
      "thread_url": "https://xxx.slack.com/archives/C12345/p1234567890",
      "thread_content": "...",
      "analysis": {
        "purpose": "先週の進捗をまとめた週次レポートを作成し、チームに共有する",
        "deliverable": "週次レポート（ドキュメント）",
        "deadline": "金曜日 17:00",
        "unclear_points": [
          {
            "question": "フォーマットは決まっていますか？",
            "impact": "フォーマットが異なると作り直しになる可能性がある",
            "suggested_options": ["前回と同じ形式", "新しいテンプレートを使用", "自由形式"]
          }
        ],
        "confirmation_message": "週次レポートについて確認させてください。フォーマットは前回と同じ形式でよろしいでしょうか？",
        "next_action": {
          "action": "山田さんにフォーマットについて確認メッセージを送る",
          "estimated_time": 2,
          "reason": "フォーマットが決まらないと作業を始められないため"
        },
        "priority": "medium"
      },
      "steps": [
        { "id": 1, "description": "フォーマットを確認する", "completed": false },
        { "id": 2, "description": "先週のSlackを振り返る", "completed": false }
      ],
      "created_at": "2025-12-18T10:00:00Z",
      "updated_at": "2025-12-18T10:00:00Z"
    }
  ]
}
```
