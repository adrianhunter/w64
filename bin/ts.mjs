// Main-thread API for bin/ts.wasm.
//
// `runTs` runs a TypeScript/JavaScript entry point inside the worker-hosted
// QuickJS runtime. `runGpuix` is the enforced path for gpuix: the caller must
// pass the root canvas element (or an OffscreenCanvas), which is transferred
// to the worker before anything is evaluated.

const DEFAULT_WORKER_URL = new URL("./ts.worker.mjs", import.meta.url);

function toTransferable(value) {
  if (typeof value === "string") return value;
  if (value instanceof Uint8Array) {
    return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
  }
  return value;
}

async function fetchBytes(url, label) {
  if (!url) return undefined;
  if (url instanceof ArrayBuffer || url instanceof Uint8Array) {
    return toTransferable(url);
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`ts: failed to fetch ${label} from ${url} (${response.status})`);
  }
  return response.arrayBuffer();
}

/**
 * Runs `entry` inside a fresh ts.wasm worker.
 *
 * @param {object} options
 * @param {string|ArrayBuffer} options.wasmUrl   bin/ts.wasm
 * @param {string|ArrayBuffer} [options.ttscUrl] bin/ttsc.wasm
 * @param {string} [options.entry]              guest path to run (default: first mounted .ts file)
 * @param {{path: string, data: string|ArrayBuffer}[]} [options.files]
 * @param {string[]} [options.args]
 * @param {Record<string,string>} [options.env]
 * @param {OffscreenCanvas} [options.canvas]
 * @param {boolean|string|{file:string}} [options.opfs] back the guest SQLite VFS with a single OPFS sync-access file
 * @param {number} [options.timeoutMs]
 * @param {(event: object) => void} [options.onEvent]
 * @param {string|URL} [options.workerUrl]
 */
export async function runTs(options) {
  const {
    wasmUrl,
    ttscUrl,
    entry,
    files = [],
    args = [],
    env = {},
    canvas,
    opfs,
    timeoutMs = 0,
    onEvent,
    workerUrl = DEFAULT_WORKER_URL,
  } = options;

  const [wasm, ttsc] = await Promise.all([
    fetchBytes(wasmUrl, "ts.wasm"),
    fetchBytes(ttscUrl, "ttsc.wasm"),
  ]);

  const worker = new Worker(workerUrl, { type: "module", name: "ts" });

  let timer = null;
  const done = new Promise((resolve, reject) => {
    worker.onmessage = (event) => {
      const message = event.data;
      onEvent?.(message);
      if (message.type === "exit") {
        if (timer) clearTimeout(timer);
        worker.terminate();
        resolve(message.code ?? 0);
      } else if (message.type === "error") {
        if (timer) clearTimeout(timer);
        worker.terminate();
        reject(new Error(message.message));
      }
    };
    worker.onerror = (event) => {
      if (timer) clearTimeout(timer);
      worker.terminate();
      reject(new Error(event.message ?? "ts worker failed"));
    };
  });

  if (timeoutMs > 0) {
    timer = setTimeout(() => {
      worker.terminate();
      done.catch(() => {});
    }, timeoutMs);
  }

  const mount = files.some((file) => file.path === entry);
  const mounted = mount
    ? files
    : entry
      ? [{ path: entry, data: "" }, ...files]
      : files;

  const transfer = [];
  if (canvas) transfer.push(canvas);
  worker.postMessage(
    {
      type: "init",
      wasm,
      ttsc,
      entry: entry ?? files[0]?.path ?? "/main.ts",
      args: entry ? [entry, ...args.slice(1)] : args,
      env,
      files: mounted,
      canvas,
      opfs: opfs ? { file: typeof opfs === "string" ? opfs : (opfs.file ?? "ts-vfs.sqlite") } : undefined,
    },
    transfer,
  );

  return done;
}

/**
 * Runs a gpuix entry point. A canvas is required: the root canvas element is
 * transferred to the worker as an OffscreenCanvas, so gpuix never executes on
 * the main thread.
 *
 * @param {HTMLCanvasElement|OffscreenCanvas} canvas
 * @param {Parameters<typeof runTs>[0]} options
 */
export async function runGpuix(canvas, options) {
  if (!canvas) {
    throw new Error(
      "runGpuix: a root canvas element is required; pass <canvas> or an OffscreenCanvas",
    );
  }
  const offscreen = typeof canvas.transferControlToOffscreen === "function"
    ? canvas.transferControlToOffscreen()
    : canvas;
  return runTs({ ...options, canvas: offscreen });
}
