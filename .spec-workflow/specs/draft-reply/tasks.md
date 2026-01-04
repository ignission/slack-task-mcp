# Tasks: draft_reply

## Overview

返信の下書きを添削し、「結論→根拠→アクション」の構造に整理する `draft_reply` MCPツールを実装する。

## Task List

### Phase 1: Foundation - Zodスキーマ定義

- [x] 1.1 TaskType/Tone/ChangeType 列挙型を定義
- [x] 1.2 Change Zodスキーマを定義
- [x] 1.3 ReplyStructure Zodスキーマを定義
- [x] 1.4 EditedReply Zodスキーマを定義

### Phase 2: Tool Implementation

- [x] 2.1 draft_reply ツールのスケルトン作成
- [x] 2.2 入力バリデーション実装

### Phase 3: Output Formatting

- [x] 3.1 TaskType/Tone ラベル変換関数
- [x] 3.2 ChangeType ラベル変換関数
- [x] 3.3 Before/After 表示フォーマット
- [x] 3.4 構造（結論/根拠/アクション）表示
- [x] 3.5 変更ポイントリスト表示
- [x] 3.6 コピー用テキスト出力

### Phase 4: Integration

- [x] 4.1 全体出力フォーマットの組み立て
- [x] 4.2 エラーレスポンスの整形

### Phase 5: Testing

- [x] 5.1 手動テスト: 報告系
- [x] 5.2 手動テスト: 確認系
- [x] 5.3 手動テスト: 依頼系
- [x] 5.4 手動テスト: カジュアルトーン

## Progress

**Total**: 18/18 tasks completed ✅

## Acceptance Criteria

- [x] `draft_reply` ツールが Claude Desktop / Claude Code で認識される
- [x] Before/After形式で添削結果が表示される
- [x] 構造（結論/根拠/アクション）が明示される
- [x] 変更ポイントと理由が具体的に表示される
- [x] コピー用テキストがそのまま貼り付けられる
