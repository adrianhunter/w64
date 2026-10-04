// Minimal Bun shims built on top of the prelude's node:* module registry, so
// gpuix's Bun examples can run inside the QuickJS guest.

const g = globalThis as unknown as Record<string, any>;

const modules = ((g.__qjs_modules as Record<string, any>) ??= {});
const get = (name: string): any => modules[name] ?? modules["node:" + name];
const textEncoder = new TextEncoder();

function isBlobLike(value: any): value is Blob {
  return value !== null && typeof value === "object" &&
    typeof value.arrayBuffer === "function" && typeof value.text === "function";
}

function pathLike(value: any): string {
  if (typeof value === "string") return value;
  if (value instanceof URL) return fileURLToPath(value);
  if (value && typeof value.name === "string") return value.name;
  return String(value);
}

function fileURLToPath(url: URL): string {
  const urlMod = get("url");
  try {
    return urlMod.fileURLToPath(url.href);
  } catch {
    return decodeURIComponent(url.pathname);
  }
}

class BunFile {
  name: string;
  type = "application/octet-stream";
  private readonly fs: any;
  private readonly pathMod: any;

  constructor(path: string) {
    this.name = path;
    this.fs = get("fs");
    this.pathMod = get("path");
  }

  get size(): number {
    try {
      return this.fs.statSync(this.name).size;
    } catch {
      return 0;
    }
  }

  exists(): boolean {
    try {
      this.fs.accessSync(this.name);
      return true;
    } catch {
      return false;
    }
  }

  async text(): Promise<string> {
    return this.fs.readFileSync(this.name, "utf8") as string;
  }

  async json(): Promise<unknown> {
    return JSON.parse(await this.text());
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    const bytes = this.fs.readFileSync(this.name) as Uint8Array;
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  }

  async bytes(): Promise<Uint8Array> {
    return new Uint8Array(this.fs.readFileSync(this.name) as Uint8Array);
  }

  stream(): ReadableStream<Uint8Array> {
    const self = this;
    return new ReadableStream({
      async start(controller) {
        controller.enqueue(await self.bytes());
        controller.close();
      },
    });
  }

  async writer(): Promise<{ write(chunk: Uint8Array | string): Promise<number>; end(): void }> {
    const self = this;
    return {
      async write(chunk: Uint8Array | string): Promise<number> {
        await Bun.write(self.name, chunk);
        return typeof chunk === "string" ? textEncoder.encode(chunk).length : chunk.length;
      },
      end() {},
    };
  }
}

function toBytes(data: any): Uint8Array | string {
  if (typeof data === "string") return data;
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  if (isBlobLike(data)) {
    throw new TypeError("Bun.write(Blob) is not supported synchronously");
  }
  return String(data);
}

async function write(destination: any, data: any): Promise<number> {
  const fs = get("fs");
  const target = pathLike(destination);
  const payload = typeof data === "string" || data instanceof Uint8Array ||
      data instanceof ArrayBuffer || ArrayBuffer.isView(data)
    ? toBytes(data)
    : isBlobLike(data)
      ? new Uint8Array(await data.arrayBuffer())
      : toBytes(data);
  try {
    fs.mkdirSync(get("path").dirname(target), { recursive: true });
  } catch {
    // parent already exists
  }
  fs.writeFileSync(target, payload);
  return typeof payload === "string"
    ? textEncoder.encode(payload).length
    : (payload as Uint8Array).length;
}

function readStreamToBytes(stream: any): Promise<Uint8Array> {
  if (stream && typeof stream.arrayBuffer === "function") {
    return stream.arrayBuffer().then((buf: ArrayBuffer) => new Uint8Array(buf));
  }
  return Promise.reject(new TypeError("not a readable stream"));
}

const Bun = {
  version: "1.2.0",
  revision: "qjs",
  env: g.process?.env ?? {},
  argv: g.process?.argv ?? ["bun"],
  main: (g.process?.argv ?? [])[1] ?? "",
  isStandaloneExecutable: false,
  embeddedFiles: [] as unknown[],

  file(path: any): BunFile {
    return new BunFile(pathLike(path));
  },

  write,

  async readableStreamToText(stream: any): Promise<string> {
    return new TextDecoder().decode(await readStreamToBytes(stream));
  },

  async readableStreamToArrayBuffer(stream: any): Promise<ArrayBuffer> {
    const bytes = await readStreamToBytes(stream);
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  },

  async readableStreamToBytes(stream: any): Promise<Uint8Array> {
    return readStreamToBytes(stream);
  },

  async readableStreamToJSON(stream: any): Promise<unknown> {
    return JSON.parse(new TextDecoder().decode(await readStreamToBytes(stream)));
  },

  async readableStreamToBlob(stream: any): Promise<Blob> {
    return new Blob([await readStreamToBytes(stream)]);
  },

  sleep(ms: number): Promise<void> {
    const timers = get("timers");
    return new Promise((resolve) => timers.setTimeout(resolve, ms));
  },

  gc(): void {
    const gcFn = g.__qjsGc as (() => void) | undefined;
    if (typeof gcFn === "function") gcFn();
  },

  nanoseconds(): number {
    const perf = g.performance;
    return (typeof perf?.now === "function" ? perf.now() : Date.now()) * 1e6;
  },

  inspect(value: unknown, options?: unknown): string {
    return get("util").inspect(value, options);
  },

  deepEquals(a: unknown, b: unknown): boolean {
    return get("util").isDeepStrictEqual(a, b);
  },

  which(command: string): string | null {
    const fs = get("fs");
    const pathMod = get("path");
    const pathEnv = String(g.process?.env?.PATH ?? "");
    for (const dir of pathEnv.split(pathMod.delimiter)) {
      if (!dir) continue;
      const candidate = pathMod.join(dir, command);
      try {
        fs.accessSync(candidate, 1);
        return candidate;
      } catch {
        // keep looking
      }
    }
    return null;
  },

  spawn(): never {
    throw new Error("Bun.spawn is not supported in this runtime");
  },

  spawnSync(): never {
    throw new Error("Bun.spawnSync is not supported in this runtime");
  },

  $(): never {
    throw new Error("Bun.$ is not supported in this runtime");
  },

  password: {
    async hash(password: string): Promise<string> {
      const crypto = get("crypto");
      return crypto.createHash("sha256").update(password).digest("hex");
    },
    async verify(password: string, hash: string): Promise<boolean> {
      return (await Bun.password.hash(password)) === hash;
    },
  },

  hash: {
    wyhash(data: string | Uint8Array): number {
      const crypto = get("crypto");
      const hex = crypto.createHash("sha256").update(data).digest("hex");
      return Number.parseInt(hex.slice(0, 8), 16);
    },
  },

  randomUUIDv7(): string {
    return get("crypto").randomUUID();
  },

  serve(options: any): any {
    const http = get("http");
    const server = http.createServer((request: any, response: any) => {
      Promise.resolve(options.fetch(request, server)).then((result: any) => {
        if (result instanceof Response) {
          response.writeHead(result.status, Object.fromEntries(result.headers));
          result.arrayBuffer().then((buf: ArrayBuffer) => response.end(new Uint8Array(buf)));
        }
      });
    });
    if (options.port !== undefined) server.listen(options.port, options.hostname);
    return server;
  },
};

g.Bun = Bun;
