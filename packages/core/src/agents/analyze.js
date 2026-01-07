/**
 * 分析エージェント
 *
 * Slackスレッドの依頼を分析し、目的・不明点・確認案・優先度を生成
 */

import { query } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import {
  ANALYZE_SYSTEM_PROMPT,
  AGENT_TIMEOUT_MS,
  createAgentOptions,
  formatAgentError,
} from "./index.js";

// ============================================
// 分析結果スキーマ（バリデーション用）
// ============================================

const UnclearPointSchema = z.object({
  question: z.string().describe("確認すべき質問"),
  impact: z.string().describe("この点が不明だと何が困るか"),
  suggested_options: z.array(z.string()).optional().describe("想定される選択肢"),
});

const NextActionSchema = z.object({
  action: z.string().describe("具体的なアクション内容"),
  estimated_time: z.number().describe("推定所要時間（分）"),
  reason: z.string().nullable().optional().describe("なぜこれが最初のアクションなのか"),
});

const PrioritySchema = z.enum(["high", "medium", "low"]);

export const AnalysisResultSchema = z.object({
  purpose: z.string().describe("依頼の目的（1文で言語化）"),
  deliverable: z.string().nullable().optional().describe("成果物"),
  deadline: z.string().nullable().optional().describe("期限"),
  unclear_points: z.array(UnclearPointSchema).describe("不明点のリスト"),
  confirmation_message: z.string().nullable().optional().describe("確認メッセージ案"),
  next_action: NextActionSchema.describe("ネクストアクション"),
  priority: PrioritySchema.describe("優先度"),
});

/**
 * Slackスレッドの依頼を分析
 *
 * @param {string} threadContent - スレッドの内容
 * @param {string} [threadUrl] - スレッドのURL（参照用）
 * @returns {Promise<object>} 分析結果
 * @throws {Error} エージェント実行エラーまたはバリデーションエラー
 */
export async function analyzeRequest(threadContent, threadUrl) {
  const options = createAgentOptions(ANALYZE_SYSTEM_PROMPT);

  // タイムアウト用のAbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AGENT_TIMEOUT_MS);

  try {
    const prompt = threadUrl
      ? `以下のSlackスレッド（${threadUrl}）を分析してください:\n\n${threadContent}`
      : `以下のSlackスレッドを分析してください:\n\n${threadContent}`;

    const result = await query({
      prompt,
      ...options,
      signal: controller.signal,
    });

    // レスポンスからJSON部分を抽出
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("分析結果のJSONが見つかりませんでした");
    }

    // JSONパースとバリデーション
    const parsed = JSON.parse(jsonMatch[0]);
    const validated = AnalysisResultSchema.parse(parsed);

    return validated;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("処理がタイムアウトしました。再試行してください。");
    }

    if (error.name === "ZodError") {
      throw new Error(`分析結果の形式が不正です: ${error.message}`);
    }

    throw new Error(formatAgentError(error));
  } finally {
    clearTimeout(timeoutId);
  }
}
