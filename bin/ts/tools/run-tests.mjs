#!/usr/bin/env node
// Runs the wasm32-wasi unit test binary produced by `zig build test`.

import { WASI } from "node:wasi";
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const wasmPath = process.argv[2];
if (!wasmPath) {
  console.error("usage: node tools/run-tests.mjs <tests.wasm>");
  process.exit(2);
}

const wasi = new WASI({
  version: "preview1",
  args: ["tests"],
  env: {},
  preopens: { "/": process.cwd() },
  returnOnExit: true,
});

try {
  const { instance } = await WebAssembly.instantiate(
    readFileSync(path.resolve(wasmPath)),
    { wasi_snapshot_preview1: wasi.wasiImport },
  );
  const code = wasi.start(instance);
  process.exit(code ?? 0);
} catch (err) {
  if (err && typeof err === "object" && "code" in err) {
    process.exit(err.code ?? 1);
  }
  console.error(err);
  process.exit(1);
}
