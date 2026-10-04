#!/usr/bin/env node
// End-to-end test for the `qjs build` pre-initialization feature.
//
// 1. builds qjs.wasm (wasm32-wasi) with zig
// 2. measures `hello world` startup time
// 3. bundles test/inputs.ts (which imports typescript@6) and pre-initializes
//    it with wizer into qjs-bundled.wasm
// 4. measures `hello world` startup time again
// 5. verifies that `import ts from "typescript"` still works in the
//    pre-initialized program
//
// usage: node tools/test.mjs
//
// environment:
//   ZIG        zig binary (default: zig; must be 0.17.x)
//   QJS_WIZER  wizer binary (default: wizer)

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const bin = (name) => path.join(root, "node_modules", ".bin", name);

// Prefer an explicit override, then a locally installed zig 0.17.0, then
// whatever `zig` is on PATH.
function findZig() {
  if (process.env.ZIG) return process.env.ZIG;
  const zvm = path.join(homedir(), ".zvm", "0.17.0", "zig");
  if (existsSync(zvm)) return zvm;
  return "zig";
}

const zig = findZig();
const wizer = process.env.QJS_WIZER ?? "wizer";
const rawWasm = path.join(root, "zig-out", "bin", "qjs.wasm");
const baseWasm = path.join(root, ".qjs-build", "qjs.opt.wasm");
const bundledWasm = path.join(root, "qjs-bundled.wasm");

let failures = 0;

function log(message) {
  console.log(message);
}

function fail(message) {
  failures += 1;
  console.error(`FAIL: ${message}`);
}

function check(condition, message) {
  if (condition) {
    log(`ok: ${message}`);
  } else {
    fail(message);
  }
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${path.join(root, "node_modules", ".bin")}:${
        process.env.PATH ?? ""
      }`,
      ...options.env,
    },
    stdio: options.stdio ?? "pipe",
  });
  return result;
}

function runQjs(wasm, args) {
  return run("node", ["tools/run-qjs.mjs", wasm, ...args]);
}

function timeHelloWorld(wasm, runs = 7) {
  const times = [];
  for (let i = 0; i < runs; i++) {
    const start = performance.now();
    const result = runQjs(wasm, ["-e", 'console.log("hello world")']);
    const elapsed = performance.now() - start;
    if (result.status !== 0) {
      fail(`hello world exited with ${result.status}`);
      return null;
    }
    if (result.stdout.trim() !== "hello world") {
      fail(`unexpected stdout: ${JSON.stringify(result.stdout)}`);
      return null;
    }
    times.push(elapsed);
  }
  times.sort((a, b) => a - b);
  return times[Math.floor(times.length / 2)];
}

function formatMs(ms) {
  return `${ms.toFixed(1)}ms`;
}

// ---------------------------------------------------------------------------

log(`using zig:   ${zig}`);
log(`using wizer: ${wizer}`);

if (!existsSync(bin("esbuild"))) {
  fail("esbuild is not installed; run `npm install` first");
  process.exit(1);
}

log("\n== building qjs.wasm ==");
{
  const buildArgs = ["build", "--release=small"];
  if (process.env.QJS_CPU) buildArgs.push(`-Dcpu=${process.env.QJS_CPU}`);
  const result = run(zig, buildArgs, { stdio: "inherit" });
  if (result.status !== 0) {
    fail("zig build failed");
    process.exit(1);
  }
}

log("\n== optimizing qjs.wasm with wasm-opt ==");
{
  const result = run("node", [
    "tools/optimize-wasm.mjs",
    rawWasm,
    "-o",
    baseWasm,
  ]);
  if (result.status !== 0) {
    fail("wasm-opt failed");
    process.exit(1);
  }
}

log("\n== hello world timing: base ==");
const baseTime = timeHelloWorld(baseWasm, 7);
if (baseTime === null) process.exit(1);
log(`median: ${formatMs(baseTime)}`);

log("\n== bundling test/inputs.ts with typescript@6.0.2 ==");
{
  const result = runQjs(baseWasm, [
    "build",
    "test/inputs.ts",
    "-o",
    bundledWasm,
  ]);
  if (result.status !== 0) {
    console.error(result.stdout);
    console.error(result.stderr);
    fail("qjs build failed");
    process.exit(1);
  }
}

log("\n== optimizing qjs-bundled.wasm with wasm-opt ==");
const optimizedBundledWasm = path.join(root, "qjs-bundled.opt.wasm");
{
  const result = run("node", [
    "tools/optimize-wasm.mjs",
    bundledWasm,
    "-o",
    optimizedBundledWasm,
  ]);
  if (result.status !== 0) {
    fail("wasm-opt failed");
    process.exit(1);
  }
}

log("\n== hello world timing: bundled ==");
const bundledTime = timeHelloWorld(optimizedBundledWasm, 7);
if (bundledTime === null) process.exit(1);
log(`median: ${formatMs(bundledTime)}`);

log("\n== checking bundled typescript ==");
{
  const expr = [
    'import ts from "typescript";',
    'if (ts.version !== "6.0.2") throw new Error("unexpected version " + ts.version);',
    'const out = ts.transpileModule("let x: number = 1",',
    "  { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;",
    'if (!out.includes("let x = 1")) throw new Error("bad output: " + out);',
    'console.log("typescript " + ts.version + " ok");',
  ].join("\n");
  const result = runQjs(optimizedBundledWasm, ["-m", "-e", expr]);
  check(
    result.status === 0 && result.stdout.includes("typescript 6.0.2 ok"),
    "bundled typescript compiler works",
  );
  if (result.status !== 0) {
    console.error(result.stdout);
    console.error(result.stderr);
  }
}

log("\n== blank-space single-file build ==");
{
  const blankWasm = path.join(root, "qjs-blank.wasm");
  const buildResult = runQjs(baseWasm, [
    "build",
    "test/blank/thrower.ts",
    "-o",
    blankWasm,
  ]);
  check(buildResult.status === 0, "qjs build strips a TypeScript file 1:1");

  const runResult = runQjs(blankWasm, ["-e", "__thrower()"]);
  check(
    (runResult.stderr ?? "").includes("/bundle/source_thrower.ts:3:13"),
    "runtime error points at the original TypeScript line and column",
  );
  if (!(runResult.stderr ?? "").includes("/bundle/source_thrower.ts:3:13")) {
    console.error(runResult.stderr);
  }
}

log("\n== summary ==");
log(`base hello world:    ${formatMs(baseTime)}`);
log(`bundled hello world: ${formatMs(bundledTime)}`);
log(`bundled wasm size:   ${(await import("node:fs")).statSync(optimizedBundledWasm).size} bytes`);
const ratio = bundledTime / baseTime;
log(`ratio: ${ratio.toFixed(2)}x`);

// Both include Node.js startup time; allow generous overhead for decoding the
// pre-initialized snapshot.
check(
  bundledTime <= baseTime + 150,
  "pre-initialized startup is within 150ms of the base startup",
);

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
