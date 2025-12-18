# Research: draft_reply

**Feature**: 002-draft-reply
**Date**: 2025-12-18

## Research Questions

### Q1: MCPツールの役割分担

**Question**: draft_reply ツールは添削ロジック自体を持つべきか？

**Decision**: 添削ロジックは持たない。Claudeの推論能力を活用する。

**Rationale**:
- analyze_request と同様、Claudeの強みを活かす設計
- MCPツールは入出力の構造化に専念
- CLAUDE.md の「返信添削のルール」がガイダンスとして機能

### Q2: ツールの入出力設計

**Question**: draft_reply ツールの入力と出力は何か？

**Decision**:
- **入力**:
  - draft_text: 下書きテキスト（必須）
  - task_type: 報告/確認/依頼（オプション）
  - tone: formal/casual（オプション）
  - thread_content: 文脈用スレッド内容（オプション）
  - edited_reply: Claudeが生成した添削結果（必須）
- **出力**: 構造化された添削結果

### Q3: タスクタイプの自動判定

**Question**: タスクタイプをどう判定するか？

**Decision**: Claude に判定させる

**Rationale**:
- 文脈依存が高く、ルールベースでは限界がある
- Claudeが下書きの意図を理解して判定
- ユーザーが明示的に指定した場合はそれを優先

**Task Types**:
| Type | 特徴 | テンプレート |
|------|------|-------------|
| report | 結果・状況を伝える | 結論→詳細→次のアクション |
| confirm | 確認・質問する | 確認事項→背景→選択肢 |
| request | 依頼・お願いする | 依頼内容→理由→期限 |

### Q4: Before/After 表示

**Question**: どのような形式で変更を表示するか？

**Decision**:
- Before: 元のテキスト
- After: 添削後テキスト
- Changes: 変更ポイントのリスト

**Rationale**:
- ユーザーが何が変わったか一目でわかる
- 学習効果（次回から自分で書ける）
- 変更を受け入れるかの判断材料

### Q5: 文脈の活用方法

**Question**: thread_content をどう活用するか？

**Decision**: オプショナルな文脈情報として扱う

**活用ポイント**:
- 相手の名前を取得して呼びかけに使用
- 相手のトーン（丁寧/カジュアル）を合わせる
- 前の会話で言及された内容を踏まえる

## Summary

| Question | Decision |
|----------|----------|
| ツールの役割 | 添削ロジックは持たない、Claudeが添削 |
| 入出力 | 下書き・オプション → 構造化された添削結果 |
| タスクタイプ判定 | Claudeが判定、明示指定も可能 |
| 表示形式 | Before/After/Changes |
| 文脈活用 | オプショナル、相手・トーンを考慮 |

## Next Steps

1. data-model.md でエンティティを定義
2. contracts/ でツールスキーマを定義
3. quickstart.md で使用例を記載
