# Tasks Document: Agent SDK Integration

- [x] 0. パッケージディレクトリのリネーム
  - File: packages/mcp-server → packages/core
  - pnpm-workspace.yaml の更新
  - Purpose: Agent SDK導入に伴い、MCPサーバー以上の役割を持つため名称変更
  - _Requirements: 1_
  - _Prompt: Implement the task for spec agent-sdk-integration, first run spec-workflow-guide to get the workflow guide then implement the task: Role: DevOps Engineer | Task: Rename packages/mcp-server to packages/core, update pnpm-workspace.yaml and any references | Restrictions: Keep npm package name as slack-task-mcp, update only directory structure | Success: Directory renamed, pnpm install works, no broken imports | After completion: Set task to [-] in tasks.md, log implementation with log-implementation tool, then mark as [x]_

- [x] 1. Agent SDKパッケージのインストール
  - File: packages/core/package.json
  - `@anthropic-ai/claude-agent-sdk` を依存関係に追加
  - Purpose: Agent SDKを利用可能にする
  - _Requirements: 4_
  - _Prompt: Implement the task for spec agent-sdk-integration, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Node.js Developer | Task: Add @anthropic-ai/claude-agent-sdk to package.json dependencies | Restrictions: Do not modify other dependencies, use compatible version | Success: Package installs without errors, SDK is importable | After completion: Set task to [-] in tasks.md, log implementation with log-implementation tool, then mark as [x]_

- [x] 2. エージェント共通設定の作成
  - File: packages/core/src/agents/index.js
  - システムプロンプト定義（分析ルール5つ、返信テンプレート）
  - createAgentOptions ユーティリティ関数
  - Purpose: エージェント共通の設定を一元管理
  - _Leverage: CLAUDE.md の依頼分析ルール、返信添削ルール_
  - _Requirements: 2, 3_
  - _Prompt: Implement the task for spec agent-sdk-integration, first run spec-workflow-guide to get the workflow guide then implement the task: Role: TypeScript/JavaScript Developer | Task: Create agents/index.js with SYSTEM_PROMPTS constant containing analysis rules (5 rules from CLAUDE.md) and reply templates (<結論>, <確認したいこと>, <お願い> format), plus createAgentOptions helper function | Restrictions: Use ES Modules, follow existing code style | Success: Exports SYSTEM_PROMPTS and createAgentOptions, prompts contain all rules from CLAUDE.md | After completion: Set task to [-] in tasks.md, log implementation with log-implementation tool, then mark as [x]_

- [x] 3. 分析エージェントの実装
  - File: packages/core/src/agents/analyze.js
  - Agent SDK query を使用した分析処理
  - Zodスキーマによるレスポンスバリデーション
  - Purpose: Slackスレッドの依頼を高精度で分析
  - _Leverage: src/index.js の AnalysisResultSchema_
  - _Requirements: 2_
  - _Prompt: Implement the task for spec agent-sdk-integration, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Agent SDK Developer | Task: Create agents/analyze.js with analyzeRequest(threadContent, threadUrl) function using Agent SDK query, validate response with AnalysisResultSchema | Restrictions: Use systemPrompt from agents/index.js, handle errors gracefully, timeout 30 seconds | Success: Returns structured analysis matching AnalysisResultSchema, errors are caught and reported | After completion: Set task to [-] in tasks.md, log implementation with log-implementation tool, then mark as [x]_

- [x] 4. 返信添削エージェントの実装
  - File: packages/core/src/agents/draft-reply.js
  - Agent SDK query を使用した添削処理
  - タスクタイプ判定とテンプレート適用
  - Purpose: 下書きを構造化された返信に変換
  - _Leverage: src/index.js の EditedReplySchema_
  - _Requirements: 3_
  - _Prompt: Implement the task for spec agent-sdk-integration, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Agent SDK Developer | Task: Create agents/draft-reply.js with draftReply(draftText, threadContent, taskType, tone) function using Agent SDK query, apply templates based on task type (report/confirm/request) | Restrictions: Use systemPrompt from agents/index.js, validate with EditedReplySchema | Success: Returns structured reply with <結論>/<確認したいこと>/<お願い> format based on task type | After completion: Set task to [-] in tasks.md, log implementation with log-implementation tool, then mark as [x]_

- [x] 5. MCPツール analyze_request の更新
  - File: packages/core/src/index.js
  - analyze_request ツールで分析エージェントを呼び出す
  - 既存のパラメータ構造を維持（後方互換性）
  - Purpose: MCPからエージェントを透過的に利用可能に
  - _Leverage: agents/analyze.js_
  - _Requirements: 4_
  - _Prompt: Implement the task for spec agent-sdk-integration, first run spec-workflow-guide to get the workflow guide then implement the task: Role: MCP Developer | Task: Update analyze_request tool in index.js to call analyzeRequest from agents/analyze.js, maintain existing parameter structure for backward compatibility | Restrictions: Keep existing Zod schemas, handle agent errors with user-friendly messages | Success: analyze_request works with Agent SDK, existing callers continue to work | After completion: Set task to [-] in tasks.md, log implementation with log-implementation tool, then mark as [x]_

- [x] 6. MCPツール draft_reply の更新
  - File: packages/core/src/index.js
  - draft_reply ツールで返信添削エージェントを呼び出す
  - 既存のパラメータ構造を維持（後方互換性）
  - Purpose: MCPからエージェントを透過的に利用可能に
  - _Leverage: agents/draft-reply.js_
  - _Requirements: 4_
  - _Prompt: Implement the task for spec agent-sdk-integration, first run spec-workflow-guide to get the workflow guide then implement the task: Role: MCP Developer | Task: Update draft_reply tool in index.js to call draftReply from agents/draft-reply.js, maintain existing parameter structure | Restrictions: Keep existing Zod schemas, handle agent errors gracefully | Success: draft_reply works with Agent SDK, template format <結論>/<確認したいこと>/<お願い> is consistently applied | After completion: Set task to [-] in tasks.md, log implementation with log-implementation tool, then mark as [x]_

- [x] 7. エラーハンドリングの実装
  - File: packages/core/src/agents/index.js (追加)
  - Claude Code認証エラーの検知と案内
  - タイムアウト処理
  - Purpose: ユーザーフレンドリーなエラー表示
  - _Requirements: 4, 5_
  - _Prompt: Implement the task for spec agent-sdk-integration, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Error Handling Specialist | Task: Add error handling utilities to agents/index.js - detect Claude Code auth errors (guide user to run 'claude' command), implement 30s timeout, catch malformed responses | Restrictions: Error messages in Japanese, don't expose internal errors | Success: Auth errors show clear guidance, timeouts are handled gracefully, users understand what went wrong | After completion: Set task to [-] in tasks.md, log implementation with log-implementation tool, then mark as [x]_

- [x] 8. 統合テスト
  - File: packages/core/tests/agents.test.js
  - 分析エージェントのテスト
  - 返信添削エージェントのテスト
  - エラーケースのテスト
  - Purpose: エージェント動作の信頼性確保
  - _Requirements: All_
  - _Prompt: Implement the task for spec agent-sdk-integration, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Engineer | Task: Create tests/agents.test.js with integration tests for analyzeRequest and draftReply functions, test error handling (timeout, auth errors, invalid responses) | Restrictions: Use vitest, mock Agent SDK for unit tests, test real behavior for integration | Success: Tests cover happy path and error cases, all tests pass | After completion: Set task to [-] in tasks.md, log implementation with log-implementation tool, then mark as [x]_
