import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const root = "/Volumes/workspace/github/w64";
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".ts": "text/javascript",
  ".tsx": "text/javascript",
  ".json": "application/json",
  ".wasm": "application/wasm",
  ".svg": "image/svg+xml",
  ".map": "application/json",
  ".css": "text/css",
  ".txt": "text/plain",
  ".md": "text/markdown",
};
const port = Number(process.env.PORT || 8123);
createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (path.endsWith("/")) path += "index.html";
    // the chat example imports svg icons as text; serve a stub module per icon
    const icon = path.match(/^\/bin\/ttsc\/test\/icons\/([A-Za-z0-9-]+)\.js$/);
    if (icon) {
      res.writeHead(200, { "content-type": "text/javascript", "cache-control": "no-store" });
      res.end(`export default ${JSON.stringify(`<svg data-icon="${icon[1]}"></svg>`)};`);
      return;
    }
    const file = join(root, normalize(path).replace(/^(\.\.[/\\])+/, ""));
    const info = await stat(file);
    if (!info.isFile()) throw new Error("not a file");
    const body = await readFile(file);
    res.writeHead(200, {
      "content-type": types[extname(file)] || "application/octet-stream",
      "cache-control": "no-store",
    });
    res.end(body);
  } catch (e) {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not found: " + e.message);
  }
}).listen(port, () => console.log("serving " + root + " on " + port));
