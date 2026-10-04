import app from "../hono/app";
import assert from "assert/strict";

Deno.test("hono transpiles TypeScript routes with yuku", async () => {
  const response = await app.request("http://localhost/public/hello.ts");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/javascript");
  const code = await response.text();
  assert.ok(!code.includes("interface Greeting"), code);
  assert.ok(!code.includes(": string"), code);
  assert.ok(code.includes("function hello"), code);
});

Deno.test("hono transpiled code runs", async () => {
  const response = await app.request("http://localhost/public/value.ts");
  assert.equal(response.status, 200);
  const code = await response.text();
  assert.ok(code.includes("__tsValue"), code);
  (0, eval)(code);
  assert.equal((globalThis as Record<string, unknown>).__tsValue, 42);
});

Deno.test("hono serves static assets via @hono/deno", async () => {
  const response = await app.request("http://localhost/public/index.html");
  assert.equal(response.status, 200);
  assert.ok((await response.text()).includes("<h1>hono</h1>"));
});

Deno.test("hono returns 404 for missing assets", async () => {
  const response = await app.request("http://localhost/public/missing.html");
  assert.equal(response.status, 404);
});
