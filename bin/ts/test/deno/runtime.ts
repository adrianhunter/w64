// qjs prelude: a MemoryVolume-backed set of Node.js builtins built from the
// Nodepod polyfills. Evaluated before the main bundle so that modules the
// bundle links against (`fs`, `path`, ...) can be resolved through
// globalThis.__qjs_modules.

import "qjs:web-globals";
import { MemoryVolume } from "../../vendor/nodepod/src/memory-volume";
import { buildFileSystemBridge } from "../../vendor/nodepod/src/polyfills/fs";
import { buildProcessEnv } from "../../vendor/nodepod/src/polyfills/process";
import * as nodePath from "../../vendor/nodepod/src/polyfills/path";
import * as nodeOs from "../../vendor/nodepod/src/polyfills/os";
import nodeEvents from "../../vendor/nodepod/src/polyfills/events";
import * as nodeTimers from "../../vendor/nodepod/src/polyfills/timers";
import * as nodeBuffer from "../../vendor/nodepod/src/polyfills/buffer";
import * as nodeUtil from "../../vendor/nodepod/src/polyfills/util";
import * as nodeQs from "../../vendor/nodepod/src/polyfills/querystring";
import * as nodeUrl from "../../vendor/nodepod/src/polyfills/url";
import * as nodeAssert from "../../vendor/nodepod/src/polyfills/assert";
import * as nodeStringDecoder from "../../vendor/nodepod/src/polyfills/string_decoder";
import * as nodeStream from "../../vendor/nodepod/src/polyfills/stream";
import * as nodeConstants from "../../vendor/nodepod/src/polyfills/constants";
import * as nodeTty from "../../vendor/nodepod/src/polyfills/tty";
import * as nodeDns from "../../vendor/nodepod/src/polyfills/dns";
import * as nodeNet from "../../vendor/nodepod/src/polyfills/net";
import * as nodeTls from "../../vendor/nodepod/src/polyfills/tls";
import * as nodeHttp from "../../vendor/nodepod/src/polyfills/http";
import * as nodeHttps from "../../vendor/nodepod/src/polyfills/https";
import * as nodeCrypto from "../../vendor/nodepod/src/polyfills/crypto";
import * as nodeModule from "../../vendor/nodepod/src/polyfills/module";
import * as nodeReadline from "../../vendor/nodepod/src/polyfills/readline";
import * as nodeZlib from "../../vendor/nodepod/src/polyfills/zlib";
import * as nodeAsyncHooks from "../../vendor/nodepod/src/polyfills/async_hooks";
import * as nodeConsole from "../../vendor/nodepod/src/polyfills/console";
import * as nodeDgram from "../../vendor/nodepod/src/polyfills/dgram";
import * as nodeDomain from "../../vendor/nodepod/src/polyfills/domain";
import * as nodeHttp2 from "../../vendor/nodepod/src/polyfills/http2";
import * as nodeInspector from "../../vendor/nodepod/src/polyfills/inspector";
import * as nodeRepl from "../../vendor/nodepod/src/polyfills/repl";
import * as nodeSea from "../../vendor/nodepod/src/polyfills/sea";
import * as nodeDiagnostics from "../../vendor/nodepod/src/polyfills/diagnostics_channel";
import * as nodePerfHooks from "../../vendor/nodepod/src/polyfills/perf_hooks";
import * as nodePunycode from "../../vendor/nodepod/src/polyfills/punycode";
import * as nodeTraceEvents from "../../vendor/nodepod/src/polyfills/trace_events";
import * as nodeV8 from "../../vendor/nodepod/src/polyfills/v8";

const g = globalThis as unknown as Record<string, unknown>;

const volume = new MemoryVolume();
const proc = buildProcessEnv({ cwd: "/", env: {} });
const fs = buildFileSystemBridge(volume, () => proc.cwd());

g.process = proc;
g.Buffer = nodeBuffer.Buffer;
g.global = globalThis;

const registry = ((g.__qjs_modules as Record<string, unknown>) ??= {});

