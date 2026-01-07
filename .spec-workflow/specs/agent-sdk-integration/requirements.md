# Requirements Document: Agent SDK Integration

## Introduction

MCPサーバーの分析・添削機能をClaude Agent SDKで実装し、システムプロンプトによる高精度な処理を実現する。現在のMCPツールはdescriptionのみでコンテキストを渡すため精度にムラがあり、CLAUDE.mdがないリポジトリでは期待通りに動作しない問題を解決する。

## Alignment with Product Vision

### 解決する課題（product.mdより）
- 「何求められてる？」が曖昧で固まる → **Agent SDKで高精度な目的明確化**
- 「どう返せばいい？」で時間かかる → **システムプロンプト完備で安定した返信添削**

### 設計原則との整合
- **認知負荷の軽減**: エージェントが自律的に最適なフローを実行
- **ワーキングメモリ節約**: 一度の呼び出しで分析→タスク化まで完結

## Requirements

### Requirement 1: 責務分離アーキテクチャ

**User Story:** 開発者として、MCPサーバーとAgent SDKの責務を明確に分離したい。Slack API操作と知的処理を分けることで、保守性と拡張性を高める。

#### Acceptance Criteria

1. WHEN MCPツールが呼び出される THEN システム SHALL Slack API操作（スレッド取得、タスク保存、検索）のみを実行する
2. WHEN 分析・添削が必要な場合 THEN システム SHALL Agent SDKエージェントを呼び出す
3. IF エージェントがSlackデータを必要とする THEN エージェント SHALL MCPツール経由でアクセスする

### Requirement 2: 分析エージェント

**User Story:** ユーザーとして、Slackスレッドを渡すだけで高精度な依頼分析を受けたい。CLAUDE.mdがなくても同じ品質を得られるようにする。

#### Acceptance Criteria

1. WHEN スレッドURLが渡される THEN エージェント SHALL 目的・不明点・確認メッセージ案・優先度を生成する
2. WHEN 分析を実行する THEN エージェント SHALL システムプロンプトに定義された5つのルール（目的明確化、不明点洗い出し、確認メッセージ案、タスク分解、優先度判定）に従う
3. IF 不明点がある THEN エージェント SHALL 具体的な確認メッセージ案を生成する

### Requirement 3: 返信添削エージェント

**User Story:** ユーザーとして、下書きを渡すだけで構造化された返信を得たい。テンプレート（報告系/確認系/依頼系）に沿った出力を安定して受けられる。

#### Acceptance Criteria

1. WHEN 下書きテキストが渡される THEN エージェント SHALL 結論→根拠→アクションの構造に整理する
2. WHEN タスクタイプが判別される THEN エージェント SHALL 適切なテンプレート（`<結論>`, `<確認したいこと>`, `<お願い>`形式）を適用する
3. WHEN 添削が完了する THEN エージェント SHALL 変更ポイントと理由を明示する

### Requirement 4: MCPからのエージェント呼び出し

**User Story:** ユーザーとして、Claude Code/Desktopから今まで通りMCPツールとして使いたい。Agent SDKの導入を意識せずに使える。

#### Acceptance Criteria

1. WHEN `analyze_request` ツールが呼び出される THEN MCPサーバー SHALL 内部で分析エージェントを起動する
2. WHEN `draft_reply` ツールが呼び出される THEN MCPサーバー SHALL 内部で返信添削エージェントを起動する
3. IF エージェントがエラーを返す THEN MCPサーバー SHALL ユーザーに分かりやすいエラーメッセージを表示する

### Requirement 5: 認証の継承

**User Story:** ユーザーとして、追加の認証設定なしでAgent SDKを利用したい。既存のSlack OAuthとClaude Codeの認証をそのまま活用する。

#### Acceptance Criteria

1. WHEN エージェントがSlack APIを呼び出す THEN エージェント SHALL 既存のOAuthトークン（credentials.json）を使用する
2. WHEN エージェントがClaude APIを呼び出す THEN エージェント SHALL Claude Codeの認証を継承する
3. IF Slack認証が切れている THEN システム SHALL `slack-task-mcp auth` への誘導メッセージを表示する

## Non-Functional Requirements

### Code Architecture and Modularity
- **責務分離**: MCPツール（Slack操作）とエージェント（知的処理）を明確に分離
- **単一責任**: 各エージェントは1つの機能（分析 or 添削）に集中
- **疎結合**: エージェントはMCPクライアントとしてSlackツールを利用

### Performance
- エージェント呼び出しのレイテンシ: 10秒以内（通常の分析）
- MCPサーバー起動時間への影響: 最小限（エージェントは遅延初期化）

### Security
- APIキーは環境変数または暗号化されたローカルファイルで管理
- ユーザーのSlackデータは外部に送信しない（Anthropic APIへの送信のみ）

### Reliability
- エージェントのタイムアウト処理を実装
- フォールバック: エージェント失敗時は従来のMCPツール動作を維持

### Usability
- 既存のMCPツールインターフェースを維持（後方互換性）
- エラーメッセージは日本語で分かりやすく
