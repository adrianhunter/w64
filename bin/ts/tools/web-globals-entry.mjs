// Web platform globals that QuickJS-ng does not provide but that the
// Nodepod polyfills and the Deno shim expect. Bundled into
// `src/web_globals.bundle.js` by `tools/build-web-globals.mjs` and evaluated
// by the qjs runtime before any user/bundle code.

import {
  ReadableStream,
  WritableStream,
  TransformStream,
  ByteLengthQueuingStrategy,
  CountQueuingStrategy,
} from "web-streams-polyfill";

const g = globalThis;

// QuickJS-ng ships a minimal `performance` object; the Node polyfills expect
// the full Performance interface (methods live on the object, not a
// prototype).
if (g.performance) {
  const perf = g.performance;
  const fill = (name, value) => {
    if (typeof perf[name] !== "function") perf[name] = value;
  };
  fill("now", () => Date.now());
  fill("mark", () => {});
  fill("measure", () => {});
  fill("clearMarks", () => {});
  fill("clearMeasures", () => {});
  fill("clearResourceTimings", () => {});
  fill("getEntries", () => []);
  fill("getEntriesByName", () => []);
  fill("getEntriesByType", () => []);
  fill("markResourceTiming", () => {});
  if (typeof perf.timeOrigin !== "number") {
    perf.timeOrigin = Date.now();
  }
}

if (typeof g.ReadableStream === "undefined") g.ReadableStream = ReadableStream;
if (typeof g.WritableStream === "undefined") g.WritableStream = WritableStream;
if (typeof g.TransformStream === "undefined") g.TransformStream = TransformStream;
if (typeof g.ByteLengthQueuingStrategy === "undefined") {
  g.ByteLengthQueuingStrategy = ByteLengthQueuingStrategy;
}
if (typeof g.CountQueuingStrategy === "undefined") {
  g.CountQueuingStrategy = CountQueuingStrategy;
}

// ---------------------------------------------------------------------------
// TextEncoder / TextDecoder
// ---------------------------------------------------------------------------

class TextEncoder {
  get encoding() {
    return "utf-8";
  }
  encode(input = "") {
    const str = String(input);
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
      let code = str.charCodeAt(i);
      if (code >= 0xd800 && code <= 0xdbff && i + 1 < str.length) {
        const next = str.charCodeAt(i + 1);
        if (next >= 0xdc00 && next <= 0xdfff) {
          code = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00);
          i++;
        }
      }
      if (code < 0x80) {
        bytes.push(code);
      } else if (code < 0x800) {
        bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
      } else if (code < 0x10000) {
        bytes.push(
          0xe0 | (code >> 12),
          0x80 | ((code >> 6) & 0x3f),
          0x80 | (code & 0x3f),
        );
      } else {
        bytes.push(
          0xf0 | (code >> 18),
          0x80 | ((code >> 12) & 0x3f),
          0x80 | ((code >> 6) & 0x3f),
          0x80 | (code & 0x3f),
        );
      }
    }
    return new Uint8Array(bytes);
  }
  encodeInto(input, dest) {
    const encoded = this.encode(input);
    const n = Math.min(encoded.length, dest.length);
    dest.set(encoded.subarray(0, n));
    return { read: input.length, written: n };
  }
}

