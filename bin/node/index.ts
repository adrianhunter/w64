// nodepod - browser-native Node.js runtime environment

// Default RuntimeHost for the browser entry. The browser-host module also
// publishes `globalThis.__NODEPOD_CREATE_BROWSER_HOST__` so boot still works
// if cross-chunk minify drops `registerDefaultHostFactory(...)`.
import { createBrowserHost } from "./host/browser-host.ts";
import { registerDefaultHostFactory } from "./host/runtime-host.ts";
registerDefaultHostFactory(createBrowserHost);
(globalThis as Record<string, unknown>).__NODEPOD_CREATE_BROWSER_HOST__ =
  createBrowserHost;

export { MemoryVolume } from "./memory-volume.ts";
export type {
  VolumeNode,
  FileStat,
  FileWatchHandle,
  WatchCallback,
  WatchEventKind,
  SystemError,
  VolumeMutation,
  VolumeNodeInfo,
  MountEntry,
  MetaChange,
} from "./memory-volume.ts";
export { ScriptEngine, executeCode } from "./script-engine.ts";
export type { ModuleRecord, EngineOptions, ResolverFn } from "./script-engine.ts";
export { spawnEngine, WorkerSandbox, IframeSandbox, spawnProcessWorkerEngine, ProcessWorkerAdapter } from "./engine-factory.ts";
export type {
  IScriptEngine,
  ExecutionOutcome,
  SpawnEngineConfig,
  EngineConfig,
  VolumeSnapshot,
} from "./engine-types.ts";
export {
  generateSandboxDeployment,
  getSandboxPageHtml,
  getSandboxHostingConfig,
  SANDBOX_DEPLOYMENT_GUIDE,
} from "./isolation-helpers.ts";
export { buildFileSystemBridge } from "./polyfills/fs.ts";
export type { FsBridge } from "./polyfills/fs.ts";
export { buildProcessEnv } from "./polyfills/process.ts";
export type { ProcessObject, ProcessEnvVars } from "./polyfills/process.ts";
export * as path from "./polyfills/path.ts";
export * as http from "./polyfills/http.ts";
export {
  setFetchResponse,
  installFetchHeadersSetCookieParity,
  installNodeFetchClassParity,
} from "./polyfills/fetch-response.ts";
export * as net from "./polyfills/net.ts";
export * as events from "./polyfills/events.ts";
export * as stream from "./polyfills/stream.ts";
export * as url from "./polyfills/url.ts";
export * as querystring from "./polyfills/querystring.ts";
export * as util from "./polyfills/util.ts";
export * as npm from "./packages/installer.ts";
export { DependencyInstaller, install } from "./packages/installer.ts";
export type { InstallFlags, InstallOutcome, WorkspaceInstallOutcome } from "./packages/installer.ts";
export { discoverWorkspaces, readWorkspacePatterns } from "./packages/workspace.ts";
export type { WorkspaceGraph, WorkspacePackage } from "./packages/workspace.ts";
export { RequestProxy, getProxyInstance, resetProxy, NodepodSWSetupError } from "./request-proxy.ts";
export type {
  ProxyOptions,
  ServiceWorkerConfig,
  NodepodSWFrameworkHint,
  PreviewOriginContext,
  PreviewOriginOption,
} from "./request-proxy.ts";
export {
  setProxy as setCorsProxy,
  getProxy as getCorsProxy,
  setAllowedDomains,
} from "./cross-origin.ts";
export * as chokidar from "./polyfills/chokidar.ts";
export * as ws from "./polyfills/ws.ts";
export * as fsevents from "./polyfills/fsevents.ts";
export * as readdirp from "./polyfills/readdirp.ts";
export * as module from "./polyfills/module.ts";
export * as perf_hooks from "./polyfills/perf_hooks.ts";
export * as worker_threads from "./polyfills/worker_threads.ts";
export * as esbuild from "./polyfills/esbuild.ts";
export * as rollup from "./polyfills/rollup.ts";
export * as assert from "./polyfills/assert.ts";

