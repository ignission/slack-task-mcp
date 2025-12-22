# Requirements Document: Slack Search

## Introduction

Slack内のメッセージを検索する `search_slack` ツールを追加します。

ADHDユーザーが「あの話どうなったっけ」と思ったときに、Slackを開かずにClaudeに聞くだけで過去のやり取りを素早く見つけられるようにします。これにより、ワーキングメモリの負担を軽減し、コンテキストスイッチを減らします。

## Alignment with Product Vision

**解決する課題**: メンションがたまると、どこから手を付けていいか迷う

このSlack検索機能は以下のワークフローを強化します：
- 過去の類似依頼を検索して対応方法を参考にできる
- スレッドURLがなくても「〇〇さんとの会話」「△△の件」で検索できる
- タスクの文脈を思い出すためにSlackを開く必要がなくなる

## Requirements

### Requirement 1: キーワードでSlackメッセージを検索

**User Story:** ADHDユーザーとして、キーワードでSlackのメッセージを検索したい。Slackを開いて探し回る手間を省き、集中を途切れさせないため。

#### Acceptance Criteria

1. WHEN ユーザーがキーワードを指定 THEN システム SHALL Slack search.messages APIを呼び出して結果を返す
2. IF 検索結果が0件 THEN システム SHALL 「該当するメッセージはありません」と表示する
3. WHEN 検索結果がある THEN システム SHALL 各メッセージの発言者・日時・内容・スレッドURLを表示する

### Requirement 2: 検索結果の件数制限

**User Story:** ADHDユーザーとして、検索結果が多すぎて圧倒されたくない。最も関連性の高い結果だけを見たい。

#### Acceptance Criteria

1. WHEN 検索実行 THEN システム SHALL デフォルトで最大10件の結果を返す
2. IF ユーザーが件数を指定 THEN システム SHALL 指定された件数（1〜100）を返す
3. WHEN 結果が制限を超える THEN システム SHALL 「他にN件の結果があります」と表示する

### Requirement 3: チャンネル/DMでの絞り込み

**User Story:** ADHDユーザーとして、特定のチャンネルやDMに絞って検索したい。ノイズを減らして目的の情報に早く辿り着くため。

#### Acceptance Criteria

1. IF ユーザーがチャンネル名を指定 THEN システム SHALL そのチャンネル内のみ検索する
2. WHEN チャンネル指定なし THEN システム SHALL ユーザーがアクセス可能な全チャンネル/DMを検索する

### Requirement 4: 検索結果からスレッド取得への連携

**User Story:** ADHDユーザーとして、検索で見つけたメッセージのスレッド全体を読みたい。文脈を理解してタスクを進めるため。

#### Acceptance Criteria

1. WHEN 検索結果を表示 THEN システム SHALL 各メッセージにスレッドURL（permalink）を含める
2. IF ユーザーがスレッドURLを指定 THEN システム SHALL 既存の get_slack_thread ツールでスレッド全体を取得できる

## Non-Functional Requirements

### Code Architecture and Modularity
- **Single Responsibility Principle**: search_slack ツールは検索のみを担当
- **Modular Design**: 既存のSlackClient初期化ロジックを再利用
- **Clear Interfaces**: 検索パラメータと結果のスキーマを明確に定義

### Performance
- Slack APIのレート制限（Tier 2: 20回/分）を考慮
- 検索結果のページネーションは初回リリースでは対応しない（件数制限で対応）

### Security
- User Token のスコープに `search:read` が必要
- 検索結果はユーザーがアクセス可能なメッセージのみ

### Reliability
- Slack API エラー時は適切なエラーメッセージを返す
- トークン未設定時は認証手順を案内

### Usability
- 検索クエリはSlackの検索構文をそのまま使用可能（`from:@user`, `in:#channel` など）
- 結果は新しい順にソート
