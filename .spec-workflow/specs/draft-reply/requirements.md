# Requirements: draft_reply

## Introduction

Slackへの返信メッセージの下書きを添削し、ロジカルに構造化するMCPツール。「結論→根拠→アクション」の形式に整理し、相手に伝わりやすい返信を生成する。

## Problem Statement

Slackで返信を書くとき、以下の課題がある：

- 何から書き始めればいいかわからない
- 書いたけど論理的に伝わるか不安
- 冗長になりがち、要点がぼやける
- タスクタイプ（報告/確認/依頼）ごとの適切な構造がわからない

## Alignment with Product Vision

```
「どう返せばいい？」で時間かかる → 返信メッセージの添削・構造化
```

## Requirements

### Requirement 1: 基本的な添削 (P1)

**User Story:** ユーザーとして、下書きを添削してもらい、相手に伝わりやすい返信を書きたい。

#### Acceptance Criteria

1. WHEN 下書きテキストを入力 THEN システム SHALL 「結論→根拠→アクション」の構造に整理する
2. WHEN 添削完了 THEN システム SHALL Before/After形式で変更点を表示する
3. IF 下書きが空 THEN システム SHALL エラーメッセージを返す

### Requirement 2: タスクタイプ別テンプレート (P2)

**User Story:** ユーザーとして、タスクタイプに応じた構造を選び、状況に適した返信形式で書きたい。

#### Acceptance Criteria

1. WHEN タスクタイプを指定 THEN システム SHALL 報告系/確認系/依頼系に応じたテンプレートを適用する
2. IF タスクタイプを指定しない THEN システム SHALL 自動判定する

### Requirement 3: 改善ポイントの提示 (P3)

**User Story:** ユーザーとして、具体的な改善ポイントを知り、次回から自分で書けるようになりたい。

#### Acceptance Criteria

1. WHEN 添削完了 THEN システム SHALL 変更箇所と理由を明示する
2. IF 論理の飛躍や抜け漏れがある THEN システム SHALL 指摘する

### Requirement 4: 文脈を考慮した添削 (P4)

**User Story:** ユーザーとして、スレッドの文脈を考慮した添削がほしい。

#### Acceptance Criteria

1. IF thread_content が提供された THEN システム SHALL スレッドの相手・トーンを考慮した添削を行う
2. IF thread_content がない THEN システム SHALL 汎用的な添削を行う

## Non-Functional Requirements

### Performance
- レスポンス5秒以内

### Limits
- 入力: 最大2000文字
- 出力: 入力の2倍以下

### Usability
- コピー用テキストを出力し、そのままSlackに貼り付けられる
- トーン調整（formal/casual）が可能

## Edge Cases

- **既に構造化されている**: 大きな変更不要と判断し、微調整のみ
- **感情的な内容**: 攻撃的な表現は中立的に変換し、理由を明示

## Task Types

| Type | Description | Template |
|------|-------------|----------|
| report | 報告系 | 【結論】→【詳細】→【次のアクション】 |
| confirm | 確認系 | 【確認したいこと】→【背景】→【質問】 |
| request | 依頼系 | 【お願い】→【背景】→【期限】 |

## Status

✅ **実装完了**
