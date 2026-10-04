#!/usr/bin/env node
// Builds the opencode dependency registry + server bundle and runs the smoke
// test on the base qjs runtime. Nothing is pre-initialized into qjs.wasm.
//
// usage:
//   node tools/test-opencode.mjs [--no-build]
//
// environment:
//   OPENCODE_DIR  checkout of github.com/anomalyco/opencode
//
// prerequisites: zig-out/bin/qjs.wasm exists (`zig build --release=small`).

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");

function run(args) {
  const result = spawnSync("node", args, { cwd: root, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (!existsSync(path.join(root, "zig-out", "bin", "qjs.wasm"))) {
  console.error("qjs.wasm not found; run `zig build --release=small` first");
  process.exit(1);
}

if (!process.argv.includes("--no-build")) {
  console.log("== building deno prelude ==");
  run(["tools/test-deno.mjs", "--build-only"]);
  console.log("== building opencode bundles ==");
  run(["tools/build-opencode.mjs"]);
}

console.log("== running opencode on the base runtime ==");
run(["tools/run-qjs.mjs", "zig-out/bin/qjs.wasm", "tools/opencode-smoke.mjs"]);
