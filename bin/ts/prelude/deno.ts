// Exposes the vendored denoland/node_shims Deno namespace as globalThis.Deno.
import { Deno } from "@deno/shim-deno";

const g = globalThis as unknown as Record<string, unknown>;
g.Deno = Deno;
