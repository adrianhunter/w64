import { FileSystemHandle, kAdapter } from "./FileSystemHandle.ts";
import type { HandleAdapter } from "./FileSystemHandle.ts";

export interface FileAdapter extends HandleAdapter {
    kind: "file";
    getFile(): Promise<File>;
}

export class FileSystemFileHandle extends FileSystemHandle {
    override kind: "file" = "file";

    constructor(adapter: FileAdapter) {
        super(adapter);
    }

    async getFile(): Promise<File> {
        const adapter = this[kAdapter] as FileAdapter;
        return adapter.getFile();
    }
}
