// #!/usr/bin/env node
// /*
//  * Mirror the JS/Linux Alpine x86_64 VM so it can run from a local static
//  * server at ./static/linux/index.html.
//  *
//  * Usage:
//  *   node boot.ts            # download everything (resumes if interrupted)
//  *   node boot.ts --no-fs    # only the loader/kernel, no filesystem mirror
//  *   node boot.ts --force    # re-download files even if they already exist
//  */
// import { existsSync } from "node:fs";
// import { mkdir, rename, stat, writeFile } from "node:fs/promises";
// import { dirname, join } from "node:path";

// const JL_ORIGIN = "https://bellard.org/jslinux";
// const VFS_ORIGIN = "https://vfsync.org/u/os/alpine-x86_64";
// const DEST = join(import.meta.dirname, "static", "linux");
// const VFS_DIR = join(DEST, "vfs", "alpine-x86_64");
// const PAGE_QUERY = "cpu=x86_64&url=alpine-x86_64.cfg&mem=256";
// const CONCURRENCY = 12;
// const RETRIES = 4;

// const flags = new Set(process.argv.slice(2));
// const skipFs = flags.has("--no-fs");
// const force = flags.has("--force");

// const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// function human(bytes: number): string {
//   const units = ["B", "KB", "MB", "GB"];
//   let n = bytes;
//   let u = 0;
//   while (n >= 1024 && u < units.length - 1) {
//     n /= 1024;
//     u++;
//   }
//   return `${n.toFixed(n >= 100 || u === 0 ? 0 : 1)} ${units[u]}`;
// }

// async function saveFile(dest: string, data: Uint8Array | string): Promise<void> {
//   await mkdir(dirname(dest), { recursive: true });
//   const tmp = `${dest}.part`;
//   await writeFile(tmp, data);
//   await rename(tmp, dest);
// }

// async function download(url: string, dest: string): Promise<Uint8Array> {
//   let lastError: unknown;
//   for (let attempt = 1; attempt <= RETRIES; attempt++) {
//     try {
//       const res = await fetch(url);
//       if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
//       const data = new Uint8Array(await res.arrayBuffer());
//       await saveFile(dest, data);
//       return data;
//     } catch (err) {
//       lastError = err;
//       if (attempt < RETRIES) await sleep(500 * attempt);
//     }
//   }
//   throw new Error(`failed to download ${url}: ${String(lastError)}`);
// }

// async function downloadIfMissing(url: string, dest: string, expectedSize?: number): Promise<"kept" | "fetched"> {
//   if (!force && existsSync(dest)) {
//     const info = await stat(dest);
//     if (expectedSize === undefined || info.size === expectedSize) return "kept";
//   }
//   let lastError: unknown;
//   for (let attempt = 1; attempt <= RETRIES; attempt++) {
//     try {
//       const res = await fetch(url);
//       if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
//       const data = new Uint8Array(await res.arrayBuffer());
//       if (expectedSize !== undefined && data.byteLength !== expectedSize) {
//         throw new Error(`size mismatch: got ${data.byteLength}, expected ${expectedSize}`);
//       }
//       await saveFile(dest, data);
//       return "fetched";
//     } catch (err) {
//       lastError = err;
//       if (attempt < RETRIES) await sleep(500 * attempt);
//     }
//   }
//   throw new Error(`failed to download ${url}: ${String(lastError)}`);
// }

// function injectPageDefaults(html: string): string {
//   const script = `<script>if (location.search === "") history.replaceState(null, "", location.pathname + "?${PAGE_QUERY}");</script>`;
//   if (html.includes("location.search")) return html;
//   return html.replace("</head>", `    ${script}\n</head>`);
// }

// function rewriteConfig(cfg: string): string {
//   return cfg.replace(/(fs0:\s*\{\s*file:\s*)"[^"]*"/, '$1"vfs/alpine-x86_64"');
// }

// interface FileListEntry {
//   id: string;
//   size: number;
// }

// function parseFileList(text: string): Map<string, FileListEntry> {
//   const files = new Map<string, FileListEntry>();
//   for (const line of text.split("\n")) {
//     const [mode, , , sizeStr, , , id] = line.split(" ");
//     if (!mode || !sizeStr || !id) continue;
//     if (!/^[0-7]{6}$/.test(mode)) continue;
//     if (!/^[0-9a-f]+$/.test(id)) continue;
//     const size = Number(sizeStr);
//     if (!Number.isFinite(size)) continue;
//     if (!files.has(id)) files.set(id, { id, size });
//   }
//   return files;
// }

// const pad16 = (id: string) => id.padStart(16, "0");

