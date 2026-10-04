// Smoke test: run opencode on the base qjs runtime, loading the shared
// dependency registry and the server bundle from the guest filesystem at
// runtime (no pre-initialization).
//
// usage:
//   node tools/test-deno.mjs --build-only
//   node tools/build-opencode.mjs
//   node tools/run-qjs.mjs zig-out/bin/qjs.wasm tools/opencode-smoke.mjs
//
// The imports must stay dynamic: each layer registers modules on
// globalThis.__qjs_modules before the next layer is linked.

import { exit } from "qjs:std";

await import("../.qjs-build/deno-prelude.mjs");
await import("../.qjs-build/opencode-deps.mjs");
const server = await import("../.qjs-build/opencode-server.mjs");

print("exports: " + Object.keys(server).join(","));

const { app } = server.Default();
const dir = encodeURIComponent("/tmp/opencode-qjs");

const health = await app.request("/global/health");
print("health -> " + health.status + " " + (await health.text()));

const sessions = await app.request("/session?directory=" + dir);
print("session -> " + sessions.status + " " + (await sessions.text()).slice(0, 200));

const config = await app.request("/config?directory=" + dir);
print("config -> " + config.status + " " + (await config.text()).slice(0, 100));

print("opencode-smoke ok");
exit(0);
