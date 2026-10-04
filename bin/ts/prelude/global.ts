// The single bundle manifest for ts.wasm.
//
// Only what is imported *directly* here (plus its relative files) is bundled.
// Every other package import stays external: the guest resolves it later from
// globalThis.__qjs_modules or the filesystem, so a package used by several
// shims is never duplicated and heavy optional dependencies (crypto, zlib,
// http, dgram, sqlite, quic, lightningcss, ...) stay out of the wasm.
//
// To bundle something new, import it here on purpose.

import "qjs:web-globals";

// node:* module registry and globalThis.Bun; both register themselves so a
// later `import "fs"` from guest code resolves to the same instance.
import "./runtime";
import "./bun";

// The Deno shim imports bare `fs`/`stream`/... specifiers, so it is loaded in
// a separate chunk after the node registry has been evaluated.
await import("./deno");
