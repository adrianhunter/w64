#!/usr/bin/env node
// Builds just the browser runtime: bin/ts.worker.mjs and bin/ts.mjs.

import { build } from "esbuild";
import { copyFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

const runtimeStubs = new Map([
  [
    "../helpers/wasm-cache",
    `export function registerCompiledModule() {}
     export function precompileWasm() {}
     export function getCachedModule() { return null; }
     export function compileWasmInWorker() { return Promise.resolve(null); }
     export function needsAsyncCompile() { return false; }
     export function wasmCacheStats() { return { entries: 0, pending: 0 }; }
     export function reclaimWasmCache() {}
     export function cloneCachedModule() { return null; }
     export function disposeWasmCache() {}
     export const PRECOMPILE_THRESHOLD = 0;`,
  ],
  [
    "../helpers/wasm-cdn",
    `export function resolveWasmAssetPath(_volume, vfsPath) { return vfsPath; }
     export function buildCdnWasmUrl() { return null; }
     export function isRecoverableWasmPath() { return false; }
     export function isWasmResolverProbe() { return false; }
     export function resetCdnRefusals() {}
     export async function prefetchWasmFromCdn() { return false; }`,
  ],
]);

await build({
  entryPoints: [path.join(root, "runtime", "worker.ts")],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["es2022"],
  outfile: path.resolve(root, "..", "ts.worker.mjs"),
  logLevel: "warning",
  absWorkingDir: root,
  plugins: [
    {
      name: "qjs-runtime-stubs",
      setup(pluginBuild) {
        pluginBuild.onResolve({ filter: /.*/ }, (args) => {
          if (runtimeStubs.has(args.path)) {
            return { path: args.path, namespace: "qjs-stub" };
          }
          return undefined;
        });
        pluginBuild.onLoad(
          { filter: /.*/, namespace: "qjs-stub" },
          (loadArgs) => ({
            contents: runtimeStubs.get(loadArgs.path),
            loader: "js",
          }),
        );
      },
    },
  ],
});
await copyFile(
  path.join(root, "runtime", "index.mjs"),
  path.resolve(root, "..", "ts.mjs"),
);

console.log("wrote ts.worker.mjs and ts.mjs");
