<!--
Sync Impact Report
==================
Version Change: N/A → 1.0.0 (Initial)
Bump Rationale: Initial constitution creation for Slack Task MCP Server project

Modified Principles: N/A (Initial creation)

Added Sections:
- Core Principles (5 principles)
  - I. User-Centric Task Design
  - II. MCP Protocol Compliance
  - III. Incremental Achievement
  - IV. Data Persistence & Privacy
  - V. Simplicity & Maintainability
- Development Workflow
- Technical Constraints
- Governance

Removed Sections: N/A

Templates Requiring Updates:
- ✅ .specify/templates/plan-template.md (Constitution Check section exists, compatible)
- ✅ .specify/templates/spec-template.md (User Scenarios align with user-centric design)
- ✅ .specify/templates/tasks-template.md (Phase structure compatible with incremental approach)

Follow-up TODOs: None
-->

# Slack Task MCP Server Constitution

## Core Principles

### I. User-Centric Task Design

ADHDの特性を持つユーザーが達成感を得られるように設計すること。

- タスク分解は必ず5分以内で完了できる粒度に分割すること
- 最初のステップは最も簡単で、すぐに取り掛かれるものにすること
- 各ステップは「やった感」が得られる明確な区切りを持つこと
- 曖昧な作業は具体的な動作に変換すること（例: ❌「資料を作る」→ ✅「Googleドキュメントを開いてタイトルを書く」）

**理由**: ユーザーが行動を起こしやすく、モチベーションを維持できる設計がプロダクトの価値の根幹である。

### II. MCP Protocol Compliance

Model Context Protocol（MCP）仕様に準拠すること。

- ツールは stdin/stdout を介した JSON-RPC 2.0 形式で通信すること
- エラーは適切なエラーコードとメッセージを含む形式で返すこと
- ツールスキーマは Zod を用いて厳密に定義すること
- MCP SDK のバージョンアップに追従すること

**理由**: Claude Code との安定した統合を保証し、他のMCPクライアントとの互換性を確保するため。

### III. Incremental Achievement

タスク完了の進捗を可視化し、達成感を積み重ねられるようにすること。

- タスクの各ステップは個別に完了マーク可能であること
- 完了したステップは視覚的に区別できること（打ち消し線など）
- 次に取り組むべきステップを明確に提示すること
- 進捗状況をいつでも確認できること

**理由**: 小さな達成の積み重ねがモチベーション維持と最終目標達成の鍵である。

### IV. Data Persistence & Privacy

ユーザーのタスクデータを安全に永続化すること。

- タスクデータはローカルファイルシステム（`~/.slack-task-mcp/tasks.json`）に保存すること
- Slack User Token はユーザーの環境変数として管理し、コードにハードコードしないこと
- APIレスポンスに含まれる個人情報を不必要にログ出力しないこと
- データ形式の変更時は下位互換性を考慮すること

**理由**: ユーザーのプライバシーを保護しつつ、セッションをまたいでもタスク管理を継続できるようにするため。

### V. Simplicity & Maintainability

シンプルさを保ち、必要最小限の複雑さに留めること。

- 単一ファイル構成（`src/index.js`）を基本とし、複雑になった場合のみ分割すること
- 依存関係は必要最小限に抑えること（MCP SDK, Slack API, Zod のみ）
- YAGNI原則に従い、現在必要な機能のみ実装すること
- ドキュメント（CLAUDE.md, README.md）は実装と同期させること

**理由**: 保守性を高く保ち、機能追加やバグ修正を容易にするため。

## Technical Constraints

### 技術スタック

- **Runtime**: Node.js (ES Modules)
- **Protocol**: MCP (Model Context Protocol) over stdio
- **External API**: Slack Web API (User Token)
- **Validation**: Zod
- **Package Manager**: pnpm

### API要件

- Slack User Token（`xoxp-...`）は環境変数 `SLACK_USER_TOKEN` から読み取ること
- スレッド取得には `channels:history`, `groups:history` スコープが必要
- User Tokenを使用するため、Botのチャンネル追加は不要

### パフォーマンス目標

- MCP ツール呼び出しのレスポンスは 5 秒以内
- ローカルファイル操作は 100ms 以内

## Development Workflow

### コード品質

- コミット前にコードが正常に動作することを確認すること
- エラーハンドリングを適切に実装し、ユーザーに分かりやすいメッセージを返すこと
- コメントとドキュメントは日本語で記述すること

### テスト

- 新機能追加時は手動での動作確認を必須とすること
- 将来的に自動テストを追加する場合は、MCP ツールの統合テストを優先すること

### 変更管理

- 破壊的変更を行う場合は、CLAUDE.md と README.md を同時に更新すること
- タスクデータ形式の変更時はマイグレーション手順を提供すること

## Governance

### 改訂手順

1. 改訂提案は constitution.md の変更として提出すること
2. 改訂内容は既存の原則との整合性を確認すること
3. 改訂後は関連するテンプレートとドキュメントを更新すること

### バージョニング

- **MAJOR**: 原則の削除または根本的な再定義
- **MINOR**: 新しい原則やセクションの追加、既存ガイダンスの大幅な拡張
- **PATCH**: 明確化、文言修正、軽微な調整

### コンプライアンス確認

- すべての機能実装はCore Principlesに準拠すること
- PRレビュー時は constitution との整合性を確認すること
- 定期的に constitution の見直しを行い、プロジェクトの成長に合わせて更新すること

**Version**: 1.0.0 | **Ratified**: 2025-12-18 | **Last Amended**: 2025-12-18
