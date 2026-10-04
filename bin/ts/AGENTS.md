# Agent Development Guide

A file for [guiding coding agents](https://agents.md/).

- The C API is defined in `upstream/quickjs-ng/quickjs.h` (vendored).
- Use Zig **0.17.0** (e.g. `~/.zvm/0.17.0/zig`).
- The project builds for `wasm32-wasi` by default; the bindings do not
  support other targets (upstream changed `JSValueUnion` in a way that
  breaks the non-NaN-boxing code paths).
- `src/root.zig` is the library root; `src/main.zig` is the `qjs` CLI
  (ported from quickjs-ng's `qjs.c`).
- `-Dcpu=...` composes with the default wasm32-wasi target (for example
  `zig build -Dcpu=bleeding_edge --release=small`); `build.zig` parses the
  target options itself so `-Dcpu` alone does not resolve against the host.
- `src/web_globals.bundle.js` and `src/url_globals.bundle.js` are generated
  by `tools/build-web-globals.mjs` and embedded by `src/main.zig`; the
  `qjs:web-globals` module installs them lazily.
- Vendored code lives in `upstream/quickjs-ng`, `vendor/nodepod`, and
  `vendor/node_shims`. Local patches are marked with `// qjs:` comments;
  keep them minimal and note them in the README.
- Write comprehensive unit tests for all new APIs.
- Mimic the style of the existing Zig codebase.
- Examples have their own `build.zig`, so run `zig` commands for
  examples from within their respective directories.
- Build with `zig build --release=small`. There is no default
  optimization mode, so `--release=small` (or `-Doptimize=...`) matters:
  a Debug build of the C library has huge stack frames and can make
  QuickJS's stack checks fire early.

## Zig Guide

- Use Zig types in API parameters where possible.
- Never use `[*:0]const u8` in public APIs; use `[:0]const u8` and
  call `ptr` on it instead.
- For definitions, use `context x: T = .` syntax, do NOT use
  `const x = T{}`. This works for functions too: `const x: T = .init()`
- For packed structs or enums porting the C API, always pair it
  with unit tests to ensure we match C constants
- For types that should match C layouts exactly (extern structs,
  enums, packed structs, etc.), always add a comptime assertion
  that the size and alignment matches the header
- For callbacks, use the `opaque.zig` helpers and make the callback
  use free (no conversion cost) Zig types wherever possible. See
  Runtime.addFinalizer or setPromiseHook for an example.
- Try to restrict line length to ~80, using trailing commas for
  function args or structs where possible to split them up. Don't
  do this for short lines that fit easily.
- Don't import other files within a test, use a top-level import.

## Testing Guide

- Tests should use real JavaScript wherever possible (use `eval`)
  and avoid simply twiddling internal state.
- Run tests with `zig build test --release=small`. They are compiled
  for wasm32-wasi and executed through `tools/run-tests.mjs` (Node).
- `node tools/test.mjs` runs the end-to-end `qjs build` test
  (esbuild + wizer) and checks startup timing. `QJS_CPU=bleeding_edge`
  selects the CPU variant.
- `node tools/test-deno.mjs` builds the Nodepod-backed `node:*` module set
  and the vendored Deno shim (plus Hono and the Yuku transpiler middleware)
  into `qjs-deno.wasm`, then runs the `Deno.test` suite with `qjs test`.
- The `qjs:yuku` module bridges to a host worker thread
  (`tools/yuku-worker.mjs`) over `qjs_host.transpile`; keep the
  eight-argument signature (source, lang, mode, out) in sync with the wizer
  stub in `src/main.zig`. `mode = "blank"` erases TypeScript with the
  ts-blank-space trick so positions are preserved (no source maps);
  `"strip"` is compact Yuku codegen.
- `qjs build` of a single-file input with no bare imports skips esbuild and
  uses blank-space stripping directly; keep that fast path position exact.
- SQLite and zstd are compiled ReleaseFast regardless of the app optimize
  mode. The OPFS VFS passes handles as externrefs through host imports; the
  reference table is host-side, because wizer rejects `table.set`. Keep the
  `qjs_host.opfs_*`/`externref_*` signatures in sync with the wizer stub in
  `src/main.zig`.
- Prefer `std.heap.BufferFirstAllocator` for small/likely-stack scratch
  buffers instead of heap allocation. QuickJS and SQLite are capped at 4 GiB
  and must fail with clean errors, never traps.
- `tools/optimize-wasm.mjs` runs `wasm-opt -O3 --all-features`; both
  `tools/test.mjs` and `tools/test-deno.mjs` apply it to the base and
  pre-initialized wasm.
- When modifying the core library, also verify all examples
  build. Use subagents for this.
