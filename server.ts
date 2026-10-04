import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { TsTranspiler } from "./plugins/transpiler.ts";

const app = new Hono();

// app.get(":scriptName{.+.tsx?}", TsTranspiler());
app.get("*", serveStatic({ root: "./" }));

serve(app, (e) => {
    console.log(`Server started on http://localhost:${e.port}`);
});
