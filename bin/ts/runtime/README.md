# ts.wasm browser runtime

`bin/ts.wasm` is the QuickJS interpreter pre-initialized (wizer) with:

- the `node:*` module registry built from `bin/node`'s browser polyfills,
- the vendored Deno shim (`vendor/node_shims`),
- minimal `globalThis.Bun` shims built on the node module registry.

TypeScript and TSX are handled by `bin/ttsc`'s `ttsc.wasm` everywhere: the
`qjs:ttsc` guest module, the `qjs_host.transpile` host import, the single-file
`qjs build` fast path, and the browser worker.

## Files

| File                        | Purpose                                                        |
| --------------------------- | -------------------------------------------------------------- |
| `bin/ts.wasm`               | pre-initialized interpreter                                    |
| `bin/ts.mjs`                | main-thread API (`runTs`, `runGpuix`)                          |
| `bin/ts.worker.mjs`         | worker host: WASI, `qjs_host`, ttsc, canvas, OPFS              |
| `bin/ttsc.wasm`             | transpiler used by the worker                                  |
| `ts` (this directory)       | Node CLI: `./ts file.ts`                                       |

## Build

```sh
node tools/build-ts.mjs          # bin/ts.wasm + runtime
node tools/build-runtime.mjs     # only bin/ts.worker.mjs + bin/ts.mjs
```

`tools/bundle-global.mjs` bundles `prelude/global.ts`, the single manifest of
what is embedded. Only relative files (the shims) are bundled; every bare
package import stays external and is resolved by the guest from
`globalThis.__qjs_modules` or the filesystem at runtime. Adding a package to
the manifest is the explicit way to bundle it.

## Browser API

```js
import { runTs, runGpuix } from "/bin/ts.mjs";

await runTs({
  wasmUrl: "/bin/ts.wasm",
  ttscUrl: "/bin/ttsc.wasm",
  entry: "/main.ts",
  files: [{ path: "/main.ts", data: source }],
  onEvent: (event) => console.log(event),
});

// gpuix is enforced to run in the worker, with the root canvas transferred as
// an OffscreenCanvas before anything is evaluated.
await runGpuix(canvasElement, {
  wasmUrl: "/bin/ts.wasm",
  ttscUrl: "/bin/ttsc.wasm",
  entry: "/chat.tsx",
  files: [...],
});
```

The worker mounts user files under `/bundle` because wizer leaves that as the
runtime's only preopen. `runGpuix` throws when no canvas is given and
`runTs`/`runGpuix` always execute inside a `Worker`.

## WASI and the virtual filesystem

The worker uses `/wasi.ts` (the browser WASI port vendored in this repository,
`wat`/`fs_mem`/`fs_opfs`). In-memory files are seeded into a
`PreopenDirectory("/bundle", ...)`.

With `opfs` enabled, the guest's SQLite VFS (`qjs_host.opfs_*`) is routed to a
single `FileSystemSyncAccessHandle` in the origin private file system:

```js
await runTs({ ..., opfs: { file: "ts-vfs.sqlite" } });
```

The worker posts a `{ type: "vfs", backend: "opfs-sync-access-handle" }` event
when the handle is open.

## Inspecting locally

```sh
node bin/ttsc/test/serve.mjs &         # serves the repository on :8123
node bin/ts/tools/browser-check.mjs http://localhost:8123/bin/ts/test/browser/run.html
```

Pages:

- `test/browser/run.html` – TS entry in the worker
- `test/browser/gpuix.html` – `runGpuix` + OffscreenCanvas transfer
- `test/browser/opfs.html` – single OPFS sync-access-handle backend

## Still to do

- Back the WASI `Directory` tree itself with SQLite stored in the single OPFS
  handle, so large file trees (20k+ files, e.g. a Zig toolchain) never load
  into memory. The seam is `wasi.ts`'s `SyncOPFSFile` plus `runtime/opfs.ts`.
- Grow the Bun shims beyond the current surface (`Bun.serve` is a thin
  `node:http` wrapper; `Bun.spawn`/`Bun.$` are unsupported).
