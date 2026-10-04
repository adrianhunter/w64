// A Hono app served through the Deno adapter, with on-the-fly TypeScript
// transpilation from the Yuku worker.

import { Hono } from "hono";
import { serveStatic } from "@hono/deno";
import { yukuTranspiler } from "./yuku-transpiler";
import { sqliteCache } from "./sqlite-cache";

const app = new Hono();

app.use(
  "/:scriptName{.+.tsx?}",
  sqliteCache({
    cacheName: "qjs-hono-cache",
    cacheControl: "public, max-age=31536000, immutable",
    compress: true,
  }),
);
app.get("/:scriptName{.+.tsx?}", yukuTranspiler());
app.get("/*", serveStatic({ root: "./" }));

export default app;
