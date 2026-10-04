# w64 — Agent Handoff

## Objective

- Current task (just started): make `/Volumes/workspace/github/w64/index.html`
  show the vendored jslinux VM (`static/linux`, alpine-x86_64) using the
  vercel-labs/wterm ghostty terminal instead of `term.js`, with the guest
  `node` command overridden to run `bin/ts.wasm`, and `static/linux/vfs`
  copied into a SQLite-backed virtual filesystem.
- Prior completed work: build `bin/ttsc.wasm` (Solid 1.9 universal TS/TSX
  transpiler) and `bin/ts.wasm` (preinited QuickJS runtime with
  node/deno/bun shims + browser worker runtime).

## Important Details

- Zig toolchain: `/Users/boo/.zvm/0.17.0/zig` (0.17.0). User chose to
  patch/vendor yuku for 0.17.0 (upstream targets 0.16 APIs).
- Toolchain gotchas: Zig 0.17 `@hasDecl` is pub-only (all yuku `emit_*` made
  `pub`); `std.meta.fields` removed → `@typeInfo(T).@"struct".field_names/field_types`;
  `lang.Type.Struct.fields` → `field_names`; `lang.Type.Fn.params` →
  `param_types`; `.Debug` → `.debug`; `[_]T{v} ** n` → `@splat`;
  `std.mem.trimLeft` → `trimStart`; no `dupeZ` (use `allocSentinel`);
  `std.process.Init` main signature;
  `std.Io.Dir.cwd().readFileAlloc(io, path, gpa, .limited(n))`.
- `bin/ttsc.wasm` export is exactly `(externref, externref) -> externref`
  named `default`; string I/O via sibling `bin/ttsc-host.js` (import
  specifier `./ttsc-host.js`); no heap (FixedBufferAllocator over static
  64MB arena; `fba.reset()` each call).
- `static/es-module-shims/dist/es-module-shims.debug.js` was patched so a wasm
  export named `default` is re-exported via a local binding
  (`export { $_export_N as default }`) — needed for
  `import ttsc from "./ttsc.wasm"` in the browser.
- `bin/ts/vendor/node` is a symlink → `../../node` (i.e. `bin/node`);
  `vendor/nodepod` deleted.
- Bundling rule (user requirement): single manifest `prelude/global.ts`; only
  relative shim files bundled, every bare package import external and
  resolved at runtime from `globalThis.__qjs_modules` or the filesystem.
  Explicitly NOT bundled: pako, `@noble/*`, crypto, zlib, dgram, sqlite,
  quic, lightningcss, test, v8, vm, wasi, volume-registry.
- `bin/ts.wasm` = 11.9 MB, hello-world ~60–93 ms. Wizer pre-init only
  registers `/bundle` as a guest preopen → user files must be mounted under
  `/bundle`.
- Browser runtime uses `/Volumes/workspace/github/w64/wasi.ts` (unmodified
  browser_wasi_shim port + `SyncOPFSFile`); verified working. Files pre-open
  OPFS async before `_start`; JSPI used only for `qjs_host.timer_wait`.
- `runtime/index.mjs` (`runTs`, `runGpuix`) always uses a module `Worker`;
  `runGpuix` throws without a canvas and transfers
  `canvas.transferControlToOffscreen()`.
- Test server: `node /Volumes/workspace/github/w64/bin/ttsc/test/serve.mjs`
  (port 8123, serves repo root). CDP checker:
  `node /Volumes/workspace/github/w64/bin/ts/tools/browser-check.mjs <url> [timeoutMs]`.
- Reference babel output for chat.tsx:
  `/var/folders/q9/nx4wdybj0lz701rlvbw9409w0000gq/T/opencode/chat.babel.mjs`;
  AST compare script
  `/var/folders/q9/nx4wdybj0lz701rlvbw9409w0000gq/T/opencode/compare.mjs`
  (normalizes generated uids).
