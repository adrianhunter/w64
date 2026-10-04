import { mainModule } from "../../../vendor/node_shims/shim-deno/src/deno/stable/variables/mainModule.js";
import assert from "assert/strict";

Deno.test("should get entrypoint", () => {
  assert.equal(typeof mainModule, "string");
  assert.ok(mainModule.startsWith("file://"), mainModule);
});
