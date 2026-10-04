# zig-quickjs-ng

Zig build, bindings, and a standalone interpreter for
[QuickJS-ng](https://github.com/quickjs-ng/quickjs), targeting
**Zig 0.17.0** and **wasm32-wasi**.

This is a fork/port of [mitchellh/zig-quickjs-ng](https://github.com/mitchellh/zig-quickjs-ng)
with the following changes:

- Ported to Zig 0.17.0 (new `std.Io` APIs, `@bitCast` rules, build API).
- Updated to the latest quickjs-ng (vendored in `upstream/quickjs-ng`).
- `src/main.zig` was renamed to `src/root.zig`.
- `src/main.zig` is now a Zig port of quickjs-ng's `qjs.c` standalone
  interpreter (no `translate-c`, no `c_int`/`[*c]` in the port itself).
- Added a `qjs build` subcommand that bundles JavaScript/TypeScript with
  esbuild and **pre-initializes** the module with
  [wizer](https://github.com/bytecodealliance/wizer), producing a new,
  faster-starting version of the interpreter that already has the bundle
  loaded.
- Vendored [Nodepod](https://github.com/R1ck404/Nodepod)'s browser Node.js
  polyfills as a `qjs:web-globals` + prelude-backed `node:*` module set
  (MemoryVolume filesystem, path, os, process, buffer, stream, events,
  timers, url, util, assert, ...).
- Vendored [denoland/node_shims](https://github.com/denoland/node_shims)
  (`@deno/shim-deno` and `@deno/shim-deno-test`), exposes `globalThis.Deno`,
  and added a `Deno.test` runner reachable with `qjs test`.
- Bundles [Hono](https://hono.dev/) plus a `@hono/deno`-style middleware
  that transpiles `.ts`/`.tsx` responses with
  [Yuku](https://yuku.fyi/). Yuku runs on a host worker thread, reached
  through the synchronous `qjs:yuku` bridge.
- TypeScript is erased in the style of
  [ts-blank-space](https://github.com/bloomberg/ts-blank-space): type syntax
  becomes whitespace, so line and column positions in the output are
  byte-for-byte identical to the source and runtime stack traces point at
  the original TypeScript without any source maps.

The bindings only support the wasm32 target: upstream quickjs-ng changed
`JSValueUnion` in a way that broke the non-NaN-boxing (64-bit) code paths.

## Requirements

- Zig **0.17.0**
- Node.js (tested with v26) for the WASI host and for esbuild
- [wizer](https://github.com/bytecodealliance/wizer) v11+
  (`cargo install wizer --all-features`, or a pre-built release)
- `npm install` (esbuild + typescript)

## Building

```sh
zig build --release=small

# all wasm features (simd, relaxed-simd, ...); composes with the default
# wasm32-wasi target:
zig build -Dcpu=bleeding_edge --release=small
```

This produces `zig-out/bin/qjs.wasm` (a wasm32-wasi command).

Run it through the Node WASI host:

```sh
node tools/run-qjs.mjs zig-out/bin/qjs.wasm -e 'console.log("hello world")'
node tools/run-qjs.mjs zig-out/bin/qjs.wasm script.js
node tools/run-qjs.mjs zig-out/bin/qjs.wasm -m module.mjs
```

`tools/run-qjs.mjs` provides WASI plus the custom `qjs_host` import that
`qjs build` uses to invoke host tools (esbuild, wizer).

## Pre-initialized bundles

`qjs build` bundles an entry point with esbuild, registers every bare
import on `globalThis.__qjs_modules`, and then runs the bundle during
`wizer`'s build-time initialization. The resulting wasm starts with the
bundle already evaluated, so `import ... from "<specifier>"` keeps working
in code that runs later without paying the parse/compile cost again.

```sh
# test/inputs.ts contains: import "typescript";
node tools/run-qjs.mjs zig-out/bin/qjs.wasm build test/inputs.ts \
  -o qjs-bundled.wasm

# hello world starts as fast as the base interpreter...
node tools/run-qjs.mjs qjs-bundled.wasm -e 'console.log("hello world")'

# ...and the bundled typescript compiler is importable:
node tools/run-qjs.mjs qjs-bundled.wasm -m -e '
  import ts from "typescript";
  console.log(ts.transpileModule("let x: number = 1").outputText);
'
```

Additional `qjs build` options:

- `--prelude <file>`: a module evaluated before the bundle during wizer
  initialization. It can populate `globalThis.__qjs_modules` with modules
  that the bundle then links against by name (this is how the `node:*`
  module set works).
- `--external <name>` (repeatable): leave `<name>` as an import instead of
  bundling it, so it is resolved from `globalThis.__qjs_modules` at runtime.

Environment variables used by `qjs build`:

| Variable     | Default    | Meaning                                |
| ------------ | ---------- | -------------------------------------- |
| `QJS_SELF`   | (required) | path to the base `qjs.wasm`            |
| `QJS_ESBUILD`| `esbuild`  | esbuild binary                         |
| `QJS_WIZER`  | `wizer`    | wizer binary                           |

`QJS_SELF` is set automatically by `tools/run-qjs.mjs`.

## Node.js and Deno compatibility

The prelude machinery is used to run Node-style code and the Deno shim:

- `test/deno/runtime.ts` builds a `MemoryVolume`-backed module set from the
  vendored Nodepod polyfills. It imports `qjs:web-globals` first, which
  installs the web platform globals QuickJS-ng lacks (`TextEncoder`,
  `TextDecoder`, WHATWG `URL`, `AbortController`, `structuredClone`, a
  timer queue with host-side draining, ...).
- `tools/build-nodepod.mjs` can build that module set on its own for
  experiments (`node tools/build-nodepod.mjs --self-test`).
- `tools/build-web-globals.mjs` regenerates the two embedded bundles in
  `src/` (`web_globals.bundle.js`, `url_globals.bundle.js`).

### Deno shim and `qjs test`

`tools/test-deno.mjs` builds the vendored `@deno/shim-deno` and
`@deno/shim-deno-test` packages together with a test entry, pre-initializes
it through `qjs build --prelude ... --external ...`, and runs the suite with
`qjs test`. The suite ports tests from node_shims (`streams.test.ts`,
`open.test.ts`, `mainModule.test.ts`) plus a set of node:* API tests.

```sh
node tools/test-deno.mjs
QJS_CPU=bleeding_edge node tools/test-deno.mjs   # same, with wasm features
```

`qjs test` imports the `deno:test-runner` module that the bundle registers
and awaits its `run()`. The runner understands `Deno.test(name, fn)`,
`Deno.test({ name, fn, ignore, only, ... })`, and `TestContext.step`.

### Hono and Yuku

`test/deno/hono/app.ts` is a Hono app using the Deno adapter:

```ts
import { Hono } from "hono";
import { serveStatic } from "@hono/deno";
import { yukuTranspiler } from "./yuku-transpiler";

const app = new Hono();
app.get("/:scriptName{.+.tsx?}", yukuTranspiler());
app.get("/*", serveStatic({ root: "./" }));
export default app;
```

`yuku-transpiler.ts` mirrors `@hono/bun-transpiler`: after `await next()` it
transpiles the response of the static handler with Yuku and returns
JavaScript. `yuku-worker.ts` is the worker front end; the actual
compilation happens on a Node `worker_threads` thread started lazily by
`tools/run-qjs.mjs` (`tools/yuku-worker.mjs`). The guest blocks on an
`Atomics.wait` while the thread transpiles, so from Hono's point of view
the call is a normal synchronous `transformSync`.

The runtime exposes this bridge as the `qjs:yuku` module
(`transpile(source, lang, mode)`), implemented in `src/main.zig` and backed
by the `qjs_host.transpile` import. `mode` is `"blank"` (the default for the
middleware) or `"strip"` (compact Yuku codegen). `qjs build` automatically
keeps `qjs:*` and `node:*` specifiers external.

### Position-preserving type stripping

`"blank"` mode works like ts-blank-space:

1. Yuku parses the file and enforces the `erasableSyntaxOnly` assumption
   (`enum`, `namespace`, parameter properties, `export =`, ... are rejected
   with a `line:column` diagnostic).
2. `ts-blank-space` replaces every TypeScript-only byte range with spaces,
   leaving all JavaScript bytes untouched.

The result has the same length as the input, so an error thrown on line 3,
column 13 of `boom.ts` reports `/bundle/source_boom.ts:3:13`. No source maps
are generated or needed.

For `qjs build`, a single-file input with no bare imports skips esbuild
entirely and uses this path (`stripping <file> (ts, blank space...)`), so
directly built TypeScript scripts keep exact positions. Multi-module
bundles still go through esbuild, which necessarily moves code between
modules; positions there follow the bundle, by design (we deliberately do
not emit source maps).

The web globals now also provide `Headers`, `Request`, `Response`, `fetch`
(a stub), `Blob`, and the web streams classes, which Hono's
`app.request()` and `serveStatic` need.

Three small local patches are applied to the vendored Nodepod sources
(marked with `// qjs:` comments): numeric `fs` flags in `writeFileSync`,
persisting write-stream data so synchronous reads observe it like Node, and
accepting a null path when a stream is opened by file descriptor
(`Deno.open().readable`).

## SQLite, zstd, and the OPFS cache

- `upstream/sqlite3` vendors the SQLite amalgamation; `upstream/zstd` vendors
  zstd. Both are compiled by Zig with `.optimize = .ReleaseFast` (independent
  of `--release=small`) and linked only into the `qjs` executable.
- SQLite is built with `SQLITE_OS_OTHER=1`, `SQLITE_THREADSAFE=0`, JSON and
  math enabled, FTS5/load-extension disabled, and runs in **WAL** mode with
  heap-backed shared memory (`xShmMap`), `locking_mode=EXCLUSIVE`,
  `synchronous=NORMAL`, `temp_store=MEMORY` and a 32 MiB page cache.
- A hard 4 GiB heap limit is installed for both QuickJS
  (`JS_SetMemoryLimit`) and SQLite (`sqlite3_hard_heap_limit64`); allocation
  failures surface as errors and the runtime exits cleanly.
- Small scratch buffers (host command argv, generated bundle entries,
  transpiler output) use Zig 0.17's `std.heap.BufferFirstAllocator` (the
  reworked `StackFallbackAllocator`), so the common cases never touch the
  heap.
- `node:sqlite`/`sqlite` expose `DatabaseSync` and `StatementSync`
  (`exec`, `prepare`, `run/get/all/iterate`, named/anonymous bindings,
  `Uint8Array` blobs, `setReadBigInts`) plus zstd helpers.

### OPFS bridge

The OPFS VFS resolves the main database and its `-wal` file through the host.
Handles cross the boundary as real **externrefs**; the reference table lives
on the host so the wasm module contains no `table.set`/`table.get`
instructions and stays wizer-friendly. Node has no synchronous OPFS access
handle, so `src/opfs/adapters/node.mjs` is async-only and the wasm stack
suspends through **JSPI** (`WebAssembly.Suspending`/`WebAssembly.promising`)
for every file operation. Browser hosts can map the same imports to native
`createSyncAccessHandle({ mode: "readwrite-unsafe" })`.

Set `QJS_OPFS_DIR` to change the backing directory (default
`.qjs-cache/opfs`).

### Transparent zstd compression

`DatabaseSync.enableZstdCompression({ table, column, dictChooser })` is a
native port of the [sqlite-zstd](https://github.com/phiresky/sqlite-zstd)
technique: the table becomes a decompressing view with INSTEAD OF
INSERT/UPDATE/DELETE triggers over a backing table, per-partition
dictionaries are trained with `ZDICT_trainFromBuffer`, and
`runZstdMaintenance()` compresses uncompressed rows in chunked transactions.
SQL functions `qjs_zstd_compress`/`qjs_zstd_decompress` and the
dictionary-aware variants are registered per connection.

### `sqliteCache` middleware

`test/deno/hono/sqlite-cache.ts` mirrors Hono's built-in `cache` middleware
but stores responses in SQLite (GET only, skips Authorization/`private`/
`no-store`/`Set-Cookie`, supports `cacheControl`, `vary`, `keyGenerator`,
`cacheableStatusCodes`) and adds `x-qjs-cache: HIT|MISS`. It is wired before
`yukuTranspiler()` and transparently zstd-compresses the `responses` table.

### wasm-opt

Both test harnesses optimize every wasm artifact with
`tools/optimize-wasm.mjs` (`wasm-opt -O3 --all-features`, i.e. the full
bleeding-edge feature set) before running or wizening it.

## Testing

```sh
npm install
zig build test --release=small   # unit tests (run on wasm via Node)
node tools/test.mjs              # end-to-end: timing + typescript bundle
```

`tools/test.mjs` builds the interpreter, measures `hello world` startup,
bundles `test/inputs.ts` (which imports `typescript@6.0.2`), measures
startup again, verifies the bundled compiler still transpiles code, and
builds `test/blank/thrower.ts` to check that runtime errors report the
original TypeScript line and column.
Set `QJS_CPU` (for example `QJS_CPU=bleeding_edge`) to build the CPU
variant; set `ZIG` to pick a specific Zig binary. `tools/test-deno.mjs`
prints the Deno/Hono suite (22 tests) and also honors `QJS_CPU`.

## Library usage

```zig
const quickjs = @import("quickjs");

pub fn main(init: std.process.Init) !void {
    const rt: *quickjs.Runtime = try .init();
    defer rt.deinit();

    const ctx: *quickjs.Context = try .init(rt);
    defer ctx.deinit();

    const result = ctx.eval("40 + 2", "<main>", .{});
    defer result.deinit(ctx);

    if (result.isException()) return error.JavaScriptError;
    const value = try result.toInt32(ctx);
    std.debug.assert(value == 42);
}
```

## Vendored projects

- `upstream/quickjs-ng`: quickjs-ng/quickjs at commit
  `90c3922da00f52e477a622245a7c582fbcb7dea6` (2026-10-02).
- `vendor/nodepod`: `src/` of R1ck404/Nodepod (MIT with Commons Clause;
  see `vendor/nodepod/LICENSE`) with the two `qjs:` patches noted above.
- `vendor/node_shims`: `src/` of denoland/node_shims' `shim-deno` and
  `shim-deno-test` packages (MIT; see `vendor/node_shims/LICENSE`).
