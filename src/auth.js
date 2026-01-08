#!/usr/bin/env node

/**
 * OAuth 認証モジュール
 *
 * ハイブリッド方式: Cloudflare Worker + ローカルサーバー
 * - Worker: トークン交換（Client Secretを安全に保持）
 * - ローカルサーバー: コールバック受け取り（KV不要で即時反映）
 */

import http from "node:http";
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
const DEFAULT_PORT = 8888;
const MAX_PORT_ATTEMPTS = 10;

// OAuth Worker URL
const OAUTH_WORKER_URL =
  process.env.OAUTH_WORKER_URL || "https://slack-task-mcp-oauth.ignission.workers.dev";

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
 * 空いているポートを探す
 */
async function findAvailablePort(startPort) {
  for (let port = startPort; port < startPort + MAX_PORT_ATTEMPTS; port++) {
    const available = await new Promise((resolve) => {
      const server = http.createServer();
      server.once("error", () => resolve(false));
      server.once("listening", () => {
        server.close();
        resolve(true);
      });
      server.listen(port, "127.0.0.1");
    });
    if (available) return port;
  }
  throw new Error(`ポート ${startPort}-${startPort + MAX_PORT_ATTEMPTS - 1} が全て使用中です`);
}

/**
 * HTMLレスポンスを生成
 */
function htmlResponse(title, message, isError = false) {
  const icon = isError ? "❌" : "✅";
  const color = isError ? "#dc3545" : "#28a745";
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: #f5f5f5;
    }
    .container {
      text-align: center;
      padding: 40px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { color: ${color}; margin: 0 0 16px 0; }
    p { color: #666; margin: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
}

/**
 * ハイブリッド方式でOAuth認証を実行
 * 1. ローカルサーバーを起動
 * 2. Worker経由でSlack認証
 * 3. Workerがトークン交換後、ローカルサーバーにリダイレクト
 */
async function startHybridOAuth(options = {}) {
  const noBrowser = options.noBrowser || false;

  // 空きポートを探す
  const port = await findAvailablePort(DEFAULT_PORT);

  return new Promise((resolve) => {
    let server;
    let timeoutId;

    const cleanup = () => {
      clearTimeout(timeoutId);
      if (server) {
        server.close();
      }
    };

    server = http.createServer(async (req, res) => {
      const url = new URL(req.url, `http://localhost:${port}`);

      if (url.pathname === "/callback") {
        // Workerからリダイレクトされてきたトークン情報を取得
        const accessToken = url.searchParams.get("access_token");
        const error = url.searchParams.get("error");

        if (error) {
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(htmlResponse("認証キャンセル", "このウィンドウを閉じてください。", true));
          console.error("");
          console.error(`❌ 認証がキャンセルされました: ${error}`);
          cleanup();
          resolve(false);
          return;
        }

        if (!accessToken) {
          res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
          res.end(htmlResponse("エラー", "トークンが取得できませんでした。", true));
          console.error("");
          console.error("❌ トークンが取得できませんでした");
          cleanup();
          resolve(false);
          return;
        }

        // credentials を保存
        const teamName = url.searchParams.get("team_name") || "Unknown";
        const teamDomain = url.searchParams.get("team_domain") || extractDomainFromTeamName(teamName);
        const credentials = {
          access_token: accessToken,
          token_type: url.searchParams.get("token_type") || "user",
          scope: url.searchParams.get("scope") || "",
          user_id: url.searchParams.get("user_id") || "",
          team_id: url.searchParams.get("team_id") || "",
          team_name: teamName,
          team_domain: teamDomain,
          created_at: new Date().toISOString(),
        };

        try {
          await saveCredentials(credentials);

          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(htmlResponse(
            "認証が完了しました！",
            `ワークスペース: ${credentials.team_name}<br>このウィンドウを閉じてください。`
          ));

          console.log("");
          console.log("✅ 認証が完了しました！");
          console.log(`   ワークスペース: ${credentials.team_name}`);
          console.log(`   ドメイン: ${credentials.team_domain}.slack.com`);
          console.log(`   保存先: ${getCredentialsDir()}/${credentials.team_id}.json`);

          cleanup();
          resolve(true);
        } catch (err) {
          res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
          res.end(htmlResponse("エラー", err.message, true));
          console.error("");
          console.error(`❌ 認証情報の保存に失敗: ${err.message}`);
          cleanup();
          resolve(false);
        }
      } else {
        res.writeHead(404);
        res.end("Not Found");
      }
    });

    server.listen(port, "127.0.0.1", () => {
      // Worker の認証 URL を生成
      const authUrl = `${OAUTH_WORKER_URL}/auth?port=${port}`;

      console.log("🔐 Slack OAuth 認証を開始します...");
      console.log("");

      if (noBrowser) {
        console.log("以下の URL をブラウザで開いてください:");
        console.log("");
        console.log(authUrl);
      } else {
        console.log("ブラウザで Slack ログイン画面を開いています...");
        open(authUrl).catch(() => {
          console.log("");
          console.log("ブラウザを自動で開けませんでした。以下の URL を手動で開いてください:");
          console.log("");
          console.log(authUrl);
        });
      }

      console.log("");
      console.log("認証が完了するまで待機中...");
      console.log(`(コールバック待機: http://localhost:${port})`);
    });

    // タイムアウト設定
    timeoutId = setTimeout(() => {
      console.error("");
      console.error("❌ 認証がタイムアウトしました（5分）");
      cleanup();
      resolve(false);
    }, AUTH_TIMEOUT);
  });
}

/**
 * OAuth 認証フローを実行
 */
export async function authenticate(options = {}) {
  return startHybridOAuth(options);
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
