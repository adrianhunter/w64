// Optimizes a wasm binary with wasm-opt using the full "bleeding edge"
// feature set (reference types, SIMD, relaxed SIMD, tail calls, ...).
//
// usage: node tools/optimize-wasm.mjs <input.wasm> -o <output.wasm>

import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

const args = process.argv.slice(2);
const input = args[0];
const outIndex = args.findIndex((arg) => arg === "-o" || arg === "--output");
const output = outIndex >= 0 ? args[outIndex + 1] : undefined;

if (!input || !output) {
  console.error("usage: node tools/optimize-wasm.mjs <input.wasm> -o <output.wasm>");
  process.exit(2);
}

// Enable every feature Binaryen knows about; this covers the full
// bleeding-edge wasm feature set (reference types, SIMD, relaxed SIMD,
// tail calls, ...) regardless of which `-Dcpu` variant Zig used.
const featureFlags = ["--all-features"];

const result = spawnSync(
  "wasm-opt",
  ["-O3", ...featureFlags, path.resolve(input), "-o", path.resolve(output)],
  { stdio: "inherit" },
);

if (result.error) {
  console.error(`wasm-opt not available: ${result.error.message}`);
  process.exit(127);
}
process.exit(result.status ?? 1);