- jslinux: `static/linux/` has `index.html`, `jslinux.js`, `term.js`,
  `style.css`, `x86_64emu-wasm.{js,wasm}`, `kernel-x86_64-new.bin` (21MB),
  `alpine-x86_64.cfg` (mem 256, fs0 `vfs/alpine-x86_64`), `vfs/` is 222MB
  (`alpine-x86_64/{head,files/*}`). Original page auto-sets
  `?cpu=x86_64&url=alpine-x86_64.cfg&mem=256`.
- wterm: `@wterm/dom` + `@wterm/ghostty` (0.5.4) published on npm and now
  installed at the w64 root. Usage:
  `import { WTerm } from "@wterm/dom"; import { GhosttyCore } from "@wterm/ghostty"; import "@wterm/dom/css";`
  then `const core = await GhosttyCore.load(); const term = new WTerm(el, { core }); await term.init(); term.write(...)`.
  `jslinux.js` constructs `new Term({ cols, rows, scrollback, fontSize })`
  (line ~572) and calls `term.open`, `term.setKeyHandler`, `term.write`,
  `term.writeln`, `term.resizePixel`, `term.term_el`.

## Work State

### Completed

- `bin/ttsc`: `zig build` → `/Volumes/workspace/github/w64/bin/ttsc.wasm` +
  `bin/ttsc-host.js`. Vendored `vendor/yuku` patched for Zig 0.17.
  `zig build tool -- file.tsx` native driver. Full `chat.tsx` output
  AST-identical to `babel-preset-solid@1.9.15` universal
  (`moduleName:"@gpuix/solid"`); import order matches (reverse registration);
  `with { type: "file" }` → `new URL(spec, import.meta.url).href`. Browser
  proof: `bin/ttsc/test/full.html` (es-module-shims) executes ttsc output vs
  babel output with real solid-js + stub and reports tree equality (`DONE`).
- `bin/ts` (QuickJS/qjs): replaced nodepod with bin/node;
  `prelude/{global,runtime,bun,deno}.ts`; `tools/bundle-global.mjs`;
  `tools/build-ts.mjs` (builds ttsc if missing, qjs, optimize, wizer prelude,
  runtime); `tools/build-runtime.mjs`; ttsc wired via `qjs:ttsc` (alias
  `qjs:yuku`), `tools/ttsc-worker.mjs`, `main.zig` `transpileTsSource` (in
  `evalFile`/`fileModule`, scripts + `.ts` imports).
  `qjs_host.transpile` mode now always `strip`.
- `bin/ts.wasm`, `bin/ts.worker.mjs` (62KB), `bin/ts.mjs` emitted. CLI
  `/Volumes/workspace/github/w64/bin/ts/ts` runs `./ts file.ts` and `.tsx`
  (verified `hello from ttsc`, relative `.ts` import works).
- Browser verified in Chrome (`run.html`: node shims + Bun/Deno + exit 0;
  `gpuix.html`: OffscreenCanvas 320×200 transferred + exit 0; `opfs.html`:
  `backend:"opfs-sync-access-handle"` file `ts-vfs.sqlite` + exit 0).
- `runtime/opfs.ts` opens one OPFS `FileSystemSyncAccessHandle` during boot
  and routes all `qjs_host.opfs_*` to it.
- w64 root `package.json` gained `@gpuix/solid@0.10.0`, `solid-js@1.9.15`,
  `@wterm/dom@0.5.4`, `@wterm/ghostty@0.5.4`; `bin/ts` deps gained then
  removed `@bjorn3/browser_wasi_shim`; `bin/ts/build.zig.zon` declares
  `.ttsc = .{ .path = "../../ttsc" }`.

### Active

- New jslinux/wterm task: reconnaissance done (listed `static/linux`, read
  its `index.html`, `alpine-x86_64.cfg`, `vfs` tree, viewed screenshot
  `Screenshot 2026-10-04 at 22.11.56.png`); wterm packages installed; grepped
  jslinux.js terminal API. No code changes to `index.html` yet.
