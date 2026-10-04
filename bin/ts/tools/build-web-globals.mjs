// Bundles the web platform globals the qjs runtime embeds:
//   - src/web_globals.bundle.js  (core globals, no dependencies)
//   - src/url_globals.bundle.js  (WHATWG URL, built on top of the core)
//
// usage: node tools/build-web-globals.mjs

import { build } from "esbuild";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");

const shared = {
  bundle: true,
  format: "iife",
  platform: "browser",
  target: ["es2020"],
  minify: true,
  legalComments: "none",
  logLevel: "warning",
};

await build({
  ...shared,
  entryPoints: [path.join(root, "tools", "web-globals-entry.mjs")],
  outfile: path.join(root, "src", "web_globals.bundle.js"),
});

await build({
  ...shared,
  entryPoints: [path.join(root, "tools", "url-globals-entry.mjs")],
  outfile: path.join(root, "src", "url_globals.bundle.js"),
});

console.log("wrote src/web_globals.bundle.js and src/url_globals.bundle.js");
