/**
 * Slack Task MCP OAuth Worker
 *
 * KVを使わないハイブリッド方式
 * トークン交換後、ローカルサーバーに直接リダイレクト
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
  "search:read",
].join(",");

/**
 * HTMLレスポンスを返す
 */
function htmlResponse(html, status = 200) {
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

/**
 * エラーページを生成
 */
function errorPage(title, message) {
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
    h1 { color: #dc3545; margin: 0 0 16px 0; }
    p { color: #666; margin: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">❌</div>
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
}

/**
 * Base64 URL エンコード/デコード
 */
function base64UrlEncode(str) {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return atob(str);
}

/**
 * /auth - OAuth 認証を開始
 * CLI からローカルサーバーのURLを受け取り、Slack OAuth にリダイレクト
 */
async function handleAuth(request, env) {
  const url = new URL(request.url);
  const redirectUrl = url.searchParams.get("redirect_url");
  const port = url.searchParams.get("port");

  if (!redirectUrl && !port) {
    return htmlResponse(errorPage("エラー", "redirect_url または port パラメータが必要です"), 400);
  }

  // ローカルサーバーのURL
  const localCallbackUrl = redirectUrl || `http://localhost:${port}/callback`;

  // state に localCallbackUrl をエンコードして埋め込む
  const state = base64UrlEncode(localCallbackUrl);

  // Slack OAuth URL を生成
  const callbackUrl = `${url.origin}/callback`;
  const params = new URLSearchParams({
    client_id: env.SLACK_CLIENT_ID,
    user_scope: USER_SCOPES,
    redirect_uri: callbackUrl,
    state: state,
  });

  const authUrl = `${SLACK_AUTHORIZE_URL}?${params.toString()}`;

  // Slack にリダイレクト
  return Response.redirect(authUrl, 302);
}

/**
 * /callback - Slack からのコールバックを処理
 * トークン交換後、ローカルサーバーにリダイレクト
 */
async function handleCallback(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  // エラーチェック
  if (error) {
    return htmlResponse(errorPage("認証キャンセル", "Slackでの認証がキャンセルされました。このウィンドウを閉じてください。"));
  }

  if (!code || !state) {
    return htmlResponse(errorPage("エラー", "パラメータが不足しています。認証を最初からやり直してください。"), 400);
  }

  // state から localCallbackUrl をデコード
  let localCallbackUrl;
  try {
    localCallbackUrl = base64UrlDecode(state);
  } catch {
    return htmlResponse(errorPage("エラー", "state パラメータが無効です。"), 400);
  }

  try {
    // トークン交換
    const callbackUrl = `${url.origin}/callback`;
    const tokenParams = new URLSearchParams({
      client_id: env.SLACK_CLIENT_ID,
      client_secret: env.SLACK_CLIENT_SECRET,
      code: code,
      redirect_uri: callbackUrl,
    });

    const tokenResponse = await fetch(SLACK_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenParams.toString(),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.ok) {
      throw new Error(tokenData.error || "Token exchange failed");
    }

    // ローカルサーバーにリダイレクト（トークン情報をクエリパラメータで渡す）
    const redirectParams = new URLSearchParams({
      access_token: tokenData.authed_user.access_token,
      token_type: "user",
      scope: tokenData.authed_user.scope,
      user_id: tokenData.authed_user.id,
      team_id: tokenData.team.id,
      team_name: tokenData.team.name,
      team_domain: tokenData.team.domain || "",
    });

    return Response.redirect(`${localCallbackUrl}?${redirectParams.toString()}`, 302);
  } catch (err) {
    return htmlResponse(errorPage("エラー", `トークン取得に失敗しました: ${err.message}`), 500);
  }
}

/**
 * メインハンドラー
 */
export default {
  async fetch(request, env, _ctx) {
    const url = new URL(request.url);

    switch (url.pathname) {
      case "/auth":
        return handleAuth(request, env);
      case "/callback":
        return handleCallback(request, env);
      case "/":
        return htmlResponse(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Slack Task MCP OAuth</title>
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
    h1 { color: #333; margin: 0 0 16px 0; }
    p { color: #666; margin: 0; }
    code { background: #f0f0f0; padding: 2px 8px; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Slack Task MCP OAuth Server</h1>
    <p>このサーバーは Slack Task MCP の OAuth 認証に使用されます。</p>
    <p>認証を開始するには <code>npx @ignission/slack-task-mcp auth login</code> を実行してください。</p>
  </div>
</body>
</html>
        `);
      default:
        return new Response("Not Found", { status: 404 });
    }
  },
};
