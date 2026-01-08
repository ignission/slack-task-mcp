/**
 * XDG Base Directory準拠のパス解決モジュール
 *
 * macOS/Linux: XDG環境変数またはデフォルト値を使用
 * - $XDG_CONFIG_HOME (デフォルト: ~/.config)
 * - $XDG_DATA_HOME (デフォルト: ~/.local/share)
 */

import os from "node:os";
import path from "node:path";

const APP_NAME = "slack-task-mcp";

/**
 * XDG_CONFIG_HOMEのパスを取得
 * @returns {string} 設定ディレクトリのパス
 */
function getXdgConfigHome() {
  return process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
}

/**
 * XDG_DATA_HOMEのパスを取得
 * @returns {string} データディレクトリのパス
 */
function getXdgDataHome() {
  return process.env.XDG_DATA_HOME || path.join(os.homedir(), ".local", "share");
}

/**
 * アプリケーションの設定ディレクトリを取得
 * @returns {string} $XDG_CONFIG_HOME/slack-task-mcp
 */
export function getConfigDir() {
  return path.join(getXdgConfigHome(), APP_NAME);
}

/**
 * アプリケーションのデータディレクトリを取得
 * @returns {string} $XDG_DATA_HOME/slack-task-mcp
 */
export function getDataDir() {
  return path.join(getXdgDataHome(), APP_NAME);
}

/**
 * 認証情報ディレクトリを取得
 * @returns {string} $XDG_DATA_HOME/slack-task-mcp/credentials
 */
export function getCredentialsDir() {
  return path.join(getDataDir(), "credentials");
}

/**
 * タスクファイルのパスを取得
 * @returns {string} $XDG_DATA_HOME/slack-task-mcp/tasks.json
 */
export function getTasksPath() {
  return path.join(getDataDir(), "tasks.json");
}
