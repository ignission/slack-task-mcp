/**
 * 複数ワークスペースの認証情報管理モジュール
 *
 * 認証情報は credentials/{team_id}.json に保存
 */

import fs from "node:fs/promises";
import path from "node:path";
import { getCredentialsDir as _getCredentialsDir, getDataDir } from "./paths.js";

// Re-export for use in other modules
export { _getCredentialsDir as getCredentialsDir };

/**
 * 認証情報ディレクトリを初期化
 */
async function ensureCredentialsDir() {
  const dir = __getCredentialsDir();
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

/**
 * データディレクトリを初期化
 */
export async function ensureDataDir() {
  const dir = getDataDir();
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

/**
 * 全ワークスペース一覧を取得
 * @returns {Promise<Array<{team_id: string, team_name: string, team_domain: string, user_id: string, created_at: string}>>}
 */
export async function listWorkspaces() {
  const dir = _getCredentialsDir();

  try {
    const files = await fs.readdir(dir);
    const workspaces = [];

    for (const file of files) {
      if (!file.endsWith(".json")) continue;

      try {
        const filePath = path.join(dir, file);
        const data = await fs.readFile(filePath, "utf-8");
        const creds = JSON.parse(data);

        workspaces.push({
          team_id: creds.team_id,
          team_name: creds.team_name,
          team_domain: creds.team_domain,
          user_id: creds.user_id,
          created_at: creds.created_at,
        });
      } catch {
        // 破損したファイルはスキップ
      }
    }

    return workspaces;
  } catch {
    // ディレクトリが存在しない場合
    return [];
  }
}

/**
 * team_domainで認証情報を検索
 * @param {string} teamDomain - ワークスペースのドメイン（例: "myworkspace"）
 * @returns {Promise<object|null>} 認証情報またはnull
 */
export async function getCredentialsByDomain(teamDomain) {
  const dir = _getCredentialsDir();

  try {
    const files = await fs.readdir(dir);

    for (const file of files) {
      if (!file.endsWith(".json")) continue;

      try {
        const filePath = path.join(dir, file);
        const data = await fs.readFile(filePath, "utf-8");
        const creds = JSON.parse(data);

        if (creds.team_domain === teamDomain) {
          return creds;
        }
      } catch {
        // 破損したファイルはスキップ
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * team_idで認証情報を取得
 * @param {string} teamId - ワークスペースID（例: "T01234567"）
 * @returns {Promise<object|null>} 認証情報またはnull
 */
export async function getCredentialsById(teamId) {
  const filePath = path.join(_getCredentialsDir(), `${teamId}.json`);

  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/**
 * 最初に見つかった認証情報を取得（単一ワークスペース用の互換性）
 * @returns {Promise<object|null>} 認証情報またはnull
 */
export async function getFirstCredentials() {
  const workspaces = await listWorkspaces();
  if (workspaces.length === 0) return null;

  return getCredentialsById(workspaces[0].team_id);
}

/**
 * 認証情報を保存
 * @param {object} credentials - 認証情報
 * @param {string} credentials.access_token
 * @param {string} credentials.token_type
 * @param {string} credentials.scope
 * @param {string} credentials.user_id
 * @param {string} credentials.team_id
 * @param {string} credentials.team_name
 * @param {string} credentials.team_domain
 * @param {string} credentials.created_at
 */
export async function saveCredentials(credentials) {
  await ensureCredentialsDir();

  const filePath = path.join(_getCredentialsDir(), `${credentials.team_id}.json`);
  await fs.writeFile(filePath, JSON.stringify(credentials, null, 2), { mode: 0o600 });
}

/**
 * 指定ワークスペースの認証情報を削除
 * @param {string} teamId - ワークスペースID
 * @returns {Promise<boolean>} 削除成功/失敗
 */
export async function deleteCredentials(teamId) {
  const filePath = path.join(_getCredentialsDir(), `${teamId}.json`);

  try {
    await fs.unlink(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * team_domainで認証情報を削除
 * @param {string} teamDomain - ワークスペースのドメイン
 * @returns {Promise<boolean>} 削除成功/失敗
 */
export async function deleteCredentialsByDomain(teamDomain) {
  const creds = await getCredentialsByDomain(teamDomain);
  if (!creds) return false;

  return deleteCredentials(creds.team_id);
}

/**
 * 全ワークスペースの認証情報を削除
 * @returns {Promise<number>} 削除した件数
 */
export async function deleteAllCredentials() {
  const dir = _getCredentialsDir();
  let count = 0;

  try {
    const files = await fs.readdir(dir);

    for (const file of files) {
      if (!file.endsWith(".json")) continue;

      try {
        await fs.unlink(path.join(dir, file));
        count++;
      } catch {
        // 削除失敗は無視
      }
    }
  } catch {
    // ディレクトリが存在しない場合
  }

  return count;
}
