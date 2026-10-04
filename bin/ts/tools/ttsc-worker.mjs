// ttsc transpiler worker thread.
//
// ttsc.wasm (bin/ttsc) does the whole job: TypeScript/TSX in, JavaScript out.
// The guest is blocked on Atomics.wait while this thread runs, so from Hono's
// point of view `qjs:ttsc` is a synchronous transform.
//
// Mailbox layout:
//   int32 state      0 while idle/request length, -1 on error, 1 on success
//   int32 resultLen  byte length of the transpiled code
//   bytes 8..        "mode\0lang\0source" on input, transpiled code on output

import { parentPort } from "node:worker_threads";
import path from "node:path";
import { pathToFileURL } from "node:url";

let state = null;
let data = null;
let ttsc = null;

const defaultWasm = process.env.QJS_TTSC ??
  path.resolve(import.meta.dirname, "..", "..", "ttsc.wasm");

parentPort.on("message", async (message) => {
  if (message.type === "init") {
    state = new Int32Array(message.sab, 0, 2);
    data = new Uint8Array(message.sab, 8);
    try {
      const wasmPath = message.wasm ?? defaultWasm;
      const mod = await import(pathToFileURL(wasmPath).href);
      ttsc = mod.default;
    } catch (err) {
      console.error("ttsc worker: failed to load", defaultWasm, err);
    }
    return;
  }
  if (message.type !== "transpile") return;

  const requestLength = Atomics.load(state, 0);
  const request = Buffer.from(data.subarray(0, requestLength)).toString("utf8");
  const modeEnd = request.indexOf("\0");
  const rest = request.slice(modeEnd + 1);
  const langEnd = rest.indexOf("\0");
  const lang = rest.slice(0, langEnd);
  const source = rest.slice(langEnd + 1);

  let result;
  let error = false;
  try {
    if (!ttsc) throw new Error("ttsc.wasm is not loaded");
    result = ttsc(source, `module.${lang}`);
    if (result.length === 0 && source.trim().length > 0) {
      throw new Error("ttsc returned no output");
    }
  } catch (err) {
    error = true;
    result = err instanceof Error ? err.message : String(err);
    console.error("ttsc worker error:", err && err.stack ? err.stack : err);
  }

  const bytes = Buffer.from(result, "utf8");
  const count = Math.min(bytes.length, data.length - 1);
  data.set(bytes.subarray(0, count));
  if (error) data[count] = 0; // NUL-terminate diagnostics for the guest
  Atomics.store(state, 1, count);
  Atomics.store(state, 0, error ? -1 : 1);
  Atomics.notify(state, 0);
});
