# Tasks Document: Slack Search

## 実装タスク

- [x] 1. Zodスキーマ定義を追加
  - File: src/index.js
  - SearchParamsSchema を定義（query, count, channel）
  - 既存のスキーマ定義パターンに従う
  - Purpose: 検索パラメータの型安全性を確保
  - _Leverage: 既存のZodスキーマ（AnalysisResultSchema等）_
  - _Requirements: 1, 2, 3_

- [x] 2. searchSlackMessages関数を実装
  - File: src/index.js
  - slackClient.search.messages APIを呼び出し
  - チャンネル指定時はクエリに `in:#channel` を追加
  - 結果から必要な情報を抽出（user, text, timestamp, channel, permalink）
  - Purpose: Slack APIとの通信を担当
  - _Leverage: slackClient, getUserInfo()_
  - _Requirements: 1, 3_

- [x] 3. formatSearchResults関数を実装
  - File: src/index.js
  - 検索結果をMarkdown形式に変換
  - 各メッセージにpermalink（get_slack_thread用）を含める
  - 結果が制限を超えた場合の表示（「他にN件の結果があります」）
  - Purpose: 読みやすい出力を生成
  - _Leverage: formatMessages()のパターン_
  - _Requirements: 1, 2, 4_

- [x] 4. search_slackツールを登録
  - File: src/index.js
  - server.tool() でツールを登録
  - エラーハンドリング（未認証、search:readスコープ不足、レート制限）
  - 結果0件時のメッセージ
  - Purpose: MCPツールとして公開
  - _Leverage: 既存のserver.tool()パターン_
  - _Requirements: 1, 2, 3, 4_

- [x] 5. CLAUDE.mdにツール説明を追加
  - File: CLAUDE.md
  - search_slackツールの使用例を追加
  - 検索構文の説明（from:@user, in:#channel等）
  - Purpose: ユーザーへのドキュメント提供
  - _Requirements: 1_

- [x] 6. 動作確認
  - 基本的な検索クエリのテスト
  - チャンネル絞り込みのテスト
  - 検索結果からget_slack_threadへの連携テスト
  - エラーケースの確認（0件、未認証）
  - Purpose: 実装の品質保証
  - _Requirements: All_

## 依存関係

```
1 → 2 → 3 → 4 → 5 → 6
     ↘     ↗
       並行可
```

- タスク1（スキーマ）はタスク2, 4の前提
- タスク2, 3は並行作業可能
- タスク4はタスク2, 3の完了後
- タスク5はタスク4と並行可能
- タスク6は全タスク完了後

## 見積もり

| タスク | 見積もり |
|--------|----------|
| 1. Zodスキーマ定義 | 5分 |
| 2. searchSlackMessages関数 | 15分 |
| 3. formatSearchResults関数 | 10分 |
| 4. search_slackツール登録 | 10分 |
| 5. CLAUDE.md更新 | 5分 |
| 6. 動作確認 | 15分 |
| **合計** | **60分** |
