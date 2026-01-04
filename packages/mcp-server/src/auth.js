#!/usr/bin/env node

/**
 * OAuth 認証モジュール
 *
 * Cloudflare Workers を使った OAuth 認証フロー
 */

import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import os from "os";
import open from "open";

// 定数
const DATA_DIR = path.join(os.homedir(), ".slack-task-mcp");
const CREDENTIALS_FILE = path.join(DATA_DIR, "credentials.json");
const AUTH_TIMEOUT = 5 * 60 * 1000; // 5分
const POLL_INTERVAL = 2000; // 2秒

// OAuth Worker URL
const OAUTH_WORKER_URL = process.env.OAUTH_WORKER_URL || "https://slack-task-mcp-oauth.ignission.workers.dev";

/**
 * データディレクトリを初期化
 */
async function initDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (err) {
    // 既に存在する場合は無視
  }
}

/**
 * credentials.json を読み込み
 */
export async function loadCredentials() {
  try {
    const data = await fs.readFile(CREDENTIALS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    return null;
  }
}

/**
 * credentials.json を保存
 */
async function saveCredentials(credentials) {
  await initDataDir();
  await fs.writeFile(
    CREDENTIALS_FILE,
    JSON.stringify(credentials, null, 2),
    { mode: 0o600 }
  );
}

/**
 * credentials.json を削除
 */
async function deleteCredentials() {
  try {
    await fs.unlink(CREDENTIALS_FILE);
    return true;
  } catch (err) {
    return false;
  }
}

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
    } catch (err) {
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
        // credentials を保存
        const credentials = {
          access_token: result.access_token,
          token_type: result.token_type,
          scope: result.scope,
          user_id: result.user_id,
          team_id: result.team_id,
          team_name: result.team_name,
          created_at: result.created_at,
        };

        await saveCredentials(credentials);

        console.log("");
        console.log("✅ 認証が完了しました！");
        console.log(`   ワークスペース: ${credentials.team_name}`);
        console.log(`   トークンは ${CREDENTIALS_FILE} に保存されました`);

        return true;
      }

      if (result.status === "error") {
        console.error("");
        console.error(`❌ 認証エラー: ${result.error}`);
        return false;
      }

      // pending の場合は継続
      process.stdout.write(".");
    } catch (err) {
      // ネットワークエラーは無視して継続
      process.stdout.write("x");
    }
  }

  console.error("");
  console.error("❌ 認証がタイムアウトしました（5分）");
  return false;
}

/**
 * 認証状態を表示
 */
export async function showStatus() {
  const credentials = await loadCredentials();

  console.log("📋 認証状態");
  console.log("");

  if (!credentials) {
    console.log("状態: ❌ 未認証");
    console.log("");
    console.log("`npx slack-task-mcp auth` を実行して認証してください");
    return;
  }

  console.log("状態: ✅ 認証済み");
  console.log(`ユーザー ID: ${credentials.user_id}`);
  console.log(`ワークスペース: ${credentials.team_name} (${credentials.team_id})`);
  console.log(`認証日時: ${credentials.created_at}`);
  console.log(`スコープ: ${credentials.scope}`);
}

/**
 * ログアウト
 */
export async function logout() {
  const credentials = await loadCredentials();

  if (!credentials) {
    console.log("ℹ️ 認証情報はありません");
    return true;
  }

  const deleted = await deleteCredentials();

  if (deleted) {
    console.log("✅ ログアウトしました");
    console.log(`   ${CREDENTIALS_FILE} を削除しました`);
    return true;
  } else {
    console.error("❌ ログアウトに失敗しました");
    return false;
  }
}
