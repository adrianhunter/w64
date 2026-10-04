// SQLite-backed cache middleware modeled on Hono's built-in `cache`.
//
// Responses are stored in a SQLite database (`node:sqlite` backed by our
// zstd-enabled native SQLite and the OPFS VFS). The `responses` table is
// transparently zstd-compressed using the sqlite-zstd technique
// (`enableZstdCompression`), and maintenance runs in the background of the
// first few misses.

import type { MiddlewareHandler } from "hono";
import { createMiddleware } from "hono/factory";
import { DatabaseSync } from "node:sqlite";

export type SqliteCacheOptions = {
  /// Namespace, like Hono's `cacheName`.
  cacheName?: string;
  cacheControl?: string;
  vary?: string | string[];
  keyGenerator?: (c: Parameters<MiddlewareHandler>[0]) => string;
  cacheableStatusCodes?: number[];
  /// Enable transparent zstd compression of the response bodies.
  compress?: boolean;
  /// Run zstd maintenance after this many stores (0 disables it).
  maintenanceEvery?: number;
};

const defaultCacheableStatusCodes = [200];

type CacheRow = {
  status: number;
  headers: string;
  body: Uint8Array | string | null;
};

const databases = new Map<string, DatabaseSync>();
let storesSinceMaintenance = 0;

function databaseFor(cacheName: string): DatabaseSync {
  const existing = databases.get(cacheName);
  if (existing) return existing;

  const db = new DatabaseSync(`${cacheName}.db`);
  db.exec(`
    CREATE TABLE IF NOT EXISTS responses(
      cache TEXT NOT NULL,
      key TEXT NOT NULL,
      status INTEGER NOT NULL,
      headers TEXT NOT NULL,
      body BLOB,
      created INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      PRIMARY KEY (cache, key)
    );
  `);
  databases.set(cacheName, db);
  return db;
}

const shouldSkipCacheControl = (cacheControl: string | null) =>
  !!cacheControl && /(?:^|,\s*)(?:private|no-(?:store|cache))(?:\s*(?:=|,|$))/i.test(cacheControl);

const parseVary = (vary: string | string[] | undefined): string[] => {
  if (vary == null) return [];
  return (Array.isArray(vary) ? vary : vary.split(","))
    .map((directive) => directive.trim().toLowerCase())
    .filter(Boolean);
};

/// Removes every cached response. Used by tests; safe to call at runtime.
export function clearSqliteCache(cacheName = "qjs-transpile"): void {
  const db = databaseFor(cacheName);
  db.exec(`DELETE FROM responses`);
}

export const sqliteCache = (
  options: SqliteCacheOptions = {},
): MiddlewareHandler => {
  const cacheName = options.cacheName ?? "qjs-transpile";
  const cacheable = new Set(
    options.cacheableStatusCodes ?? defaultCacheableStatusCodes,
  );
  const varyDirectives = parseVary(options.vary);
  const cacheControlDirectives = options.cacheControl
    ?.split(",")
    .map((directive) => directive.trim().toLowerCase())
    .filter(Boolean);
  const maintenanceEvery = options.maintenanceEvery ?? 32;

  return createMiddleware(async (c, next) => {
    if (c.req.method !== "GET" || c.req.raw.headers.has("Authorization")) {
      await next();
      return;
    }

    const db = databaseFor(cacheName);
    const key =
      options.keyGenerator?.(c as never) ??
      [
        c.req.url,
        ...varyDirectives.map(
          (header) => `${header}=${c.req.raw.headers.get(header) ?? ""}`,
        ),
      ].join("\n");

    const hit = db
      .prepare(
        `SELECT status, headers, body FROM responses WHERE cache = ?1 AND key = ?2`,
      )
      .get(cacheName, key) as CacheRow | undefined;

    if (hit) {
      const headers = new Headers(JSON.parse(hit.headers) as [string, string][]);
      headers.set("x-qjs-cache", "HIT");
      return new Response(hit.body instanceof Uint8Array ? hit.body : hit.body, {
        status: hit.status,
        headers,
      });
    }

    await next();
    if (!cacheable.has(c.res.status)) return;
    if (c.res.headers.has("Set-Cookie")) return;
    if (shouldSkipCacheControl(c.res.headers.get("Cache-Control"))) return;

    if (cacheControlDirectives) {
      c.header("Cache-Control", cacheControlDirectives.join(", "));
    }
    if (varyDirectives.length > 0) {
      c.header("Vary", varyDirectives.join(", "));
    }
    c.header("x-qjs-cache", "MISS");

    const body = new Uint8Array(await c.res.clone().arrayBuffer());
    const headerList: [string, string][] = [];
    c.res.headers.forEach((value, name) => headerList.push([name, value]));

    db.prepare(
      `INSERT OR REPLACE INTO responses(cache, key, status, headers, body, created)
       VALUES (?1, ?2, ?3, ?4, ?5, strftime('%s','now'))`,
    ).run(cacheName, key, c.res.status, JSON.stringify(headerList), body);

    if (options.compress) {
      try {
        db.exec(
          `CREATE TABLE IF NOT EXISTS _qjs_zstd_config("table" TEXT PRIMARY KEY, "column" TEXT NOT NULL, compression_level INTEGER NOT NULL, dict_chooser TEXT NOT NULL)`,
        );
        const configured = db
          .prepare(`SELECT 1 AS ok FROM _qjs_zstd_config WHERE "table" = 'responses'`)
          .get() as { ok: number } | undefined;
        if (!configured) {
          (db as unknown as {
            enableZstdCompression(config: Record<string, unknown>): void;
          }).enableZstdCompression({
            table: "responses",
            column: "body",
            compressionLevel: 3,
            dictChooser: "''",
          });
        }
        storesSinceMaintenance += 1;
        if (
          maintenanceEvery > 0 &&
          storesSinceMaintenance >= maintenanceEvery
        ) {
          storesSinceMaintenance = 0;
          (db as unknown as {
            runZstdMaintenance(options: Record<string, unknown>): number;
          }).runZstdMaintenance({ maxRows: 4096 });
        }
      } catch (error) {
        console.warn(`sqlite cache zstd setup failed: ${error}`);
      }
    }
  });
};
