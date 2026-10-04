// Yuku transpiler worker thread.
//
// Receives a request through a SharedArrayBuffer mailbox and replies with the
// transpiled code. Two modes:
//
//   "strip"  Yuku codegen with `strip: true` (compact output)
//   "blank"  ts-blank-space erasure: TypeScript syntax is replaced by
//            whitespace so line/column positions in the output match the
//            original source exactly, like the ts-blank-space trick. Yuku
//            parses first to report non-erasable syntax (enums, namespaces,
//            parameter properties) with a source location.
//
// The mailbox layout:
//   int32 state     0 while idle/request length, -1 on error, 1 on success
//   int32 resultLen byte length of the transpiled code
//   bytes 8..       "mode\0lang\0source" on input, transpiled code on output

import { parentPort } from "node:worker_threads";
import { parse } from "yuku-parser";
import { generate } from "yuku-codegen";
import tsBlankSpace from "ts-blank-space";

let state = null;
let data = null;

parentPort.on("message", (message) => {
  if (message.type === "init") {
    state = new Int32Array(message.sab, 0, 2);
    data = new Uint8Array(message.sab, 8);
    return;
  }
  if (message.type !== "transpile") return;

  const requestLength = Atomics.load(state, 0);
  const request = Buffer.from(data.subarray(0, requestLength)).toString("utf8");
  const modeEnd = request.indexOf("\0");
  const mode = request.slice(0, modeEnd);
  const rest = request.slice(modeEnd + 1);
  const langEnd = rest.indexOf("\0");
  const lang = rest.slice(0, langEnd);
  const source = rest.slice(langEnd + 1);

  let result;
  let error = false;
  try {
    if (mode === "blank") {
      result = blankSpace(source, lang);
    } else {
      result = strip(source, lang);
    }
  } catch (err) {
    error = true;
    result = err instanceof Error ? err.message : String(err);
    console.error("yuku worker error:", err && err.stack ? err.stack : err);
  }

  const bytes = Buffer.from(result, "utf8");
  const count = Math.min(bytes.length, data.length - 1);
  data.set(bytes.subarray(0, count));
  if (error) data[count] = 0; // NUL-terminate diagnostics for the guest
  Atomics.store(state, 1, count);
  Atomics.store(state, 0, error ? -1 : 1);
  Atomics.notify(state, 0);
});

function lineColumn(source, offset) {
  let line = 1;
  let lineStart = 0;
  for (let i = 0; i < offset && i < source.length; i++) {
    if (source[i] === "\n") {
      line++;
      lineStart = i + 1;
    }
  }
  return { line, column: offset - lineStart + 1 };
}

function strip(source, lang) {
  const parsed = parse(source, { lang });
  const generated = generate(parsed.program, {
    strip: true,
    format: "compact",
    quotes: "shortest",
  });
  const diagnostics = [
    ...(parsed.diagnostics ?? []),
    ...(generated.diagnostics ?? []),
  ];
  if (diagnostics.length > 0) {
    throw new Error(diagnostics.map((d) => d.message).join("; "));
  }
  return generated.code;
}

function blankSpace(source, lang) {
  // Yuku enforces the erasableSyntaxOnly assumption; each non-erasable
  // construct is reported with a byte span we turn into line/column.
  const parsed = parse(source, { lang });
  if (parsed.diagnostics && parsed.diagnostics.length > 0) {
    const diagnostic = parsed.diagnostics[0];
    const at =
      diagnostic.start != null
        ? lineColumn(source, diagnostic.start)
        : { line: 1, column: 1 };
    throw new Error(
      `${diagnostic.message} (${at.line}:${at.column})`,
    );
  }

  const generated = generate(parsed.program, { strip: true });
  const nonErasable = (generated.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.severity !== "info" &&
      diagnostic.severity !== "hint",
  );
  if (nonErasable.length > 0) {
    const diagnostic = nonErasable[0];
    const at =
      diagnostic.start != null
        ? lineColumn(source, diagnostic.start)
        : { line: 1, column: 1 };
    throw new Error(`${diagnostic.message} (${at.line}:${at.column})`);
  }

  // ts-blank-space replaces TypeScript syntax with spaces, preserving every
  // other byte, so output positions are identical to the input positions.
  return tsBlankSpace(source);
}
