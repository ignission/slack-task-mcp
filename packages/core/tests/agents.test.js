/**
 * Agent SDK統合テスト
 */

import { describe, expect, it, vi } from "vitest";

// Agent SDKをモック
vi.mock("@anthropic-ai/claude-agent-sdk", () => ({
  query: vi.fn(),
}));

import { query } from "@anthropic-ai/claude-agent-sdk";
import { analyzeRequest, AnalysisResultSchema } from "../src/agents/analyze.js";
import { draftReply, EditedReplySchema } from "../src/agents/draft-reply.js";
import {
  ANALYZE_SYSTEM_PROMPT,
  DRAFT_REPLY_SYSTEM_PROMPT,
  createAgentOptions,
  formatAgentError,
  AGENT_TIMEOUT_MS,
} from "../src/agents/index.js";

describe("エージェント共通設定", () => {
  it("ANALYZE_SYSTEM_PROMPTが5つの分析ルールを含む", () => {
    expect(ANALYZE_SYSTEM_PROMPT).toContain("目的の明確化");
    expect(ANALYZE_SYSTEM_PROMPT).toContain("不明点の洗い出し");
    expect(ANALYZE_SYSTEM_PROMPT).toContain("確認メッセージ案");
    expect(ANALYZE_SYSTEM_PROMPT).toContain("タスク分解");
    expect(ANALYZE_SYSTEM_PROMPT).toContain("優先度の判定");
  });

  it("DRAFT_REPLY_SYSTEM_PROMPTが3つのテンプレートを含む", () => {
    expect(DRAFT_REPLY_SYSTEM_PROMPT).toContain("報告系");
    expect(DRAFT_REPLY_SYSTEM_PROMPT).toContain("確認系");
    expect(DRAFT_REPLY_SYSTEM_PROMPT).toContain("依頼系");
    expect(DRAFT_REPLY_SYSTEM_PROMPT).toContain("<結論>");
    expect(DRAFT_REPLY_SYSTEM_PROMPT).toContain("<確認したいこと>");
    expect(DRAFT_REPLY_SYSTEM_PROMPT).toContain("<お願い>");
  });

  it("createAgentOptionsがAgent SDK用オプションを返す", () => {
    const options = createAgentOptions("test prompt");
    expect(options.systemPrompt).toBe("test prompt");
    expect(options.allowedTools).toContain("Read");
    expect(options.permissionMode).toBe("bypassPermissions");
  });

  it("AGENT_TIMEOUT_MSが30秒", () => {
    expect(AGENT_TIMEOUT_MS).toBe(30000);
  });
});

describe("formatAgentError", () => {
  it("認証エラーをユーザーフレンドリーに変換", () => {
    const error = new Error("Claude Code not found");
    const message = formatAgentError(error);
    expect(message).toContain("認証されていません");
    expect(message).toContain("claude");
  });

  it("タイムアウトエラーを変換", () => {
    const error = new Error("timeout occurred");
    const message = formatAgentError(error);
    expect(message).toContain("タイムアウト");
  });

  it("レート制限エラーを変換", () => {
    const error = new Error("rate limit exceeded");
    const message = formatAgentError(error);
    expect(message).toContain("レート制限");
  });

  it("一般的なエラーをそのまま表示", () => {
    const error = new Error("something went wrong");
    const message = formatAgentError(error);
    expect(message).toContain("something went wrong");
  });
});

describe("AnalysisResultSchema", () => {
  it("有効な分析結果をパース", () => {
    const validResult = {
      purpose: "週次レポートを作成する",
      unclear_points: [],
      next_action: {
        action: "データを集める",
        estimated_time: 5,
      },
      priority: "medium",
    };

    const result = AnalysisResultSchema.parse(validResult);
    expect(result.purpose).toBe("週次レポートを作成する");
    expect(result.priority).toBe("medium");
  });

  it("不正な優先度を拒否", () => {
    const invalidResult = {
      purpose: "test",
      unclear_points: [],
      next_action: { action: "test", estimated_time: 5 },
      priority: "invalid",
    };

    expect(() => AnalysisResultSchema.parse(invalidResult)).toThrow();
  });
});

describe("EditedReplySchema", () => {
  it("有効な添削結果をパース", () => {
    const validResult = {
      task_type: "report",
      after: "添削後のテキスト",
      structure: {
        conclusion: "結論です",
      },
      changes: [],
      tone: "formal",
    };

    const result = EditedReplySchema.parse(validResult);
    expect(result.task_type).toBe("report");
    expect(result.tone).toBe("formal");
  });

  it("不正なタスクタイプを拒否", () => {
    const invalidResult = {
      task_type: "invalid",
      after: "test",
      structure: { conclusion: "test" },
      changes: [],
      tone: "formal",
    };

    expect(() => EditedReplySchema.parse(invalidResult)).toThrow();
  });
});

// AsyncGeneratorを返すモックヘルパー
function createMockGenerator(resultText) {
  return async function* () {
    yield { type: "result", subtype: "success", result: resultText };
  };
}

describe("analyzeRequest", () => {
  it("Agent SDKを呼び出して分析結果を返す", async () => {
    const mockResponse = JSON.stringify({
      purpose: "テスト依頼の目的",
      unclear_points: [
        {
          question: "期限はいつですか？",
          impact: "スケジュールが組めない",
        },
      ],
      next_action: {
        action: "期限を確認する",
        estimated_time: 2,
        reason: "最初に確認すべき",
      },
      priority: "high",
    });

    query.mockReturnValueOnce(createMockGenerator(mockResponse)());

    const result = await analyzeRequest("テストスレッド内容", "https://slack.com/test");

    expect(query).toHaveBeenCalled();
    expect(result.purpose).toBe("テスト依頼の目的");
    expect(result.priority).toBe("high");
    expect(result.unclear_points).toHaveLength(1);
  });

  it("JSONがない場合エラーを投げる", async () => {
    query.mockReturnValueOnce(createMockGenerator("JSONを含まない応答")());

    await expect(analyzeRequest("テスト")).rejects.toThrow("JSONが見つかりませんでした");
  });
});

describe("draftReply", () => {
  it("Agent SDKを呼び出して添削結果を返す", async () => {
    const mockResponse = JSON.stringify({
      task_type: "report",
      after: "<結論>完了しました。",
      structure: {
        conclusion: "完了しました",
      },
      changes: [
        {
          type: "structure",
          description: "結論を先に",
          reason: "わかりやすさ向上",
        },
      ],
      tone: "formal",
    });

    query.mockReturnValueOnce(createMockGenerator(mockResponse)());

    const result = await draftReply("完了した", undefined, undefined, "formal");

    expect(query).toHaveBeenCalled();
    expect(result.task_type).toBe("report");
    expect(result.after).toContain("結論");
    expect(result.changes).toHaveLength(1);
  });

  it("JSONがない場合エラーを投げる", async () => {
    query.mockReturnValueOnce(createMockGenerator("JSONを含まない応答")());

    await expect(draftReply("テスト")).rejects.toThrow("JSONが見つかりませんでした");
  });
});