// async function mirrorFilesystem(): Promise<void> {
//   console.log("[fs] reading head ...");
//   const head = await download(`${VFS_ORIGIN}/head?nocache=${Date.now()}`, join(VFS_DIR, "head"));
//   const headText = new TextDecoder().decode(head);
//   const rootId = headText.match(/^RootID:\s*([0-9a-f]+)/m)?.[1];
//   if (!rootId) throw new Error("could not parse RootID from vfsync head response");
//   console.log(`[fs] root id ${rootId}, fetching file list ...`);

//   const rootDest = join(VFS_DIR, "files", pad16(rootId));
//   const root = await download(`${VFS_ORIGIN}/files/${pad16(rootId)}`, rootDest);
//   const files = parseFileList(new TextDecoder().decode(root));
//   if (files.size === 0) throw new Error("empty file list");

//   const entries = [...files.values()];
//   const totalBytes = entries.reduce((sum, e) => sum + e.size, 0);
//   console.log(`[fs] ${entries.length} files, ${human(totalBytes)} to mirror`);

//   let next = 0;
//   let kept = 0;
//   let done = 0;
//   let bytes = 0;
//   let failures = 0;
//   const started = Date.now();

//   const render = () => {
//     const completed = done + kept;
//     const pct = totalBytes > 0 ? ((bytes / totalBytes) * 100).toFixed(1) : "0.0";
//     const elapsed = (Date.now() - started) / 1000;
//     const rate = bytes / Math.max(elapsed, 0.001);
//     process.stdout.write(
//       `\r[fs] ${done + kept}/${entries.length} (${pct}%) ${human(bytes)}/${human(totalBytes)} @ ${human(rate)}/s    `
//     );
//   };

//   const worker = async () => {
//     for (;;) {
//       const entry = entries[next++];
//       if (!entry) return;
//       const dest = join(VFS_DIR, "files", pad16(entry.id));
//       try {
//         const result = await downloadIfMissing(`${VFS_ORIGIN}/files/${pad16(entry.id)}`, dest, entry.size);
//         if (result === "kept") kept++;
//         else done++;
//         bytes += entry.size;
//         if ((done + kept) % 50 === 0) render();
//       } catch (err) {
//         failures++;
//         console.error(`\n[fs] ${String(err)}`);
//       }
//     }
//   };

//   const timer = setInterval(render, 500);
//   await Promise.all(Array.from({ length: CONCURRENCY }, worker));
//   clearInterval(timer);
//   render();
//   process.stdout.write("\n");
//   if (failures > 0) {
//     console.error(`[fs] ${failures} files failed; re-run "node boot.ts" to retry them`);
//   } else {
//     console.log(`[fs] done (${done} downloaded, ${kept} already present)`);
//   }
// }

// async function main(): Promise<void> {
//   await mkdir(DEST, { recursive: true });

//   const assets: Array<[string, string]> = [
//     ["term.js", "term.js"],
//     ["jslinux.js", "jslinux.js"],
//     ["style.css", "style.css"],
//     ["images/upload-icon.png", "images/upload-icon.png"],
//     ["images/bg-scrollbar-track-y.png", "images/bg-scrollbar-track-y.png"],
//     ["images/bg-scrollbar-trackend-y.png", "images/bg-scrollbar-trackend-y.png"],
//     ["images/bg-scrollbar-thumb-y.png", "images/bg-scrollbar-thumb-y.png"],
//     ["x86_64emu-wasm.js", "x86_64emu-wasm.js"],
//     ["x86_64emu-wasm.wasm", "x86_64emu-wasm.wasm"],
//     ["kernel-x86_64-new.bin", "kernel-x86_64-new.bin"],
//   ];

//   for (const [src, rel] of assets) {
//     const dest = join(DEST, rel);
//     process.stdout.write(`[web] ${src} ... `);
//     const data = await download(`${JL_ORIGIN}/${src}`, dest);
//     console.log(human(data.byteLength));
//   }

//   process.stdout.write("[web] alpine-x86_64.cfg (rewritten) ... ");
//   const cfg = new TextDecoder().decode(await download(`${JL_ORIGIN}/alpine-x86_64.cfg`, join(DEST, "alpine-x86_64.cfg")));
//   await saveFile(join(DEST, "alpine-x86_64.cfg"), rewriteConfig(cfg));
//   console.log("ok");

//   process.stdout.write("[web] index.html (default query params) ... ");
//   const html = new TextDecoder().decode(await download(`${JL_ORIGIN}/vm.html`, join(DEST, "index.html")));
//   await saveFile(join(DEST, "index.html"), injectPageDefaults(html));
//   console.log("ok");

//   if (skipFs) {
//     console.log("[fs] skipped (--no-fs)");
//   } else {
//     await mirrorFilesystem();
//   }

//   console.log(`\nDone. Serve this repo and open:\n  http://localhost:3000/static/linux/index.html`);
// }

// main().catch((err) => {
//   console.error(`\nboot failed: ${String(err)}`);
//   process.exit(1);
// });
