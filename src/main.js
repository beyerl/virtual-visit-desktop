#!/usr/bin/env node
// Starts Virtual Visit:  virtual-visit [--windowed] [-- extra Chromium flags]

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromiumArgs, createGameServer, HOST, listen, PORT, profileDir } from "./launcher.js";

const APP = process.env.VIRTUAL_VISIT_APP ?? path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "app");
const manifest = path.join(APP, "app.json");
if (!fs.existsSync(manifest)) {
  console.error(`The app isn't set up (${manifest} is missing). Run: npm run setup`);
  process.exit(1);
}
const { browser } = JSON.parse(fs.readFileSync(manifest, "utf8"));

const argv = process.argv.slice(2);
const split = argv.indexOf("--");
const own = split < 0 ? argv : argv.slice(0, split);
const extra = split < 0 ? [] : argv.slice(split + 1);

const server = createGameServer(path.join(APP, "game"));
await listen(server);

const profile = profileDir();
fs.mkdirSync(profile, { recursive: true });
const chromium = spawn(
  path.join(APP, browser),
  chromiumArgs({
    extension: path.join(APP, "extension"),
    profile,
    url: `http://${HOST}:${PORT}/`,
    windowed: own.includes("--windowed"),
    extra,
  }),
  { stdio: "inherit" },
);
chromium.on("error", (e) => {
  console.error(`Could not start Chromium: ${e.message}`);
  process.exit(1);
});
chromium.on("exit", (code) => process.exit(code ?? 0));
for (const signal of /** @type {const} */ (["SIGINT", "SIGTERM"])) process.on(signal, () => chromium.kill(signal));
