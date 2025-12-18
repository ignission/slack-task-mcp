/**
 * Slack Task MCP OAuth Worker
 *
 * Cloudflare Workers で動作する OAuth コールバックサーバー
 */

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

// セッション有効期限（5分）
const SESSION_TTL = 60 * 5;

/**
 * CORS ヘッダーを追加
 */
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

/**
 * JSON レスポンスを返す
 */
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(),
    },
  });
}

/**
 * HTML レスポンスを返す
 */
function htmlResponse(html, status = 200) {
  return new Response(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}

/**
 * /auth - OAuth 認証を開始
 * CLI からセッション ID を受け取り、Slack OAuth にリダイレクト
 */
async function handleAuth(request, env) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session_id");

  if (!sessionId) {
    return jsonResponse({ error: "session_id is required" }, 400);
  }

  // セッションを初期化（pending 状態）
  await env.AUTH_SESSIONS.put(
    sessionId,
    JSON.stringify({ status: "pending", created_at: Date.now() }),
    { expirationTtl: SESSION_TTL }
  );

  // Slack OAuth URL を生成
  const redirectUri = `${url.origin}/callback`;
  const params = new URLSearchParams({
    client_id: env.SLACK_CLIENT_ID,
    user_scope: USER_SCOPES,
    redirect_uri: redirectUri,
    state: sessionId,
  });

  const authUrl = `${SLACK_AUTHORIZE_URL}?${params.toString()}`;

  // Slack にリダイレクト
  return Response.redirect(authUrl, 302);
}

/**
 * /callback - Slack からのコールバックを処理
 */
async function handleCallback(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state"); // session_id
  const error = url.searchParams.get("error");

  // エラーチェック
  if (error) {
    if (state) {
      await env.AUTH_SESSIONS.put(
        state,
        JSON.stringify({ status: "error", error: error }),
        { expirationTtl: SESSION_TTL }
      );
    }
    return htmlResponse(`
      <!DOCTYPE html>
      <html>
        <head><title>認証キャンセル</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h1>❌ 認証がキャンセルされました</h1>
          <p>このウィンドウを閉じてください。</p>
        </body>
      </html>
    `);
  }

  if (!code || !state) {
    return htmlResponse(`
      <!DOCTYPE html>
      <html>
        <head><title>エラー</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h1>❌ パラメータが不足しています</h1>
          <p>認証を最初からやり直してください。</p>
        </body>
      </html>
    `, 400);
  }

  // セッションを確認
  const sessionData = await env.AUTH_SESSIONS.get(state);
  if (!sessionData) {
    return htmlResponse(`
      <!DOCTYPE html>
      <html>
        <head><title>エラー</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h1>❌ セッションが無効または期限切れです</h1>
          <p>認証を最初からやり直してください。</p>
        </body>
      </html>
    `, 400);
  }

  try {
    // トークン交換
    const redirectUri = `${url.origin}/callback`;
    const tokenParams = new URLSearchParams({
      client_id: env.SLACK_CLIENT_ID,
      client_secret: env.SLACK_CLIENT_SECRET,
      code: code,
      redirect_uri: redirectUri,
    });

    const tokenResponse = await fetch(SLACK_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: tokenParams.toString(),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.ok) {
      throw new Error(tokenData.error || "Token exchange failed");
    }

    // 認証情報を保存
    const credentials = {
      status: "success",
      access_token: tokenData.authed_user.access_token,
      token_type: "user",
      scope: tokenData.authed_user.scope,
      user_id: tokenData.authed_user.id,
      team_id: tokenData.team.id,
      team_name: tokenData.team.name,
      created_at: new Date().toISOString(),
    };

    await env.AUTH_SESSIONS.put(
      state,
      JSON.stringify(credentials),
      { expirationTtl: SESSION_TTL }
    );

    return htmlResponse(`
      <!DOCTYPE html>
      <html>
        <head><title>認証完了</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h1>✅ 認証が完了しました！</h1>
          <p>ワークスペース: <strong>${credentials.team_name}</strong></p>
          <p>このウィンドウを閉じて、ターミナルに戻ってください。</p>
        </body>
      </html>
    `);

  } catch (err) {
    await env.AUTH_SESSIONS.put(
      state,
      JSON.stringify({ status: "error", error: err.message }),
      { expirationTtl: SESSION_TTL }
    );

    return htmlResponse(`
      <!DOCTYPE html>
      <html>
        <head><title>エラー</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h1>❌ エラーが発生しました</h1>
          <p>${err.message}</p>
        </body>
      </html>
    `, 500);
  }
}

/**
 * /poll - CLI からのポーリング
 * セッション ID に対応するトークンを返す
 */
async function handlePoll(request, env) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session_id");

  if (!sessionId) {
    return jsonResponse({ error: "session_id is required" }, 400);
  }

  const sessionData = await env.AUTH_SESSIONS.get(sessionId);

  if (!sessionData) {
    return jsonResponse({ status: "not_found" }, 404);
  }

  const data = JSON.parse(sessionData);

  // 成功した場合はトークンを返してセッションを削除
  if (data.status === "success") {
    await env.AUTH_SESSIONS.delete(sessionId);
    return jsonResponse(data);
  }

  // エラーの場合
  if (data.status === "error") {
    await env.AUTH_SESSIONS.delete(sessionId);
    return jsonResponse(data);
  }

  // まだ pending の場合
  return jsonResponse({ status: "pending" });
}

/**
 * メインハンドラー
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    // ルーティング
    switch (url.pathname) {
      case "/auth":
        return handleAuth(request, env);
      case "/callback":
        return handleCallback(request, env);
      case "/poll":
        return handlePoll(request, env);
      case "/":
        return htmlResponse(`
          <!DOCTYPE html>
          <html>
            <head><title>Slack Task MCP OAuth</title></head>
            <body style="font-family: sans-serif; text-align: center; padding: 50px;">
              <h1>Slack Task MCP OAuth Server</h1>
              <p>このサーバーは Slack Task MCP の OAuth 認証に使用されます。</p>
              <p>認証を開始するには、CLIで <code>npx slack-task-mcp auth</code> を実行してください。</p>
            </body>
          </html>
        `);
      default:
        return new Response("Not Found", { status: 404 });
    }
  },
};
