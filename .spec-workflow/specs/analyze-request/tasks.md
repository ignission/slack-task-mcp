# Tasks: analyze_request

## Overview

Slackスレッドの依頼を分析し、目的・不明点・確認メッセージ案・ネクストアクションを構造化して出力する `analyze_request` MCPツールを実装する。

## Task List

### Phase 1: Foundation - Zodスキーマ定義

- [x] 1.1 UnclearPoint Zodスキーマを定義
- [x] 1.2 NextAction Zodスキーマを定義
- [x] 1.3 Priority Zodスキーマを定義
- [x] 1.4 AnalysisResult Zodスキーマを定義

### Phase 2: User Story P1 - 目的の明確化

- [x] 2.1 analyze_request ツールのスケルトン作成
- [x] 2.2 入力バリデーション実装
- [x] 2.3 目的表示のフォーマット実装

### Phase 3: User Story P2 - 不明点の洗い出し

- [x] 3.1 不明点リストのフォーマット実装
- [x] 3.2 影響度・選択肢の表示追加

### Phase 4: User Story P3 - 確認メッセージ案

- [x] 4.1 確認メッセージ案の表示実装
- [x] 4.2 不明点なしの場合の分岐処理

### Phase 5: User Story P4 - ネクストアクション

- [x] 5.1 ネクストアクションの表示実装
- [x] 5.2 推定時間・理由の表示追加

### Phase 6: Integration & Output

- [x] 6.1 優先度アイコン表示実装
- [x] 6.2 全体出力フォーマットの組み立て
- [x] 6.3 成功/エラーレスポンスの整形

### Phase 7: Testing & Polish

- [x] 7.1 手動テスト: 曖昧な依頼
- [x] 7.2 手動テスト: 明確な依頼
- [x] 7.3 手動テスト: 複数依頼混在
- [x] 7.4 エッジケース確認

## Progress

**Total**: 20/20 tasks completed ✅

## Acceptance Criteria

- [x] `analyze_request` ツールが Claude Desktop / Claude Code で認識される
- [x] 分析結果が構造化されたMarkdown形式で出力される
- [x] 不明点がある場合は確認メッセージ案が提示される
- [x] ネクストアクションが5分以内の具体的な行動として提示される
- [x] 優先度がアイコン付きで表示される
