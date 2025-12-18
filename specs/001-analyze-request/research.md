# Research: analyze_request

**Feature**: 001-analyze-request
**Date**: 2025-12-18

## Research Questions

### Q1: MCPツールの役割分担

**Question**: analyze_request ツールは分析ロジック自体を持つべきか？

**Decision**: 分析ロジックは持たない。Claudeの推論能力を活用する。

**Rationale**:
- 仕様のAssumptionsに明記: 「分析はClaudeの推論能力を活用する（MCPツールは分析ロジック自体を持たない）」
- LLMの強みを活かす設計（自然言語理解、文脈把握）
- MCPツールはシンプルに保つ（constitution原則VII: Simplicity & Maintainability）

**Alternatives Considered**:
- ルールベースの分析エンジン → 柔軟性が低い、日本語対応が複雑
- 別のLLM API呼び出し → 複雑化、コスト増加

### Q2: ツールの入出力設計

**Question**: analyze_request ツールの入力と出力は何か？

**Decision**:
- **入力**: スレッドメッセージのテキスト（get_slack_threadの出力を受け取る）
- **出力**: 構造化された分析結果（AnalysisResult）

**Rationale**:
- Claudeが分析を行うため、ツール自体は入力テキストを受け取り、構造化フォーマットで出力を返すだけ
- MCPツールの役割は「出力フォーマットの定義」と「Claudeへの分析プロンプトの提供」

**Implementation Approach**:
```
ユーザー: "このスレッドを分析して"
    ↓
Claude: get_slack_thread を呼び出し
    ↓
Claude: スレッド内容を分析（Claude自身の推論）
    ↓
Claude: analyze_request ツールを呼び出し、分析結果を構造化して保存/表示
```

### Q3: プロンプトエンジニアリング

**Question**: Claudeが適切な分析を行うために、どのようなガイダンスが必要か？

**Decision**: CLAUDE.md の「依頼分析のルール」セクションでガイダンスを提供（既に実装済み）

**Rationale**:
- MCPツール内にプロンプトを埋め込むより、CLAUDE.mdで管理する方が柔軟
- ユーザーがカスタマイズしやすい
- 既存の「依頼分析のルール」が十分なガイダンスを提供

**Key Guidelines** (CLAUDE.md より):
1. 目的の明確化: 最終ゴール、成果物、関係者を特定
2. 不明点の洗い出し: 確認しないと手戻りになる点を特定
3. 確認メッセージ案: 簡潔で相手が答えやすい形式
4. タスク分解: 5分以内のステップに分解

### Q4: 既存ツールとの連携

**Question**: get_slack_thread と analyze_request の連携方法は？

**Decision**: 2つの独立したツールとして実装し、Claudeがオーケストレーション

**Rationale**:
- 疎結合を保つ（各ツールが単一責任）
- get_slack_thread は汎用的に使える（分析以外の用途も可能）
- Claudeが状況に応じてツールを組み合わせられる

**Workflow**:
1. `get_slack_thread(url)` → スレッドメッセージを取得
2. Claude が分析を実行（CLAUDE.mdのルールに従う）
3. `analyze_request(thread_content, analysis)` → 分析結果を構造化・保存

### Q5: 分析結果の永続化

**Question**: 分析結果はどこに保存するか？

**Decision**: タスクと一緒に `~/.slack-task-mcp/tasks.json` に保存

**Rationale**:
- constitution原則II: Slack as Context DB（文脈情報を保持）
- constitution原則VI: Data Persistence（セッションをまたいで継続）
- 分析結果はタスクの一部として管理することで、後から参照可能

**Data Structure**:
```json
{
  "tasks": [
    {
      "id": "xxx",
      "thread_url": "https://xxx.slack.com/...",
      "analysis": {
        "purpose": "...",
        "deliverable": "...",
        "deadline": "...",
        "unclear_points": [...],
        "confirmation_message": "...",
        "next_action": {...},
        "priority": "high"
      },
      "steps": [...],
      "created_at": "..."
    }
  ]
}
```

## Summary

| Question | Decision |
|----------|----------|
| ツールの役割 | 分析ロジックは持たない、Claudeが分析 |
| 入出力 | テキスト入力 → 構造化出力 |
| プロンプト | CLAUDE.mdで管理 |
| ツール連携 | 独立したツール、Claudeがオーケストレーション |
| 永続化 | tasks.jsonに保存 |

## Next Steps

1. data-model.md でエンティティを定義
2. contracts/ でツールスキーマを定義
3. quickstart.md で使用例を記載
