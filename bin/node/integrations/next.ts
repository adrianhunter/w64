// Next.js integration. Two ways in:
//
//   1. App Router route handler (works Next 13 through 16):
//
//        // app/__sw__.js/route.ts
//        export { GET } from '@r1ck404/nodepod/next';
//
//   2. Composable for users who already have a proxy.ts / middleware.ts:
//
//        // Next 16+ (proxy.ts)                  // Next <=15 (middleware.ts)
//        import { nodepodProxy } from            import { nodepodMiddleware } from
//          '@r1ck404/nodepod/next';                 '@r1ck404/nodepod/next';
//
// `nodepodProxy` and `nodepodMiddleware` are the same function under two
// names. Next 16 renamed `middleware.ts` to `proxy.ts`
// (https://nextjs.org/docs/app/getting-started/proxy), but NextRequest /
// NextResponse didn't change, so one implementation covers both.
//
// next/server is imported lazily so this file still parses in bundlers /
// test harnesses that don't have `next` installed. The module specifier is
// held in a variable so TypeScript does not require the optional peer dep to
// be resolvable at build time.

import { readServiceWorkerSource } from "./shared/read-sw.ts";
import { readPreviewBridgeSource } from "./shared/read-preview-bridge.ts";
import {
  swResponseHeaders,
  previewBridgeResponseHeaders,
  DEFAULT_SW_PATH,
  DEFAULT_BRIDGE_HTML_PATH,
  DEFAULT_BRIDGE_SCRIPT_PATH,
} from "./shared/headers.ts";

/** Minimal structural view of NextRequest used by the handlers below. */
export interface NodepodNextURL {
  pathname: string;
  searchParams?: { get(name: string): string | null } | null;
}

export interface NodepodNextRequest {
  nextUrl: NodepodNextURL;
}

interface NextResponseModule {
  NextResponse: new (
    body?: BodyInit | null,
    init?: ResponseInit,
  ) => Response;
}

async function importNextServer(): Promise<NextResponseModule> {
  const moduleId = "next/server";
  return await import(moduleId);
}

/** Drop-in matcher for `export const config = { matcher: nodepodMatcher }`. */
export const nodepodMatcher = DEFAULT_SW_PATH;
export const nodepodMatchers = [
  DEFAULT_SW_PATH,
  DEFAULT_BRIDGE_HTML_PATH,
  DEFAULT_BRIDGE_SCRIPT_PATH,
] as const;

async function buildResponse(): Promise<Response> {
  const { NextResponse } = await importNextServer();
  const body = await readServiceWorkerSource(import.meta.url);
  return new NextResponse(body, {
    status: 200,
    headers: swResponseHeaders(),
  });
}

async function buildBridgeResponse(
  asset: "html" | "script",
  mode?: "top" | "parent" | null,
): Promise<Response> {
  const { NextResponse } = await importNextServer();
  return new NextResponse(
    await readPreviewBridgeSource(import.meta.url, asset),
    {
      status: 200,
      headers: previewBridgeResponseHeaders(
        asset === "html" ? "text/html" : "application/javascript",
        mode,
      ),
    },
  );
}

/**
 * Route handler for `app/__sw__.js/route.ts`.
 *
 * ```ts
 * export { GET } from '@r1ck404/nodepod/next';
 * ```
 */
export async function GET(): Promise<Response> {
  return buildResponse();
}

/** Route handler for `app/__nodepod_bridge__.html/route.ts`. */
export async function GET_PREVIEW_BRIDGE(
  req?: NodepodNextRequest,
): Promise<Response> {
  const mode = req?.nextUrl.searchParams?.get("mode");
  return buildBridgeResponse(
    "html",
    mode === "top" || mode === "parent" ? mode : null,
  );
}

/** Route handler for `app/__nodepod_bridge__.js/route.ts`. */
export async function GET_PREVIEW_BRIDGE_SCRIPT(): Promise<Response> {
  return buildBridgeResponse("script");
}

/**
 * Composable handler for Next 16's `proxy.ts` or Next <=15's `middleware.ts`.
 * Returns a response for the SW path, or `null` so the caller's own logic
 * can take over.
 *
 * Also exported as `nodepodMiddleware` for projects still on Next <=15.
 */
export async function nodepodProxy(
  req: NodepodNextRequest,
): Promise<Response | null> {
  if (req.nextUrl.pathname === DEFAULT_SW_PATH) return buildResponse();
  if (req.nextUrl.pathname === DEFAULT_BRIDGE_HTML_PATH) {
    const mode = req.nextUrl.searchParams?.get("mode");
    return buildBridgeResponse(
      "html",
      mode === "top" || mode === "parent" ? mode : null,
    );
  }
  if (req.nextUrl.pathname === DEFAULT_BRIDGE_SCRIPT_PATH) {
    return buildBridgeResponse("script");
  }
  return null;
}

/** Alias of {@link nodepodProxy} for Next <=15 (`middleware.ts`). */
export const nodepodMiddleware = nodepodProxy;
