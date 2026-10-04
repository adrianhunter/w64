#!/usr/bin/env node
// Builds the Nodepod + node_shims Deno-compat bundle, pre-initializes it with
// `qjs build`, and runs the Deno.test suite with `qjs test`.
//
// usage: node tools/test-deno.mjs

import { build } from "esbuild";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const buildDir = path.join(root, ".qjs-build");
const vendor = path.join(root, "vendor");

const NODE_BUILTINS = [
  "assert",
  "assert/strict",
  "async_hooks",
  "buffer",
  "child_process",
  "cluster",
  "console",
  "constants",
  "crypto",
  "dgram",
  "diagnostics_channel",
  "dns",
  "domain",
  "events",
  "fs",
  "fs/promises",
  "http",
  "http2",
  "https",
  "inspector",
  "module",
  "net",
  "os",
  "path",
  "path/posix",
  "path/win32",
  "perf_hooks",
  "process",
  "punycode",
  "querystring",
  "readline",
  "repl",
  "stream",
  "stream/promises",
  "string_decoder",
  "timers",
  "timers/promises",
  "tls",
  "tty",
  "url",
  "util",
  "util/types",
  "v8",
  "vm",
  "wasi",
  "worker_threads",
  "zlib",
];

const wasmStubs = new Map([
  [
    "../helpers/wasm-cache",
    `export function precompileWasm() { return null; }
     export function registerCompiledModule() {}
     export const PRECOMPILE_THRESHOLD = 0;
     export function wasmMemoryRequirements() { return null; }
     export function rememberWasmMemoryRequirements() {}`,
  ],
  [
    "../helpers/wasm-cdn",
    `export function prefetchWasmFromCdn() { return null; }
     export function resolveWasmAssetPath(path) { return path; }`,
  ],
]);

// Resolves the Nodepod browser-only helpers, the vendored Deno shims, and
// the `which` package used by Deno.run/execPath.
const resolvePlugin = {
  name: "deno-test-resolve",
  setup(pluginBuild) {
    pluginBuild.onResolve({ filter: /.*/ }, (args) => {
      if (args.path.startsWith("node:")) {
        return { path: args.path, external: true };
      }
      if (wasmStubs.has(args.path)) {
        return { path: args.path, namespace: "wasm-stub" };
      }
      if (args.path === "@deno/shim-deno") {
        return {
          path: path.join(
            vendor,
            "node_shims",
            "shim-deno",
            "src",
            "index.ts",
          ),
        };
      }
      if (args.path === "@deno/shim-deno-test") {
        return {
          path: path.join(
            vendor,
            "node_shims",
            "shim-deno-test",
            "src",
            "index.ts",
          ),
        };
      }
      if (args.path === "which") {
        return { path: "which", namespace: "which-stub" };
      }
      return undefined;
    });
    pluginBuild.onLoad(
      { filter: /.*/, namespace: "wasm-stub" },
      (args) => ({ contents: wasmStubs.get(args.path), loader: "js" }),
    );
    pluginBuild.onLoad(
      { filter: /^which$/, namespace: "which-stub" },
      () => ({
        contents: `const which = { sync: () => null, default: { sync: () => null } };
export default which;
export const sync = which.sync;`,
        loader: "js",
      }),
    );
  },
};

const shared = {
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["es2022"],
  logLevel: "warning",
  define: { global: "globalThis" },
  plugins: [resolvePlugin],
};

console.log("== building qjs.wasm ==");
{
  const zig = process.env.ZIG ?? "zig";
  const buildArgs = ["build", "--release=small"];
  if (process.env.QJS_CPU) buildArgs.push(`-Dcpu=${process.env.QJS_CPU}`);
  const result = spawnSync(zig, buildArgs, { cwd: root, stdio: "inherit" });
  if (result.status !== 0) {
    console.error("zig build failed");
    process.exit(1);
  }
}

console.log("== optimizing qjs.wasm with wasm-opt ==");
{
  const optimize = spawnSync(
    "node",
    [
      "tools/optimize-wasm.mjs",
      "zig-out/bin/qjs.wasm",
      "-o",
      ".qjs-build/qjs.opt.wasm",
    ],
    { cwd: root, stdio: "inherit" },
  );
  if (optimize.status !== 0) {
    console.error("wasm-opt failed");
    process.exit(1);
  }
}

console.log("== building prelude ==");
await build({
  ...shared,
  entryPoints: [path.join(root, "test", "deno", "runtime.ts")],
  outfile: path.join(buildDir, "deno-prelude.mjs"),
  external: ["qjs:web-globals"],
});

console.log("== building test bundle ==");
await build({
  ...shared,
  entryPoints: [path.join(root, "test", "deno", "entry.ts")],
  outfile: path.join(buildDir, "deno-bundle.mjs"),
  external: [...NODE_BUILTINS, "qjs:yuku", "qjs:web-globals"],
});

if (process.argv.includes("--build-only")) {
  console.log("build-only: done");
  process.exit(0);
}

const runQjs = (wasm, args, options = {}) =>
  spawnSync("node", ["tools/run-qjs.mjs", wasm, ...args], {
    cwd: root,
    stdio: options.stdio ?? "inherit",
    env: {
      ...process.env,
      PATH: `${path.join(root, "node_modules", ".bin")}:${
        process.env.PATH ?? ""
      }`,
      QJS_WIZER: process.env.QJS_WIZER ?? "wizer",
    },
  });

console.log("== qjs build (esbuild + wizer) ==");
const buildArgs = [
  "build",
  "--prelude",
  ".qjs-build/deno-prelude.mjs",
  ...NODE_BUILTINS.flatMap((name) => ["--external", name]),
  ".qjs-build/deno-bundle.mjs",
  "-o",
  "qjs-deno.wasm",
];
const buildResult = runQjs(".qjs-build/qjs.opt.wasm", buildArgs);
if (buildResult.status !== 0) {
  console.error("qjs build failed");
  process.exit(1);
}

console.log("== optimizing qjs-deno.wasm with wasm-opt ==");
{
  const optimize = spawnSync(
    "node",
    [
      "tools/optimize-wasm.mjs",
      "qjs-deno.wasm",
      "-o",
      "qjs-deno.opt.wasm",
    ],
    { cwd: root, stdio: "inherit" },
  );
  if (optimize.status !== 0) {
    console.error("wasm-opt failed");
    process.exit(1);
  }
}

console.log("== qjs test ==");
const testResult = runQjs("qjs-deno.opt.wasm", ["test"]);
process.exit(testResult.status ?? 1);
