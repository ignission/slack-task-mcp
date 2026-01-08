# Tasks Document: Local OAuth Server

## Phase 1: モノレポからシングルリポジトリへの移行

- [x] 1. ソースコードの移動
  - Files: `packages/core/src/*` → `src/*`
  - `packages/core/src/` の全ファイルをルートの `src/` に移動
  - Purpose: シングルリポジトリ構造への移行準備
  - _Leverage: なし_
  - _Requirements: 6_
  - _Prompt: Implement the task for spec local-oauth-server, first run spec-workflow-guide to get the workflow guide then implement the task: Role: DevOps Engineer | Task: packages/core/src/ 配下の全ファイルをルートの src/ ディレクトリに移動する。git mv を使用してファイル履歴を保持すること | Restrictions: ファイル内容は変更しない、相対パスのimportは後続タスクで修正 | Success: src/ に全ソースファイルが存在し、packages/core/src/ は空になっている。tasks.mdで[-]から[x]に変更し、log-implementationでアーティファクトを記録すること_

- [x] 2. package.json の統合
  - File: `package.json`
  - `packages/core/package.json` の内容をルートの `package.json` にマージ
  - pnpm workspace 設定を削除
  - Purpose: 単一パッケージとして構成
  - _Leverage: packages/core/package.json_
  - _Requirements: 6_
  - _Prompt: Implement the task for spec local-oauth-server, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Node.js Developer | Task: packages/core/package.json の内容（name, version, dependencies, bin, main等）をルートの package.json にマージする。workspaces 設定は削除 | Restrictions: @ignission/slack-task-mcp のパッケージ名とバージョンを維持、依存関係は重複なく統合 | Success: ルートの package.json が単一パッケージとして正しく構成されている。tasks.mdで[-]から[x]に変更し、log-implementationでアーティファクトを記録すること_

- [x] 3. 不要ファイルの削除
  - Files: `packages/`, `pnpm-workspace.yaml`
  - モノレポ関連の設定ファイルとディレクトリを削除
  - Purpose: シングルリポジトリ構造の完成
  - _Leverage: なし_
  - _Requirements: 6_
  - _Prompt: Implement the task for spec local-oauth-server, first run spec-workflow-guide to get the workflow guide then implement the task: Role: DevOps Engineer | Task: packages/ ディレクトリ全体と pnpm-workspace.yaml を削除する | Restrictions: src/ に移動済みのファイルが存在することを確認してから削除 | Success: packages/ と pnpm-workspace.yaml が存在しない。tasks.mdで[-]から[x]に変更し、log-implementationでアーティファクトを記録すること_

## Phase 2: ローカル OAuth サーバーの実装

- [x] 4. auth.js のローカルサーバー実装
  - File: `src/auth.js`
  - Worker ベースの認証をローカル HTTP サーバーベースに書き換え
  - Purpose: Cloudflare Workers への依存を排除
  - _Leverage: src/credentials.js, src/paths.js_
  - _Requirements: 1, 2, 3_
  - _Prompt: Implement the task for spec local-oauth-server, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Node.js Developer specializing in HTTP servers | Task: src/auth.js を書き換え、Node.js標準のhttpモジュールでローカルサーバーを起動し、Slackのコールバックを直接受け取る実装に変更する。authenticate()関数のインターフェースは維持 | Restrictions: 新規ライブラリ追加禁止、既存のcredentials.js/paths.jsを再利用、CSRF対策のstateパラメータ必須 | Success: npx @ignission/slack-task-mcp auth login でローカルサーバーが起動し、Slack認証が完了する。tasks.mdで[-]から[x]に変更し、log-implementationでアーティファクトを記録すること_

- [x] 5. 環境変数の設定対応
  - File: `src/auth.js`
  - SLACK_CLIENT_ID, SLACK_CLIENT_SECRET 環境変数の読み取り
  - OAUTH_WORKER_URL への依存を削除
  - Purpose: ローカルでのトークン交換に必要な認証情報
  - _Leverage: src/auth.js_
  - _Requirements: 4, 5_
  - _Prompt: Implement the task for spec local-oauth-server, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Node.js Developer | Task: src/auth.js で SLACK_CLIENT_ID と SLACK_CLIENT_SECRET 環境変数を読み取り、トークン交換に使用する。OAUTH_WORKER_URL の参照は削除 | Restrictions: 環境変数未設定時は明確なエラーメッセージを表示 | Success: 環境変数が設定されている場合は認証が動作し、未設定の場合は適切なエラーメッセージが表示される。tasks.mdで[-]から[x]に変更し、log-implementationでアーティファクトを記録すること_

