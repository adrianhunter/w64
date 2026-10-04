#!/usr/bin/env node
// Bundles the Nodepod Node.js polyfills into a single ESM file that installs
// a MemoryVolume-backed `node:*` module set on globalThis.__qjs_modules.
//
// usage: node tools/build-nodepod.mjs [--outfile path] [--self-test]
//
// The bundle is meant to be evaluated during wizer pre-initialization (or as
// a file under the base qjs), after the web globals have been installed.

import { build } from "esbuild";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const vendor = path.join(root, "vendor", "nodepod");

const args = process.argv.slice(2);
function argValue(name, fallback) {
  const idx = args.indexOf(name);
  return idx >= 0 ? args[idx + 1] : fallback;
}
const outfile = path.resolve(
  root,
  argValue("--outfile", ".qjs-build/nodepod.bundle.mjs"),
);
const selfTest = args.includes("--self-test");

const stubs = new Map([
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

const stubPlugin = {
  name: "nodepod-stubs",
  setup(pluginBuild) {
    pluginBuild.onResolve({ filter: /.*/ }, (buildArgs) => {
      if (stubs.has(buildArgs.path)) {
        return { path: buildArgs.path, namespace: "nodepod-stub" };
      }
      return undefined;
    });
    pluginBuild.onLoad(
      { filter: /.*/, namespace: "nodepod-stub" },
      (loadArgs) => ({
        contents: stubs.get(loadArgs.path),
        loader: "js",
      }),
    );
  },
};

const entry = `
import "qjs:web-globals";
import { MemoryVolume } from "./src/memory-volume";
import { buildFileSystemBridge } from "./src/polyfills/fs";
import { buildProcessEnv } from "./src/polyfills/process";
import * as nodePath from "./src/polyfills/path";
import * as nodeOs from "./src/polyfills/os";
import nodeEvents from "./src/polyfills/events";
import * as nodeTimers from "./src/polyfills/timers";
import * as nodeBuffer from "./src/polyfills/buffer";
import * as nodeUtil from "./src/polyfills/util";
import * as nodeQs from "./src/polyfills/querystring";
import * as nodeUrl from "./src/polyfills/url";
import * as nodeAssert from "./src/polyfills/assert";
import * as nodeStringDecoder from "./src/polyfills/string_decoder";
import * as nodeStream from "./src/polyfills/stream";
import * as nodeConstants from "./src/polyfills/constants";
import * as nodeTty from "./src/polyfills/tty";

const volume = new MemoryVolume();
const proc = buildProcessEnv({ cwd: "/", env: {} });
const fs = buildFileSystemBridge(volume, () => proc.cwd());

globalThis.process = proc;
globalThis.Buffer = nodeBuffer.Buffer;
globalThis.global = globalThis;

const registry = (globalThis.__qjs_modules = globalThis.__qjs_modules || {});
function put(name, mod, extra) {
  const wrapped = Object.assign({}, mod, extra);
  if (!("default" in wrapped)) wrapped.default = wrapped;
  registry[name] = wrapped;
  registry["node:" + name] = wrapped;
}

put("fs", fs);
put("fs/promises", fs.promises);
put("path", nodePath);
put("path/posix", nodePath);
put("path/win32", nodePath.win32);
put("os", nodeOs);
put("events", nodeEvents);
put("timers", nodeTimers);
put("timers/promises", {
  ...(nodeTimers.promises || {}),
  setTimeout: nodeTimers.promises && nodeTimers.promises.setTimeout,
});
put("buffer", nodeBuffer);
put("util", nodeUtil);
put("util/types", nodeUtil.types);
put("querystring", nodeQs);
put("url", nodeUrl);
put("assert", nodeAssert);
put("assert/strict", nodeAssert);
put("string_decoder", nodeStringDecoder);
put("stream", nodeStream);
put("stream/promises", nodeStream.promises || {});
put("constants", nodeConstants);
put("tty", nodeTty);
put("process", proc, { default: proc });

globalThis.__qjs_nodepod = { volume, fs, proc };

${selfTest ? `
const assert = (cond, msg) => { if (!cond) throw new Error("SELF-TEST FAILED: " + msg); };
fs.mkdirSync("/tmp", { recursive: true });
fs.writeFileSync("/tmp/hello.txt", "hello nodepod");
assert(fs.readFileSync("/tmp/hello.txt", "utf8") === "hello nodepod", "fs read/write");
assert(fs.statSync("/tmp/hello.txt").size === 13, "fs stat size");
assert(nodePath.join("/a", "b", "..", "c") === "/a/c", "path join");
assert(nodeBuffer.Buffer.from("hi").toString("hex") === "6869", "buffer hex");
assert(nodeOs.type() !== undefined, "os type");
assert(typeof proc.cwd() === "string", "process.cwd");
assert(nodeUrl.fileURLToPath("file:///tmp/hello.txt") === "/tmp/hello.txt", "fileURLToPath");
const ev = new nodeEvents();
let fired = false;
ev.on("x", () => { fired = true; });
ev.emit("x");
assert(fired, "events");
print("nodepod self-test ok");
` : ""}
`;

await build({
  stdin: {
    contents: entry,
    resolveDir: vendor,
    sourcefile: "qjs-nodepod-entry.js",
    loader: "js",
  },
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["es2020"],
  outfile,
  logLevel: "warning",
  define: { global: "globalThis" },
  external: ["qjs:web-globals"],
  plugins: [stubPlugin],
});

console.log(`wrote ${path.relative(root, outfile)}`);
