// Bundles opencode for the qjs runtime.
//
// usage: node tools/build-opencode.mjs [--entry path] [--outfile path]
//          [--no-deps]
//
// The app bundle and the shared dependency registry are loaded at runtime by
// the base qjs runtime; nothing is pre-initialized into qjs.wasm.
//
//   --no-deps   skip the shared package registry bundle
//
// environment:
//   OPENCODE_DIR  checkout of github.com/anomalyco/opencode (default ../opencode)

import { build } from "esbuild";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const opencodeDir = path.resolve(
  process.env.OPENCODE_DIR ??
    path.join(root, "..", "..", "..", "..", "opencode"),
);

const args = process.argv.slice(2);
function argValue(name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
}

const entry = path.resolve(
  opencodeDir,
  argValue("--entry", "packages/opencode/src/server/server.ts"),
);
const outfile = path.resolve(
  root,
  argValue("--outfile", ".qjs-build/opencode-server.mjs"),
);

if (!existsSync(entry)) {
  console.error(
    `build-opencode: entry not found: ${entry}\n` +
      "set OPENCODE_DIR to a github.com/anomalyco/opencode checkout",
  );
  process.exit(1);
}

// Bun's `with { type: "text" | "file" | "wasm" }` imports. esbuild cannot
// represent them, so serve text files inline and turn binary assets into
// path stubs (the image/audio paths are not exercised in this environment).
const assetPlugin = {
  name: "opencode-assets",
  setup(pluginBuild) {
    pluginBuild.onResolve(
      { filter: /\.(md|txt|wasm|mp3|wav|png|ttf)$/ },
      (resolveArgs) => ({
        path: resolveArgs.path,
        namespace: "opencode-asset",
        pluginData: { resolveDir: resolveArgs.resolveDir },
      }),
    );
    pluginBuild.onLoad(
      { filter: /.*/, namespace: "opencode-asset" },
      (loadArgs) => {
        const resolved = path.resolve(
          loadArgs.pluginData.resolveDir,
          loadArgs.path,
        );
        if (/\.(md|txt)$/.test(loadArgs.path)) {
          return {
            contents: `export default ${JSON.stringify(
              readFileSync(resolved, "utf8"),
            )};`,
            loader: "js",
          };
        }
        return {
          contents: `export default ${JSON.stringify(resolved)};`,
          loader: "js",
        };
      },
    );
  },
};

// Opencode has two genuine top-level awaits in its module graph:
//   - packages/core/src/global.ts eagerly mkdir's its data dirs
//   - packages/core/src/database/migration.gen.ts awaits dynamic imports
// Top-level await turns esbuild's module init graph async, which deadlocks on
// the package's import cycles. Both are neutralised here: directory creation
// becomes fire-and-forget and the migrations become static imports.
const qjsPatches = {
  name: "qjs-patches",
  setup(pluginBuild) {
    pluginBuild.onLoad(
      { filter: /packages\/core\/src\/global\.ts$/ },
      (loadArgs) => {
        const source = readFileSync(loadArgs.path, "utf8");
        const contents = source.replace(
          /await Promise\.all\((\[[\s\S]*?\])\)/,
          "void Promise.all($1).catch(() => {})",
        );
        return {
          contents,
          loader: "ts",
          resolveDir: path.dirname(loadArgs.path),
        };
      },
    );
    pluginBuild.onLoad(
      { filter: /packages\/core\/src\/database\/migration\.gen\.ts$/ },
      (loadArgs) => {
        const source = readFileSync(loadArgs.path, "utf8");
        const specs = [...source.matchAll(/import\(\s*"([^"]+)"\s*\)/g)].map(
          (match) => match[1],
        );
        const lines = ['import type { DatabaseMigration } from "./migration";'];
        specs.forEach((spec, index) =>
          lines.push(`import * as qjsMigration${index} from ${JSON.stringify(spec)};`),
        );
        lines.push("", "export const migrations = [");
        specs.forEach((_, index) => lines.push(`  qjsMigration${index}.default,`));
        lines.push("] satisfies DatabaseMigration.Migration[];", "");
        return {
          contents: lines.join("\n"),
          loader: "ts",
          resolveDir: path.dirname(loadArgs.path),
        };
      },
    );
  },
};

const result = await build({
  entryPoints: [entry],
  absWorkingDir: opencodeDir,
  bundle: true,
  format: "esm",
  platform: "node",
  // Match the runtime: modern Node syntax, node conditions and resolution.
  target: ["node22"],
  conditions: ["node"],
  // Keep node_modules out of the app bundle. Packages are provided by a
  // shared prelude registry instead, so they are only bundled once.
  packages: "external",
  // Bun prefers ESM builds; node's default main-field order picks UMD builds
  // (jsonc-parser), whose dynamic relative requires esbuild cannot bundle.
  mainFields: ["module", "main"],
  outfile,
  logLevel: "warning",
  metafile: true,
  external: ["bun", "bun:*"],
  define: {
    "process.env.NODE_ENV": '"production"',
  },
  plugins: [assetPlugin, qjsPatches],
  logOverride: {
    "unsupported-jsx-comment": "silent",
  },
});

