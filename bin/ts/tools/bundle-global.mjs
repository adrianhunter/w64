#!/usr/bin/env node
// Bundles `prelude/global.ts` — the single manifest of what ts.wasm embeds.
//
// Rule: relative files (the shims themselves) are bundled. Every bare package
// import stays external and is resolved by the guest at runtime from
// globalThis.__qjs_modules or the filesystem, so no package is duplicated and
// optional heavy libraries never enter the wasm. The only exceptions are the
// Deno shim aliases (bundled) and two local stubs for unsupported wasm
// helpers.
//
// usage: node tools/bundle-global.mjs

import { build } from "esbuild";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

const stubs = new Map([
  [
    "../helpers/wasm-cache.ts",
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
    "pako",
    `// pako is intentionally not bundled; volume snapshot packing is the only
     // consumer and is not used by the startup shims.
     const unavailable = () => { throw new Error("pako is not available in this runtime"); };
     class Deflate { constructor() {} push() { unavailable(); } }
     export default { deflateRaw: unavailable, inflateRaw: unavailable, Deflate, deflate: unavailable, inflate: unavailable };
     export { Deflate };
     export const deflateRaw = unavailable;
     export const inflateRaw = unavailable;
     export const deflate = unavailable;
     export const inflate = unavailable;`,
  ],
  [
    "../helpers/wasm-cdn.ts",
    `export function resolveWasmAssetPath(_volume, vfsPath) { return vfsPath; }
     export function buildCdnWasmUrl() { return null; }
     export function isRecoverableWasmPath() { return false; }
     export function isWasmResolverProbe() { return false; }
     export function resetCdnRefusals() {}
     export async function prefetchWasmFromCdn() { return false; }`,
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

const plugin = {
  name: "qjs-global-manifest",
  setup(pluginBuild) {
    pluginBuild.onResolve({ filter: /.*/ }, (args) => {
      if (args.path.startsWith("qjs:")) {
        return { path: args.path, external: true };
      }
      if (stubs.has(args.path)) {
        return { path: args.path, namespace: "qjs-stub" };
      }
      if (args.path === "@deno/shim-deno") {
        return {
          path: path.join(root, "vendor", "node_shims", "shim-deno", "src", "index.ts"),
        };
      }
      if (args.path === "@deno/shim-deno-test") {
        return {
          path: path.join(root, "vendor", "node_shims", "shim-deno-test", "src", "index.ts"),
        };
      }
      if (args.path === "which") {
        return { path: "which", namespace: "qjs-stub" };
      }
      if (args.path.startsWith(".") || args.path.startsWith("/")) {
        return undefined;
      }
      // every package import the manifest does not bundle stays external
      return { path: args.path, external: true };
    });
    pluginBuild.onLoad({ filter: /.*/, namespace: "qjs-stub" }, (args) => ({
      contents:
        args.path === "which"
          ? "const which = { sync: () => null, default: { sync: () => null } };\nexport default which;\nexport const sync = which.sync;"
          : stubs.get(args.path),
      loader: "js",
    }));
  },
};

const result = await build({
  metafile: true,
  entryPoints: [path.join(root, "prelude", "global.ts")],
  entryNames: "global",
  outdir: path.join(root, ".qjs-build"),
  chunkNames: "chunk-[hash]",
  bundle: true,
  splitting: true,
  format: "esm",
  platform: "browser",
  target: ["es2022"],
  logLevel: "warning",
  absWorkingDir: root,
  define: { global: "globalThis" },
  plugins: [plugin],
});

const inputs = Object.keys(result.metafile.inputs);
const heavy = inputs.filter((name) =>
  name.includes("sync-digest") || name.includes("crypto") || name.includes("noble") ||
  name.includes("wasm-module-cache"));
if (heavy.length) {
  console.log("heavy inputs:", heavy.join(", "));
}
console.log("wrote .qjs-build/global.mjs (+ chunks)");
