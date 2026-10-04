#!/usr/bin/env node
// Builds bin/ts.wasm: the qjs interpreter, pre-initialized (wizer) with the
// vendor/node (bin/node) node:* module registry, the Bun shims, and the
// vendored Deno shim. TypeScript is handled by bin/ttsc's ttsc.wasm.
//
// usage: node tools/build-ts.mjs [--skip-qjs] [--skip-optimize]

import { build } from "esbuild";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const buildDir = path.join(root, ".qjs-build");
const vendor = path.join(root, "vendor");
const outWasm = path.resolve(root, "..", "ts.wasm");
const flags = new Set(process.argv.slice(2));
const zig = process.env.ZIG ?? "zig";

const NODE_BUILTINS = [
  "assert", "assert/strict", "async_hooks", "buffer", "child_process",
  "cluster", "console", "constants", "crypto", "dgram", "diagnostics_channel",
  "dns", "domain", "events", "fs", "fs/promises", "http", "http2", "https",
  "inspector", "module", "net", "os", "path", "path/posix", "path/win32",
  "perf_hooks", "process", "punycode", "querystring", "readline", "repl",
  "stream", "stream/promises", "string_decoder", "timers", "timers/promises",
  "tls", "tty", "url", "util", "util/types", "v8", "vm", "wasi",
  "worker_threads", "zlib",
];

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    stdio: "inherit",
    env: {
      ...process.env,
      PATH: `${path.join(root, "node_modules", ".bin")}:${process.env.PATH ?? ""}`,
      ...options.env,
    },
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed`);
  }
}

// ---------------------------------------------------------------------------
// ttsc (bin/ttsc) is the TypeScript transpiler. Build it if missing.
// ---------------------------------------------------------------------------
const ttscWasm = path.resolve(root, "..", "ttsc.wasm");
if (!existsSync(ttscWasm)) {
  console.log("== building ttsc.wasm ==");
  run(zig, ["build"], { cwd: path.resolve(root, "..", "ttsc") });
}
if (!existsSync(ttscWasm)) {
  throw new Error(`ttsc.wasm not found at ${ttscWasm}`);
}

// ---------------------------------------------------------------------------
// Base interpreter
// ---------------------------------------------------------------------------
if (!flags.has("--skip-qjs")) {
  console.log("== building qjs.wasm ==");
  const buildArgs = ["build", "--release=small"];
  if (process.env.QJS_CPU) buildArgs.push(`-Dcpu=${process.env.QJS_CPU}`);
  run(zig, buildArgs);
}

console.log("== optimizing qjs.wasm ==");
run("node", [
  "tools/optimize-wasm.mjs",
  "zig-out/bin/qjs.wasm",
  "-o",
  ".qjs-build/qjs.opt.wasm",
]);

// ---------------------------------------------------------------------------
// The single global prelude manifest (prelude/global.ts). Everything imported
// there is bundled; every other package import stays external and is resolved
// by the guest at runtime.
// ---------------------------------------------------------------------------
console.log("== bundling prelude/global.ts ==");
run("node", ["tools/bundle-global.mjs"]);

// The wizer bundle itself is empty: the manifest already ran in the prelude.
await import("node:fs/promises").then((fs) =>
  fs.writeFile(
    path.join(buildDir, "wizer-entry.mjs"),
    "export const ready = true;\n",
  )
);

// ---------------------------------------------------------------------------
// wizer pre-initialization -> bin/ts.wasm
// ---------------------------------------------------------------------------
console.log("== pre-initializing ts.wasm ==");
run("node", [
  "tools/run-qjs.mjs",
  ".qjs-build/qjs.opt.wasm",
  "build",
  "--prelude",
  ".qjs-build/global.js",
  ".qjs-build/wizer-entry.mjs",
  "-o",
  outWasm,
]);

if (!flags.has("--skip-optimize")) {
  console.log("== optimizing ts.wasm ==");
  run("node", ["tools/optimize-wasm.mjs", outWasm, "-o", outWasm]);
}

// ---------------------------------------------------------------------------
// Browser runtime: the worker host and the main-thread API.
// ---------------------------------------------------------------------------
console.log("== building browser runtime ==");
run("node", ["tools/build-runtime.mjs"]);

console.log(`wrote ${outWasm}, ts.worker.mjs, and ts.mjs`);
