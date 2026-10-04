/**
 * `@r1ck404/nodepod/headless` — Node/Bun host adapter for isomorphic headless mode.
 *
 * Installs a `worker_threads` RuntimeHost (plus local HTTP ingress) before
 * re-exporting the public SDK. Prefer this entry for agents, CI, and CLIs.
 *
 * @example
 * ```ts
 * import { Nodepod } from "@r1ck404/nodepod/headless";
 * const pod = await Nodepod.boot();
 * await pod.fs.writeFile("/hello.txt", "hi");
 * const res = await pod.request(3000, { path: "/" });
 * ```
 */

import { setRuntimeHost } from "./host/runtime-host.ts";
import { createNodeHost } from "./host/node/node-host.ts";

setRuntimeHost(createNodeHost());

export { setRuntimeHost, getRuntimeHost, resetRuntimeHost } from "./host/index.ts";
export { createNodeHost } from "./host/node/node-host.ts";
export type { NodeHostOptions } from "./host/node/node-host.ts";
export { createLocalHttpIngress } from "./host/node/local-http-ingress.ts";
export { openFsSnapshotCache } from "./host/node/fs-snapshot-cache.ts";
export { createFsWorkspaceStore } from "./host/node/fs-workspace-store.ts";

export { Nodepod } from "./sdk/nodepod.ts";
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
export { MemoryVolume } from "./memory-volume.ts";
export type { VolumeMutation, VolumeNodeInfo, MountEntry, MetaChange } from "./memory-volume.ts";
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
export type {
  NodepodOptions,
  NodepodRequestOptions,
  Snapshot,
  SpawnOptions,
  ShellLimits,
  ShellOptions,
  StatResult,
  SnapshotOptions,
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
