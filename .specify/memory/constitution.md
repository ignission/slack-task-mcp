<!--
Sync Impact Report
==================
Version Change: 1.0.0 → 1.1.0
Bump Rationale: コンセプトのブラッシュアップ - 着手ハードル低減・文脈DB・返信添削機能を追加

Modified Principles:
- I. User-Centric Task Design → I. Lower the Barrier to Start（着手ハードルを下げる）
  - タスク分解に加え、目的明確化・不明点洗い出しを追加
- III. Incremental Achievement（内容拡充）

Added Sections:
- Product Vision（プロダクトビジョン）
- II. Slack as Context DB（Slackを文脈DBとして活用）
- VI. Logical Communication Support（論理的なコミュニケーション支援）
- MCP Tools（ツール定義を明確化）

Removed Sections: N/A

Templates Requiring Updates:
- ✅ .specify/templates/plan-template.md (互換性あり)
- ✅ .specify/templates/spec-template.md (互換性あり)
- ✅ .specify/templates/tasks-template.md (互換性あり)
- ⚠️ CLAUDE.md (新ツール analyze_request, draft_reply の追加が必要)
- ⚠️ README.md (新ツールの使い方追加が必要)

Follow-up TODOs:
- CLAUDE.md に analyze_request, draft_reply ツールの説明を追加
- README.md に新しいワークフローを追加
-->

# Slack Task MCP Server Constitution

## Product Vision

**解決する課題**: Slackでメンションがたまると、どこから手を付けていいか迷い、難しい依頼は諦めてしまう

**ターゲット**: ADHDの特性を持つユーザー

**提供する価値**: メンションから着手までの摩擦をゼロに近づける

```
メンション来た
    ↓
「何求められてる？」が曖昧で固まる → 目的の明確化
    ↓
「何聞けばいい？」がわからない   → 不明点の洗い出し + 確認メッセージ案
    ↓
「どう返せばいい？」で時間かかる → 返信メッセージの添削・構造化
    ↓
「次何する？」で迷う            → ネクストアクション提示
```

## Core Principles

### I. Lower the Barrier to Start（着手ハードルを下げる）

難しいメンションでも「最初の一歩」を踏み出せるように支援すること。

- **目的の明確化**: 「結局何を求められているか」を言語化すること
- **不明点の洗い出し**: 「これを聞かないと進めない」を特定すること
- **確認メッセージ案**: Slackで聞く文面まで生成すること
- **5分で終わる最初のステップ**: すぐ取り掛かれる具体的な動作を提示すること
- 曖昧な作業は具体的な動作に変換すること（例: ❌「資料を作る」→ ✅「Googleドキュメントを開いてタイトルを書く」）

**理由**: 曖昧さが着手を阻む最大の障壁。明確にすれば動ける。

### II. Slack as Context DB（Slackを文脈DBとして活用）

Slackスレッドの情報を「文脈のデータベース」として保持し、継続的に参照できるようにすること。

- スレッドの内容をタスクと紐づけて保存すること
- 「あの話どうなったっけ」をClaudeに聞けるようにすること
- スレッドを読み直す必要をなくすこと（ワーキングメモリ節約）
- タスクの背景情報が常に参照可能な状態を維持すること

**理由**: ADHDはワーキングメモリに負荷がかかりやすい。外部記憶として活用することで認知負荷を下げる。

### III. Incremental Achievement（段階的な達成感）

タスク完了の進捗を可視化し、達成感を積み重ねられるようにすること。

- タスクの各ステップは個別に完了マーク可能であること
- 完了したステップは視覚的に区別できること（打ち消し線など）
- 次に取り組むべきステップを明確に提示すること
- 途中で止めてもOKな区切りを明示すること
- 「ここまでやった」を可視化して達成感を与えること

**理由**: 小さな達成の積み重ねがモチベーション維持と最終目標達成の鍵である。

### IV. Logical Communication Support（論理的なコミュニケーション支援）

ユーザーの返信メッセージを添削し、ロジカルに整理すること。

- **構造化**: 下書き → 結論→根拠→アクションの形式に整理
- **簡潔化**: 冗長な表現を要点を絞った文章に変換
- **ロジカルチェック**: 論理の飛躍や抜け漏れを指摘
- 報告・調査・作成など、タスクタイプに応じたテンプレートを提供すること

**理由**: 「伝わるかな」という不安が返信を遅らせる。構造化された文章は自信を持って送れる。

### V. MCP Protocol Compliance（MCP準拠）

Model Context Protocol（MCP）仕様に準拠すること。

- ツールは stdin/stdout を介した JSON-RPC 2.0 形式で通信すること
- エラーは適切なエラーコードとメッセージを含む形式で返すこと
- ツールスキーマは Zod を用いて厳密に定義すること
- MCP SDK のバージョンアップに追従すること

**理由**: Claude Code / Claude Desktop との安定した統合を保証するため。

### VI. Data Persistence & Privacy（データ永続化とプライバシー）

ユーザーのタスクデータを安全に永続化すること。

- タスクデータはローカルファイルシステム（`~/.slack-task-mcp/tasks.json`）に保存すること
- Slackスレッドの文脈情報もタスクと共に保存すること
- Slack User Token はユーザーの環境変数として管理し、コードにハードコードしないこと
- APIレスポンスに含まれる個人情報を不必要にログ出力しないこと

**理由**: セッションをまたいでも文脈を維持し、継続的なタスク管理を可能にするため。

### VII. Simplicity & Maintainability（シンプルさと保守性）

シンプルさを保ち、必要最小限の複雑さに留めること。

- 単一ファイル構成（`src/index.js`）を基本とし、複雑になった場合のみ分割すること
- 依存関係は必要最小限に抑えること（MCP SDK, Slack API, Zod のみ）
- YAGNI原則に従い、現在必要な機能のみ実装すること

**理由**: 保守性を高く保ち、機能追加やバグ修正を容易にするため。

## MCP Tools

### コアツール

| ツール名 | 目的 | 入力 | 出力 |
|----------|------|------|------|
| `get_slack_thread` | スレッド取得 | Slack URL | メッセージ一覧 |
| `analyze_request` | 依頼分析 | スレッド内容 | 目的・不明点・確認メッセージ案・ネクストアクション |
| `draft_reply` | 返信添削 | 下書きテキスト | 構造化された返信案 |
| `save_task` | タスク保存 | タスク情報 | 保存結果 |
| `list_tasks` | タスク一覧 | なし | タスクリスト |
| `complete_step` | ステップ完了 | タスクID, ステップ番号 | 更新結果 |

### 推奨ワークフロー

```
1. get_slack_thread  → スレッド取得（文脈DB化）
2. analyze_request   → 目的・不明点・確認案を生成
3. draft_reply       → 返信の下書きを添削・構造化
4. save_task         → タスクとして保存
5. complete_step     → 進捗管理
```

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

**Version**: 1.1.0 | **Ratified**: 2025-12-18 | **Last Amended**: 2025-12-18