class TextDecoder {
  constructor(label = "utf-8", options = {}) {
    const normalized = String(label).toLowerCase().replace(/[-_ ]/g, "");
    this.encoding =
      normalized === "utf8"
        ? "utf-8"
        : normalized === "latin1" ||
            normalized === "iso88591" ||
            normalized === "windows1252" ||
            normalized === "ascii" ||
            normalized === "usascii"
          ? "windows-1252"
          : normalized === "utf16" || normalized === "utf16le"
            ? "utf-16le"
            : normalized === "utf16be"
              ? "utf-16be"
              : normalized;
    this.fatal = !!options.fatal;
    this.ignoreBOM = !!options.ignoreBOM;
  }
  decode(input) {
    if (input === undefined) return "";
    const bytes =
      input instanceof Uint8Array
        ? input
        : new Uint8Array(input.buffer ?? input);
    if (this.encoding === "utf-16le" || this.encoding === "utf-16be") {
      const littleEndian = this.encoding === "utf-16le";
      let out = "";
      for (let i = 0; i + 1 < bytes.length; i += 2) {
        const code = littleEndian
          ? bytes[i] | (bytes[i + 1] << 8)
          : (bytes[i] << 8) | bytes[i + 1];
        out += String.fromCharCode(code);
      }
      return out;
    }
    if (this.encoding !== "utf-8") {
      // Latin1 / windows-1252 and unknown labels: map bytes directly.
      let out = "";
      for (const byte of bytes) out += String.fromCharCode(byte);
      return out;
    }
    let out = "";
    let i = 0;
    while (i < bytes.length) {
      const byte = bytes[i++];
      let code;
      if (byte < 0x80) {
        code = byte;
      } else if ((byte & 0xe0) === 0xc0) {
        code = ((byte & 0x1f) << 6) | (bytes[i++] & 0x3f);
      } else if ((byte & 0xf0) === 0xe0) {
        code =
          ((byte & 0x0f) << 12) |
          ((bytes[i++] & 0x3f) << 6) |
          (bytes[i++] & 0x3f);
      } else {
        code =
          ((byte & 0x07) << 18) |
          ((bytes[i++] & 0x3f) << 12) |
          ((bytes[i++] & 0x3f) << 6) |
          (bytes[i++] & 0x3f);
      }
      if (code > 0xffff) {
        code -= 0x10000;
        out += String.fromCharCode(
          0xd800 + (code >> 10),
          0xdc00 + (code & 0x3ff),
        );
      } else {
        out += String.fromCharCode(code);
      }
    }
    return out;
  }
}

if (typeof g.TextEncoder === "undefined") g.TextEncoder = TextEncoder;
if (typeof g.TextDecoder === "undefined") g.TextDecoder = TextDecoder;

// ---------------------------------------------------------------------------
// Event / EventTarget / AbortController
// ---------------------------------------------------------------------------

if (typeof g.Event === "undefined") {
  g.Event = class Event {
    constructor(type, options = {}) {
      this.type = String(type);
      this.bubbles = !!options.bubbles;
      this.cancelable = !!options.cancelable;
      this.defaultPrevented = false;
      this.target = null;
      this.currentTarget = null;
    }
    preventDefault() {
      this.defaultPrevented = true;
    }
    stopPropagation() {}
    stopImmediatePropagation() {}
  };
}

if (typeof g.EventTarget === "undefined") {
  g.EventTarget = class EventTarget {
    constructor() {
      Object.defineProperty(this, "_listeners", { value: new Map() });
    }
    addEventListener(type, listener) {
      if (!listener) return;
      const list = this._listeners.get(type) ?? [];
      if (!list.includes(listener)) list.push(listener);
      this._listeners.set(type, list);
    }
    removeEventListener(type, listener) {
      const list = this._listeners.get(type);
      if (!list) return;
      const idx = list.indexOf(listener);
      if (idx >= 0) list.splice(idx, 1);
    }
    dispatchEvent(event) {
      event.target = this;
      event.currentTarget = this;
      for (const listener of [...(this._listeners.get(event.type) ?? [])]) {
        if (typeof listener === "function") listener.call(this, event);
        else listener.handleEvent(event);
      }
      return !event.defaultPrevented;
    }
  };
}

