import { transpile } from "qjs:yuku";
import app from "../hono/app";
import assert from "assert/strict";

const source =
  'const marker: string = "blank";\n' +
  "(globalThis as { __boom?: () => void }).__boom = (): void => {\n" +
  '  throw new Error("boom from typescript");\n' +
  "};\n" +
  "console.log(marker);\n";

Deno.test("blank mode keeps every source position", () => {
  const output = transpile(source, "ts", "blank") as string;
  assert.equal(output.length, source.length);
  assert.ok(output.includes('  throw new Error("boom from typescript");'));
  assert.ok(output.includes("const marker         ="), output);
});

Deno.test("blank mode rejects non-erasable syntax", () => {
  assert.throws(
    () => transpile("enum E { A }\n", "ts", "blank"),
    /enum/i,
  );
});

Deno.test("runtime errors point at the original line and column", () => {
  (0, eval)(transpile(source, "ts", "blank") as string);
  const boom = (globalThis as { __boom?: () => void }).__boom!;
  let stack = "";
  try {
    boom();
  } catch (error) {
    stack = (error as Error).stack ?? String(error);
  }
  // QuickJS reports the position of the `Error` constructor call.
  const errorColumn = source.split("\n")[2].indexOf("Error") + 1;
  assert.ok(stack.includes(`:3:${errorColumn}`), stack);
});

Deno.test("hono-served code keeps the original ts positions", async () => {
  const response = await app.request("http://localhost/public/boom.ts");
  assert.equal(response.status, 200);
  (0, eval)(await response.text());
  const boom = (globalThis as { __boom?: () => void }).__boom!;
  let stack = "";
  try {
    boom();
  } catch (error) {
    stack = (error as Error).stack ?? String(error);
  }
  // QuickJS reports the position of the `Error` constructor call.
  const errorColumn = source.split("\n")[2].indexOf("Error") + 1;
  assert.ok(stack.includes(`:3:${errorColumn}`), stack);
});