import { MemoryVolume } from "./memory-volume.ts";
import { ScriptEngine, type EngineOptions } from "./script-engine.ts";
import { DependencyInstaller } from "./packages/installer.ts";
import { RequestProxy, getProxyInstance } from "./request-proxy.ts";
// lazy-load child_process to avoid pulling in the shell at module load time
let _shellMod: typeof import("./polyfills/child_process.ts") | null = null;
async function getShellMod() {
  if (!_shellMod) _shellMod = await import("./polyfills/child_process.ts");
  return _shellMod;
}

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface CommandOptions {
  cwd?: string;
  onStdout?: (data: string) => void;
  onStderr?: (data: string) => void;
  signal?: AbortSignal;
}

export interface WorkspaceConfig extends EngineOptions {
  baseUrl?: string;
  onServerReady?: (port: number, url: string) => void;
}

// create a fully-wired workspace (volume + engine + packages + proxy)
export function createWorkspace(config?: WorkspaceConfig): {
  volume: MemoryVolume;
  engine: ScriptEngine;
  packages: DependencyInstaller;
  proxy: RequestProxy;
  execute: (code: string, filename?: string) => { exports: unknown };
  runFile: (filename: string) => { exports: unknown };
  run: (command: string, options?: CommandOptions) => Promise<CommandResult>;
  sendInput: (data: string) => Promise<void>;
  createREPL: () => { eval: (code: string) => unknown };
  on: (event: string, listener: (...args: unknown[]) => void) => void;
} {
  const volume = new MemoryVolume();
  const engine = new ScriptEngine(volume, config);
  const packages = new DependencyInstaller(volume, {
    ...(config?.cwd !== undefined ? { cwd: config.cwd } : {}),
  });
  const proxy = getProxyInstance({
    ...(config?.baseUrl !== undefined ? { baseUrl: config.baseUrl } : {}),
    ...(config?.onServerReady !== undefined
      ? { onServerReady: config.onServerReady }
      : {}),
  });

  // init shell lazily (SDK path uses Nodepod.boot() instead)
  getShellMod().then((mod) =>
    mod.initShellExec(volume, {
      ...(config?.cwd !== undefined ? { cwd: config.cwd } : {}),
    }),
  );

  return {
    volume,
    engine,
    packages,
    proxy,
    execute: (code: string, filename?: string) =>
      engine.execute(code, filename),
    runFile: (filename: string) => engine.runFile(filename),
    run: async (
      command: string,
      runOpts?: CommandOptions,
    ): Promise<CommandResult> => {
      if (runOpts?.signal?.aborted) {
        return { stdout: "", stderr: "", exitCode: 130 };
      }

      const shell = await getShellMod();
      const hasStreaming =
        runOpts?.onStdout || runOpts?.onStderr || runOpts?.signal;
      if (hasStreaming) {
        shell.setStreamingCallbacks({
          onStdout: runOpts?.onStdout,
          onStderr: runOpts?.onStderr,
          signal: runOpts?.signal,
        });
      }

      return new Promise((resolve) => {
        shell.exec(
          command,
          { ...(runOpts?.cwd !== undefined ? { cwd: runOpts.cwd } : {}) },
          (error, stdout, stderr) => {
            if (hasStreaming) shell.clearStreamingCallbacks();
            resolve({
              stdout: String(stdout),
              stderr: String(stderr),
              exitCode: error ? ((error as any).code ?? 1) : 0,
            });
          },
        );
      });
    },
    sendInput: async (data: string) => {
      const shell = await getShellMod();
      shell.sendStdin(data);
    },
    createREPL: () => engine.createREPL(),
    on: (event: string, listener: (...args: unknown[]) => void) => {
      proxy.on(event, listener);
    },
  };
}

export default createWorkspace;

/* ---- SDK (clean public API) ---- */