- `bin/ts/runtime/README.md` written documenting runtime, build, browser API,
  OPFS, and remaining work.

### Blocked

- SQLite-backed WASI `Directory` tree (20k–100k files over the single OPFS
  handle) not implemented — only the seam (`runtime/opfs.ts`, w64
  `SyncOPFSFile`).
- Bun shims minimal (`Bun.serve` thin `node:http` wrapper; `Bun.spawn`/`Bun.$`
  throw).
- Full gpuix Bun examples not run end-to-end; host-side gpuix renderer not
  wired into worker.
- w64 lib `wasi.ts` debug prints (`wasi: 0 0`, `wasi: 2 N`, `wasi: main.ts`)
  still on console.

## Next Move

1. Write a wterm-backed Term shim that matches the API `jslinux.js` expects
   (`new Term({cols, rows, scrollback, fontSize})`, `open`, `setKeyHandler`,
   `write`, `writeln`, `resizePixel`, `term_el`), then boot jslinux in
   `/Volumes/workspace/github/w64/index.html` using the wterm ghostty
   terminal.
2. Implement the guest `node` override that runs `bin/ts.wasm`, and plan
   copying `static/linux/vfs` (222MB, `head` + `files/<hex>` blobs) into the
   SQLite/OPFS-backed VFS.

## Relevant Files

- `/Volumes/workspace/github/w64/index.html`: target page for the jslinux +
  wterm integration.
- `/Volumes/workspace/github/w64/static/linux/`: jslinux copy (`index.html`,
  `jslinux.js`, `term.js`, `style.css`, `x86_64emu-wasm.{js,wasm}`,
  `kernel-x86_64-new.bin`, `alpine-x86_64.cfg`, `vfs/` 222MB, `images/`).
- `/Volumes/workspace/github/w64/wasi.ts` + `/Volumes/workspace/github/w64/wasi/`
  (`wasi_fns.ts`, `fs_mem.ts`, `fs_opfs.ts` with `SyncOPFSFile`/`OpenSyncOPFSFile`,
  `fd.ts`, `wasi_defs.ts`): WASI port used by the ts browser worker.
- `/Volumes/workspace/github/w64/bin/node/`: browser Node polyfills
  (`polyfills/{fs,process,wasi,sqlite,crypto,zlib,...}.ts`,
  `memory-volume.ts`, `helpers/{event-loop,wasm-cache,wasm-cdn}.ts`,
  `packages/`); symlinked as `bin/ts/vendor/node`.
- `/Volumes/workspace/github/w64/bin/ts/`: qjs project — `build.zig`,
  `build.zig.zon`, `prelude/{global,runtime,bun,deno}.ts`,
  `runtime/{worker.ts,index.mjs,opfs.ts,README.md}`,
  `tools/{build-ts,build-runtime,bundle-global,ttsc-worker,optimize-wasm,browser-check,debug-wasi,debug-wasi2}.mjs`,
  `src/main.zig`, `ts` (CLI), `test/browser/{run,gpuix,opfs}.html`,
  `test/hello.ts`, `test/main-import.ts`.
- `/Volumes/workspace/github/w64/bin/ts.wasm`, `bin/ts.mjs`,
  `bin/ts.worker.mjs`, `bin/ttsc.wasm`, `bin/ttsc-host.js`: built artifacts.
- `/Volumes/workspace/github/w64/bin/ttsc/`: ttsc project — `build.zig`,
  `build.zig.zon`, `src/{main.zig,transform.zig,tool.zig,host.js}`,
  `vendor/yuku/` (patched), `test/{serve.mjs,full.html,shim.html,chat.tsx,chat.babel.mjs,solid-stub.js}`.
- `/Volumes/workspace/github/w64/static/es-module-shims/dist/es-module-shims.debug.js`:
  patched wasm `default` export handling.
- `/Volumes/workspace/github/w64/screenshots/`:
  `Screenshot 2026-10-04 at 22.11.56.png` shows working node@24 jslinux;
  `22.05.*` show the three ts browser pages passing.
