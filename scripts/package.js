// Packs the app with its own Node into dist/virtual-visit-desktop-<version>-linux-x64.tar.gz.
// Run `npm run setup` first. Unpack anywhere and run ./virtual-visit.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

if (process.platform !== "linux" || process.arch !== "x64") throw new Error("Packaging is for Linux x64 only so far");
if (!fs.existsSync("app/app.json")) throw new Error("Run npm run setup first");

const { version } = JSON.parse(fs.readFileSync("package.json", "utf8"));
const name = `virtual-visit-desktop-${version}-linux-x64`;
const stage = path.join("dist", name);
fs.rmSync(stage, { recursive: true, force: true });
fs.mkdirSync(stage, { recursive: true });
fs.cpSync("app", path.join(stage, "app"), { recursive: true, verbatimSymlinks: true });
fs.cpSync("src", path.join(stage, "src"), { recursive: true });
fs.writeFileSync(path.join(stage, "package.json"), `${JSON.stringify({ type: "module", version })}\n`);
fs.copyFileSync(process.execPath, path.join(stage, "node"));
fs.writeFileSync(
  path.join(stage, "virtual-visit"),
  '#!/bin/sh\nhere="$(dirname "$(readlink -f "$0")")"\nexec "$here/node" "$here/src/main.js" "$@"\n',
  { mode: 0o755 },
);
execFileSync("tar", ["-czf", `${name}.tar.gz`, name], { cwd: "dist", stdio: "inherit" });
console.log(`dist/${name}.tar.gz: ${(fs.statSync(`${stage}.tar.gz`).size / 1e6).toFixed(0)} MB`);