if (typeof g.AbortSignal === "undefined") {
  class AbortSignal {
    constructor() {
      this.aborted = false;
      this.reason = undefined;
      this.onabort = null;
      this._listeners = [];
    }
    addEventListener(type, listener) {
      if (type === "abort") this._listeners.push(listener);
    }
    removeEventListener(type, listener) {
      if (type !== "abort") return;
      const idx = this._listeners.indexOf(listener);
      if (idx >= 0) this._listeners.splice(idx, 1);
    }
    throwIfAborted() {
      if (this.aborted) throw this.reason;
    }
    static abort(reason) {
      const signal = new AbortSignal();
      signal.aborted = true;
      signal.reason = reason;
      return signal;
    }
    static timeout(ms) {
      const signal = new AbortSignal();
      setTimeout(() => {
        signal.aborted = true;
        signal.reason = new Error("The operation was aborted.");
        for (const listener of signal._listeners) listener.call(signal, { type: "abort" });
        if (signal.onabort) signal.onabort.call(signal, { type: "abort" });
      }, ms);
      return signal;
    }
  }
  g.AbortSignal = AbortSignal;

  g.AbortController = class AbortController {
    constructor() {
      this.signal = new AbortSignal();
    }
    abort(reason) {
      if (this.signal.aborted) return;
      this.signal.aborted = true;
      this.signal.reason = reason;
      for (const listener of this.signal._listeners) {
        listener.call(this.signal, { type: "abort" });
      }
      if (this.signal.onabort) {
        this.signal.onabort.call(this.signal, { type: "abort" });
      }
    }
  };
}

// ---------------------------------------------------------------------------
// MessageChannel (used by the fs polyfill for callback scheduling)
// ---------------------------------------------------------------------------

if (typeof g.MessageChannel === "undefined") {
  class MessagePort {
    constructor() {
      this.onmessage = null;
      this._other = null;
    }
    postMessage(data) {
      const other = this._other;
      queueMicrotask(() => {
        if (other && other.onmessage) other.onmessage({ data });
      });
    }
    start() {}
    close() {}
  }
  g.MessageChannel = class MessageChannel {
    constructor() {
      this.port1 = new MessagePort();
      this.port2 = new MessagePort();
      this.port1._other = this.port2;
      this.port2._other = this.port1;
    }
  };
}

// ---------------------------------------------------------------------------
// structuredClone
// ---------------------------------------------------------------------------

if (typeof g.structuredClone === "undefined") {
  g.structuredClone = function structuredClone(value) {
    const seen = new Map();
    function clone(v) {
      if (v === null || typeof v !== "object") return v;
      if (seen.has(v)) return seen.get(v);
      if (v instanceof Date) return new Date(v.getTime());
      if (v instanceof RegExp) return new RegExp(v.source, v.flags);
      if (v instanceof ArrayBuffer) return v.slice(0);
      if (ArrayBuffer.isView(v)) {
        return new v.constructor(clone(v.buffer), v.byteOffset, v.length);
      }
      if (v instanceof Map) {
        const out = new Map();
        seen.set(v, out);
        for (const [k, val] of v) out.set(clone(k), clone(val));
        return out;
      }
      if (v instanceof Set) {
        const out = new Set();
        seen.set(v, out);
        for (const val of v) out.add(clone(val));
        return out;
      }
      const out = Array.isArray(v) ? [] : {};
      seen.set(v, out);
      for (const key of Object.keys(v)) out[key] = clone(v[key]);
      return out;
    }
    return clone(value);
  };
}

// ---------------------------------------------------------------------------
// Headers / Request / Response
// ---------------------------------------------------------------------------

