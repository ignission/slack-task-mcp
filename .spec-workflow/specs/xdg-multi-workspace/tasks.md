# Tasks Document: XDG対応 + 複数ワークスペース

- [x] 1. paths.jsモジュールを作成
  - File: packages/core/src/paths.js
  - XDG Base Directory準拠のパス解決関数を実装
    - `getConfigDir()` - $XDG_CONFIG_HOME/slack-task-mcp
    - `getDataDir()` - $XDG_DATA_HOME/slack-task-mcp
    - `getCredentialsDir()` - $XDG_DATA_HOME/slack-task-mcp/credentials
    - `getTasksPath()` - $XDG_DATA_HOME/slack-task-mcp/tasks.json
  - macOS/Linux: XDG環境変数またはデフォルト値を使用
  - Purpose: パス管理を一元化し、XDG準拠を実現
  - _Leverage: なし（新規モジュール）_
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. credentials.jsモジュールを作成
  - File: packages/core/src/credentials.js
  - 複数ワークスペースの認証情報管理を実装
    - `listWorkspaces()` - 全ワークスペース一覧
    - `getCredentialsByDomain(teamDomain)` - team_domainで検索
    - `getCredentialsById(teamId)` - team_idで検索
    - `saveCredentials(credentials)` - 認証情報保存（mode: 0o600）
    - `deleteCredentials(teamId)` - 指定ワークスペース削除
    - `deleteAllCredentials()` - 全削除
  - ファイル形式: credentials/{team_id}.json
  - Purpose: 認証情報のCRUD操作を提供
  - _Leverage: packages/core/src/paths.js_
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 3. auth.jsをリファクタ
  - File: packages/core/src/auth.js (modify)
  - ストレージ操作をcredentials.jsに委譲
  - authenticate()でteam_domainを保存するよう変更
  - showStatus()を複数ワークスペース対応に拡張
  - logout()にworkspaceオプションを追加
  - DATA_DIR, CREDENTIALS_FILE定数を削除
  - Purpose: OAuthフローに集中、ストレージは分離
  - _Leverage: packages/core/src/credentials.js, packages/core/src/paths.js_
  - _Requirements: 2.3, 3.1, 3.2, 3.3_

- [x] 4. cli.jsを更新
  - File: packages/core/src/cli.js (modify)
  - コマンド体系を変更:
    - `auth` → `auth login` に変更
    - `auth logout --workspace <name>` オプション追加
    - `auth status` は維持
  - ヘルプ文言を更新
  - Purpose: 複数ワークスペース管理のためのCLI拡張
  - _Leverage: packages/core/src/auth.js_
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 5. index.jsを更新（認証情報読み込み）
  - File: packages/core/src/index.js (modify)
  - loadCredentials()をcredentials.jsのgetCredentialsByDomain()に置換
  - extractTeamDomain()関数を追加（URLからteam_domain抽出）
  - DATA_DIR, TASKS_FILE定数をpaths.jsに移行
  - Purpose: URL解析による自動ワークスペース選択
  - _Leverage: packages/core/src/credentials.js, packages/core/src/paths.js_
  - _Requirements: 2.4, 2.5_

- [x] 6. get_slack_threadツールを更新
  - File: packages/core/src/index.js (modify, get_slack_thread部分)
  - URLからteam_domainを抽出し、該当ワークスペースのトークンを使用
  - 未認証ワークスペースの場合はエラーメッセージを表示
  - Purpose: 複数ワークスペース対応のSlack API呼び出し
  - _Leverage: extractTeamDomain(), getCredentialsByDomain()_
  - _Requirements: 2.4, 2.5_

- [x] 7. search_slackツールを更新
  - File: packages/core/src/index.js (modify, search_slack部分)
  - 検索結果のpermalinkからワークスペースを判定
  - 未認証の場合の動作を検討
  - Purpose: 複数ワークスペース対応の検索機能
  - _Leverage: extractTeamDomain(), getCredentialsByDomain()_
  - _Requirements: 2.4, 2.5_

- [x] 8. README.mdを更新
  - File: README.md (modify)
  - データ保存先の説明をXDGパスに更新
  - 複数ワークスペースの使い方を追加
  - CLI コマンドの説明を更新
  - Purpose: ドキュメントの整合性維持
  - _Leverage: なし_
  - _Requirements: All_

- [x] 9. 動作確認
  - 手動テスト:
    - `auth login` で新規ワークスペース認証
    - `auth status` で複数ワークスペース表示
    - `auth logout --workspace <name>` で個別削除
    - `auth logout` で全削除
    - 異なるワークスペースのURLでget_slack_thread
  - XDGパスの確認:
    - credentials/{team_id}.jsonの作成確認
    - tasks.jsonの移行確認
  - Purpose: 実装の検証
  - _Requirements: All_
