# Requirements Document: Local OAuth Server

## Introduction

Slack OAuth認証をCloudflare Workers + KVベースから、ローカルHTTPサーバーベースに変更する。これにより、KVの結果整合性問題を解消し、外部サービス依存を排除して認証の信頼性を向上させる。

併せて、pnpmモノレポ構造からシングルリポジトリ構造に戻し、プロジェクト構成をシンプル化する。

## Alignment with Product Vision

このFeatureはプロダクトの以下のゴールをサポートする:

- **シンプルさ優先**: 外部サービス（Cloudflare Workers）への依存を排除、モノレポ廃止
- **信頼性向上**: 認証フローの失敗率をゼロに近づける
- **プライバシー重視**: 認証情報がローカルのみで処理される

## 背景・課題

### 現状の問題

Cloudflare Workers KVは「結果整合性（eventual consistency）」のため、書き込み直後に別リージョンから読み取ると古いデータが返る場合がある。これにより:

1. ブラウザでは「認証完了」と表示される
2. CLIのポーリングでは`pending`状態のままトークンを取得できない
3. ユーザーが認証成功したと思っても、実際には認証情報が保存されない

### 解決策

gh CLI、Stripe CLIなど実績のある「ローカルサーバー方式」を採用する:

1. CLIがローカルでHTTPサーバーを起動（例: `http://localhost:8888/callback`）
2. Slackの`redirect_uri`にローカルURLを指定
3. 認証後、Slackが直接ローカルサーバーにコールバック
4. CLIがトークンを即座に受け取り保存

## Requirements

### Requirement 1: ローカルHTTPサーバーの起動

**User Story:** 開発者として、`auth login`コマンド実行時にローカルHTTPサーバーが自動起動されることで、外部サービスに依存せず認証できる。

#### Acceptance Criteria

1. WHEN `auth login`を実行 THEN システム SHALL 空いているポートでHTTPサーバーを起動する
2. IF ポート8888が使用中 THEN システム SHALL 別の空きポート（8889, 8890...）を自動選択する
3. WHEN サーバー起動完了 THEN システム SHALL `http://localhost:{port}/callback`をredirect_uriとして使用する

### Requirement 2: Slack OAuth URLの生成とブラウザ起動

**User Story:** 開発者として、ブラウザでSlack認証画面が自動で開かれることで、スムーズに認証フローを開始できる。

#### Acceptance Criteria

1. WHEN ローカルサーバー起動後 THEN システム SHALL Slack OAuth URLを生成してブラウザで開く
2. IF `--no-browser`オプション指定 THEN システム SHALL URLを表示のみしてブラウザは開かない
3. WHEN OAuth URL生成 THEN システム SHALL 以下のパラメータを含める:
   - `client_id`: Slack App Client ID
   - `user_scope`: 必要なスコープ（channels:history, groups:history等）
   - `redirect_uri`: ローカルサーバーのコールバックURL
   - `state`: CSRF対策用のランダム文字列

### Requirement 3: コールバック処理とトークン取得

**User Story:** 開発者として、Slack認証後に自動的にトークンが取得・保存されることで、追加の操作なく認証が完了する。

#### Acceptance Criteria

1. WHEN Slackからコールバックを受信 THEN システム SHALL 認可コードを取得する
2. WHEN 認可コード取得後 THEN システム SHALL Slack APIでアクセストークンに交換する
3. IF トークン交換成功 THEN システム SHALL 認証情報をローカルに保存する
4. WHEN 認証完了 THEN システム SHALL ブラウザに成功ページを表示する
5. IF エラー発生 THEN システム SHALL エラーメッセージをブラウザとターミナル両方に表示する

### Requirement 4: Slack App設定要件

**User Story:** 開発者として、Slack Appの設定方法が明確にドキュメント化されていることで、自分のSlack Appを使用できる。

#### Acceptance Criteria

1. WHEN ユーザーが自分のSlack Appを使用する場合 THEN ドキュメント SHALL 設定手順を明記する
2. IF `localhost`をredirect_uriに追加する場合 THEN ドキュメント SHALL Slack App設定画面での操作手順を記載する

### Requirement 5: Cloudflare Workers の廃止

**User Story:** メンテナとして、Cloudflare Workers関連のコードが削除されることで、保守対象が減る。

#### Acceptance Criteria

1. WHEN 移行完了 THEN システム SHALL `packages/oauth-worker`ディレクトリを削除する
2. WHEN 移行完了 THEN システム SHALL Worker関連の環境変数（OAUTH_WORKER_URL）への依存を削除する
3. WHEN 移行完了 THEN ドキュメント SHALL 新しい認証フローを反映する

### Requirement 6: モノレポからシングルリポジトリへの移行

**User Story:** メンテナとして、モノレポ構造が廃止されシンプルなシングルリポジトリ構造になることで、ビルド・開発体験がシンプルになる。

#### Acceptance Criteria

1. WHEN 移行完了 THEN プロジェクト SHALL `packages/`ディレクトリを廃止し、ルートに`src/`を配置する
2. WHEN 移行完了 THEN プロジェクト SHALL pnpm workspace設定を削除する
3. WHEN 移行完了 THEN プロジェクト SHALL ルートの`package.json`を単一パッケージとして構成する
4. WHEN 移行完了 THEN プロジェクト SHALL 現在の`packages/core/src/`の内容を`src/`に移動する
5. WHEN 移行完了 THEN ドキュメント SHALL 新しいプロジェクト構造を反映する

#### 移行後のディレクトリ構造

```
mcp-slack-task/
├── src/
│   ├── index.js          # MCPサーバーエントリーポイント
│   ├── cli.js            # CLIエントリーポイント
│   ├── auth.js           # ローカルOAuth認証
│   ├── credentials.js    # 認証情報管理
│   ├── paths.js          # パス解決
│   └── agents/           # Agent SDK関連
├── package.json          # 単一パッケージ
├── README.md
└── CLAUDE.md
```

## Non-Functional Requirements

### Code Architecture and Modularity
- **Single Responsibility Principle**: ローカルサーバー、トークン交換、認証情報保存を別モジュールに分離
- **Modular Design**: 既存の`credentials.js`を再利用
- **Dependency Management**: 新規依存は最小限に（Node.js標準の`http`モジュールを使用）
- **Clear Interfaces**: `authenticate()`関数のインターフェースは維持

### Performance
- サーバー起動は1秒以内
- 認証完了後、サーバーは即座にシャットダウン

### Security
- state パラメータによるCSRF対策
- Client Secret はユーザーのローカル環境でのみ使用
- トークンはファイルパーミッション 0o600 で保存（既存仕様を維持）

### Reliability
- ポート競合時の自動リカバリー
- タイムアウト処理（5分でサーバー自動終了）
- ネットワークエラー時の明確なエラーメッセージ

### Usability
- 既存の`auth login`コマンドと同じUX
- 認証成功/失敗がターミナルとブラウザ両方で明確に表示される

## Out of Scope

- 公開Slack Appとしての配布（ユーザーが自分のSlack Appを作成する前提）
- 複数同時認証のサポート
- HTTPS対応（localhostはHTTPで十分）
