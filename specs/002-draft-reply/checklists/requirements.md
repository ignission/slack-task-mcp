# Requirements Checklist: draft_reply

**Feature**: 002-draft-reply
**Date**: 2025-12-18

## Functional Requirements

| ID | Requirement | Status | Notes |
|----|-------------|--------|-------|
| FR-001 | 下書き入力 | ⬜ | 必須、空文字不可 |
| FR-002 | タスクタイプ指定 | ⬜ | オプション、自動判定あり |
| FR-003 | 構造化出力 | ⬜ | 結論/根拠/アクション |
| FR-004 | Before/After表示 | ⬜ | 変更前後を表示 |
| FR-005 | 改善ポイント | ⬜ | 変更理由のリスト |
| FR-006 | 文脈参照 | ⬜ | オプション |
| FR-007 | トーン調整 | ⬜ | formal/casual |
| FR-008 | コピー用テキスト | ⬜ | そのまま貼れる形式 |

## Non-Functional Requirements

| ID | Requirement | Status | Notes |
|----|-------------|--------|-------|
| NFR-001 | レスポンス5秒以内 | ⬜ | - |
| NFR-002 | 入力最大2000文字 | ⬜ | - |

## User Stories

| ID | Story | Status | Notes |
|----|-------|--------|-------|
| P1 | 基本的な添削 | ⬜ | Before/After形式 |
| P2 | タスクタイプ別テンプレート | ⬜ | 報告/確認/依頼 |
| P3 | 改善ポイントの提示 | ⬜ | 変更理由明示 |
| P4 | 文脈を考慮した添削 | ⬜ | thread_content参照 |

## Edge Cases

| ID | Case | Status | Notes |
|----|------|--------|-------|
| EC-001 | 既に構造化されている | ⬜ | 微調整のみ |
| EC-002 | 文脈が不足 | ⬜ | 汎用的な添削 |
| EC-003 | 感情的な内容 | ⬜ | 中立的に変換 |

## Success Criteria

| ID | Criterion | Status |
|----|-----------|--------|
| SC-001 | 構造化された返信案が得られる | ⬜ |
| SC-002 | Before/After形式で変更点が明確 | ⬜ |
| SC-003 | タスクタイプに応じたテンプレート | ⬜ |
| SC-004 | 改善ポイントが具体的 | ⬜ |
| SC-005 | コピペで使える | ⬜ |
