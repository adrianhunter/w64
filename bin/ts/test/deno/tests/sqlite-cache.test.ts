import app from "../hono/app";
import { clearSqliteCache } from "../hono/sqlite-cache";
import assert from "assert/strict";

Deno.test("cache misses then hits for the same URL", async () => {
  clearSqliteCache("qjs-hono-cache");
  const first = await app.request("http://localhost/public/hello.ts");
  assert.equal(first.status, 200);
  assert.equal(first.headers.get("x-qjs-cache"), "MISS");
  const firstBody = await first.text();

  const second = await app.request("http://localhost/public/hello.ts");
  assert.equal(second.status, 200);
  assert.equal(second.headers.get("x-qjs-cache"), "HIT");
  const secondBody = await second.text();
  assert.equal(secondBody, firstBody);
  assert.equal(second.headers.get("cache-control"), "public, max-age=31536000, immutable");
});

Deno.test("cache is keyed by URL", async () => {
  clearSqliteCache("qjs-hono-cache");
  const other = await app.request("http://localhost/public/value.ts");
  assert.equal(other.headers.get("x-qjs-cache"), "MISS");
  const again = await app.request("http://localhost/public/value.ts");
  assert.equal(again.headers.get("x-qjs-cache"), "HIT");
});

Deno.test("non-GET requests skip the cache", async () => {
  const response = await app.request("http://localhost/public/hello.ts", {
    method: "POST",
  });
  assert.notEqual(response.headers.get("x-qjs-cache"), "HIT");
});
