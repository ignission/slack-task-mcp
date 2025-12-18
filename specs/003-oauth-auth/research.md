# Research: OAuth Authentication

**Feature**: 003-oauth-auth
**Date**: 2025-12-18

## Research Questions

### Q1: Slack OAuth 2.0 の仕様

**Question**: Slack の OAuth 2.0 はどのような仕様か？

**Findings**:
- Slack は OAuth 2.0 Authorization Code Grant を使用
- User Token Scopes と Bot Token Scopes は別管理
- Redirect URL は事前に Slack App で登録が必要
- PKCE（Proof Key for Code Exchange）対応

**参考**: https://api.slack.com/authentication/oauth-v2

### Q2: 必要な Scopes

**Question**: 現在の機能に必要な User Token Scopes は？

**Decision**:
| Scope | 用途 |
|-------|------|
| `channels:history` | パブリックチャンネルのメッセージ取得 |
| `groups:history` | プライベートチャンネルのメッセージ取得 |
| `im:history` | DM のメッセージ取得 |
| `mpim:history` | グループ DM のメッセージ取得 |
| `users:read` | ユーザー情報（名前）の取得 |

### Q3: トークンの有効期限

**Question**: Slack のトークンは期限があるか？

**Findings**:
- User Token にはデフォルトで有効期限なし（無期限）
- ただし Token Rotation を有効にすると 12 時間で期限切れ
- Token Rotation 有効時は refresh_token で更新可能

**Decision**: Token Rotation はオプショナル。まずは無期限トークンで実装し、将来的に Token Rotation 対応を検討。

### Q4: ローカルサーバーの実装方法

**Question**: コールバック用ローカルサーバーをどう実装するか？

**Decision**: Node.js 標準の `http` モジュールを使用

**Rationale**:
- 追加の依存関係なし
- 一時的なサーバーなので軽量で十分
- Express は過剰

**Implementation**:
```javascript
import http from 'http';

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost:3000');
  if (url.pathname === '/callback') {
    const code = url.searchParams.get('code');
    // トークン交換処理
  }
});

server.listen(3000);
```

### Q5: ブラウザの起動方法

**Question**: クロスプラットフォームでブラウザを開くには？

**Decision**: `open` パッケージを使用

**Rationale**:
- macOS, Windows, Linux 対応
- 軽量（依存関係少ない）
- 広く使われている（gh CLI も採用）

**Alternative**:
- 手動で URL をコピーするオプションも提供（`--no-browser`）

### Q6: トークンの保存場所

**Question**: トークンをどこに保存するか？

**Decision**: `~/.slack-task-mcp/credentials.json`

**Rationale**:
- 既存の DATA_DIR を活用
- ファイルパーミッション 600 で保護
- JSON 形式で他のメタデータも保存可能

**Alternatives Considered**:
- OS キーチェーン → 複雑、クロスプラットフォーム対応が大変
- 環境変数 → 永続化できない
- `.env` ファイル → 平文で保存されるリスク

### Q7: CLI エントリーポイント

**Question**: `npx slack-task-mcp auth` をどう実装するか？

**Decision**: package.json の `bin` フィールドで CLI コマンドを定義

**Implementation**:
```json
{
  "bin": {
    "slack-task-mcp": "./src/cli.js"
  }
}
```

**CLI 構成**:
```
src/
├── index.js      # MCP サーバー（既存）
├── cli.js        # CLI エントリーポイント（新規）
└── auth.js       # OAuth 認証ロジック（新規）
```

### Q8: CSRF 対策

**Question**: OAuth の CSRF 対策は？

**Decision**: `state` パラメータを使用

**Implementation**:
1. ランダムな state を生成
2. 認可リクエストに state を含める
3. コールバックで state を検証

```javascript
const state = crypto.randomBytes(16).toString('hex');
// 認可 URL に &state=${state} を追加
// コールバックで state が一致するか確認
```

## Summary

| Question | Decision |
|----------|----------|
| OAuth フロー | Authorization Code Grant |
| Scopes | channels:history, groups:history, im:history, mpim:history, users:read |
| トークン期限 | まずは無期限、将来 Token Rotation 対応 |
| ローカルサーバー | Node.js http モジュール |
| ブラウザ起動 | open パッケージ |
| トークン保存 | ~/.slack-task-mcp/credentials.json |
| CLI | src/cli.js を新規作成 |
| CSRF 対策 | state パラメータ |

## Dependencies to Add

```json
{
  "dependencies": {
    "open": "^10.0.0"
  }
}
```

## Next Steps

1. data-model.md で Credentials エンティティを定義
2. CLI コマンド構成を決定
3. quickstart.md で使用例を記載
