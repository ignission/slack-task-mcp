#!/usr/bin/env node

/**
 * OAuth 認証モジュール
 *
 * Cloudflare Workers を使った OAuth 認証フロー
 */

import crypto from "node:crypto";
import open from "open";
import {
  listWorkspaces,
  saveCredentials,
  deleteCredentialsByDomain,
  deleteAllCredentials,
  getCredentialsDir,
} from "./credentials.js";

// 定数
const AUTH_TIMEOUT = 5 * 60 * 1000; // 5分
const POLL_INTERVAL = 2000; // 2秒

// OAuth Worker URL
const OAUTH_WORKER_URL =
  process.env.OAUTH_WORKER_URL || "https://slack-task-mcp-oauth.ignission.workers.dev";

/**
 * セッション ID を生成
 */
function generateSessionId() {
  return crypto.randomBytes(16).toString("hex");
}

/**
 * Worker にポーリングしてトークンを取得
 */
async function pollForToken(sessionId) {
  const pollUrl = `${OAUTH_WORKER_URL}/poll?session_id=${sessionId}`;

  const response = await fetch(pollUrl);
  const data = await response.json();

  return data;
}

/**
 * OAuth 認証フローを実行
 * Cloudflare Workers を使用
 */
export async function authenticate(options = {}) {
  const noBrowser = options.noBrowser || false;

  // セッション ID を生成
  const sessionId = generateSessionId();

  // Worker の認証 URL を生成
  const authUrl = `${OAUTH_WORKER_URL}/auth?session_id=${sessionId}`;

  console.log("🔐 Slack OAuth 認証を開始します...");
  console.log("");

  if (noBrowser) {
    console.log("以下の URL をブラウザで開いてください:");
    console.log("");
    console.log(authUrl);
  } else {
    console.log("ブラウザで Slack ログイン画面を開いています...");
    try {
      await open(authUrl);
    } catch (_err) {
      console.log("");
      console.log("ブラウザを自動で開けませんでした。以下の URL を手動で開いてください:");
      console.log("");
      console.log(authUrl);
    }
  }

  console.log("");
  console.log("認証が完了するまで待機中...");

  // ポーリング開始
  const startTime = Date.now();

  while (Date.now() - startTime < AUTH_TIMEOUT) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));

    try {
      const result = await pollForToken(sessionId);

      if (result.status === "success") {
        // credentials を保存（team_domain を追加）
        const credentials = {
          access_token: result.access_token,
          token_type: result.token_type,
          scope: result.scope,
          user_id: result.user_id,
          team_id: result.team_id,
          team_name: result.team_name,
          team_domain: result.team_domain || extractDomainFromTeamName(result.team_name),
          created_at: result.created_at,
        };

        await saveCredentials(credentials);

        console.log("");
        console.log("✅ 認証が完了しました！");
        console.log(`   ワークスペース: ${credentials.team_name}`);
        console.log(`   ドメイン: ${credentials.team_domain}.slack.com`);
        console.log(`   保存先: ${getCredentialsDir()}/${credentials.team_id}.json`);

        return true;
      }

      if (result.status === "error") {
        console.error("");
        console.error(`❌ 認証エラー: ${result.error}`);
        return false;
      }

      // pending の場合は継続
      process.stdout.write(".");
    } catch (_err) {
      // ネットワークエラーは無視して継続
      process.stdout.write("x");
    }
  }

  console.error("");
  console.error("❌ 認証がタイムアウトしました（5分）");
  return false;
}

/**
 * team_nameからドメインを推測（フォールバック用）
 */
function extractDomainFromTeamName(teamName) {
  return teamName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * 認証状態を表示
 */
export async function showStatus() {
  const workspaces = await listWorkspaces();

  console.log("📋 認証状態");
  console.log("");

  if (workspaces.length === 0) {
    console.log("状態: ❌ 未認証");
    console.log("");
    console.log("`npx @ignission/slack-task-mcp auth login` を実行して認証してください");
    return;
  }

  console.log(`状態: ✅ ${workspaces.length} ワークスペース認証済み`);
  console.log("");

  for (const ws of workspaces) {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📌 ${ws.team_name}`);
    console.log(`   ドメイン: ${ws.team_domain}.slack.com`);
    console.log(`   チームID: ${ws.team_id}`);
    console.log(`   ユーザーID: ${ws.user_id}`);
    console.log(`   認証日時: ${ws.created_at}`);
  }
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

/**
 * ログアウト
 * @param {object} options
 * @param {string} [options.workspace] - ログアウトするワークスペース名またはドメイン
 */
export async function logout(options = {}) {
  const { workspace } = options;

  if (workspace) {
    // 指定ワークスペースのみログアウト
    const deleted = await deleteCredentialsByDomain(workspace);

    if (deleted) {
      console.log(`✅ ワークスペース「${workspace}」からログアウトしました`);
      return true;
    }

    console.error(`❌ ワークスペース「${workspace}」が見つかりません`);
    console.log("");
    console.log("`npx @ignission/slack-task-mcp auth status` で認証済みワークスペースを確認してください");
    return false;
  }

  // 全ワークスペースをログアウト
  const workspaces = await listWorkspaces();

  if (workspaces.length === 0) {
    console.log("ℹ️ 認証情報はありません");
    return true;
  }

  const count = await deleteAllCredentials();

  console.log(`✅ ${count} ワークスペースからログアウトしました`);
  return true;
}
