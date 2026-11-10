// What the desktop app is: a small local web server for the game, and Chromium
// started on it as an app window with the extension loaded.

import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";

// Fixed, because the game's saves and settings belong to its origin. The
// extension's content script runs on 127.0.0.1 at any port.
export const PORT = 47813;
export const HOST = "127.0.0.1";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".mp3": "audio/mpeg",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

/** Where the app keeps its browser profile. @param {NodeJS.ProcessEnv} [env] */
export function profileDir(env = process.env) {
  const base = env.XDG_DATA_HOME || path.join(os.homedir(), ".local", "share");
  return path.join(base, "virtual-visit-desktop", "profile");
}

/**
 * Chromium's command line.
 * @param {{ extension: string, profile: string, url: string, windowed?: boolean, extra?: string[] }} o
 */
export function chromiumArgs({ extension, profile, url, windowed = false, extra = [] }) {
  return [
    `--user-data-dir=${profile}`,
    `--load-extension=${extension}`,
    `--app=${url}`,
    // A gamepad press doesn't count as a user gesture, so without this a
    // pad-only player would never hear the music, guides or ride videos.
    "--autoplay-policy=no-user-gesture-required",
    "--no-first-run",
    "--no-default-browser-check",
    ...(windowed ? [] : ["--start-fullscreen"]),
    ...extra,
  ];
}

/**
 * Chromium's environment. Chromium builds come without Google API keys and
 * would say so in a bar across the top of the window; "no" turns that off.
 * The game, the extension and Google Maps don't need the keys.
 * @param {NodeJS.ProcessEnv} [env]
 */
export function chromiumEnv(env = process.env) {
  return { GOOGLE_API_KEY: "no", GOOGLE_DEFAULT_CLIENT_ID: "no", GOOGLE_DEFAULT_CLIENT_SECRET: "no", ...env };
}

/** The file a URL path means under root, or null if it may not be served. @param {string} root @param {string} urlPath */
export function resolveFile(root, urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath.split(/[?#]/)[0]);
  } catch {
    return null;
  }
  if (decoded.includes("\0")) return null;
  const parts = decoded.split(/[/\\]/).filter(Boolean);
  if (parts.some((part) => part.startsWith("."))) return null; // also "..", and .git of the submodule
  return path.join(root, ...(parts.length ? parts : ["index.html"]));
}

/** @param {string} root @returns {http.Server} */
export function createGameServer(root) {
  return http.createServer((req, res) => {
    const fail = (/** @type {number} */ status) => {
      res.writeHead(status, { "Content-Type": "text/plain" });
      res.end(String(status));
    };
    if (req.method !== "GET" && req.method !== "HEAD") return fail(405);
    let file = resolveFile(root, req.url ?? "/");
    if (!file) return fail(404);
    if (fs.statSync(file, { throwIfNoEntry: false })?.isDirectory()) file = path.join(file, "index.html");
    const stat = fs.statSync(file, { throwIfNoEntry: false });
    if (!stat?.isFile()) return fail(404);
    res.writeHead(200, {
      "Content-Type": MIME[/** @type {keyof typeof MIME} */ (path.extname(file).toLowerCase())] ?? "application/octet-stream",
      "Content-Length": stat.size,
      "Cache-Control": "no-cache",
    });
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(file).on("error", () => res.destroy()).pipe(res);
  });
}

/**
 * Starts the server. If the port is taken, the app is already running: its
 * server keeps serving, and Chromium hands the new window to the running one.
 * @param {http.Server} server @returns {Promise<boolean>} whether this process serves
 */
export function listen(server, port = PORT, host = HOST) {
  return new Promise((resolve, reject) => {
    server.once("error", (e) => (/** @type {NodeJS.ErrnoException} */ (e).code === "EADDRINUSE" ? resolve(false) : reject(e)));
    server.listen(port, host, () => resolve(true));
  });
}
