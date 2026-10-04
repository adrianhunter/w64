// Hono middleware that transpiles TypeScript responses on the fly with
// Yuku, modeled after @hono/bun-transpiler but using the host Yuku worker
// instead of Bun.

import type { MiddlewareHandler } from "hono";
import { createMiddleware } from "hono/factory";
import { getYukuWorker, type YukuLoader } from "./yuku-worker";

export type YukuTranspilerOptions = {
  extensions?: string[];
  headers?: Record<string, string | string[]>;
};

export const defaultOptions: Required<YukuTranspilerOptions> = {
  extensions: [".ts", ".tsx"],
  headers: { "content-type": "application/javascript" },
};

export const yukuTranspiler = (
  options?: YukuTranspilerOptions,
): MiddlewareHandler =>
  createMiddleware(async (c, next) => {
    await next();

    const url = new URL(c.req.url);
    const extensions = options?.extensions ?? defaultOptions.extensions;
    const headers = options?.headers ?? defaultOptions.headers;

    if (extensions.every((extension) => !url.pathname.endsWith(extension))) {
      return;
    }

    try {
      const loader = url.pathname.split(".").pop() as YukuLoader;
      const transpiled = await getYukuWorker().transform(
        await c.res.text(),
        loader,
      );
      c.res = c.newResponse(transpiled, 200, headers);
    } catch (error) {
      console.warn(`Error transpiling ${url.pathname}: ${error}`);
      const errorHeaders = {
        ...headers,
        "content-type": "text/plain",
      };
      c.res = c.newResponse(
        error instanceof Error ? error.message : "Malformed Input",
        500,
        errorHeaders,
      );
    }
  });
