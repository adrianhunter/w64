# ttsc

A TypeScript/TSX to JavaScript compiler for the browser, built for
`wasm32-freestanding` with `-Dcpu=bleeding_edge` and exporting a single
`default` function:

```ts
import ttsc from "./ttsc.wasm";

const jsCode = ttsc(someTsCode, "index.tsx");
```

- `.ts` files are printed as JavaScript with TypeScript syntax stripped.
- `.tsx` files are transformed with the same `generate: "universal"` Solid 1.9
  output that `babel-preset-solid@1.9.15` produces (`moduleName:
  "@gpuix/solid"`), so the result runs on `@gpuix/solid` / `solid-js`.
- Imports written `with { type: "file" }` (for example gpuix's
  `browser.mjs`) become `new URL(specifier, import.meta.url).href`, which
  browsers accept.
- `default` takes the code and the file name as two `externref` values and
  returns the result as an `externref`. No heap allocations: the whole
  transform runs out of a fixed static arena.

## Build

```sh
zig build
```

This writes:

- `/Volumes/workspace/github/w64/bin/ttsc.wasm`
- `/Volumes/workspace/github/w64/bin/ttsc-host.js` (must stay next to the wasm)

The wasm module imports its string helpers from `./ttsc-host.js` (resolved
relative to the wasm URL), so plain `WebAssembly` ESM integration and
`es-module-shims` both work without any wiring. `es-module-shims` needs the
small patch in `static/es-module-shims/dist/es-module-shims.debug.js` that
lets a wasm export be named `default`.

## Layout

- `src/main.zig` - wasm entry point, UTF-16/UTF-8 conversion, static arena.
- `src/transform.zig` - the Solid universal JSX transform and TS handling.
- `src/tool.zig` - native driver used while developing the transform.
- `src/host.js` - JS side of the string boundary.
- `vendor/yuku` - yuku 0.17.0 (fetched with `zig fetch --save`) patched to
  compile with Zig 0.17.0. Upstream still targets the Zig 0.16 std APIs
  (`std.meta.fields`, `lang.Type.Struct.fields`, `.Debug`, pub-only
  `@hasDecl`, ...), which is why the parser is built from the vendored copy
  instead of running yuku's own `build.zig`.

## Native development

```sh
zig build tool -- path/to/file.tsx
```

## Browser verification

`test/serve.mjs` serves the repository (including `node_modules`) for the test
pages, `test/minimal.html` checks the wasm boundary, and `test/full.html`:

1. imports `ttsc.wasm` through `es-module-shims`,
2. transforms `@gpuix/native/browser.mjs` and checks the `type: "file"`
   rewrite,
3. transforms the real gpuix `chat.tsx` in the browser,
4. executes both that output and the official `babel-preset-solid` output
   against real `solid-js` plus a small universal-renderer stub and asserts
   the two host trees are byte-for-byte equal.

```sh
node test/serve.mjs &
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu --virtual-time-budget=40000 \
  --dump-dom http://localhost:8123/bin/ttsc/test/full.html
```

The last line printed is `DONE` when every check passes.
