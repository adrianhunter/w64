export const kAdapter: unique symbol = Symbol("adapter");

export interface HandleAdapter {
    kind: "file" | "directory";
    name: string;
    writable?: boolean;
    queryPermission?(descriptor: { mode: string }): Promise<string>;
    requestPermission?(descriptor: { mode: string }): Promise<string>;
    getUniqueId?(): Promise<string>;
    remove(options?: { recursive?: boolean }): Promise<void>;
    isSameEntry(other: HandleAdapter): Promise<boolean> | boolean;
    _uniqueId?: string;
}

export interface FileSystemHandlePermissionDescriptor {
    mode?: "read" | "readwrite";
}

export class FileSystemHandle {
    [kAdapter]: HandleAdapter;
    kind: "file" | "directory";
    name: string;

    constructor(adapter: HandleAdapter) {
        this.kind = adapter.kind;
        this.name = adapter.name;
        this[kAdapter] = adapter;
    }

    async queryPermission(descriptor: FileSystemHandlePermissionDescriptor = {}): Promise<string> {
        const mode = descriptor.mode ?? "read";
        const handle = this[kAdapter];
        if (handle.queryPermission) {
            return handle.queryPermission({ mode });
        }
        if (mode === "read") {
            return "granted";
        }
        if (mode === "readwrite") {
            return handle.writable ? "granted" : "denied";
        }
        throw new TypeError(`Mode ${mode} must be 'read' or 'readwrite'`);
    }

    async requestPermission(
        descriptor: FileSystemHandlePermissionDescriptor = {},
    ): Promise<string> {
        const mode = descriptor.mode ?? "read";
        const handle = this[kAdapter];
        if (handle.requestPermission) {
            return handle.requestPermission({ mode });
        }
        if (mode === "read") {
            return "granted";
        }
        if (mode === "readwrite") {
            return handle.writable ? "granted" : "denied";
        }
        throw new TypeError(`Mode ${mode} must be 'read' or 'readwrite'`);
    }

    async remove(options: { recursive?: boolean } = {}): Promise<void> {
        await this[kAdapter].remove(options);
    }

    async getUniqueId(): Promise<string> {
        const adapter = this[kAdapter];
        if (adapter.getUniqueId) {
            return adapter.getUniqueId();
        }
        if (!adapter._uniqueId) {
            adapter._uniqueId = crypto.randomUUID();
        }
        return adapter._uniqueId;
    }

    async isSameEntry(other: FileSystemHandle): Promise<boolean> {
        if (this === other) return true;
        if (other === null || typeof other !== "object" || this.kind !== other.kind) {
            return false;
        }
        return Boolean(await this[kAdapter].isSameEntry(other[kAdapter]));
    }
}
