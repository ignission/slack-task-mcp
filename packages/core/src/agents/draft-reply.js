/**
 * 返信添削エージェント
 *
 * 下書きを添削し、テンプレートに沿った構造化返信を生成
 */

import { query } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import {
  DRAFT_REPLY_SYSTEM_PROMPT,
  AGENT_TIMEOUT_MS,
  createAgentOptions,
  formatAgentError,
} from "./index.js";

// ============================================
// 返信添削結果スキーマ（バリデーション用）
// ============================================

const TaskTypeSchema = z.enum(["report", "confirm", "request"]);
const ToneSchema = z.enum(["formal", "casual"]);
const ChangeTypeSchema = z.enum(["structure", "simplify", "clarify", "tone", "logic", "add"]);

const ChangeSchema = z.object({
  type: ChangeTypeSchema.describe("変更の種類"),
  description: z.string().describe("変更内容の説明"),
  reason: z.string().describe("変更の理由"),
});

const ReplyStructureSchema = z.object({
  conclusion: z.string().describe("結論（何を伝えたいか）"),
  reasoning: z.string().nullable().optional().describe("根拠（なぜそう言えるか）"),
  action: z.string().nullable().optional().describe("アクション"),
});

export const EditedReplySchema = z.object({
  task_type: TaskTypeSchema.describe("タスクタイプ"),
  after: z.string().describe("添削後のテキスト"),
  structure: ReplyStructureSchema.describe("構造化された返信"),
  changes: z.array(ChangeSchema).describe("変更ポイント"),
  tone: ToneSchema.describe("適用されたトーン"),
});

/**
 * 返信を添削
 *
 * @param {string} draftText - 添削対象の下書き
 * @param {string} [threadContent] - 文脈用のスレッド内容
 * @param {string} [taskType] - タスクタイプ（report/confirm/request）
 * @param {string} [tone] - トーン（formal/casual）
 * @returns {Promise<object>} 添削結果
 * @throws {Error} エージェント実行エラーまたはバリデーションエラー
 */
export async function draftReply(draftText, threadContent, taskType, tone = "formal") {
  const options = createAgentOptions(DRAFT_REPLY_SYSTEM_PROMPT);

  // タイムアウト用のAbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AGENT_TIMEOUT_MS);

  try {
    let prompt = `以下の下書きを添削してください:\n\n「${draftText}」`;

    if (threadContent) {
      prompt += `\n\n文脈となるスレッド内容:\n${threadContent}`;
    }

    if (taskType) {
      prompt += `\n\nタスクタイプ: ${taskType}`;
    }

    prompt += `\n\nトーン: ${tone}`;

    const result = await query({
      prompt,
      ...options,
      signal: controller.signal,
    });

    // レスポンスからJSON部分を抽出
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("添削結果のJSONが見つかりませんでした");
    }

    // JSONパースとバリデーション
    const parsed = JSON.parse(jsonMatch[0]);
    const validated = EditedReplySchema.parse(parsed);

    return validated;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("処理がタイムアウトしました。再試行してください。");
    }

    if (error.name === "ZodError") {
      throw new Error(`添削結果の形式が不正です: ${error.message}`);
    }

    throw new Error(formatAgentError(error));
  } finally {
    clearTimeout(timeoutId);
  }
}
