import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromiumArgs, chromiumEnv, createGameServer, listen, profileDir, resolveFile } from "../src/launcher.js";

test("chromium is started as a fullscreen app window with the extension and sound", () => {
  const args = chromiumArgs({ extension: "/e", profile: "/p", url: "http://127.0.0.1:1/" });
  for (const a of ["--user-data-dir=/p", "--load-extension=/e", "--app=http://127.0.0.1:1/", "--start-fullscreen", "--autoplay-policy=no-user-gesture-required"]) {
    assert.ok(args.includes(a), a);
  }
  const windowed = chromiumArgs({ extension: "/e", profile: "/p", url: "u", windowed: true, extra: ["--x"] });
  assert.equal(windowed.includes("--start-fullscreen"), false);
  assert.equal(windowed.at(-1), "--x");
});

test("chromium doesn't ask for Google API keys, unless some are set", () => {
  const env = chromiumEnv({ PATH: "/bin" });
  assert.equal(env.GOOGLE_API_KEY, "no");
  assert.equal(env.GOOGLE_DEFAULT_CLIENT_ID, "no");
  assert.equal(env.GOOGLE_DEFAULT_CLIENT_SECRET, "no");
  assert.equal(env.PATH, "/bin");
  assert.equal(chromiumEnv({ GOOGLE_API_KEY: "k" }).GOOGLE_API_KEY, "k");
});

test("the profile follows XDG_DATA_HOME", () => {
  assert.equal(profileDir({ XDG_DATA_HOME: "/data" }), path.join("/data", "virtual-visit-desktop", "profile"));
});

test("only files inside the game are resolved", () => {
  assert.equal(resolveFile("/g", "/"), path.join("/g", "index.html"));
  assert.equal(resolveFile("/g", "/src/main.js?v=1"), path.join("/g", "src/main.js"));
  assert.equal(resolveFile("/g", "/audio/a%20b.mp3"), path.join("/g", "audio/a b.mp3"));
  assert.equal(resolveFile("/g", "/.git/config"), null);
  assert.equal(resolveFile("/g", "/%2e%2e/secret"), null);
  assert.equal(resolveFile("/g", "/a/%2e%2e/%2e%2e/secret"), null);
  assert.equal(resolveFile("/g", "/%zz"), null);
  assert.equal(resolveFile("/g", "/a%00b"), null);
});

test("the server serves the game with the right types and nothing else", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "vvd-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, "index.html"), "<h1>hi</h1>");
  fs.mkdirSync(path.join(root, "src"));
  fs.writeFileSync(path.join(root, "src", "a.js"), "export {}");
  const server = createGameServer(root);
  assert.equal(await listen(server, 0), true);
  t.after(() => server.close());
  const base = `http://127.0.0.1:${/** @type {any} */ (server.address()).port}`;

  const index = await fetch(`${base}/`);
  assert.equal(index.status, 200);
  assert.match(index.headers.get("content-type"), /text\/html/);
  assert.equal(await index.text(), "<h1>hi</h1>");
  assert.match((await fetch(`${base}/src/a.js`)).headers.get("content-type"), /text\/javascript/);
  assert.equal((await fetch(`${base}/nope.js`)).status, 404);
  assert.equal((await fetch(`${base}/`, { method: "POST" })).status, 405);

  const second = createGameServer(root);
  assert.equal(await listen(second, /** @type {any} */ (server.address()).port), false, "already running");
});
