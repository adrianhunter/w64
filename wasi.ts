import WASI, { WASIProcExit } from "./wasi/wasi_fns.ts";
export { WASI, WASIProcExit };

export { Fd, Inode } from "./wasi/fd.ts";
export {
  File,
  Directory,
  OpenFile,
  OpenDirectory,
  PreopenDirectory,
  ConsoleStdout,
} from "./wasi/fs_mem.ts";
export { SyncOPFSFile, OpenSyncOPFSFile } from "./wasi/fs_opfs.ts";
export { strace } from "./wasi/strace.ts";
export * as wasi from "./wasi/wasi_defs.ts";
