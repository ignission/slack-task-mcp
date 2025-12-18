#!/usr/bin/env node

/**
 * OAuth 認証モジュール
 *
 * Slack OAuth 2.0 認証フローを実装
 */

import http from "http";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import os from "os";
import open from "open";

// 定数
const DATA_DIR = path.join(os.homedir(), ".slack-task-mcp");
const CREDENTIALS_FILE = path.join(DATA_DIR, "credentials.json");
const DEFAULT_PORT = 3000;
const AUTH_TIMEOUT = 5 * 60 * 1000; // 5分

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
].join(",");

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
 * 環境変数から Client ID/Secret を取得
 */
function getClientCredentials() {
  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  return { clientId, clientSecret };
}

/**
 * OAuth 認可 URL を生成
 */
function generateAuthUrl(clientId, redirectUri, state) {
  const params = new URLSearchParams({
    client_id: clientId,
    user_scope: USER_SCOPES,
    redirect_uri: redirectUri,
    state: state,
  });

  return `${SLACK_AUTHORIZE_URL}?${params.toString()}`;
}

/**
 * 認可コードをアクセストークンに交換
 */
async function exchangeCodeForToken(code, clientId, clientSecret, redirectUri) {
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
    throw new Error(`Slack API error: ${data.error}`);
  }

  return data;
}

/**
 * OAuth 認証フローを実行
 */
export async function authenticate(options = {}) {
  const port = options.port || DEFAULT_PORT;
  const noBrowser = options.noBrowser || false;

  // Client ID/Secret を確認
  const clientCreds = getClientCredentials();
  if (!clientCreds) {
    console.error("❌ SLACK_CLIENT_ID と SLACK_CLIENT_SECRET を環境変数に設定してください");
    console.error("");
    console.error("設定方法:");
    console.error("  export SLACK_CLIENT_ID=your-client-id");
    console.error("  export SLACK_CLIENT_SECRET=your-client-secret");
    console.error("");
    console.error("Slack App の作成手順は specs/003-oauth-auth/quickstart.md を参照してください");
    return false;
  }

  const { clientId, clientSecret } = clientCreds;
  const redirectUri = `http://localhost:${port}/callback`;
  const state = crypto.randomBytes(16).toString("hex");

  return new Promise((resolve) => {
    let server;
    let timeoutId;

    // タイムアウト設定
    timeoutId = setTimeout(() => {
      console.error("\n❌ 認証がタイムアウトしました（5分）");
      server?.close();
      resolve(false);
    }, AUTH_TIMEOUT);

    // ローカルサーバー起動
    server = http.createServer(async (req, res) => {
      const url = new URL(req.url, `http://localhost:${port}`);

      if (url.pathname === "/callback") {
        const code = url.searchParams.get("code");
        const returnedState = url.searchParams.get("state");
        const error = url.searchParams.get("error");

        // エラーチェック
        if (error) {
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(`
            <html>
              <body style="font-family: sans-serif; text-align: center; padding: 50px;">
                <h1>❌ 認証がキャンセルされました</h1>
                <p>このウィンドウを閉じてください。</p>
              </body>
            </html>
          `);
          clearTimeout(timeoutId);
          server.close();
          resolve(false);
          return;
        }

        // state 検証
        if (returnedState !== state) {
          res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
          res.end(`
            <html>
              <body style="font-family: sans-serif; text-align: center; padding: 50px;">
                <h1>❌ セキュリティエラー</h1>
                <p>state パラメータが一致しません。再度認証を試みてください。</p>
              </body>
            </html>
          `);
          clearTimeout(timeoutId);
          server.close();
          resolve(false);
          return;
        }

        try {
          // トークン交換
          const tokenData = await exchangeCodeForToken(code, clientId, clientSecret, redirectUri);

          // credentials を保存
          const credentials = {
            access_token: tokenData.authed_user.access_token,
            token_type: "user",
            scope: tokenData.authed_user.scope,
            user_id: tokenData.authed_user.id,
            team_id: tokenData.team.id,
            team_name: tokenData.team.name,
            created_at: new Date().toISOString(),
          };

          await saveCredentials(credentials);

          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(`
            <html>
              <body style="font-family: sans-serif; text-align: center; padding: 50px;">
                <h1>✅ 認証が完了しました！</h1>
                <p>ワークスペース: ${credentials.team_name}</p>
                <p>このウィンドウを閉じて、ターミナルに戻ってください。</p>
              </body>
            </html>
          `);

          console.log("");
          console.log("✅ 認証が完了しました！");
          console.log(`   ワークスペース: ${credentials.team_name}`);
          console.log(`   トークンは ${CREDENTIALS_FILE} に保存されました`);

          clearTimeout(timeoutId);
          server.close();
          resolve(true);

        } catch (err) {
          res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
          res.end(`
            <html>
              <body style="font-family: sans-serif; text-align: center; padding: 50px;">
                <h1>❌ エラーが発生しました</h1>
                <p>${err.message}</p>
              </body>
            </html>
          `);
          console.error(`\n❌ トークン交換エラー: ${err.message}`);
          clearTimeout(timeoutId);
          server.close();
          resolve(false);
        }
      } else {
        res.writeHead(404);
        res.end("Not Found");
      }
    });

    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.error(`❌ ポート ${port} は使用中です。--port オプションで別のポートを指定してください`);
      } else {
        console.error(`❌ サーバーエラー: ${err.message}`);
      }
      clearTimeout(timeoutId);
      resolve(false);
    });

    server.listen(port, async () => {
      const authUrl = generateAuthUrl(clientId, redirectUri, state);

      console.log("🔐 Slack OAuth 認証を開始します...");
      console.log("");

      if (noBrowser) {
        console.log("以下の URL をブラウザで開いてください:");
        console.log("");
        console.log(authUrl);
        console.log("");
        console.log("認証が完了するまで待機中...");
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
        console.log("");
        console.log("認証が完了するまで待機中...");
      }
    });
  });
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
