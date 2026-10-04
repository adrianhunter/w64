import { errors, toDOMException } from "../util.ts";
import type { HandleAdapter } from "../FileSystemHandle.ts";
import type { DirectoryAdapter } from "../FileSystemDirectoryHandle.ts";
import type { FileAdapter } from "../FileSystemFileHandle.ts";

const { GONE, MISMATCH, MOD_ERR, DISALLOWED, NO_MOD } = errors;

export class FileHandle implements FileAdapter, HandleAdapter {
    _file: File;
    name: string;
    kind = "file" as const;
    _deleted = false;
    writable: boolean;
    readable = true;
    _parent: FolderHandle | null;
    _openWritables = 0;

    constructor(
        name = "",
        file: File = new File([], name),
        writable = true,
        parent: FolderHandle | null = null,
    ) {
        this._file = file;
        this.name = name;
        this.writable = writable;
        this._parent = parent;
    }

    async getFile(): Promise<File> {
        if (this._deleted) throw toDOMException(GONE);
        return this._file;
    }

    async isSameEntry(other: HandleAdapter): Promise<boolean> {
        if (this === (other as unknown as FileHandle)) return true;
        if (this.kind !== other.kind) return false;
        return pathOf(this) === pathOf(other as unknown as FileHandle);
    }

    async move(dest: FolderHandle | null | undefined, newName?: string): Promise<void> {
        if (this._deleted) throw toDOMException(GONE);
        if (this._openWritables > 0) throw toDOMException(NO_MOD);
        if (newName === "") throw new TypeError("Name cannot be empty.");
        if (
            newName !== undefined &&
            (newName.includes("/") || newName.includes("\\") || newName === "." || newName === "..")
        ) {
            throw new TypeError("Name contains invalid characters.");
        }
        const name = newName ?? this.name;
        const target = dest ?? this._parent;
        if (!target) throw toDOMException(GONE);
        if (target.kind !== "directory") throw toDOMException(MISMATCH);
        target._entries[name] = this;
        if (this._parent) {
            delete this._parent._entries[this.name];
        }
        this.name = name;
        this._parent = target;
    }

    async _destroy(): Promise<void> {
        if (this._openWritables > 0) throw toDOMException(NO_MOD);
        this._deleted = true;
    }

    async remove(): Promise<void> {
        if (this._deleted) throw toDOMException(GONE);
        await this._destroy();
        if (this._parent) {
            delete this._parent._entries[this.name];
        }
    }
}

export class FolderHandle implements DirectoryAdapter, HandleAdapter {
    name: string;
    kind = "directory" as const;
    _deleted = false;
    _entries: Record<string, FileHandle | FolderHandle> = {};
    writable: boolean;
    readable = true;
    _parent: FolderHandle | null;

    constructor(name: string, writable = true, parent: FolderHandle | null = null) {
        this.name = name;
        this.writable = writable;
        this._parent = parent;
    }

    async *entries(): AsyncGenerator<[string, FileHandle | FolderHandle]> {
        if (this._deleted) throw toDOMException(GONE);
        for (const entry of Object.entries(this._entries)) {
            yield entry;
        }
    }

    async isSameEntry(other: HandleAdapter): Promise<boolean> {
        if (this === (other as unknown as FolderHandle)) return true;
        if (this.kind !== other.kind) return false;
        return pathOf(this) === pathOf(other as unknown as FolderHandle);
    }

    async getDirectoryHandle(
        name: string,
        opts: { create: boolean },
    ): Promise<FolderHandle> {
        if (this._deleted) throw toDOMException(GONE);
        const entry = this._entries[name];
        if (entry) {
            if (entry.kind === "file") throw toDOMException(MISMATCH);
            return entry;
        }
        if (!opts.create) throw toDOMException(GONE);
        const folder = new FolderHandle(name, true, this);
        this._entries[name] = folder;
        return folder;
    }

    async getFileHandle(
        name: string,
        opts: { create: boolean },
    ): Promise<FileHandle> {
        const entry = this._entries[name];
        if (entry && entry.kind === "file") return entry;
        if (entry) throw toDOMException(MISMATCH);
        if (!opts.create) throw toDOMException(GONE);
        const file = new FileHandle(name, new File([], name, { lastModified: Date.now() }), true, this);
        this._entries[name] = file;
        return file;
    }

    async removeEntry(name: string, opts: { recursive: boolean }): Promise<void> {
        const entry = this._entries[name];
        if (!entry) throw toDOMException(GONE);
        await destroy(entry, opts.recursive);
        delete this._entries[name];
    }

    async _destroy(recursive: boolean): Promise<void> {
        await destroy(this, recursive);
    }

    async remove(options: { recursive?: boolean } = {}): Promise<void> {
        if (this._deleted) throw toDOMException(GONE);
        if (!this._parent) {
            for (const name of Object.keys(this._entries)) {
                await this.removeEntry(name, { recursive: true });
            }
            return;
        }
        if (!options.recursive && Object.keys(this._entries).length > 0) {
            throw toDOMException(MOD_ERR);
        }
        await destroy(this, Boolean(options.recursive));
    }
}

async function destroy(handle: FileHandle | FolderHandle, recursive: boolean): Promise<void> {
    if (hasOpenWritables(handle)) throw toDOMException(NO_MOD);
    if (handle.kind === "file") {
        handle._deleted = true;
        return;
    }
    for (const entry of Object.values(handle._entries)) {
        if (!recursive) throw toDOMException(MOD_ERR);
        await destroy(entry, recursive);
    }
    handle._entries = {};
    handle._deleted = true;
    if (handle._parent) {
        delete handle._parent._entries[handle.name];
    }
}

function hasOpenWritables(handle: FileHandle | FolderHandle): boolean {
    if (handle.kind === "file") return handle._openWritables > 0;
    for (const entry of Object.values(handle._entries)) {
        if (hasOpenWritables(entry)) return true;
    }
    return false;
}

function pathOf(handle: FileHandle | FolderHandle): string {
    const parts: string[] = [];
    let current: FileHandle | FolderHandle | null = handle;
    while (current) {
        parts.unshift(current.name);
        current = current._parent;
    }
    return parts.join("/");
}

void DISALLOWED;

export default (): FolderHandle => new FolderHandle("");
