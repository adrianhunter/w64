// shared types for the script engine and its execution modes

import type { MemoryVolume } from './memory-volume.ts';

export interface EngineConfig {
  cwd?: string | undefined;
  env?: Record<string, string> | undefined;
  onConsole?: ((method: string, args: unknown[]) => void) | undefined;
  onStdout?: ((data: string) => void) | undefined;
  onStderr?: ((data: string) => void) | undefined;
}

export interface LoadedModule {
  id: string;
  filename: string;
  exports: unknown;
  loaded: boolean;
  children: LoadedModule[];
  paths: string[];
}

export interface ExecutionOutcome {
  exports: unknown;
  module: LoadedModule;
}

// async interface implemented by all execution modes (main thread, worker, iframe)
export interface IScriptEngine {
  execute(code: string, filename?: string): Promise<ExecutionOutcome>;
  runFile(filename: string): Promise<ExecutionOutcome>;
  clearCache(): void;
  getVolume?(): MemoryVolume;
  terminate?(): void;
}

export interface SpawnEngineConfig extends EngineConfig {
  // cross-origin sandbox URL for maximum isolation (prevents cookie/storage access)
  sandboxUrl?: string;

  // explicitly permit same-origin eval (required when sandboxUrl is not set)
  allowUnsafeEval?: boolean;

  // false (default) = main thread, true = Worker, 'auto' = Worker if available
  useWorker?: boolean | 'auto';
}

// serialized MemoryVolume for transfer across boundaries
export interface VolumeSnapshot {
  entries: VolumeEntry[];
}

export interface VolumeEntry {
  path: string;
  kind: 'file' | 'directory' | 'symlink';
  data?: string | undefined; // base64-encoded
  target?: string | undefined;
  inode?: number | undefined;
  mode?: number | undefined;
  atimeMs?: number | undefined;
  mtimeMs?: number | undefined;
  ctimeMs?: number | undefined;
  nlink?: number | undefined;
  uid?: number | undefined;
  gid?: number | undefined;
  symlinkType?: string | undefined;
}
