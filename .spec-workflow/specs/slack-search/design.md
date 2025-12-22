# Design Document: Slack Search

## Overview

`search_slack` ツールをMCPサーバーに追加し、Slackメッセージのキーワード検索機能を提供する。既存の `get_slack_thread` との連携により、「検索 → スレッド取得 → 分析」のワークフローを実現する。

## Steering Document Alignment

### Technical Standards (tech.md)

- **Zodスキーマ活用**: 検索パラメータと結果の型定義にZodを使用
- **Markdown出力**: 検索結果は読みやすいMarkdown形式で返却
- **シンプルさ優先**: 外部DBを使わず、Slack APIへの直接クエリのみ
- **MCP準拠**: stdio トランスポート、テキストコンテンツレスポンス

### Project Structure (structure.md)

- **単一ファイル**: `src/index.js` に追加（既存パターンに従う）
- **命名規則**: ツール名は snake_case（`search_slack`）
- **スキーマ命名**: PascalCase（`SearchResultSchema`）

## Code Reuse Analysis

### Existing Components to Leverage

- **slackClient (WebClient)**: 既存のSlack APIクライアントを再利用
- **loadCredentials()**: OAuth認証情報の読み込み
- **getUserInfo()**: ユーザー名解決（検索結果の発言者表示用）
- **formatMessages()のパターン**: 日時フォーマット、ユーザー名キャッシュ

### Integration Points

- **get_slack_thread**: 検索結果のpermalinkから直接スレッド取得可能
- **analyze_request**: 検索で見つけたスレッドを分析に回せる

## Architecture

```
search_slack ツール
    │
    ├── 入力: キーワード、件数制限、チャンネル（任意）
    │
    ├── Slack API: search.messages
    │   └── User Token (search:read スコープ必要)
    │
    └── 出力: Markdown形式の検索結果
        └── 各メッセージにpermalink（get_slack_threadで使用可能）
```

### Modular Design Principles

- **Single File Responsibility**: 検索ロジックは `src/index.js` 内に集約（既存パターン）
- **関数分離**:
  - `searchSlackMessages()`: API呼び出し
  - `formatSearchResults()`: 結果のMarkdown化

## Components and Interfaces

### search_slack ツール

- **Purpose:** Slackメッセージをキーワードで検索
- **Interfaces:**
  ```
  入力:
    - query: string (必須) - 検索クエリ（Slack検索構文対応）
    - count: number (任意) - 最大件数（デフォルト10、上限100）
    - channel: string (任意) - チャンネル名で絞り込み

  出力:
    - Markdown形式の検索結果テキスト
  ```
- **Dependencies:** slackClient, getUserInfo
- **Reuses:** 日時フォーマットパターン、ユーザー名キャッシュ

### searchSlackMessages 関数

- **Purpose:** Slack search.messages APIを呼び出し
- **Interfaces:**
  ```javascript
  async function searchSlackMessages(query, count = 10)
    → { messages: [], total: number }
  ```
- **Dependencies:** slackClient

### formatSearchResults 関数

- **Purpose:** API結果をMarkdown形式に変換
- **Interfaces:**
  ```javascript
  function formatSearchResults(results, total)
    → string (Markdown)
  ```
- **Dependencies:** なし（純粋関数）

## Data Models

### SearchParams (入力スキーマ)

```javascript
const SearchParamsSchema = z.object({
  query: z.string().min(1).describe("検索クエリ（Slack検索構文対応: from:@user, in:#channel等）"),
  count: z.number().min(1).max(100).optional().describe("最大件数（デフォルト10）"),
  channel: z.string().optional().describe("チャンネル名で絞り込み"),
});
```

### SearchResult (内部データ構造)

```javascript
// Slack API search.messages レスポンスから抽出
{
  user: string,      // 発言者名（解決済み）
  text: string,      // メッセージ本文
  timestamp: string, // 日時（フォーマット済み）
  channel: string,   // チャンネル名
  permalink: string, // メッセージへのURL（get_slack_thread用）
}
```

## Error Handling

### Error Scenarios

1. **search:read スコープ不足**
   - **Handling:** エラーメッセージでOAuth再認証を案内
   - **User Impact:** 「検索権限がありません。`npx slack-task-mcp auth` で再認証してください」

2. **検索結果0件**
   - **Handling:** 正常終了、空結果メッセージ
   - **User Impact:** 「該当するメッセージはありません」

3. **レート制限 (Tier 2: 20回/分)**
   - **Handling:** Slack APIのエラーをそのまま返却
   - **User Impact:** 「APIレート制限に達しました。しばらく待ってから再試行してください」

4. **未認証**
   - **Handling:** 認証手順を案内
   - **User Impact:** 「Slack認証されていません。`npx slack-task-mcp auth` を実行してください」

## Testing Strategy

### Unit Testing

- クエリパラメータのバリデーション（Zodスキーマ）
- formatSearchResults のMarkdown出力形式
- チャンネル指定時のクエリ構築

### Integration Testing

- 実際のSlack APIとの通信（テスト用ワークスペース）
- 大量結果時のページネーション動作
- エラーケース（無効なチャンネル名等）

### End-to-End Testing

- 「キーワード検索 → permalink取得 → get_slack_thread」のフロー
- 検索結果0件のケース
- 権限エラー時の案内表示

## Implementation Notes

### Slack search.messages API

```javascript
const result = await slackClient.search.messages({
  query: query,        // 検索クエリ
  count: count,        // 件数
  sort: "timestamp",   // 新しい順
  sort_dir: "desc",
});
```

### チャンネル絞り込みの実装

チャンネル指定時は、クエリに `in:#channel` を追加:

```javascript
const fullQuery = channel ? `${query} in:#${channel}` : query;
```

### 出力フォーマット例

```markdown
## 🔍 検索結果 (10件 / 全42件)

---

### 1. #general - 2024/12/19 14:30
**山田太郎**
週次レポートの件、確認しました。
📎 https://xxx.slack.com/archives/C12345/p1234567890

---

### 2. #project-a - 2024/12/18 10:15
**鈴木花子**
レポートのテンプレートを更新しました。
📎 https://xxx.slack.com/archives/C67890/p0987654321

---

💡 スレッド全体を見るには: `get_slack_thread` に📎のURLを渡してください
```
