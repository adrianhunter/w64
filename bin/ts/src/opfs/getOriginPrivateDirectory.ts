import { FileSystemDirectoryHandle } from "./FileSystemDirectoryHandle.ts";
import type { DirectoryAdapter } from "./FileSystemDirectoryHandle.ts";

/** Structural subset of the File System Access API we rely on. */
export interface FileHandleLike {
    kind: "file";
    name: string;
    getFile(): Promise<File>;
}

export interface DirectoryHandleLike {
    kind: "directory";
    name: string;
    getDirectoryHandle(
        name: string,
        options?: { create?: boolean },
    ): Promise<DirectoryHandleLike>;
    getFileHandle(name: string, options?: { create?: boolean }): Promise<FileHandleLike>;
}

export type DriverFactory = (
    options: Record<string, unknown>,
) => DirectoryAdapter | Promise<DirectoryAdapter>;

export type Driver = DriverFactory | { default: DriverFactory };

/**
 * Resolve an OPFS root.
 *
 * - With no driver, uses `navigator.storage.getDirectory()` when available
 *   (browsers/workers); otherwise `globalThis.getOriginPrivateDirectory()`
 *   (Deno). Throws if neither exists.
 * - With a driver (usually a dynamically imported adapter module such as
 *   `adapters/memory.ts`), wraps the adapter in a `FileSystemDirectoryHandle`.
 */
export async function getOriginPrivateDirectory(
    driver?: unknown,
    options: Record<string, unknown> = {},
): Promise<DirectoryHandleLike> {
    if (driver === undefined) {
        const nav = globalThis as {
            navigator?: { storage?: { getDirectory?: () => Promise<DirectoryHandleLike> } };
        };
        const getDirectory = nav.navigator?.storage?.getDirectory;
        if (getDirectory) {
            return await getDirectory.call(nav.navigator?.storage);
        }
        const globalDriver = globalThis as {
            getOriginPrivateDirectory?: () => Promise<DirectoryHandleLike>;
        };
        if (globalDriver.getOriginPrivateDirectory) {
            return await globalDriver.getOriginPrivateDirectory();
        }
        throw new Error(
            "No OPFS available: navigator.storage.getDirectory is missing. " +
                "Pass an adapter module (e.g. getOriginPrivateDirectory(import('./adapters/memory.ts')))",
        );
    }

    const resolved = (await driver) as Driver | undefined;
    const factory =
        typeof resolved === "function"
            ? resolved
            : resolved?.default;
    if (typeof factory !== "function") {
        throw new TypeError("The provided OPFS driver is not a function");
    }
    const adapter = await factory(options);
    return new FileSystemDirectoryHandle(adapter);
}