if (typeof g.Headers === "undefined") {
  g.Headers = class Headers {
    constructor(init) {
      this._entries = [];
      if (init instanceof Headers) {
        for (const [name, value] of init) this.append(name, value);
      } else if (Array.isArray(init)) {
        for (const [name, value] of init) this.append(name, value);
      } else if (init && typeof init === "object") {
        for (const name of Object.keys(init)) this.append(name, init[name]);
      }
    }
    _normalize(name) {
      return String(name).toLowerCase();
    }
    append(name, value) {
      this._entries.push([this._normalize(name), String(value)]);
    }
    delete(name) {
      const key = this._normalize(name);
      this._entries = this._entries.filter(([entryName]) => entryName !== key);
    }
    get(name) {
      const key = this._normalize(name);
      const values = this._entries
        .filter(([entryName]) => entryName === key)
        .map(([, value]) => value);
      return values.length > 0 ? values.join(", ") : null;
    }
    getSetCookie() {
      return this._entries
        .filter(([entryName]) => entryName === "set-cookie")
        .map(([, value]) => value);
    }
    has(name) {
      const key = this._normalize(name);
      return this._entries.some(([entryName]) => entryName === key);
    }
    set(name, value) {
      const key = this._normalize(name);
      this.delete(key);
      this._entries.push([key, String(value)]);
    }
    forEach(callback, thisArg) {
      for (const [name, value] of this._entries) {
        callback.call(thisArg, value, name, this);
      }
    }
    *entries() {
      yield* this._entries;
    }
    *keys() {
      for (const [name] of this._entries) yield name;
    }
    *values() {
      for (const [, value] of this._entries) yield value;
    }
    [Symbol.iterator]() {
      return this.entries();
    }
  };
}

if (typeof g.Blob === "undefined") {
  g.Blob = class Blob {
    constructor(parts = [], options = {}) {
      this._parts = parts;
      this.type = options.type ?? "";
      this.size = 0;
      this._bytes = [];
      for (const part of parts) {
        let bytes;
        if (typeof part === "string") bytes = new TextEncoder().encode(part);
        else if (part instanceof ArrayBuffer) bytes = new Uint8Array(part);
        else if (ArrayBuffer.isView(part)) {
          bytes = new Uint8Array(part.buffer, part.byteOffset, part.byteLength);
        } else bytes = new TextEncoder().encode(String(part));
        this._bytes.push(bytes);
        this.size += bytes.byteLength;
      }
    }
    async arrayBuffer() {
      const out = new Uint8Array(this.size);
      let offset = 0;
      for (const bytes of this._bytes) {
        out.set(bytes, offset);
        offset += bytes.byteLength;
      }
      return out.buffer;
    }
    async text() {
      return new TextDecoder().decode(await this.arrayBuffer());
    }
  };
}

if (typeof g.File === "undefined") {
  g.File = class File extends Blob {
    constructor(parts = [], name = "blob", options = {}) {
      super(parts, options);
      this.name = String(name);
      this.lastModified = options.lastModified ?? 0;
    }
  };
}

if (typeof g.MessagePort === "undefined") {
  g.MessagePort = class MessagePort {
    postMessage() {}
    start() {}
    close() {}
    addEventListener() {}
    removeEventListener() {}
  };
}

if (typeof g.MessageChannel === "undefined") {
  g.MessageChannel = class MessageChannel {
    constructor() {
      this.port1 = new g.MessagePort();
      this.port2 = new g.MessagePort();
    }
  };
}

function bodyBytes(body) {
  if (body === null || body === undefined) return new Uint8Array(0);
  if (typeof body === "string") return new TextEncoder().encode(body);
  // Always copy: binary values may be views into wasm memory, which can be
  // detached when the guest heap grows.
  if (body instanceof ArrayBuffer) return new Uint8Array(body).slice();
  if (ArrayBuffer.isView(body)) {
    return new Uint8Array(body.buffer, body.byteOffset, body.byteLength).slice();
  }
  return new TextEncoder().encode(String(body));
}

async function consumeBody(body) {
  if (body === null || body === undefined) return new Uint8Array(0);
  if (typeof body === "string" || body instanceof ArrayBuffer) {
    return body instanceof ArrayBuffer
      ? new Uint8Array(body)
      : new TextEncoder().encode(body);
  }
  if (ArrayBuffer.isView(body)) {
    return new Uint8Array(body.buffer, body.byteOffset, body.byteLength);
  }
  if (body && typeof body.getReader === "function") {
    const reader = body.getReader();
    const chunks = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const bytes = value instanceof Uint8Array ? value : bodyBytes(value);
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
  }
  if (body && typeof body.arrayBuffer === "function") {
    return new Uint8Array(await body.arrayBuffer());
  }
  return new TextEncoder().encode(String(body));
}

