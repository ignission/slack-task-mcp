# Requirements Document: XDG対応 + 複数ワークスペース

## Introduction

ユーザーホームディレクトリ直下への設定ファイル配置を避け、XDG Base Directory Specificationに準拠した構成に移行する。また、複数のSlackワークスペースを同時に利用できるよう認証情報の管理を拡張する。

## Alignment with Product Vision

- **認知負荷の軽減**: 複数ワークスペースの切り替えを意識せずに利用可能
- **プライバシー重視**: XDG準拠により、設定とデータを適切な場所に分離保存
- **シンプルさ優先**: クリーンな新構造でスタート

## Requirements

### Requirement 1: XDG Base Directory対応

**User Story:** As a ユーザー, I want 設定ファイルがXDG準拠の場所に保存される, so that ホームディレクトリが散らからない

#### Acceptance Criteria

1. WHEN アプリケーション起動 THEN システム SHALL `$XDG_CONFIG_HOME/slack-task-mcp/` に設定を保存（デフォルト: `~/.config/slack-task-mcp/`）
2. WHEN アプリケーション起動 THEN システム SHALL `$XDG_DATA_HOME/slack-task-mcp/` にデータを保存（デフォルト: `~/.local/share/slack-task-mcp/`）
3. WHEN 環境変数 `XDG_CONFIG_HOME` / `XDG_DATA_HOME` が設定されている THEN システム SHALL その値を優先

### Requirement 2: 複数ワークスペース認証

**User Story:** As a ユーザー, I want 複数のSlackワークスペースに認証できる, so that 仕事用と個人用のワークスペースを切り替えて使える

#### Acceptance Criteria

1. WHEN `auth login` コマンド実行 THEN システム SHALL 新しいワークスペースを追加認証できる
2. WHEN 認証完了 THEN システム SHALL ワークスペースごとに認証情報を個別ファイルで保存
3. WHEN 認証完了 THEN システム SHALL `team_domain`（URLサブドメイン）も認証情報に保存
4. WHEN Slack API呼び出し THEN システム SHALL URLの `team_domain` から該当ワークスペースのトークンを自動選択
5. IF 該当ワークスペースの認証がない THEN システム SHALL 認証を促すメッセージを表示

### Requirement 3: ワークスペース管理CLI

**User Story:** As a ユーザー, I want 認証済みワークスペースを一覧・削除できる, so that 不要な認証情報を管理できる

#### CLIコマンド体系

```
auth login                      # 新しいワークスペースを認証
auth logout                     # 全ワークスペースをログアウト
auth logout --workspace <name>  # 指定ワークスペースのみログアウト
auth status                     # 認証状態を一覧表示
```

#### Acceptance Criteria

1. WHEN `auth status` 実行 THEN システム SHALL 全ての認証済みワークスペースを一覧表示
2. WHEN `auth logout --workspace <name>` 実行 THEN システム SHALL 指定ワークスペースの認証情報のみ削除
3. WHEN `auth logout` 実行（オプションなし） THEN システム SHALL 全ワークスペースの認証情報を削除

## Non-Functional Requirements

### Code Architecture and Modularity

- **Single Responsibility Principle**: 設定パス解決、認証情報読み書きを別モジュールに分離
- **Modular Design**: `paths.js`（XDGパス解決）, `credentials.js`（認証情報管理）として分離
- **Clear Interfaces**: 認証情報取得は `getCredentialsForWorkspace(teamId)` のような明確なAPI

### Performance

- ワークスペース選択はSlack URL解析で即座に判定（追加のAPI呼び出し不要）

### Security

- 認証情報ファイルは `mode: 0o600` で保存
- ワークスペースごとにファイル分離（1つの漏洩が全体に影響しない）

### Reliability

- 設定ディレクトリが存在しない場合は自動作成

### Usability

- `auth status` で現在の状態を確認可能
- ワークスペース名で直感的に管理

## Data Structure

### ディレクトリ構造

```
~/.config/slack-task-mcp/          # XDG_CONFIG_HOME
└── config.json                    # 全体設定（将来用）

~/.local/share/slack-task-mcp/     # XDG_DATA_HOME
├── credentials/
│   ├── T01234567.json             # team_id をファイル名に
│   └── T98765432.json
└── tasks.json
```

### credentials/{team_id}.json

```json
{
  "access_token": "xoxp-...",
  "token_type": "user",
  "scope": "...",
  "user_id": "U...",
  "team_id": "T01234567",
  "team_name": "My Workspace",
  "team_domain": "myworkspace",
  "created_at": "2024-01-01T00:00:00Z"
}
```

### ワークスペース判定フロー

```
Slack URL: https://myworkspace.slack.com/archives/C123/p456
                   ^^^^^^^^^^^
                   team_domain を抽出
                        ↓
credentials/ 内を検索し team_domain が一致するファイルを特定
                        ↓
該当する認証情報のトークンを使用
```
