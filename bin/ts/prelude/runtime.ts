// Minimal node:* module registry for ts.wasm.
//
// Only the modules the Deno shim (and a typical gpuix example) needs are
// imported here, so heavy polyfills (crypto, zlib, http, dgram, sqlite, ...)
// stay out of the wasm. Everything registered here is importable later from
// guest code under both `name` and `node:name`.

import "qjs:web-globals";
import { MemoryVolume } from "../vendor/node/memory-volume";
import { buildFileSystemBridge } from "../vendor/node/polyfills/fs";
import { buildProcessEnv } from "../vendor/node/polyfills/process";
import * as nodePath from "../vendor/node/polyfills/path";
import * as nodeOs from "../vendor/node/polyfills/os";
import nodeEvents from "../vendor/node/polyfills/events";
import * as nodeTimers from "../vendor/node/polyfills/timers";
import * as nodeBuffer from "../vendor/node/polyfills/buffer";
import * as nodeUtil from "../vendor/node/polyfills/util";
import * as nodeQs from "../vendor/node/polyfills/querystring";
import * as nodeUrl from "../vendor/node/polyfills/url";
import * as nodeAssert from "../vendor/node/polyfills/assert";
import * as nodeStringDecoder from "../vendor/node/polyfills/string_decoder";
import * as nodeStream from "../vendor/node/polyfills/stream";
import * as nodeConstants from "../vendor/node/polyfills/constants";
import * as nodeTty from "../vendor/node/polyfills/tty";
import * as nodeDns from "../vendor/node/polyfills/dns";
import * as nodeNet from "../vendor/node/polyfills/net";
import * as nodeTls from "../vendor/node/polyfills/tls";
import * as nodeConsole from "../vendor/node/polyfills/console";
import * as nodeAsyncHooks from "../vendor/node/polyfills/async_hooks";
import * as nodePerfHooks from "../vendor/node/polyfills/perf_hooks";
import * as nodePunycode from "../vendor/node/polyfills/punycode";
import * as nodeModule from "../vendor/node/polyfills/module";
import * as nodeDomain from "../vendor/node/polyfills/domain";
import * as nodeDiagnostics from "../vendor/node/polyfills/diagnostics_channel";
import * as nodeTraceEvents from "../vendor/node/polyfills/trace_events";

const g = globalThis as unknown as Record<string, unknown>;

const volume = new MemoryVolume();
const proc = buildProcessEnv({ cwd: "/", env: {} });
const fs = buildFileSystemBridge(volume, () => proc.cwd());

g.process = proc;
g.Buffer = nodeBuffer.Buffer;
g.global = globalThis;

const registry = ((g.__qjs_modules as Record<string, unknown>) ??= {});

function put(name: string, mod: unknown, extra?: Record<string, unknown>) {
  let wrapped: Record<string, unknown>;
  if (typeof mod === "function") {
    wrapped = {};
    for (const key of Object.keys(mod)) {
      wrapped[key] = (mod as Record<string, unknown>)[key];
    }
    wrapped.default = mod;
  } else {
    wrapped = Object.assign({}, mod as object);
  }
  Object.assign(wrapped, extra);
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
put("timers/promises", nodeTimers.promises ?? {});
put("buffer", nodeBuffer);
put("util", nodeUtil);
put("util/types", nodeUtil.types);
put("querystring", nodeQs);
put("url", nodeUrl);
put("assert", (nodeAssert as any).default ?? nodeAssert);
put("assert/strict", (nodeAssert as any).default ?? nodeAssert);
put("string_decoder", nodeStringDecoder);
put("stream", nodeStream);
put("stream/promises", nodeStream.promises ?? {});
put("constants", nodeConstants);
put("tty", nodeTty);
put("dns", nodeDns);
put("net", nodeNet, { Socket: nodeNet.TcpSocket, Server: nodeNet.TcpServer });
put("tls", nodeTls);
put("process", proc, { default: proc });
put("console", nodeConsole);
put("async_hooks", nodeAsyncHooks);
put("perf_hooks", nodePerfHooks);
put("punycode", nodePunycode);
put("module", nodeModule);
put("domain", nodeDomain);
put("diagnostics_channel", nodeDiagnostics);
put("trace_events", nodeTraceEvents);

// enough surface for libraries that only probe these at import time
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

function streamText(stream: AsyncIterable<Uint8Array | string>): Promise<string> {
  return (async () => {
    let out = "";
    for await (const chunk of stream) {
      out +=
        typeof chunk === "string"
          ? chunk
          : nodeBuffer.Buffer.from(chunk).toString("utf8");
    }
    return out;
  })();
}

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
    return streamText(stream);
  },
  async json(stream: AsyncIterable<Uint8Array | string>) {
    return JSON.parse(await streamText(stream));
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

// CommonJS globals expected by bundled packages (e.g. TypeScript's sys).
g.__filename = "/bundle/module.js";
g.__dirname = "/bundle";
g.module = { exports: {} };
g.exports = (g.module as { exports: unknown }).exports;

g.require = function require(name: string) {
  const modules = (g.__qjs_modules ?? {}) as Record<string, unknown>;
  let mod = modules[name] ?? modules["node:" + name];
  if (mod === undefined) {
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
    for (const key of Object.keys(wrapped)) {
      if (key === "default") continue;
      if ((def as Record<string, unknown>)[key] === undefined) {
        (def as Record<string, unknown>)[key] = wrapped[key];
      }
    }
  }
  return def;
};

g.__qjs_node = { volume, fs, proc };