function put(name: string, mod: unknown, extra?: Record<string, unknown>) {
  const wrapped = Object.assign({}, mod as object, extra);
  if (!("default" in wrapped)) {
    // Default-imported function modules (events, tls, ...) must keep their
    // callable default, not a plain copy.
    (wrapped as Record<string, unknown>).default =
      typeof mod === "function" ? mod : wrapped;
  }
  registry[name] = wrapped;
  registry["node:" + name] = wrapped;
}

// Seed the virtual filesystem with the fixtures the tests rely on.
volume.writeFileSync(
  "/README.md",
  "# node_shims test fixture\n\nHello from the Nodepod memory volume.\n",
);
volume.mkdirSync("/public", { recursive: true });
volume.writeFileSync(
  "/public/index.html",
  "<!doctype html><html><body><h1>hono</h1></body></html>\n",
);
volume.writeFileSync(
  "/public/hello.ts",
  "export interface Greeting {\n" +
    "  name: string;\n" +
    "}\n" +
    "\n" +
    "export function hello(name: string): string {\n" +
    "  return `hello ${name}`;\n" +
    "}\n",
);
volume.writeFileSync(
  "/public/value.ts",
  "const value: number = 41;\n" +
    "(globalThis as { __tsValue?: number }).__tsValue = value + 1;\n",
);
volume.writeFileSync(
  "/public/boom.ts",
  "const marker: string = \"blank\";\n" +
    "(globalThis as { __boom?: () => void }).__boom = (): void => {\n" +
    "  throw new Error(\"boom from typescript\");\n" +
    "};\n" +
    "console.log(marker);\n",
);

put("fs", fs);
put("fs/promises", fs.promises);
put("path", nodePath);
put("path/posix", nodePath);
put("path/win32", nodePath.win32);
put("os", nodeOs);
put("events", nodeEvents);
put("timers", nodeTimers);
put("timers/promises", nodeTimers.promises ?? {});
put("buffer", nodeBuffer);
put("util", nodeUtil);
put("util/types", nodeUtil.types);
put("querystring", nodeQs);
put("url", nodeUrl);
put("assert", nodeAssert);
put("assert/strict", nodeAssert);
put("string_decoder", nodeStringDecoder);
put("stream", nodeStream);
put("stream/promises", nodeStream.promises ?? {});
put("constants", nodeConstants);
put("tty", nodeTty);
put("dns", nodeDns);
put("net", nodeNet, { Socket: nodeNet.TcpSocket, Server: nodeNet.TcpServer });
put("tls", nodeTls);
put("process", proc, { default: proc });
put("http", nodeHttp);
put("https", nodeHttps);
put("crypto", nodeCrypto);
put("module", nodeModule);
put("readline", nodeReadline);
put("zlib", nodeZlib);
put("async_hooks", nodeAsyncHooks);

put("console", nodeConsole);
put("dgram", nodeDgram);
put("domain", nodeDomain);
put("http2", nodeHttp2);
put("inspector", nodeInspector);
put("repl", nodeRepl);
put("sea", nodeSea);
put("diagnostics_channel", nodeDiagnostics);
put("perf_hooks", nodePerfHooks);
put("punycode", nodePunycode);
put("trace_events", nodeTraceEvents);
put("v8", nodeV8);

put("stream/consumers", {
  async arrayBuffer(stream: AsyncIterable<Uint8Array | string>) {
    const chunks: Uint8Array[] = [];
    let total = 0;
    for await (const chunk of stream) {
      const bytes =
        typeof chunk === "string" ? nodeBuffer.Buffer.from(chunk) : chunk;
      chunks.push(bytes);
      total += bytes.byteLength;
    }
    const out = new Uint8Array(total);
    let offset = 0;
    for (const bytes of chunks) {
      out.set(bytes, offset);
      offset += bytes.byteLength;
    }
    return out;
  },
  async text(stream: AsyncIterable<Uint8Array | string>) {
    let out = "";
    for await (const chunk of stream) {
      out +=
        typeof chunk === "string"
          ? chunk
          : nodeBuffer.Buffer.from(chunk).toString("utf8");
    }
    return out;
  },
  async json(stream: AsyncIterable<Uint8Array | string>) {
    let out = "";
    for await (const chunk of stream) {
      out +=
        typeof chunk === "string"
          ? chunk
          : nodeBuffer.Buffer.from(chunk).toString("utf8");
    }
    return JSON.parse(out);
  },
  async buffer(stream: AsyncIterable<Uint8Array | string>) {
    const chunks: Uint8Array[] = [];
    let total = 0;
    for await (const chunk of stream) {
      const bytes =
        typeof chunk === "string" ? nodeBuffer.Buffer.from(chunk) : chunk;
      chunks.push(bytes);
      total += bytes.byteLength;
    }
    return nodeBuffer.Buffer.concat(chunks, total);
  },
});

