#!/usr/bin/env node
// Runs a page in headless Chrome over the DevTools protocol, waits for real
// time (not virtual time), prints console messages, and returns the page's
// `<pre id="out">` text. Used to verify the ts.wasm browser runtime.
//
// usage: node tools/browser-check.mjs <url> [timeout-ms]

import { spawn } from "node:child_process";

const url = process.argv[2];
const timeoutMs = Number(process.argv[3] ?? 120000);
if (!url) {
  console.error("usage: node tools/browser-check.mjs <url> [timeout-ms]");
  process.exit(2);
}

const chromePath =
  process.env.CHROME ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const chrome = spawn(chromePath, [
  "--headless=new",
  "--disable-gpu",
  "--no-sandbox",
  "--remote-debugging-port=0",
  "--user-data-dir=/tmp/ts-browser-check-profile",
  "about:blank",
], { stdio: ["ignore", "pipe", "pipe"] });

const wsUrl = await new Promise((resolve, reject) => {
  let buffer = "";
  chrome.stderr.on("data", (chunk) => {
    buffer += chunk.toString();
    const match = buffer.match(/DevTools listening on (ws:\/\/\S+)/);
    if (match) resolve(match[1]);
  });
  chrome.on("exit", () => reject(new Error("chrome exited before DevTools was ready")));
  setTimeout(() => reject(new Error("timed out waiting for DevTools")), 20000);
});

const ws = new WebSocket(wsUrl);
await new Promise((resolve, reject) => {
  ws.onopen = resolve;
  ws.onerror = (event) => reject(new Error("websocket error: " + event.message));
});

let nextId = 1;
const pending = new Map();
const consoleLines = [];

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
    return;
  }
  if (message.method === "Runtime.consoleAPICalled") {
    const text = (message.params.args ?? [])
      .map((arg) => arg.value ?? arg.description ?? "")
      .join(" ");
    consoleLines.push(text);
  }
};

function send(method, params = {}, sessionId) {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });
}

const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await send("Target.attachToTarget", {
  targetId,
  flatten: true,
});
await send("Runtime.enable", {}, sessionId);
await send("Page.enable", {}, sessionId);
await send("Page.navigate", { url }, sessionId);

const deadline = Date.now() + timeoutMs;
let output = "";
while (Date.now() < deadline) {
  await new Promise((resolve) => setTimeout(resolve, 500));
  try {
    const result = await send(
      "Runtime.evaluate",
      {
        expression:
          'document.getElementById("out") ? document.getElementById("out").textContent : ""',
        returnByValue: true,
      },
      sessionId,
    );
    output = result.result?.value ?? "";
    if (output.includes("DONE") || output.includes("ERR ")) break;
  } catch {
    // page still navigating
  }
}

console.log(output);
if (consoleLines.length > 0) {
  console.error("--- console ---");
  for (const line of consoleLines) console.error(line);
}

ws.close();
chrome.kill("SIGKILL");