export { Nodepod } from "./sdk/nodepod.ts";
export { NodepodTerminal } from "./sdk/nodepod-terminal.ts";
export { NodepodProcess } from "./sdk/nodepod-process.ts";
export { NodepodFS } from "./sdk/nodepod-fs.ts";
export { NodepodFSClient, NodepodFSClientError } from "./sdk/nodepod-fs-client.ts";
export {
  WorkspacePersistence,
  createMemoryWorkspaceStore,
  createIndexedDBWorkspaceStore,
  listIndexedDBWorkspaces,
  deleteIndexedDBWorkspace,
} from "./persistence/workspace/index.ts";
export type {
  PersistenceOptions,
  PersistenceStatus,
  PersistenceSavedEvent,
  WorkspaceStore,
  WorkspaceManifest,
  WorkspaceEntry,
  WorkspaceBatch,
  IndexedDBWorkspaceStoreOptions,
  StoredWorkspaceInfo,
} from "./persistence/workspace/index.ts";
export {
  PreviewInspector,
  PreviewInspectorError,
  PreviewNotAttachedError,
  PreviewAgentUnavailableError,
  PreviewInspectionTimeoutError,
  PreviewScreenshotUnavailableError,
} from "./sdk/preview-inspector.ts";
export type {
  NodepodOptions,
  NodepodRequestOptions,
  TerminalOptions,
  TerminalTheme,
  StatResult,
  Snapshot,
  SnapshotOptions,
  SpawnOptions,
  ShellLimits,
  ShellOptions,
  PerformanceStats,
  PerformanceTiming,
} from "./sdk/types.ts";
export type {
  NodepodProfileReport,
  NodepodProfiler,
  ProfileAggregate,
  ProfileCategory,
  ProfileEnvironment,
  ProfileExportFormat,
  ProfileLongTaskSample,
  ProfileMemorySample,
  ProfileSample,
  ProfileSession,
  ProfileSpan,
  ProfileSpanOptions,
  ProfileSummary,
  ProfileWarning,
  ProfilerLevel,
  ProfilerOptions,
  ProfilePathDetail,
} from "./profiling/types.ts";
export {
  ensureRuntimeHost,
  getRuntimeHost,
  setRuntimeHost,
  resetRuntimeHost,
  createBrowserHost,
} from "./host/index.ts";
export type { RuntimeHost, HostWorker, HttpIngress, WorkerSpec } from "./host/index.ts";
export type {
  InspectWaitUntil,
  InspectTarget,
  InspectResult,
  InspectAttachOptions,
  InspectRect,
  InspectConsoleEntry,
  InspectErrorEntry,
  InspectDomNode,
  InspectQueryNode,
  InspectA11yNode,
  InspectA11yViolation,
  InspectScreenshot,
  InspectEvent,
  InspectSnapshot,
} from "./sdk/preview-inspector.ts";
export { MemoryHandler, LRUCache } from "./memory-handler.ts";
export type { MemoryHandlerOptions } from "./memory-handler.ts";

/* ---- Threading / Worker Infrastructure ---- */

export { ProcessManager } from "./threading/process-manager.ts";
export { ProcessHandle } from "./threading/process-handle.ts";
export type { ProcessState } from "./threading/process-handle.ts";
export { VFSBridge } from "./threading/vfs-bridge.ts";
export { WorkerVFS } from "./threading/worker-vfs.ts";
export { SyncChannelController, SyncChannelWorker } from "./threading/sync-channel.ts";
export { SharedVFSController, SharedVFSReader, isSharedArrayBufferAvailable } from "./threading/shared-vfs.ts";
export type { SharedVFSStat } from "./threading/shared-vfs.ts";
export { createProcessContext, getActiveContext, setActiveContext } from "./threading/process-context.ts";
export type { ProcessContext, ProcessWriter, ProcessReader, OpenFileEntry } from "./threading/process-context.ts";
export type {
  VFSBinarySnapshot,
  VFSSnapshotEntry,
  SpawnConfig,
  ProcessInfo,
  MainToWorkerMessage,
  WorkerToMainMessage,
} from "./threading/worker-protocol.ts";
