#!/usr/bin/env node

/**
 * OAuth 認証モジュール
 *
 * ローカル HTTP サーバーを使った OAuth 認証フロー
 */

import crypto from "node:crypto";
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

// Slack OAuth URLs
const SLACK_AUTHORIZE_URL = "https://slack.com/oauth/v2/authorize";
const SLACK_TOKEN_URL = "https://slack.com/api/oauth.v2.access";

// 必要なスコープ
const USER_SCOPES = [
  "channels:history",
  "groups:history",
  "im:history",
  "mpim:history",
  "users:read",
  "search:read",
].join(",");

/**
 * 環境変数を取得（必須チェック付き）
 */
function getEnvVar(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `環境変数 ${name} が設定されていません。\n` +
      `Slack App の設定から取得して設定してください。\n` +
      `詳細: https://github.com/ignission/slack-task-mcp#setup`
    );
  }
  return value;
}

/**
 * state パラメータを生成（CSRF対策）
 */
function generateState() {
  return crypto.randomBytes(16).toString("hex");
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
 * 認可コードをアクセストークンに交換
 */
async function exchangeCodeForToken(code, redirectUri, clientId, clientSecret) {
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code: code,
    redirect_uri: redirectUri,
  });

  const response = await fetch(SLACK_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const data = await response.json();

  if (!data.ok) {
    throw new Error(data.error || "トークン交換に失敗しました");
  }

  return data;
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
 * ローカルサーバーを起動してOAuth認証を実行
 */
async function startLocalOAuthServer(options = {}) {
  const noBrowser = options.noBrowser || false;

  // 環境変数チェック
  let clientId, clientSecret;
  try {
    clientId = getEnvVar("SLACK_CLIENT_ID");
    clientSecret = getEnvVar("SLACK_CLIENT_SECRET");
  } catch (err) {
    console.error(`❌ ${err.message}`);
    return false;
  }

  // 空きポートを探す
  const port = await findAvailablePort(DEFAULT_PORT);
  const redirectUri = `http://localhost:${port}/callback`;
  const state = generateState();

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
        const code = url.searchParams.get("code");
        const returnedState = url.searchParams.get("state");
        const error = url.searchParams.get("error");

        // エラーチェック
        if (error) {
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(htmlResponse("認証キャンセル", "このウィンドウを閉じてください。", true));
          console.error("");
          console.error(`❌ 認証がキャンセルされました: ${error}`);
          cleanup();
          resolve(false);
          return;
        }

        // state検証（CSRF対策）
        if (returnedState !== state) {
          res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
          res.end(htmlResponse("セキュリティエラー", "state パラメータが一致しません。", true));
          console.error("");
          console.error("❌ セキュリティエラー: state パラメータが一致しません");
          cleanup();
          resolve(false);
          return;
        }

        if (!code) {
          res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
          res.end(htmlResponse("エラー", "認可コードがありません。", true));
          console.error("");
          console.error("❌ 認可コードがありません");
          cleanup();
          resolve(false);
          return;
        }

        try {
          // トークン交換
          const tokenData = await exchangeCodeForToken(code, redirectUri, clientId, clientSecret);

          // credentials を保存
          const credentials = {
            access_token: tokenData.authed_user.access_token,
            token_type: "user",
            scope: tokenData.authed_user.scope,
            user_id: tokenData.authed_user.id,
            team_id: tokenData.team.id,
            team_name: tokenData.team.name,
            team_domain: tokenData.team.domain || extractDomainFromTeamName(tokenData.team.name),
            created_at: new Date().toISOString(),
          };

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
          console.error(`❌ トークン取得エラー: ${err.message}`);
          cleanup();
          resolve(false);
        }
      } else {
        res.writeHead(404);
        res.end("Not Found");
      }
    });

    server.listen(port, "127.0.0.1", () => {
      // OAuth URL を生成
      const params = new URLSearchParams({
        client_id: clientId,
        user_scope: USER_SCOPES,
        redirect_uri: redirectUri,
        state: state,
      });
      const authUrl = `${SLACK_AUTHORIZE_URL}?${params.toString()}`;

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
      console.log(`(ローカルサーバー: http://localhost:${port})`);
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
  return startLocalOAuthServer(options);
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
