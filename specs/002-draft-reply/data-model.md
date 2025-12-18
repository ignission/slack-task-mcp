# Data Model: draft_reply

**Feature**: 002-draft-reply
**Date**: 2025-12-18

## Entities

### EditedReply

添削結果を格納するメインエンティティ。

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| task_type | TaskType | Yes | 判定されたタスクタイプ |
| before | string | Yes | 元の下書きテキスト |
| after | string | Yes | 添削後のテキスト |
| structure | ReplyStructure | Yes | 構造化された返信 |
| changes | Change[] | Yes | 変更ポイントのリスト |
| tone | Tone | Yes | 適用されたトーン |

### ReplyStructure

構造化された返信を表すエンティティ。

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| conclusion | string | Yes | 結論（何を伝えたいか） |
| reasoning | string | No | 根拠（なぜそう言えるか） |
| action | string | No | アクション（何をしてほしいか/自分が何をするか） |

### Change

変更ポイントを表すエンティティ。

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | ChangeType | Yes | 変更の種類 |
| description | string | Yes | 変更内容の説明 |
| reason | string | Yes | 変更の理由 |

### TaskType

タスクタイプを表す列挙型。

| Value | Description | Template Focus |
|-------|-------------|----------------|
| report | 報告系 | 結論→詳細→次のアクション |
| confirm | 確認系 | 確認事項→背景→選択肢 |
| request | 依頼系 | 依頼内容→理由→期限 |

### Tone

トーンを表す列挙型。

| Value | Description |
|-------|-------------|
| formal | 丁寧な表現（です/ます調） |
| casual | カジュアルな表現 |

### ChangeType

変更種類を表す列挙型。

| Value | Description |
|-------|-------------|
| structure | 構造の変更（順序入れ替えなど） |
| simplify | 簡潔化（冗長表現の削除） |
| clarify | 明確化（曖昧な表現の具体化） |
| tone | トーン調整 |
| logic | 論理補強（飛躍の修正） |
| add | 追加（不足情報の補完） |

## Validation Rules

### EditedReply

- `before`: 空文字不可、最大2000文字
- `after`: 空文字不可、beforeの2倍以下
- `changes`: 配列（空配列許可）

### ReplyStructure

- `conclusion`: 空文字不可、最大500文字
- `reasoning`: 最大500文字（省略可）
- `action`: 最大300文字（省略可）

### Change

- `description`: 空文字不可、最大200文字
- `reason`: 空文字不可、最大200文字

## Output Format

ツール出力のMarkdown形式:

```markdown
## 添削結果

### Before
「{before}」

### After
「{after}」

### 構造
- **結論**: {conclusion}
- **根拠**: {reasoning}
- **アクション**: {action}

### 変更ポイント
1. **{type}**: {description}
   - 理由: {reason}

---
📋 **コピー用**
{after}
```