## Phase 3: ドキュメント更新

- [ ] 6. README.md の更新
  - File: `README.md`
  - 新しい認証フロー、環境変数、Slack App設定手順を記載
  - Purpose: ユーザーが正しくセットアップできるようにする
  - _Leverage: 既存の README.md_
  - _Requirements: 4, 5, 6_
  - _Prompt: Implement the task for spec local-oauth-server, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Technical Writer | Task: README.md を更新し、新しい認証フロー（ローカルサーバー方式）、環境変数（SLACK_CLIENT_ID, SLACK_CLIENT_SECRET）、Slack App設定手順（redirect_uriにlocalhost追加）を記載 | Restrictions: 既存の機能説明は維持、Cloudflare Workers関連の記述は削除 | Success: 新規ユーザーがREADMEを読んでセットアップできる。tasks.mdで[-]から[x]に変更し、log-implementationでアーティファクトを記録すること_

- [ ] 7. CLAUDE.md の更新
  - File: `CLAUDE.md`
  - 認証フローの説明を更新
  - Purpose: AI アシスタントが正しい情報を持つ
  - _Leverage: 既存の CLAUDE.md_
  - _Requirements: 5_
  - _Prompt: Implement the task for spec local-oauth-server, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Technical Writer | Task: CLAUDE.md の認証関連の説明を更新し、ローカルサーバー方式のフローを反映する | Restrictions: 他のセクションは変更しない | Success: CLAUDE.mdが新しい認証フローを正しく説明している。tasks.mdで[-]から[x]に変更し、log-implementationでアーティファクトを記録すること_

- [ ] 8. steering docs の更新
  - File: `.spec-workflow/steering/tech.md`
  - アーキテクチャ図とOAuthフローの説明を更新
  - Purpose: 今後の開発で正しい情報を参照できる
  - _Leverage: 既存の tech.md_
  - _Requirements: 5, 6_
  - _Prompt: Implement the task for spec local-oauth-server, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Technical Writer | Task: .spec-workflow/steering/tech.md のアーキテクチャ図とOAuthフロー説明を更新し、Cloudflare WorkersをローカルHTTPサーバーに置き換える | Restrictions: 他の技術スタック情報は維持 | Success: tech.mdが現在のアーキテクチャを正しく反映している。tasks.mdで[-]から[x]に変更し、log-implementationでアーティファクトを記録すること_

## Phase 4: 検証とクリーンアップ

- [ ] 9. 動作確認
  - 認証フロー全体の手動テスト
  - Purpose: 実際の Slack App で認証が動作することを確認
  - _Leverage: なし_
  - _Requirements: 1, 2, 3_
  - _Prompt: Implement the task for spec local-oauth-server, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Engineer | Task: npx @ignission/slack-task-mcp auth login を実行し、認証フロー全体が動作することを確認する。成功ケース、キャンセルケース、タイムアウトケースをテスト | Restrictions: 実際のSlack Appが必要 | Success: 全ケースで期待通りの動作を確認。tasks.mdで[-]から[x]に変更し、log-implementationでアーティファクトを記録すること_

- [ ] 10. npm publish テスト
  - npm pack でパッケージを確認
  - Purpose: npm公開時に正しいファイルが含まれることを確認
  - _Leverage: package.json の files フィールド_
  - _Requirements: 6_
  - _Prompt: Implement the task for spec local-oauth-server, first run spec-workflow-guide to get the workflow guide then implement the task: Role: DevOps Engineer | Task: npm pack を実行し、生成される tarball に必要なファイル（src/*, package.json, README.md）のみが含まれることを確認 | Restrictions: 不要なファイル（.spec-workflow/, tests/等）が含まれていないこと | Success: npm pack の出力が適切で、npx で実行可能。tasks.mdで[-]から[x]に変更し、log-implementationでアーティファクトを記録すること_