function toBodyStream(body) {
  if (body === null || body === undefined) return null;
  if (typeof body.getReader === "function") return body;
  const bytes = bodyBytes(body);
  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

class WebBody {
  constructor(body) {
    this._body = body ?? null;
    this.bodyUsed = false;
    // Fetch responses always expose a ReadableStream body; some frameworks
    // (Hono's context) rely on it when rewrapping responses.
    this.body = toBodyStream(this._body);
  }
  async _consume() {
    if (this.bodyUsed) throw new TypeError("Body is unusable");
    this.bodyUsed = true;
    return consumeBody(this._body);
  }
  async arrayBuffer() {
    const bytes = await this._consume();
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  }
  async text() {
    return new TextDecoder().decode(await this._consume());
  }
  async json() {
    return JSON.parse(await this.text());
  }
}

if (typeof g.Response === "undefined") {
  g.Response = class Response extends WebBody {
    constructor(body = null, init = {}) {
      super(body);
      this.status = init.status ?? 200;
      this.statusText = init.statusText ?? "";
      this.headers =
        init.headers instanceof Headers
          ? init.headers
          : new Headers(init.headers);
      this.ok = this.status >= 200 && this.status < 300;
      this.type = "default";
      this.url = "";
      this.redirected = false;
    }
    clone() {
      // Tee stream bodies so consuming the clone keeps the original intact.
      let body = this._body;
      if (body && typeof body.tee === "function") {
        const branches = body.tee();
        this._body = branches[0];
        this.body = branches[0];
        body = branches[1];
      }
      const clone = new Response(body, {
        status: this.status,
        statusText: this.statusText,
        headers: new Headers(this.headers),
      });
      clone.url = this.url;
      return clone;
    }
    static json(data, init = {}) {
      const headers = new Headers(init.headers);
      if (!headers.has("content-type")) {
        headers.set("content-type", "application/json");
      }
      return new Response(JSON.stringify(data), { ...init, headers });
    }
    static redirect(url, status = 302) {
      return new Response(null, {
        status,
        headers: { location: String(url) },
      });
    }
    static error() {
      return new Response(null, { status: 500 });
    }
  };
}

if (typeof g.Request === "undefined") {
  g.Request = class Request extends WebBody {
    constructor(input, init = {}) {
      if (input instanceof Request) {
        super(init.body !== undefined ? init.body : input._body);
        this.url = input.url;
        this.method = (init.method ?? input.method).toUpperCase();
        this.headers =
          init.headers !== undefined
            ? new Headers(init.headers)
            : new Headers(input.headers);
        this.signal = init.signal ?? input.signal;
        this.credentials = init.credentials ?? input.credentials;
        this.cache = init.cache ?? input.cache;
        this.redirect = init.redirect ?? input.redirect;
        this.referrer = init.referrer ?? input.referrer;
        this.referrerPolicy = init.referrerPolicy ?? input.referrerPolicy;
        this.integrity = init.integrity ?? input.integrity;
        this.keepalive = init.keepalive ?? input.keepalive;
        this.mode = init.mode ?? input.mode;
      } else {
        super(init.body ?? null);
        this.url = String(input);
        this.method = (init.method ?? "GET").toUpperCase();
        this.headers = new Headers(init.headers);
        this.signal = init.signal ?? AbortSignal.abort();
        this.credentials = init.credentials ?? "same-origin";
        this.cache = init.cache ?? "default";
        this.redirect = init.redirect ?? "follow";
        this.referrer = init.referrer ?? "about:client";
        this.referrerPolicy = init.referrerPolicy ?? "";
        this.integrity = init.integrity ?? "";
        this.keepalive = init.keepalive ?? false;
        this.mode = init.mode ?? "cors";
      }
      this.destination = "";
    }
    clone() {
      const clone = new Request(this.url, {
        method: this.method,
        headers: new Headers(this.headers),
        body: this._body,
        signal: this.signal,
      });
      return clone;
    }
  };
}

if (typeof g.fetch === "undefined") {
  g.fetch = async () => {
    throw new Error("fetch is not implemented in this runtime");
  };
}

// ---------------------------------------------------------------------------
// crypto
// ---------------------------------------------------------------------------

if (typeof g.crypto === "undefined") {
  const randomBytes = (len) => {
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = Math.floor(Math.random() * 256);
    return bytes;
  };
  g.crypto = {
    getRandomValues(array) {
      const view = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
      view.set(randomBytes(view.length));
      return array;
    },
    randomUUID() {
      const bytes = randomBytes(16);
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = [];
      for (const b of bytes) hex.push(b.toString(16).padStart(2, "0"));
      return (
        hex.slice(0, 4).join("") +
        "-" +
        hex.slice(4, 6).join("") +
        "-" +
        hex.slice(6, 8).join("") +
        "-" +
        hex.slice(8, 10).join("") +
        "-" +
        hex.slice(10, 16).join("")
      );
    },
  };
}

// ---------------------------------------------------------------------------
// navigator
// ---------------------------------------------------------------------------

if (typeof g.navigator === "undefined") {
  g.navigator = { userAgent: "quickjs-ng/wasi", platform: "wasi" };
}

// ---------------------------------------------------------------------------
// Timers with a host-drained queue
// ---------------------------------------------------------------------------

const pendingTimers = new Map();
let nextTimerId = 1;
let virtualNow = 0;

// The clock is virtual: the host loop adds the real time it waited through
// `__qjs_timers_advance`, and the wizer stub can skip ahead without waiting.
function timerClock() {
  return virtualNow;
}

function scheduleTimer(fn, delay, args, repeat) {
  if (typeof fn !== "function") {
    throw new TypeError("Callback must be a function");
  }
  const id = nextTimerId++;
  const ms = Math.max(Number(delay) || 0, 1);
  pendingTimers.set(id, {
    fn,
    args,
    repeat,
    due: timerClock() + ms,
    interval: ms,
  });
  return id;
}

g.setTimeout = (fn, delay, ...args) => scheduleTimer(fn, delay, args, false);
g.setInterval = (fn, delay, ...args) => scheduleTimer(fn, delay, args, true);
g.setImmediate = (fn, ...args) => scheduleTimer(fn, 0, args, false);
g.clearTimeout = (id) => {
  pendingTimers.delete(id);
};
g.clearInterval = g.clearTimeout;
g.clearImmediate = g.clearTimeout;

g.__qjs_timers_pending = function () {
  return pendingTimers.size > 0;
};

// Runs timers that are due at the current virtual clock and returns how many
// ran. The host loop calls this after draining the job queue.
g.__qjs_timers_drain = function () {
  let ran = 0;
  const at = timerClock();
  for (const [id, timer] of [...pendingTimers]) {
    if (timer.due > at) continue;
    ran++;
    if (timer.repeat) {
      timer.due = at + timer.interval;
    } else {
      pendingTimers.delete(id);
    }
    timer.fn(...timer.args);
  }
  return ran;
};

// Milliseconds until the earliest pending timer, or -1 when none are left.
// The host sleeps for that long (JSPI) before the clock advances, so idle
// processes do not spin on repeating timers.
g.__qjs_timers_next = function () {
  if (pendingTimers.size === 0) return -1;
  let earliest = Infinity;
  for (const timer of pendingTimers.values()) {
    if (timer.due < earliest) earliest = timer.due;
  }
  return Math.max(0, earliest - timerClock());
};

// Moves the virtual clock forward to the earliest pending deadline once the
// host has actually waited for it.
g.__qjs_timers_advance = function () {
  if (pendingTimers.size === 0) return;
  let earliest = Infinity;
  for (const timer of pendingTimers.values()) {
    if (timer.due < earliest) earliest = timer.due;
  }
  const now = timerClock();
  if (earliest > now) virtualNow += earliest - now;
};
