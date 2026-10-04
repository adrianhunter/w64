// Worker-style front end for the Yuku transpiler.
//
// The compilation itself runs on a host worker thread (see
// tools/yuku-worker.mjs); `qjs:yuku` is the synchronous bridge into it, so
// this module presents the same request/transform shape as the Bun
// transpiler middleware without exposing the thread details to Hono.

import { transpile } from "qjs:yuku";

export type YukuLoader = "ts" | "tsx" | "js" | "jsx";

/// "blank" preserves line/column positions (ts-blank-space erasure),
/// "strip" produces compact Yuku codegen output.
export type YukuMode = "blank" | "strip";

export class YukuWorker {
  /// Transpiles synchronously. The host thread stays independent of the
  /// main WASM thread, so this does not run Yuku in the guest.
  transformSync(
    source: string,
    loader: YukuLoader,
    mode: YukuMode = "blank",
  ): string {
    return transpile(source, loader, mode) as string;
  }

  /// Promise-shaped alias. The work is synchronous under the hood.
  transform(
    source: string,
    loader: YukuLoader,
    mode: YukuMode = "blank",
  ): Promise<string> {
    try {
      return Promise.resolve(this.transformSync(source, loader, mode));
    } catch (error) {
      return Promise.reject(error);
    }
  }

  terminate(): void {
    // The host owns the thread and keeps it warm for the next request.
  }
}

let shared: YukuWorker | undefined;

export function getYukuWorker(): YukuWorker {
  return (shared ??= new YukuWorker());
}
