// qjs bundle entry for the Deno-compat test run.
//
// The prelude (`test/deno/runtime.ts`) has already registered the
// Nodepod-backed `node:*` modules by the time this bundle is linked, so the
// shim and the tests can import them like ordinary modules.
//
// `qjs test` imports `deno:test-runner` and awaits `run()`.

import { Deno } from "@deno/shim-deno";
import { testDefinitions } from "@deno/shim-deno-test";

const g = globalThis as unknown as Record<string, unknown>;
g.Deno = Deno;

const print: (...args: unknown[]) => void =
  (g.print as (...args: unknown[]) => void) ?? console.log;

type TestDefinition = {
  name: string;
  fn: (context: TestContext) => unknown | Promise<unknown>;
  ignore?: boolean;
  only?: boolean;
};

type TestContext = {
  name: string;
  origin: string;
  parent: TestContext | undefined;
  step: (name: string, fn: () => unknown | Promise<unknown>) => Promise<boolean>;
};

type Failure = { name: string; error: unknown };

function formatError(error: unknown): string {
  if (error && typeof error === "object") {
    const err = error as { stack?: string; message?: string };
    return err.stack ?? err.message ?? String(error);
  }
  return String(error);
}

async function runDefinition(def: TestDefinition): Promise<"passed" | "failed" | "ignored"> {
  if (def.ignore) {
    print(`test ${def.name} ... ignored`);
    return "ignored";
  }

  const failures: Failure[] = [];
  const context: TestContext = {
    name: def.name,
    origin: "",
    parent: undefined,
    async step(name, fn) {
      try {
        await fn();
        print(`  step ${name} ... ok`);
        return true;
      } catch (error) {
        failures.push({ name, error });
        print(`  step ${name} ... FAILED`);
        return false;
      }
    },
  };

  try {
    await def.fn(context);
  } catch (error) {
    failures.push({ name: def.name, error });
  }

  if (failures.length > 0) {
    print(`test ${def.name} ... FAILED`);
    for (const failure of failures) {
      print(`  ${formatError(failure.error)}`);
    }
    return "failed";
  }

  print(`test ${def.name} ... ok`);
  return "passed";
}

async function run(): Promise<number> {
  const only = testDefinitions.filter((def) => def.only);
  const selected = only.length > 0 ? only : testDefinitions;

  let passed = 0;
  let failed = 0;
  let ignored = 0;

  for (const def of selected as TestDefinition[]) {
    switch (await runDefinition(def)) {
      case "passed":
        passed++;
        break;
      case "failed":
        failed++;
        break;
      case "ignored":
        ignored++;
        break;
    }
  }

  print(`\n${passed} passed; ${failed} failed; ${ignored} ignored`);
  return failed === 0 ? 0 : 1;
}

const registry = g.__qjs_modules as Record<string, unknown>;
registry["deno:test-runner"] = { run };

// Import the test modules only now that `globalThis.Deno` exists. These
// dynamic imports are resolved by the module loader, so Deno.test()
// definitions end up in the same testDefinitions array used above.
await import("./tests/node-apis.test");
await import("./tests/streams.test");
await import("./tests/open.test");
await import("./tests/main-module.test");
await import("./tests/hono.test");
await import("./tests/blank-space.test");
await import("./tests/sqlite-cache.test");
