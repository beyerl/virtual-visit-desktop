// Puts everything the app runs from into app/: Chromium (Chrome itself no
// longer accepts --load-extension), the extension and the game.
//
// Chromium is the snapshot of the current stable milestone (see
// chromium-build.js). VIRTUAL_VISIT_CHROMIUM=<revision> or =latest picks
// another one.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { computeExecutablePath, detectBrowserPlatform, install, resolveBuildId, Browser } from "@puppeteer/browsers";
import { stableChromiumBuild } from "./chromium-build.js";

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
if (!platform) throw new Error("This platform has no Chromium build");
const cacheDir = path.join(APP, "browser");
const wanted = process.env.VIRTUAL_VISIT_CHROMIUM;
let buildId = wanted && wanted !== "latest" ? wanted : null;
let label = buildId ? `revision ${buildId}` : "";
if (!wanted) {
  const stable = await stableChromiumBuild(platform).catch((e) => console.warn(`No stable Chromium snapshot found (${e.message}).`));
  if (stable) {
    buildId = stable.revision;
    label = `${stable.milestone} (revision ${buildId})`;
  }
}
if (!buildId) {
  buildId = await resolveBuildId(Browser.CHROMIUM, platform, "latest");
  label = `latest snapshot (revision ${buildId})`;
}
// Builds from earlier setups: Chrome for Testing, older snapshots.
fs.rmSync(path.join(cacheDir, "chrome"), { recursive: true, force: true });
const snapshots = path.join(cacheDir, "chromium");
for (const old of fs.existsSync(snapshots) ? fs.readdirSync(snapshots) : []) {
  if (!old.endsWith(`-${buildId}`)) fs.rmSync(path.join(snapshots, old), { recursive: true, force: true });
}
await install({ browser: Browser.CHROMIUM, buildId, platform, cacheDir });
const executable = computeExecutablePath({ browser: Browser.CHROMIUM, buildId, platform, cacheDir });
// Linux snapshots come with debug symbols: without them the binary is a third smaller.
if (process.platform === "linux") {
  try {
    execFileSync("strip", [executable]);
  } catch {
    console.warn("strip failed or is missing: Chromium keeps its debug symbols.");
  }
}
fs.writeFileSync(path.join(APP, "app.json"), `${JSON.stringify({ browser: path.relative(APP, executable), buildId })}\n`);
console.log(`Ready: Chromium ${label}. Start with: npm start`);
