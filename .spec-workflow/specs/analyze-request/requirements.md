# Requirements: analyze_request

## Introduction

Slackスレッドの依頼を分析し、目的・不明点・確認メッセージ案・ネクストアクションを構造化して出力するMCPツール。

ADHDの特性を持つユーザーが、Slackで受け取った曖昧な依頼に対して「結局何を求められているのか」を明確に理解できるようにする。

## Alignment with Product Vision

**解決する課題**: メンションがたまると、どこから手を付けていいか迷う

```
メンション来た
    ↓
「何求められてる？」が曖昧で固まる → 目的の明確化
    ↓
「何聞けばいい？」がわからない   → 不明点の洗い出し + 確認メッセージ案
    ↓
「次何する？」で迷う            → ネクストアクション提示
```

## Requirements

### Requirement 1: 依頼の目的を明確化する (P1)

**User Story:** ADHDユーザーとして、曖昧な依頼の「結局何を求められているのか」を明確に理解したい。

#### Acceptance Criteria

1. WHEN Slackスレッドを入力 THEN システム SHALL 目的・成果物・期限を明文化して出力する
2. IF 複数の話題が混在 THEN システム SHALL 最も重要な依頼を特定し、目的を明確化する
3. IF 目的・成果物・期限が全て記載 THEN システム SHALL 不明点なしで分析結果を出力する

### Requirement 2: 不明点を洗い出す (P2)

**User Story:** ADHDユーザーとして、「何を聞けばいいかわからない」状態を解消したい。

#### Acceptance Criteria

1. WHEN 曖昧な依頼を分析 THEN システム SHALL 「確認しないと手戻りになる点」をリストアップする
2. WHEN 技術的な詳細が不足 THEN システム SHALL 技術的な確認事項を洗い出す
3. IF 完全に明確な依頼 THEN システム SHALL 「不明点なし」と出力する

### Requirement 3: 確認メッセージ案を生成する (P3)

**User Story:** ADHDユーザーとして、Slackで質問する文面を考える手間を省きたい。

#### Acceptance Criteria

1. WHEN 不明点がある THEN システム SHALL そのままSlackに貼り付けられる確認メッセージ案を生成する
2. IF 複数の不明点がある THEN システム SHALL まとめて確認できる1つのメッセージ案を生成する
3. IF 不明点がない THEN システム SHALL 確認メッセージを生成しない

### Requirement 4: ネクストアクションを提示する (P4)

**User Story:** ADHDユーザーとして、「次に何をすればいいか」を明確にし、すぐに動けるようにしたい。

#### Acceptance Criteria

1. WHEN 不明点がある依頼 THEN システム SHALL 「まず〇〇さんに確認メッセージを送る（2分）」のようなアクションを提示する
2. WHEN 不明点がない依頼 THEN システム SHALL 「〇〇を開いてタイトルを書く（5分）」のような作業開始アクションを提示する
3. WHEN 複雑な依頼 THEN システム SHALL 最も簡単で効果的なアクションを最初に提示する

## Non-Functional Requirements

### Code Architecture
- **Single Responsibility**: analyze_request ツールは分析結果の構造化のみを担当
- **Modular Design**: 既存のsrc/index.jsに追加
- **Clear Interfaces**: Zodでスキーマを明確に定義

### Performance
- レスポンス5秒以内

### Usability
- 分析結果は構造化されたMarkdown形式で出力
- 優先度はアイコン付きで表示（🔴高/🟡中/🟢低）

## Edge Cases

- スレッドが空、または依頼が含まれていない → 「依頼が見つかりませんでした」と出力
- 複数人から異なる依頼がある → 各依頼を分けて分析し、優先度を判定
- 日本語以外の言語が混在 → 日本語で分析結果を出力
- 曖昧な表現（「なるはや」「いい感じに」など） → 具体的な確認事項として洗い出す

## Status

✅ **実装完了**