// child_process is not available in this runtime; register a stub so that
// modules which import it still link. The shim's `Deno.run` will throw if
// actually used.
// worker_threads: enough surface for undici and friends to link; real
// workers are not available in this runtime.
put("worker_threads", {
  isMainThread: true,
  parentPort: null,
  workerData: null,
  threadId: 0,
  SHARE_ENV: Symbol("SHARE_ENV"),
  markAsUncloneable() {},
  markAsUntransferable() {},
  isMarkedAsUntransferable: () => false,
  moveMessagePortToContext: (port: unknown) => port,
  receiveMessageOnPort: () => undefined,
  setEnvironmentData() {},
  getEnvironmentData: () => undefined,
  Worker: class Worker {
    constructor() {
      throw new Error("worker_threads.Worker is not supported");
    }
  },
  MessageChannel: class MessageChannel {
    port1 = {};
    port2 = {};
  },
  MessagePort: class MessagePort {},
});

put("child_process", {
  spawn() {
    throw new Error("child_process.spawn is not supported");
  },
  exec(_cmd: string, opts: unknown, callback?: unknown) {
    const cb = typeof opts === "function" ? opts : callback;
    if (typeof cb === "function") {
      queueMicrotask(() =>
        (cb as (error: Error, stdout: string, stderr: string) => void)(
          new Error("child_process.exec is not supported"),
          "",
          "",
        ),
      );
    }
    return undefined;
  },
  execFile(_file: string, _args: unknown, opts: unknown, callback?: unknown) {
    const cb = typeof opts === "function" ? opts : callback;
    if (typeof cb === "function") {
      queueMicrotask(() =>
        (cb as (error: Error, stdout: string, stderr: string) => void)(
          new Error("child_process.execFile is not supported"),
          "",
          "",
        ),
      );
    }
    return undefined;
  },
  fork() {
    throw new Error("child_process.fork is not supported");
  },
  spawnSync() {
    return {
      status: 1,
      signal: null,
      stdout: "",
      stderr: "",
      output: ["", "", ""],
      pid: 0,
    };
  },
  execSync() {
    throw new Error("child_process.execSync is not supported");
  },
  execFileSync() {
    throw new Error("child_process.execFileSync is not supported");
  },
  ChildProcess: class ChildProcess {},
});

// CommonJS globals expected by bundled packages (e.g. TypeScript's sys).
g.__filename = "/bundle/module.js";
g.__dirname = "/bundle";
g.module = { exports: {} };
g.exports = (g.module as { exports: unknown }).exports;

// Synchronous CommonJS-style require for bundles that use dynamic requires.
// It resolves against the module registry built above.
g.require = function require(name: string) {
  const modules = (g.__qjs_modules ?? {}) as Record<string, unknown>;
  let mod = modules[name] ?? modules["node:" + name];
  if (mod === undefined) {
    // Fall back to a synchronous module load (JSPI suspends the loader on
    // async host I/O, if any).
    const syncImport = g.__qjsRequireSync as
      | ((specifier: string) => unknown)
      | undefined;
    if (typeof syncImport !== "function") {
      throw new Error(`Cannot find module '${name}'`);
    }
    mod = syncImport(name);
  }
  const wrapped = mod as Record<string, unknown>;
  const def = wrapped.default;
  if (def === undefined) return wrapped;
  if (typeof def === "function" || (def !== null && typeof def === "object")) {
    // CommonJS consumers expect named exports on the returned object too.
    for (const key of Object.keys(wrapped)) {
      if (key === "default") continue;
      if ((def as Record<string, unknown>)[key] === undefined) {
        (def as Record<string, unknown>)[key] = wrapped[key];
      }
    }
  }
  return def;
};

g.__qjs_nodepod = { volume, fs, proc };
