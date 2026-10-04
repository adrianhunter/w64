// Exercises the most important node:* APIs through the Nodepod polyfills
// that back the Deno shim.

import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath, pathToFileURL } from "url";
import { promisify, format } from "util";
import { EventEmitter, once } from "events";
import process from "process";
import assert from "assert/strict";

Deno.test("fs read/write/append", () => {
  const file = "/node-apis/io.txt";
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, "hello");
  fs.appendFileSync(file, " world");
  assert.equal(fs.readFileSync(file, "utf8"), "hello world");
  assert.equal(fs.statSync(file).size, 11);
});

Deno.test("fs promises", async () => {
  const file = "/node-apis/promises.txt";
  await fs.promises.writeFile(file, "async");
  assert.equal(await fs.promises.readFile(file, "utf8"), "async");
  const entries = await fs.promises.readdir("/node-apis");
  assert.ok(entries.includes("promises.txt"), JSON.stringify(entries));
});

Deno.test("fs rename/copy/unlink", () => {
  fs.writeFileSync("/node-apis/a.txt", "a");
  fs.renameSync("/node-apis/a.txt", "/node-apis/b.txt");
  fs.copyFileSync("/node-apis/b.txt", "/node-apis/c.txt");
  assert.equal(fs.readFileSync("/node-apis/c.txt", "utf8"), "a");
  fs.unlinkSync("/node-apis/b.txt");
  assert.equal(fs.existsSync("/node-apis/b.txt"), false);
});

Deno.test("fs promisify", async () => {
  const readFile = promisify(fs.readFile);
  const data = await readFile("/node-apis/io.txt", "utf8");
  assert.equal(data, "hello world");
});

Deno.test("path operations", () => {
  assert.equal(path.join("/a", "b", "..", "c"), "/a/c");
  assert.equal(path.basename("/a/b/c.txt"), "c.txt");
  assert.equal(path.extname("/a/b/c.txt"), ".txt");
  assert.equal(path.dirname("/a/b/c.txt"), "/a/b");
  assert.equal(path.resolve("/a", "b"), "/a/b");
});

Deno.test("url conversions", () => {
  assert.equal(fileURLToPath("file:///a/b/c.txt"), "/a/b/c.txt");
  assert.equal(pathToFileURL("/a/b c.txt").href, "file:///a/b%20c.txt");
});

Deno.test("os basics", () => {
  assert.ok(["Linux", "Darwin", "Windows_NT"].includes(os.type()), os.type());
  assert.equal(typeof os.tmpdir(), "string");
  assert.equal(typeof os.homedir(), "string");
});

Deno.test("buffer base64/hex/utf8", () => {
  const buf = Buffer.from("quickjs", "utf8");
  assert.equal(buf.toString("hex"), "717569636b6a73");
  assert.equal(buf.toString("base64"), "cXVpY2tqcw==");
  assert.equal(Buffer.from("cXVpY2tqcw==", "base64").toString("utf8"), "quickjs");
});

Deno.test("util format", () => {
  assert.equal(format("%s=%d", "n", 42), "n=42");
});

Deno.test("events emitter and once", async () => {
  const emitter = new EventEmitter();
  const waiting = once(emitter, "ready");
  emitter.emit("ready", 7);
  const [value] = await waiting;
  assert.equal(value, 7);
});

Deno.test("process cwd and env", () => {
  assert.equal(process.cwd(), "/");
  assert.equal(typeof process.pid, "number");
  assert.equal(typeof process.env, "object");
});

Deno.test("timers promise", async () => {
  const start = Date.now();
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.ok(Date.now() >= start);
});
