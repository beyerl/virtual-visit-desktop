// Puts everything the app runs from into app/: Chrome for Testing (Chrome
// itself no longer accepts --load-extension), the extension and the game.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { computeExecutablePath, detectBrowserPlatform, install, resolveBuildId, Browser } from "@puppeteer/browsers";

const APP = path.resolve("app");
const GAME_SOURCE = path.resolve("virtual-visit");
const EXTENSION_ZIP = path.resolve("street-view-gamepad/release/street-view-gamepad.zip");
const GAME_SKIP = new Set([".git", ".github", ".gitignore", ".nojekyll", "node_modules", "test", "tools", "reference"]);

if (!fs.existsSync(EXTENSION_ZIP) || !fs.existsSync(path.join(GAME_SOURCE, "index.html"))) {
  execFileSync("git", ["submodule", "update", "--init"], { stdio: "inherit" });
}

fs.rmSync(path.join(APP, "extension"), { recursive: true, force: true });
fs.rmSync(path.join(APP, "game"), { recursive: true, force: true });
fs.mkdirSync(path.join(APP, "extension"), { recursive: true });
execFileSync("unzip", ["-q", EXTENSION_ZIP, "-d", path.join(APP, "extension")]);
fs.cpSync(GAME_SOURCE, path.join(APP, "game"), {
  recursive: true,
  filter: (src) => src === GAME_SOURCE || !GAME_SKIP.has(path.relative(GAME_SOURCE, src).split(path.sep)[0]),
});

const platform = detectBrowserPlatform();
if (!platform) throw new Error("This platform has no Chrome for Testing build");
const cacheDir = path.join(APP, "browser");
const buildId = await resolveBuildId(Browser.CHROME, platform, "stable");
await install({ browser: Browser.CHROME, buildId, platform, cacheDir });
const executable = computeExecutablePath({ browser: Browser.CHROME, buildId, platform, cacheDir });
fs.writeFileSync(path.join(APP, "app.json"), `${JSON.stringify({ browser: path.relative(APP, executable), buildId })}\n`);
console.log(`Ready: Chrome for Testing ${buildId}. Start with: npm start`);