// esbuild handles top-level-await cycles by inserting `await init_self()`
// into each async module setup. Opencode's self-imports
// (`export * as X from "./server"` inside that same server module) turn that
// into a self-await, which deadlocks: the module awaits its own init promise.
// The self-await has no synchronization value (nothing else waits on it), so
// strip it after bundling.
{
  const bundle = readFileSync(outfile, "utf8");
  const cleaned = bundle.replace(
    /^var (init_\w+) = __esm\(\{[\s\S]*?^\}\);$/gm,
    (block, name) =>
      block
        .split("\n")
        .filter((line) => line.trim() !== `await ${name}();`)
        .join("\n"),
  );
  if (cleaned !== bundle) writeFileSync(outfile, cleaned);
}

if (process.env.QJS_METAFILE) {
  writeFileSync(
    path.join(root, ".qjs-build", "opencode-server.meta.json"),
    JSON.stringify(result.metafile),
  );
}

const BUILTINS = new Set([
  "assert", "async_hooks", "buffer", "child_process", "cluster", "console",
  "constants", "crypto", "dgram", "diagnostics_channel", "dns", "domain",
  "events", "fs", "fs/promises", "http", "http2", "https", "inspector",
  "module", "net", "os", "path", "path/posix", "path/win32", "perf_hooks",
  "process", "punycode", "querystring", "readline", "repl", "sea", "sqlite",
  "stream", "stream/consumers", "stream/promises", "stream/web",
  "string_decoder", "timers", "timers/promises", "tls", "trace_events",
  "tty", "url", "util", "v8", "vm", "wasi", "worker_threads", "zlib",
]);

const staticExternals = new Set();
for (const output of Object.values(result.metafile.outputs)) {
  for (const imp of output.imports ?? []) {
    if (!imp.external) continue;
    const name = imp.path;
    if (imp.kind !== "import-statement") continue;
    if (name.startsWith("node:") || name.startsWith("bun")) continue;
    if (name.startsWith(".") || name.startsWith("/")) continue;
    if (BUILTINS.has(name)) continue;
    if (name.includes("\x00") || name.endsWith(".gen.ts")) continue;
    staticExternals.add(name);
  }
}

// Bundle every statically imported package once into a shared prelude that
// registers each specifier on globalThis.__qjs_modules. Application bundles
// stay thin and share these modules instead of inlining them repeatedly.
if (staticExternals.size > 0 && !args.includes("--no-deps")) {
  const specifiers = [...staticExternals].sort();
  // Generate the registry entry inside the app package so workspace and
  // hoisted dependencies resolve exactly like they do for the app build.
  const entryPath = path.join(
    opencodeDir,
    "packages",
    "opencode",
    ".qjs-deps-entry.mjs",
  );
  const depsOutfile = path.resolve(root, ".qjs-build", "opencode-deps.mjs");
  const lines = [
    "const registry = (globalThis.__qjs_modules ??= {});",
    'function put(name, ns) {',
    "  const wrapped = Object.assign({}, ns);",
    '  if (!("default" in wrapped)) wrapped.default = wrapped;',
    "  registry[name] = wrapped;",
    "}",
  ];
  specifiers.forEach((specifier, index) => {
    lines.push(`import * as qjsDep${index} from ${JSON.stringify(specifier)};`);
  });
  specifiers.forEach((specifier, index) => {
    lines.push(`put(${JSON.stringify(specifier)}, qjsDep${index});`);
  });
  writeFileSync(entryPath, lines.join("\n"));

  try {
    const depsResult = await build({
      entryPoints: [entryPath],
      absWorkingDir: opencodeDir,
      bundle: true,
      format: "esm",
      platform: "node",
      target: ["node22"],
      conditions: ["node"],
      mainFields: ["module", "main"],
      // Bun's isolated linker keeps the hoisted store here; packages are
      // symlinked from this directory rather than the project root.
      nodePaths: [path.join(opencodeDir, "node_modules", ".bun", "node_modules")],
      outfile: depsOutfile,
      logLevel: "warning",
      metafile: true,
      external: ["bun", "bun:*"],
      plugins: [assetPlugin, qjsPatches],
      logOverride: { "unsupported-jsx-comment": "silent" },
    });
    if (process.env.QJS_METAFILE) {
      writeFileSync(
        path.join(root, ".qjs-build", "opencode-deps.meta.json"),
        JSON.stringify(depsResult.metafile),
      );
    }
  } finally {
    rmSync(entryPath, { force: true });
  }
  console.log(
    `wrote ${path.relative(root, depsOutfile)} (${specifiers.length} packages)`,
  );
}

console.log(
  `wrote ${path.relative(root, outfile)} (${staticExternals.size} static externals)`,
);

