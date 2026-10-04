// Assembles all builtin commands from category modules into one map.

import type { BuiltinFn } from "./shell-types.ts";
import { fileOpsCommands } from "./commands/file-ops.ts";
import { directoryCommands } from "./commands/directory.ts";
import { textProcessingCommands } from "./commands/text-processing.ts";
import { searchCommands } from "./commands/search.ts";
import { shellEnvCommands, setBuiltinsRef } from "./commands/shell-env.ts";
import { bashBuiltinCommands } from "./commands/bash-builtins.ts";
import { systemCommands } from "./commands/system.ts";

export const builtins = new Map<string, BuiltinFn>([
  ...fileOpsCommands,
  ...directoryCommands,
  ...textProcessingCommands,
  ...searchCommands,
  ...shellEnvCommands,
  ...bashBuiltinCommands,
  ...systemCommands,
]);

// shell-env needs the builtins ref for `which` and `type`
setBuiltinsRef(builtins);
