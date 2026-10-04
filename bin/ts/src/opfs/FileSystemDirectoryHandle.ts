import { FileSystemHandle, kAdapter } from "./FileSystemHandle.ts";
import type { HandleAdapter } from "./FileSystemHandle.ts";
import { FileSystemFileHandle } from "./FileSystemFileHandle.ts";
import type { FileAdapter } from "./FileSystemFileHandle.ts";

export interface DirectoryAdapter extends HandleAdapter {
    kind: "directory";
    entries(): AsyncIterable<[string, FileAdapter | DirectoryAdapter]>;
    getDirectoryHandle(name: string, options: { create: boolean }): Promise<DirectoryAdapter>;
    getFileHandle(name: string, options: { create: boolean }): Promise<FileAdapter>;
    removeEntry(name: string, options: { recursive: boolean }): Promise<void>;
}

export class FileSystemDirectoryHandle extends FileSystemHandle {
    override kind: "directory" = "directory";

    constructor(adapter: DirectoryAdapter) {
        super(adapter);
    }

    #adapter(): DirectoryAdapter {
        return this[kAdapter] as DirectoryAdapter;
    }

    async getDirectoryHandle(
        name: string,
        options: { create?: boolean } = {},
    ): Promise<FileSystemDirectoryHandle> {
        if (name === "") {
            throw new TypeError("Name can't be an empty string.");
        }
        if (name === "." || name === ".." || name.includes("/") || name.includes("\\")) {
            throw new TypeError("Name contains invalid characters.");
        }
        const handle = await this.#adapter().getDirectoryHandle(name, {
            create: Boolean(options.create),
        });
        return new FileSystemDirectoryHandle(handle);
    }

    async *entries(): AsyncGenerator<[string, FileSystemHandle]> {
        for await (const entry of this.#adapter().entries()) {
            const handle =
                entry[1].kind === "file"
                    ? new FileSystemFileHandle(entry[1])
                    : new FileSystemDirectoryHandle(entry[1]);
            yield [handle.name, handle];
        }
    }

    async getFileHandle(
        name: string,
        options: { create?: boolean } = {},
    ): Promise<FileSystemFileHandle> {
        if (name === "") {
            throw new TypeError("Name can't be an empty string.");
        }
        if (name === "." || name === ".." || name.includes("/") || name.includes("\\")) {
            throw new TypeError("Name contains invalid characters.");
        }
        const handle = await this.#adapter().getFileHandle(name, {
            create: Boolean(options.create),
        });
        return new FileSystemFileHandle(handle);
    }

    async removeEntry(name: string, options: { recursive?: boolean } = {}): Promise<void> {
        if (name === "") {
            throw new TypeError("Name can't be an empty string.");
        }
        if (name === "." || name === ".." || name.includes("/") || name.includes("\\")) {
            throw new TypeError("Name contains invalid characters.");
        }
        return this.#adapter().removeEntry(name, {
            recursive: Boolean(options.recursive),
        });
    }

    async resolve(possibleDescendant: FileSystemHandle): Promise<string[] | null> {
        if (await possibleDescendant.isSameEntry(this)) {
            return [];
        }
        const openSet: { handle: FileSystemDirectoryHandle; path: string[] }[] = [
            { handle: this, path: [] },
        ];
        while (openSet.length > 0) {
            const current = openSet.pop();
            if (current === undefined) break;
            for await (const entry of current.handle.entries()) {
                if (await entry[1].isSameEntry(possibleDescendant)) {
                    return [...current.path, entry[0]];
                }
                if (entry[1] instanceof FileSystemDirectoryHandle) {
                    openSet.push({
                        handle: entry[1],
                        path: [...current.path, entry[0]],
                    });
                }
            }
        }
        return null;
    }

    async *keys(): AsyncGenerator<string> {
        for await (const [name] of this.#adapter().entries()) {
            yield name;
        }
    }

    async *values(): AsyncGenerator<FileSystemHandle> {
        for await (const [, entry] of this) {
            yield entry;
        }
    }

    [Symbol.asyncIterator](): AsyncGenerator<[string, FileSystemHandle]> {
        return this.entries();
    }
}
