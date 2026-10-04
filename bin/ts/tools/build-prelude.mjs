#!/usr/bin/env node
// Bundles the browser Node runtime in vendor/node (bin/node) into the prelude
// the qjs runtime evaluates during wizer pre-initialization.
//
// usage: node tools/build-prelude.mjs [--outfile path] [--entry file]

import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

const args = process.argv.slice(2);
function argValue(name, fallback) {
  const idx = args.indexOf(name);
  return idx >= 0 ? args[idx + 1] : fallback;
}

const outfile = path.resolve(
  root,
  argValue("--outfile", ".qjs-build/node-prelude.mjs"),
);
const entry = path.resolve(
  root,
  argValue("--entry", "prelude/runtime.ts"),
);

// The guest has no WebAssembly and no worker host; both helpers are only
// reached by code paths we do not support inside QuickJS.
const stubs = new Map([
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

// Prefer this project's node_modules: the workspace root has wasm-accelerated
// re-implementations of pako and @noble/hashes that QuickJS cannot run.
const preferLocalModules = {
  name: "qjs-prefer-local-modules",
  setup(pluginBuild) {
    pluginBuild.onResolve({ filter: /^[^./]/ }, async (buildArgs) => {
      if (buildArgs.pluginData?.qjsLocal) return undefined;
      const parts = buildArgs.path.split("/");
      const pkg = buildArgs.path.startsWith("@")
        ? parts.slice(0, 2).join("/")
        : parts[0];
      const local = path.join(root, "node_modules", pkg);
      if (!fs.existsSync(local)) return undefined;
      return pluginBuild.resolve(buildArgs.path, {
        kind: buildArgs.kind,
        resolveDir: path.join(root, "node_modules"),
        pluginData: { qjsLocal: true },
      });
    });
  },
};

const stubPlugin = {
  name: "qjs-wasm-stubs",
  setup(pluginBuild) {
    pluginBuild.onResolve({ filter: /.*/ }, (buildArgs) => {
      if (stubs.has(buildArgs.path)) {
        return { path: buildArgs.path, namespace: "qjs-stub" };
      }
      return undefined;
    });
    pluginBuild.onLoad({ filter: /.*/, namespace: "qjs-stub" }, (loadArgs) => ({
      contents: stubs.get(loadArgs.path),
      loader: "js",
    }));
  },
};

await build({
  entryPoints: [entry],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["es2022"],
  outfile,
  logLevel: "warning",
  absWorkingDir: root,
  define: { global: "globalThis" },
  external: ["qjs:web-globals", "qjs:ttsc"],
  plugins: [preferLocalModules, stubPlugin],
});

console.log(`wrote ${path.relative(root, outfile)}`);
