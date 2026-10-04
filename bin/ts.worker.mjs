// ../node/polyfills/wasi.ts
var ERRNO_SUCCESS = 0;
var ERRNO_BADF = 8;
var ERRNO_EXIST = 20;
var ERRNO_FAULT = 21;
var ERRNO_INVAL = 28;
var ERRNO_IO = 29;
var ERRNO_ISDIR = 31;
var ERRNO_LOOP = 32;
var ERRNO_NOENT = 44;
var ERRNO_NOSYS = 52;
var ERRNO_NOTDIR = 54;
var ERRNO_NOTSUP = 58;
var ERRNO_OVERFLOW = 61;
var ERRNO_SPIPE = 70;
var ERRNO_NOTCAPABLE = 76;
var CLOCKID_REALTIME = 0;
var CLOCKID_MONOTONIC = 1;
var CLOCKID_PROCESS_CPUTIME_ID = 2;
var CLOCKID_THREAD_CPUTIME_ID = 3;
var FILETYPE_UNKNOWN = 0;
var FILETYPE_CHARACTER_DEVICE = 2;
var FILETYPE_DIRECTORY = 3;
var FILETYPE_REGULAR_FILE = 4;
var FILETYPE_SYMBOLIC_LINK = 7;
var FDFLAGS_APPEND = 1;
var FDFLAGS_DSYNC = 2;
var FDFLAGS_NONBLOCK = 4;
var FDFLAGS_RSYNC = 8;
var FDFLAGS_SYNC = 16;
var FDFLAGS_MASK = FDFLAGS_APPEND | FDFLAGS_DSYNC | FDFLAGS_NONBLOCK | FDFLAGS_RSYNC | FDFLAGS_SYNC;
var FSTFLAGS_ATIM = 1;
var FSTFLAGS_ATIM_NOW = 2;
var FSTFLAGS_MTIM = 4;
var FSTFLAGS_MTIM_NOW = 8;
var OFLAGS_CREAT = 1;
var OFLAGS_DIRECTORY = 2;
var OFLAGS_EXCL = 4;
var OFLAGS_TRUNC = 8;
var LOOKUPFLAGS_SYMLINK_FOLLOW = 1;
var WHENCE_SET = 0;
var WHENCE_CUR = 1;
var WHENCE_END = 2;
var PREOPENTYPE_DIR = 0;
var RIGHTS_FD_READ = 0x0000000000000002n;
var RIGHTS_FD_DATASYNC = 0x0000000000000001n;
var RIGHTS_FD_WRITE = 0x0000000000000040n;
var RIGHTS_FD_SEEK = 0x0000000000000004n;
var RIGHTS_FD_FDSTAT_SET_FLAGS = 0x0000000000000008n;
var RIGHTS_FD_SYNC = 0x0000000000000010n;
var RIGHTS_FD_TELL = 0x0000000000000020n;
var RIGHTS_FD_ADVISE = 0x0000000000000080n;
var RIGHTS_FD_ALLOCATE = 0x0000000000000100n;
var RIGHTS_FD_READDIR = 0x0000000000004000n;
var RIGHTS_PATH_OPEN = 0x0000000000002000n;
var RIGHTS_PATH_CREATE_DIRECTORY = 0x0000000000000200n;
var RIGHTS_PATH_CREATE_FILE = 0x0000000000000400n;
var RIGHTS_PATH_LINK_SOURCE = 0x0000000000000800n;
var RIGHTS_PATH_LINK_TARGET = 0x0000000000001000n;
var RIGHTS_PATH_UNLINK_FILE = 0x0000000004000000n;
var RIGHTS_PATH_REMOVE_DIRECTORY = 0x0000000002000000n;
var RIGHTS_PATH_RENAME_SOURCE = 0x0000000000010000n;
var RIGHTS_PATH_RENAME_TARGET = 0x0000000000020000n;
var RIGHTS_PATH_FILESTAT_GET = 0x0000000000040000n;
var RIGHTS_PATH_FILESTAT_SET_SIZE = 0x0000000000080000n;
var RIGHTS_PATH_FILESTAT_SET_TIMES = 0x0000000000100000n;
var RIGHTS_PATH_SYMLINK = 0x0000000001000000n;
var RIGHTS_PATH_READLINK = 0x0000000000008000n;
var RIGHTS_FD_FILESTAT_GET = 0x0000000000200000n;
var RIGHTS_FD_FILESTAT_SET_SIZE = 0x0000000000400000n;
var RIGHTS_FD_FILESTAT_SET_TIMES = 0x0000000000800000n;
var RIGHTS_POLL_FD_READWRITE = 0x0000000008000000n;
var RIGHTS_ALL = 0x3fffffffn;
var RIGHTS_DIR_BASE = RIGHTS_FD_READ | RIGHTS_FD_READDIR | RIGHTS_PATH_OPEN | RIGHTS_PATH_CREATE_DIRECTORY | RIGHTS_PATH_CREATE_FILE | RIGHTS_PATH_LINK_SOURCE | RIGHTS_PATH_LINK_TARGET | RIGHTS_PATH_UNLINK_FILE | RIGHTS_PATH_REMOVE_DIRECTORY | RIGHTS_PATH_RENAME_SOURCE | RIGHTS_PATH_RENAME_TARGET | RIGHTS_PATH_FILESTAT_GET | RIGHTS_PATH_FILESTAT_SET_SIZE | RIGHTS_PATH_FILESTAT_SET_TIMES | RIGHTS_PATH_SYMLINK | RIGHTS_PATH_READLINK | RIGHTS_FD_FILESTAT_GET | RIGHTS_FD_FILESTAT_SET_TIMES | RIGHTS_POLL_FD_READWRITE;
var RIGHTS_FILE_BASE = RIGHTS_FD_READ | RIGHTS_FD_WRITE | RIGHTS_FD_SEEK | RIGHTS_FD_TELL | RIGHTS_FD_DATASYNC | RIGHTS_FD_SYNC | RIGHTS_FD_ADVISE | RIGHTS_FD_ALLOCATE | RIGHTS_FD_FDSTAT_SET_FLAGS | RIGHTS_FD_FILESTAT_GET | RIGHTS_FD_FILESTAT_SET_SIZE | RIGHTS_FD_FILESTAT_SET_TIMES | RIGHTS_POLL_FD_READWRITE;
var EVENTTYPE_CLOCK = 0;
var EVENTTYPE_FD_READ = 1;
var EVENTTYPE_FD_WRITE = 2;
var SUBCLOCKFLAGS_SUBSCRIPTION_CLOCK_ABSTIME = 1;
var FdKind = {
  Stdin: 0,
  Stdout: 1,
  Stderr: 2,
  PreopenDir: 3,
  Directory: 4,
  File: 5
};
var ExitStatus = class extends Error {
  code;
  constructor(code) {
    super(`WASI exit(${code})`);
    this.code = code;
  }
};
var _wasiSyscallErrorLogged = false;
function syscall(target) {
  return function(...args) {
    try {
      return target.apply(this, args);
    } catch (err) {
      if (err instanceof ExitStatus) throw err;
      if (err instanceof RangeError) return ERRNO_FAULT;
      if (!_wasiSyscallErrorLogged && err?.message?.includes("Memory not available")) {
        _wasiSyscallErrorLogged = true;
        console.error("[WASI] Syscall failed \u2014 memory not available:", err.message);
        throw err;
      }
      const code = err?.code;
      const errno = {
        EACCES: 2,
        EADDRINUSE: 3,
        EADDRNOTAVAIL: 4,
        EAFNOSUPPORT: 5,
        EAGAIN: 6,
        EWOULDBLOCK: 6,
        EALREADY: 7,
        EBADF: 8,
        EBADMSG: 9,
        EBUSY: 10,
        ECANCELED: 11,
        ECHILD: 12,
        ECONNABORTED: 13,
        ECONNREFUSED: 14,
        ECONNRESET: 15,
        EDEADLK: 16,
        EDESTADDRREQ: 17,
        EDOM: 18,
        EDQUOT: 19,
        EEXIST: 20,
        EFAULT: 21,
        EHOSTUNREACH: 23,
        EIDRM: 24,
        EILSEQ: 25,
        EINPROGRESS: 26,
        EINTR: 27,
        EINVAL: 28,
        EIO: 29,
        EISDIR: 31,
        ELOOP: 32,
        EMFILE: 33,
        EMLINK: 34,
        EMSGSIZE: 35,
        EMULTIHOP: 36,
        ENAMETOOLONG: 37,
        ENETDOWN: 38,
        ENETRESET: 39,
        ENETUNREACH: 40,
        ENFILE: 41,
        ENOBUFS: 42,
        ENODEV: 43,
        ENOENT: 44,
        ENOLCK: 45,
        ENOLINK: 47,
        ENOMEM: 48,
        ENOMSG: 49,
        ENOPROTOOPT: 50,
        ENOSPC: 51,
        ENOSYS: 52,
        ENOTCONN: 53,
        ENOTDIR: 54,
        ENOTEMPTY: 55,
        ENOTRECOVERABLE: 56,
        ENOTSOCK: 57,
        ENOTSUP: 58,
        EOPNOTSUPP: 58,
        ENOTTY: 59,
        ENXIO: 60,
        EOVERFLOW: 61,
        EOWNERDEAD: 62,
        EPERM: 63,
        EPIPE: 64,
        EPROTO: 65,
        EPROTONOSUPPORT: 66,
        EPROTOTYPE: 67,
        ERANGE: 68,
        EROFS: 69,
        ESPIPE: 70,
        ESRCH: 71,
        ESTALE: 72,
        ETIMEDOUT: 73,
        ETXTBSY: 74,
        EXDEV: 75,
        ENOTCAPABLE: 76
      }[code];
      if (errno !== void 0) return errno;
      if (!_wasiSyscallErrorLogged) {
        _wasiSyscallErrorLogged = true;
        console.error("[WASI] First syscall error:", err?.message || err, "code:", code);
      }
      return ERRNO_IO;
    }
  };
}
function pathError(code, message2) {
  return Object.assign(new Error(message2), { code });
}
function joinPath(base, rel) {
  if (rel.startsWith("/")) {
    throw pathError("ENOTCAPABLE", `absolute WASI path is outside the directory capability: ${rel}`);
  }
  const root = normalizePath(base);
  const rootParts = root.split("/").filter(Boolean);
  const out = [...rootParts];
  for (const seg of rel.split("/")) {
    if (seg === "." || seg === "") continue;
    if (seg === "..") {
      if (out.length === rootParts.length) {
        throw pathError("ENOTCAPABLE", `WASI path escapes its directory capability: ${rel}`);
      }
      out.pop();
      continue;
    }
    if (seg.includes("\0")) throw pathError("EINVAL", "WASI paths cannot contain NUL bytes");
    out.push(seg);
  }
  return "/" + out.join("/");
}
function normalizePath(p) {
  const parts = p.split("/");
  const out = [];
  for (const seg of parts) {
    if (seg === "." || seg === "") continue;
    if (seg === "..") {
      out.pop();
      continue;
    }
    out.push(seg);
  }
  return "/" + out.join("/");
}
var encoder = new TextEncoder();
var decoder = new TextDecoder();
var decodeFromMemory = (buffer, ptr, len) => {
  if (len === 0) return "";
  const src = new Uint8Array(buffer, ptr, len);
  if (typeof SharedArrayBuffer !== "undefined" && buffer instanceof SharedArrayBuffer) {
    const copy = new Uint8Array(len);
    copy.set(src);
    return decoder.decode(copy);
  }
  return decoder.decode(src);
};
var WASI = function WASI2(options) {
  if (!(this instanceof WASI2)) {
    throw new TypeError(
      "Class constructor WASI cannot be invoked without 'new'"
    );
  }
  if (!options || typeof options.version !== "string") {
    throw new TypeError('The "options.version" property must be of type string');
  }
  if (options.version !== "preview1" && options.version !== "unstable") {
    throw new TypeError(`The property 'options.version' unsupported WASI version. Received '${options.version}'`);
  }
  const opts = options;
  const version = opts.version;
  const args = opts.args ?? [];
  const envVars = opts.env ?? {};
  const preopens = opts.preopens ?? {};
  const returnOnExit = opts.returnOnExit ?? true;
  const fs = opts.fs ?? null;
  for (const [name, value] of [["stdin", opts.stdin ?? 0], ["stdout", opts.stdout ?? 1], ["stderr", opts.stderr ?? 2]]) {
    if (!Number.isInteger(value) || value < 0) throw new TypeError(`The "options.${name}" property must be a non-negative integer`);
  }
  const fds = /* @__PURE__ */ new Map();
  let nextFd = 3;
  fds.set(0, { kind: FdKind.Stdin, path: "", rights: RIGHTS_FD_READ | RIGHTS_FD_FILESTAT_GET | RIGHTS_POLL_FD_READWRITE, hostFd: opts.stdin ?? 0 });
  fds.set(1, { kind: FdKind.Stdout, path: "", rights: RIGHTS_FD_WRITE | RIGHTS_FD_FILESTAT_GET | RIGHTS_POLL_FD_READWRITE, hostFd: opts.stdout ?? 1 });
  fds.set(2, { kind: FdKind.Stderr, path: "", rights: RIGHTS_FD_WRITE | RIGHTS_FD_FILESTAT_GET | RIGHTS_POLL_FD_READWRITE, hostFd: opts.stderr ?? 2 });
  const preopenEntries = [];
  for (const [virtualPath, realPath] of Object.entries(preopens)) {
    const fd = nextFd++;
    fds.set(fd, {
      kind: FdKind.PreopenDir,
      path: realPath,
      rights: RIGHTS_DIR_BASE,
      inheritingRights: RIGHTS_ALL
    });
    preopenEntries.push({ fd, virtualPath, realPath });
  }
  let memory = null;
  let instance = null;
  let bindingsFinalized = false;
  const getMemory = () => {
    if (memory) return memory;
    if (instance) {
      memory = instance.exports?.memory;
      if (memory) return memory;
    }
    console.error("[WASI] Memory not available \u2014 initialize() may not have been called yet");
    throw new Error("WASI: WebAssembly.Memory not available \u2014 call initialize() or setMemory() first");
  };
  const view = () => new DataView(getMemory().buffer);
  const bytes2 = () => new Uint8Array(getMemory().buffer);
  let stdoutBuf = "";
  let stderrBuf = "";
  const stdoutDecoder = new TextDecoder();
  const stderrDecoder = new TextDecoder();
  const flushLine = (fd, buf) => {
    const nl = buf.lastIndexOf("\n");
    if (nl < 0) return buf;
    const lines = buf.substring(0, nl);
    if (fd === 1) console.log(lines);
    else console.error(lines);
    return buf.substring(nl + 1);
  };
  const readString = (ptr, len) => {
    return decodeFromMemory(getMemory().buffer, ptr, len);
  };
  const writeString = (ptr, str) => {
    const encoded = encoder.encode(str + "\0");
    bytes2().set(encoded, ptr);
    return encoded.length;
  };
  const requireFd = (fd) => fds.get(fd) ?? ERRNO_BADF;
  const requireRight = (entry, right) => (entry.rights & right) === right ? ERRNO_SUCCESS : ERRNO_NOTCAPABLE;
  const requireDirectory = (fd, right) => {
    const entry = requireFd(fd);
    if (typeof entry === "number") return entry;
    if (entry.kind !== FdKind.PreopenDir && entry.kind !== FdKind.Directory) return ERRNO_NOTDIR;
    const allowed = requireRight(entry, right);
    return allowed === ERRNO_SUCCESS ? entry : allowed;
  };
  const requireExistingParent = (path) => {
    if (!fs) return;
    const parent = normalizePath(path.slice(0, path.lastIndexOf("/")) || "/");
    const stat = fs.statSync(parent);
    if (!stat.isDirectory()) throw pathError("ENOTDIR", `not a directory: ${parent}`);
  };
  const resolveCapabilityPath = (directory, relativePath, followFinal = true, allowMissingFinal = false, depth2 = 0) => {
    const root = normalizePath(directory.path);
    const lexical = joinPath(root, relativePath);
    if (!fs?.lstatSync || !fs.readlinkSync) return lexical;
    if (depth2 >= 40) throw pathError("ELOOP", `too many symbolic links: ${relativePath}`);
    const relative = lexical === root ? "" : lexical.slice(root.length + (root === "/" ? 0 : 1));
    const segments = relative.split("/").filter(Boolean);
    let current = root;
    for (let index = 0; index < segments.length; index++) {
      current = current === "/" ? `/${segments[index]}` : `${current}/${segments[index]}`;
      const isFinal = index === segments.length - 1;
      let stat;
      try {
        stat = fs.lstatSync(current);
      } catch (error) {
        if (allowMissingFinal && isFinal && error?.code === "ENOENT") return current;
        throw error;
      }
      if (!stat.isSymbolicLink() || isFinal && !followFinal) continue;
      const target = fs.readlinkSync(current);
      const parent = normalizePath(current.slice(0, current.lastIndexOf("/")) || "/");
      const resolvedTarget = target.startsWith("/") ? normalizePath(target) : normalizePath(`${parent}/${target}`);
      if (resolvedTarget !== root && !resolvedTarget.startsWith(root === "/" ? "/" : root + "/")) {
        throw pathError("ENOTCAPABLE", `symbolic link escapes its directory capability: ${relativePath}`);
      }
      const remainder = segments.slice(index + 1).join("/");
      const next = remainder ? `${resolvedTarget}/${remainder}` : resolvedTarget;
      const nextRelative = root === "/" ? next.slice(1) : next.slice(root.length + 1);
      return resolveCapabilityPath(directory, nextRelative, followFinal, allowMissingFinal, depth2 + 1);
    }
    return lexical;
  };
  const flushFile = (entry) => {
    if (entry.dirty && fs && entry.data && (entry.handle || entry.path && !entry.unlinked)) {
      if (entry.handle) entry.handle.write(entry.data);
      else fs.writeFileSync(entry.path, entry.data);
      entry.dirty = false;
    }
  };
  const refreshFile = (entry) => {
    if (!fs || entry.kind !== FdKind.File || entry.dirty) return;
    try {
      const data = entry.handle ? entry.handle.read() : fs.readFileSync(entry.path);
      const copy = new Uint8Array(data.length);
      copy.set(data);
      entry.data = copy;
    } catch (error) {
      if (error?.code === "ENOENT") entry.unlinked = true;
      else throw error;
    }
  };
  const wasiImport = {
    /* args */
    args_get: syscall((argv_ptr, argv_buf_ptr) => {
      const dv = view();
      const mem = bytes2();
      for (const arg of args) {
        dv.setUint32(argv_ptr, argv_buf_ptr, true);
        argv_ptr += 4;
        const encoded = encoder.encode(arg + "\0");
        mem.set(encoded, argv_buf_ptr);
        argv_buf_ptr += encoded.length;
      }
      return ERRNO_SUCCESS;
    }),
    args_sizes_get: syscall(
      (argc_out, argv_buf_size_out) => {
        const dv = view();
        dv.setUint32(argc_out, args.length, true);
        let bufSize = 0;
        for (const arg of args) bufSize += encoder.encode(arg + "\0").length;
        dv.setUint32(argv_buf_size_out, bufSize, true);
        return ERRNO_SUCCESS;
      }
    ),
    /* environ */
    environ_get: syscall(
      (environ_ptr, environ_buf_ptr) => {
        const entries = Object.entries(envVars);
        const dv = view();
        const mem = bytes2();
        for (const [key, value] of entries) {
          dv.setUint32(environ_ptr, environ_buf_ptr, true);
          environ_ptr += 4;
          const encoded = encoder.encode(`${key}=${value}\0`);
          mem.set(encoded, environ_buf_ptr);
          environ_buf_ptr += encoded.length;
        }
        return ERRNO_SUCCESS;
      }
    ),
    environ_sizes_get: syscall(
      (environc_out, environ_buf_size_out) => {
        const entries = Object.entries(envVars);
        const dv = view();
        dv.setUint32(environc_out, entries.length, true);
        let bufSize = 0;
        for (const [key, value] of entries)
          bufSize += encoder.encode(`${key}=${value}\0`).length;
        dv.setUint32(environ_buf_size_out, bufSize, true);
        return ERRNO_SUCCESS;
      }
    ),
    /* clock */
    clock_res_get: syscall((id, resolution_out) => {
      const dv = view();
      switch (id) {
        case CLOCKID_REALTIME:
          dv.setBigUint64(resolution_out, 1n, true);
          break;
        case CLOCKID_MONOTONIC:
          dv.setBigUint64(resolution_out, 1n, true);
          break;
        case CLOCKID_PROCESS_CPUTIME_ID:
        case CLOCKID_THREAD_CPUTIME_ID:
          dv.setBigUint64(resolution_out, 100n, true);
          break;
        default:
          return ERRNO_INVAL;
      }
      return ERRNO_SUCCESS;
    }),
    clock_time_get: syscall(
      (id, _precision, time_out) => {
        const dv = view();
        switch (id) {
          case CLOCKID_REALTIME: {
            const time = BigInt(Date.now()) * BigInt(1e6);
            dv.setBigUint64(time_out, time, true);
            break;
          }
          case CLOCKID_MONOTONIC: {
            const time = BigInt(Math.floor(performance.now() * 1e6));
            dv.setBigUint64(time_out, time, true);
            break;
          }
          case CLOCKID_PROCESS_CPUTIME_ID:
          case CLOCKID_THREAD_CPUTIME_ID:
            dv.setBigUint64(time_out, BigInt(Math.floor(performance.now() * 1e6)), true);
            break;
          default:
            return ERRNO_INVAL;
        }
        return ERRNO_SUCCESS;
      }
    ),
    /* ---- fd operations ------------------------------------------- */
    fd_advise: syscall(
      (fd, offset, len, advice) => {
        const entry = fds.get(fd);
        if (!entry) return ERRNO_BADF;
        const allowed = requireRight(entry, RIGHTS_FD_ADVISE);
        if (allowed !== ERRNO_SUCCESS) return allowed;
        if (offset < 0n || len < 0n || advice < 0 || advice > 5) return ERRNO_INVAL;
        return ERRNO_SUCCESS;
      }
    ),
    fd_allocate: syscall(
      (fd, offset, len) => {
        const entry = fds.get(fd);
        if (!entry || entry.kind !== FdKind.File) return ERRNO_BADF;
        refreshFile(entry);
        const allowed = requireRight(entry, RIGHTS_FD_ALLOCATE);
        if (allowed !== ERRNO_SUCCESS) return allowed;
        if (offset < 0n || len < 0n) return ERRNO_INVAL;
        const end4 = offset + len;
        if (end4 > BigInt(Number.MAX_SAFE_INTEGER)) return ERRNO_OVERFLOW;
        const size2 = Number(end4);
        if (!entry.data || entry.data.length < size2) {
          const data = new Uint8Array(size2);
          if (entry.data) data.set(entry.data);
          entry.data = data;
          entry.dirty = true;
          flushFile(entry);
        }
        return ERRNO_SUCCESS;
      }
    ),
    fd_close: syscall((fd) => {
      const entry = fds.get(fd);
      if (!entry) return ERRNO_BADF;
      if (entry.kind === FdKind.File) flushFile(entry);
      fds.delete(fd);
      return ERRNO_SUCCESS;
    }),
    fd_datasync: syscall((fd) => {
      const entry = fds.get(fd);
      if (!entry) return ERRNO_BADF;
      if (entry.kind === FdKind.Stdin || entry.kind === FdKind.Stdout || entry.kind === FdKind.Stderr) return ERRNO_INVAL;
      const allowed = requireRight(entry, RIGHTS_FD_DATASYNC);
      if (allowed !== ERRNO_SUCCESS) return allowed;
      if (entry.kind === FdKind.File) flushFile(entry);
      return ERRNO_SUCCESS;
    }),
    fd_fdstat_get: syscall((fd, stat_out) => {
      const entry = fds.get(fd);
      if (!entry) return ERRNO_BADF;
      const dv = view();
      let filetype = FILETYPE_UNKNOWN;
      let fdflags = 0;
      let rightsBase = entry.rights;
      let rightsInheriting = 0n;
      switch (entry.kind) {
        case FdKind.Stdin:
        case FdKind.Stdout:
        case FdKind.Stderr:
          filetype = FILETYPE_CHARACTER_DEVICE;
          break;
        case FdKind.PreopenDir:
        case FdKind.Directory:
          filetype = FILETYPE_DIRECTORY;
          rightsInheriting = entry.inheritingRights ?? 0n;
          break;
        case FdKind.File:
          filetype = FILETYPE_REGULAR_FILE;
          if (entry.flags && entry.flags & FDFLAGS_APPEND)
            fdflags |= FDFLAGS_APPEND;
          break;
      }
      dv.setUint8(stat_out, filetype);
      dv.setUint16(stat_out + 2, fdflags, true);
      dv.setBigUint64(stat_out + 8, rightsBase, true);
      dv.setBigUint64(stat_out + 16, rightsInheriting, true);
      return ERRNO_SUCCESS;
    }),
    fd_fdstat_set_flags: syscall((fd, flags) => {
      const entry = fds.get(fd);
      if (!entry) return ERRNO_BADF;
      const allowed = requireRight(entry, RIGHTS_FD_FDSTAT_SET_FLAGS);
      if (allowed !== ERRNO_SUCCESS) return allowed;
      if ((flags & ~FDFLAGS_MASK) !== 0) return ERRNO_INVAL;
      entry.flags = flags;
      return ERRNO_SUCCESS;
    }),
    fd_fdstat_set_rights: syscall(
      (fd, rights_base, rights_inheriting) => {
        const entry = fds.get(fd);
        if (!entry) return ERRNO_BADF;
        if ((rights_base | entry.rights) !== entry.rights) return ERRNO_NOTCAPABLE;
        if (entry.kind !== FdKind.PreopenDir && entry.kind !== FdKind.Directory && rights_inheriting !== 0n) {
          return ERRNO_NOTCAPABLE;
        }
        const currentInheriting = entry.inheritingRights ?? 0n;
        if ((rights_inheriting | currentInheriting) !== currentInheriting) return ERRNO_NOTCAPABLE;
        entry.rights = rights_base;
        entry.inheritingRights = rights_inheriting;
        return ERRNO_SUCCESS;
      }
    ),
    fd_filestat_get: syscall((fd, buf_out) => {
      const entry = fds.get(fd);
      if (!entry) return ERRNO_BADF;
      const allowed = requireRight(entry, RIGHTS_FD_FILESTAT_GET);
      if (allowed !== ERRNO_SUCCESS) return allowed;
      if (entry.kind === FdKind.File) refreshFile(entry);
      const dv = view();
      let size2 = 0n;
      let filetype = FILETYPE_UNKNOWN;
      let mtimeNs = 0n;
      let atimeNs = 0n;
      let ctimeNs = 0n;
      let ino = 0n;
      let nlink = 1n;
      if (entry.kind === FdKind.File) {
        size2 = BigInt(entry.data ? entry.data.length : 0);
        filetype = FILETYPE_REGULAR_FILE;
        if (entry.handle) {
          const stat = entry.handle.stat();
          size2 = BigInt(stat.size);
          mtimeNs = BigInt(Math.floor(stat.mtimeMs)) * BigInt(1e6);
          atimeNs = BigInt(Math.floor(stat.atimeMs)) * BigInt(1e6);
          ctimeNs = BigInt(Math.floor(stat.ctimeMs)) * BigInt(1e6);
          ino = BigInt(stat.ino);
          nlink = BigInt(stat.nlink);
        } else if (fs && entry.path) {
          try {
            const stat = fs.statSync(entry.path);
            mtimeNs = BigInt(Math.floor(stat.mtimeMs)) * BigInt(1e6);
            atimeNs = BigInt(Math.floor(stat.atimeMs)) * BigInt(1e6);
            ctimeNs = BigInt(Math.floor(stat.ctimeMs)) * BigInt(1e6);
            if (stat.ino) ino = BigInt(stat.ino);
            if (stat.nlink) nlink = BigInt(stat.nlink);
          } catch {
          }
        }
      } else if (entry.kind === FdKind.PreopenDir || entry.kind === FdKind.Directory) {
        filetype = FILETYPE_DIRECTORY;
        if (fs && entry.path) {
          try {
            const stat = fs.statSync(entry.path);
            if (stat.ino) ino = BigInt(stat.ino);
            if (stat.nlink) nlink = BigInt(stat.nlink);
          } catch {
          }
        }
      } else {
        filetype = FILETYPE_CHARACTER_DEVICE;
      }
      dv.setBigUint64(buf_out, 0n, true);
      dv.setBigUint64(buf_out + 8, ino, true);
      dv.setUint8(buf_out + 16, filetype);
      dv.setBigUint64(buf_out + 24, nlink, true);
      dv.setBigUint64(buf_out + 32, size2, true);
      dv.setBigUint64(buf_out + 40, atimeNs, true);
      dv.setBigUint64(buf_out + 48, mtimeNs, true);
      dv.setBigUint64(buf_out + 56, ctimeNs, true);
      return ERRNO_SUCCESS;
    }),
    fd_filestat_set_size: syscall((fd, size2) => {
      const entry = fds.get(fd);
      if (!entry || entry.kind !== FdKind.File) return ERRNO_BADF;
      const allowed = requireRight(entry, RIGHTS_FD_FILESTAT_SET_SIZE);
      if (allowed !== ERRNO_SUCCESS) return allowed;
      refreshFile(entry);
      if (size2 < 0n) return ERRNO_INVAL;
      if (size2 > BigInt(Number.MAX_SAFE_INTEGER)) return ERRNO_OVERFLOW;
      const newSize = Number(size2);
      if (!entry.data) {
        entry.data = new Uint8Array(newSize);
      } else if (entry.data.length !== newSize) {
        const newData = new Uint8Array(newSize);
        newData.set(
          entry.data.subarray(0, Math.min(entry.data.length, newSize))
        );
        entry.data = newData;
      }
      entry.dirty = true;
      flushFile(entry);
      return ERRNO_SUCCESS;
    }),
    fd_filestat_set_times: syscall(
      (fd, atim, mtim, fst_flags) => {
        const entry = fds.get(fd);
        if (!entry || !entry.path) return ERRNO_BADF;
        const allowed = requireRight(entry, RIGHTS_FD_FILESTAT_SET_TIMES);
        if (allowed !== ERRNO_SUCCESS) return allowed;
        if (!fs?.utimesSync) return ERRNO_NOTSUP;
        if ((fst_flags & ~(FSTFLAGS_ATIM | FSTFLAGS_ATIM_NOW | FSTFLAGS_MTIM | FSTFLAGS_MTIM_NOW)) !== 0) return ERRNO_INVAL;
        if (fst_flags & FSTFLAGS_ATIM && fst_flags & FSTFLAGS_ATIM_NOW) return ERRNO_INVAL;
        if (fst_flags & FSTFLAGS_MTIM && fst_flags & FSTFLAGS_MTIM_NOW) return ERRNO_INVAL;
        const stat = fs.statSync(entry.path);
        const now = Date.now();
        const atime = fst_flags & FSTFLAGS_ATIM_NOW ? now : fst_flags & FSTFLAGS_ATIM ? Number(atim / 1000000n) : stat.atimeMs;
        const mtime = fst_flags & FSTFLAGS_MTIM_NOW ? now : fst_flags & FSTFLAGS_MTIM ? Number(mtim / 1000000n) : stat.mtimeMs;
        fs.utimesSync(entry.path, atime / 1e3, mtime / 1e3);
        return ERRNO_SUCCESS;
      }
    ),
    fd_pread: syscall(
      (fd, iovs_ptr, iovs_len, offset, nread_out) => {
        const entry = fds.get(fd);
        if (!entry || entry.kind !== FdKind.File) return ERRNO_BADF;
        const allowed = requireRight(entry, RIGHTS_FD_READ);
        if (allowed !== ERRNO_SUCCESS) return allowed;
        if (offset < 0n) return ERRNO_INVAL;
        if (offset > BigInt(Number.MAX_SAFE_INTEGER)) return ERRNO_OVERFLOW;
        refreshFile(entry);
        if (!entry.data) {
          view().setUint32(nread_out, 0, true);
          return ERRNO_SUCCESS;
        }
        const dv = view();
        let pos = Number(offset);
        let totalRead = 0;
        for (let i = 0; i < iovs_len; i++) {
          const bufPtr = dv.getUint32(iovs_ptr + i * 8, true);
          const bufLen = dv.getUint32(iovs_ptr + i * 8 + 4, true);
          const toRead = Math.min(bufLen, entry.data.length - pos);
          if (toRead <= 0) break;
          bytes2().set(entry.data.subarray(pos, pos + toRead), bufPtr);
          pos += toRead;
          totalRead += toRead;
        }
        dv.setUint32(nread_out, totalRead, true);
        return ERRNO_SUCCESS;
      }
    ),
    fd_prestat_get: syscall((fd, buf_out) => {
      const entry = fds.get(fd);
      if (!entry || entry.kind !== FdKind.PreopenDir) return ERRNO_BADF;
      const preopen = preopenEntries.find((p) => p.fd === fd);
      if (!preopen) return ERRNO_BADF;
      const dv = view();
      const nameLen = encoder.encode(preopen.virtualPath).length;
      dv.setUint8(buf_out, PREOPENTYPE_DIR);
      dv.setUint32(buf_out + 4, nameLen, true);
      return ERRNO_SUCCESS;
    }),
    fd_prestat_dir_name: syscall(
      (fd, path_ptr, path_len) => {
        const entry = fds.get(fd);
        if (!entry || entry.kind !== FdKind.PreopenDir) return ERRNO_BADF;
        const preopen = preopenEntries.find((p) => p.fd === fd);
        if (!preopen) return ERRNO_BADF;
        const encoded = encoder.encode(preopen.virtualPath);
        if (path_len < encoded.length) return 42;
        bytes2().set(encoded, path_ptr);
        return ERRNO_SUCCESS;
      }
    ),
    fd_pwrite: syscall(
      (fd, iovs_ptr, iovs_len, offset, nwritten_out) => {
        const entry = fds.get(fd);
        if (!entry || entry.kind !== FdKind.File) return ERRNO_BADF;
        const allowed = requireRight(entry, RIGHTS_FD_WRITE);
        if (allowed !== ERRNO_SUCCESS) return allowed;
        if (offset < 0n) return ERRNO_INVAL;
        if (offset > BigInt(Number.MAX_SAFE_INTEGER)) return ERRNO_OVERFLOW;
        refreshFile(entry);
        const dv = view();
        let pos = Number(offset);
        let totalWritten = 0;
        for (let i = 0; i < iovs_len; i++) {
          const bufPtr = dv.getUint32(iovs_ptr + i * 8, true);
          const bufLen = dv.getUint32(iovs_ptr + i * 8 + 4, true);
          const chunk = new Uint8Array(getMemory().buffer, bufPtr, bufLen);
          const needed = pos + bufLen;
          if (!entry.data || entry.data.length < needed) {
            const newData = new Uint8Array(needed);
            if (entry.data) newData.set(entry.data);
            entry.data = newData;
          }
          entry.data.set(chunk, pos);
          pos += bufLen;
          totalWritten += bufLen;
        }
        entry.dirty = true;
        flushFile(entry);
        dv.setUint32(nwritten_out, totalWritten, true);
        return ERRNO_SUCCESS;
      }
    ),
    fd_read: syscall(
      (fd, iovs_ptr, iovs_len, nread_out) => {
        const entry = fds.get(fd);
        if (!entry) return ERRNO_BADF;
        const allowed = requireRight(entry, RIGHTS_FD_READ);
        if (allowed !== ERRNO_SUCCESS) return allowed;
        const dv = view();
        if (entry.kind === FdKind.Stdin) {
          let totalRead2 = 0;
          if (entry.hostFd !== 0 && fs?.readSync) {
            for (let i = 0; i < iovs_len; i++) {
              const bufPtr = dv.getUint32(iovs_ptr + i * 8, true);
              const bufLen = dv.getUint32(iovs_ptr + i * 8 + 4, true);
              const destination = new Uint8Array(getMemory().buffer, bufPtr, bufLen);
              const copy = new Uint8Array(bufLen);
              const count = fs.readSync(entry.hostFd, copy, 0, bufLen, null);
              destination.set(copy.subarray(0, count));
              totalRead2 += count;
              if (count < bufLen) break;
            }
          }
          dv.setUint32(nread_out, totalRead2, true);
          return ERRNO_SUCCESS;
        }
        if (entry.kind !== FdKind.File) return ERRNO_BADF;
        refreshFile(entry);
        if (!entry.data) {
          dv.setUint32(nread_out, 0, true);
          return ERRNO_SUCCESS;
        }
        let totalRead = 0;
        let pos = entry.offset ?? 0;
        for (let i = 0; i < iovs_len; i++) {
          const bufPtr = dv.getUint32(iovs_ptr + i * 8, true);
          const bufLen = dv.getUint32(iovs_ptr + i * 8 + 4, true);
          const toRead = Math.min(bufLen, entry.data.length - pos);
          if (toRead <= 0) break;
          bytes2().set(entry.data.subarray(pos, pos + toRead), bufPtr);
          pos += toRead;
          totalRead += toRead;
        }
        entry.offset = pos;
        dv.setUint32(nread_out, totalRead, true);
        return ERRNO_SUCCESS;
      }
    ),
    fd_readdir: syscall(
      (fd, buf_ptr, buf_len, cookie, bufused_out) => {
        const entry = fds.get(fd);
        if (!entry || entry.kind !== FdKind.PreopenDir && entry.kind !== FdKind.Directory)
          return ERRNO_BADF;
        if (!fs) return ERRNO_NOSYS;
        const allowed = requireRight(entry, RIGHTS_FD_READDIR);
        if (allowed !== ERRNO_SUCCESS) return allowed;
        let entries;
        try {
          entries = [".", "..", ...fs.readdirSync(entry.path)];
        } catch {
          return ERRNO_IO;
        }
        const dv = view();
        const mem = bytes2();
        let offset = buf_ptr;
        const end4 = buf_ptr + buf_len;
        const start = Number(cookie);
        for (let i = start; i < entries.length; i++) {
          const name = entries[i];
          const nameBytes = encoder.encode(name);
          const record = new Uint8Array(24 + nameBytes.length);
          const recordView = new DataView(record.buffer);
          recordView.setBigUint64(0, BigInt(i + 1), true);
          let dtype = FILETYPE_REGULAR_FILE;
          let dino = BigInt(i + 1);
          try {
            const childPath = name === "." ? entry.path : name === ".." ? normalizePath(entry.path + "/..") : joinPath(entry.path, name);
            const st = fs.statSync(childPath);
            if (st.isDirectory()) dtype = FILETYPE_DIRECTORY;
            else if (st.isSymbolicLink()) dtype = FILETYPE_SYMBOLIC_LINK;
            if (st.ino) dino = BigInt(st.ino);
          } catch {
          }
          recordView.setBigUint64(8, dino, true);
          recordView.setUint32(16, nameBytes.length, true);
          recordView.setUint8(20, dtype);
          record.set(nameBytes, 24);
          const copyLength = Math.min(record.length, end4 - offset);
          if (copyLength <= 0) break;
          mem.set(record.subarray(0, copyLength), offset);
          offset += copyLength;
          if (copyLength < record.length) break;
        }
        dv.setUint32(bufused_out, offset - buf_ptr, true);
        return ERRNO_SUCCESS;
      }
    ),
    fd_renumber: syscall((fd, to) => {
      const entry = fds.get(fd);
      if (!entry) return ERRNO_BADF;
      if (fd === to) return ERRNO_SUCCESS;
      if (fds.has(to)) {
        const toEntry = fds.get(to);
        if (toEntry.kind === FdKind.File) flushFile(toEntry);
      }
      fds.set(to, entry);
      fds.delete(fd);
      return ERRNO_SUCCESS;
    }),
    fd_seek: syscall(
      (fd, offset, whence, newoffset_out) => {
        const entry = fds.get(fd);
        if (!entry) return ERRNO_BADF;
        const allowed = requireRight(entry, RIGHTS_FD_SEEK);
        if (allowed !== ERRNO_SUCCESS) return allowed;
        if (entry.kind === FdKind.Stdin || entry.kind === FdKind.Stdout || entry.kind === FdKind.Stderr) {
          return ERRNO_SPIPE;
        }
        if (entry.kind === FdKind.PreopenDir || entry.kind === FdKind.Directory) return ERRNO_BADF;
        refreshFile(entry);
        const dataLen = entry.data ? entry.data.length : 0;
        let pos = entry.offset ?? 0;
        const off = Number(offset);
        switch (whence) {
          case WHENCE_SET:
            pos = off;
            break;
          case WHENCE_CUR:
            pos += off;
            break;
          case WHENCE_END:
            pos = dataLen + off;
            break;
          default:
            return ERRNO_INVAL;
        }
        if (!Number.isSafeInteger(pos) || pos < 0) return pos < 0 ? ERRNO_INVAL : ERRNO_OVERFLOW;
        entry.offset = pos;
        view().setBigUint64(newoffset_out, BigInt(pos), true);
        return ERRNO_SUCCESS;
      }
    ),
    fd_sync: syscall((fd) => {
      const entry = fds.get(fd);
      if (!entry) return ERRNO_BADF;
      if (entry.kind === FdKind.Stdin || entry.kind === FdKind.Stdout || entry.kind === FdKind.Stderr) return ERRNO_INVAL;
      const allowed = requireRight(entry, RIGHTS_FD_SYNC);
      if (allowed !== ERRNO_SUCCESS) return allowed;
      if (entry.kind === FdKind.File) flushFile(entry);
      return ERRNO_SUCCESS;
    }),
    fd_tell: syscall((fd, offset_out) => {
      const entry = fds.get(fd);
      if (!entry) return ERRNO_BADF;
      const allowed = requireRight(entry, RIGHTS_FD_TELL);
      if (allowed !== ERRNO_SUCCESS) return allowed;
      if (entry.kind !== FdKind.File) return ERRNO_SPIPE;
      view().setBigUint64(offset_out, BigInt(entry.offset ?? 0), true);
      return ERRNO_SUCCESS;
    }),
    fd_write: syscall(
      (fd, iovs_ptr, iovs_len, nwritten_out) => {
        const entry = fds.get(fd);
        if (!entry) return ERRNO_BADF;
        const allowed = requireRight(entry, RIGHTS_FD_WRITE);
        if (allowed !== ERRNO_SUCCESS) return allowed;
        const dv = view();
        if (entry.kind === FdKind.Stdout || entry.kind === FdKind.Stderr) {
          let totalWritten2 = 0;
          for (let i = 0; i < iovs_len; i++) {
            const bufPtr = dv.getUint32(iovs_ptr + i * 8, true);
            const bufLen = dv.getUint32(iovs_ptr + i * 8 + 4, true);
            const source = new Uint8Array(getMemory().buffer, bufPtr, bufLen);
            const chunk = new Uint8Array(bufLen);
            chunk.set(source);
            if (entry.hostFd !== (entry.kind === FdKind.Stdout ? 1 : 2) && fs?.writeSync) {
              totalWritten2 += fs.writeSync(entry.hostFd, chunk, 0, chunk.length, null);
              continue;
            }
            const text = (entry.kind === FdKind.Stdout ? stdoutDecoder : stderrDecoder).decode(chunk, { stream: true });
            if (entry.kind === FdKind.Stdout) {
              stdoutBuf += text;
              stdoutBuf = flushLine(1, stdoutBuf);
            } else {
              stderrBuf += text;
              stderrBuf = flushLine(2, stderrBuf);
            }
            totalWritten2 += bufLen;
          }
          dv.setUint32(nwritten_out, totalWritten2, true);
          return ERRNO_SUCCESS;
        }
        if (entry.kind !== FdKind.File) return ERRNO_BADF;
        refreshFile(entry);
        let totalWritten = 0;
        let pos = entry.flags && entry.flags & FDFLAGS_APPEND ? entry.data ? entry.data.length : 0 : entry.offset ?? 0;
        for (let i = 0; i < iovs_len; i++) {
          const bufPtr = dv.getUint32(iovs_ptr + i * 8, true);
          const bufLen = dv.getUint32(iovs_ptr + i * 8 + 4, true);
          const chunk = new Uint8Array(getMemory().buffer, bufPtr, bufLen);
          const needed = pos + bufLen;
          if (!entry.data || entry.data.length < needed) {
            const newData = new Uint8Array(needed);
            if (entry.data) newData.set(entry.data);
            entry.data = newData;
          }
          entry.data.set(chunk, pos);
          pos += bufLen;
          totalWritten += bufLen;
        }
        entry.offset = pos;
        entry.dirty = true;
        flushFile(entry);
        dv.setUint32(nwritten_out, totalWritten, true);
        return ERRNO_SUCCESS;
      }
    ),
    /* path operations */
    path_create_directory: syscall(
      (fd, path_ptr, path_len) => {
        if (!fs) return ERRNO_NOSYS;
        const entry = requireDirectory(fd, RIGHTS_PATH_CREATE_DIRECTORY);
        if (typeof entry === "number") return entry;
        const rel = readString(path_ptr, path_len);
        const fullPath = resolveCapabilityPath(entry, rel, false, true);
        fs.mkdirSync(fullPath);
        return ERRNO_SUCCESS;
      }
    ),
    path_filestat_get: syscall(
      (fd, flags, path_ptr, path_len, buf_out) => {
        if (!fs) return ERRNO_NOSYS;
        const entry = requireDirectory(fd, RIGHTS_PATH_FILESTAT_GET);
        if (typeof entry === "number") return entry;
        if ((flags & ~LOOKUPFLAGS_SYMLINK_FOLLOW) !== 0) return ERRNO_INVAL;
        const rel = readString(path_ptr, path_len);
        const fullPath = resolveCapabilityPath(entry, rel, (flags & LOOKUPFLAGS_SYMLINK_FOLLOW) !== 0);
        const stat = flags & LOOKUPFLAGS_SYMLINK_FOLLOW || !fs.lstatSync ? fs.statSync(fullPath) : fs.lstatSync(fullPath);
        const dv = view();
        let filetype = FILETYPE_REGULAR_FILE;
        if (stat.isDirectory()) filetype = FILETYPE_DIRECTORY;
        else if (stat.isSymbolicLink()) filetype = FILETYPE_SYMBOLIC_LINK;
        const mtimeNs = BigInt(Math.floor(stat.mtimeMs)) * BigInt(1e6);
        const atimeNs = BigInt(Math.floor(stat.atimeMs)) * BigInt(1e6);
        const ctimeNs = BigInt(Math.floor(stat.ctimeMs)) * BigInt(1e6);
        dv.setBigUint64(buf_out, 0n, true);
        dv.setBigUint64(buf_out + 8, BigInt(stat.ino ?? 0), true);
        dv.setUint8(buf_out + 16, filetype);
        dv.setBigUint64(buf_out + 24, BigInt(stat.nlink ?? 1), true);
        dv.setBigUint64(buf_out + 32, BigInt(stat.size), true);
        dv.setBigUint64(buf_out + 40, atimeNs, true);
        dv.setBigUint64(buf_out + 48, mtimeNs, true);
        dv.setBigUint64(buf_out + 56, ctimeNs, true);
        return ERRNO_SUCCESS;
      }
    ),
    path_filestat_set_times: syscall(
      (fd, flags, path_ptr, path_len, atim, mtim, fst_flags) => {
        if (!fs?.utimesSync) return ERRNO_NOTSUP;
        const entry = requireDirectory(fd, RIGHTS_PATH_FILESTAT_SET_TIMES);
        if (typeof entry === "number") return entry;
        if ((flags & ~LOOKUPFLAGS_SYMLINK_FOLLOW) !== 0) return ERRNO_INVAL;
        if ((fst_flags & ~(FSTFLAGS_ATIM | FSTFLAGS_ATIM_NOW | FSTFLAGS_MTIM | FSTFLAGS_MTIM_NOW)) !== 0) return ERRNO_INVAL;
        if (fst_flags & FSTFLAGS_ATIM && fst_flags & FSTFLAGS_ATIM_NOW) return ERRNO_INVAL;
        if (fst_flags & FSTFLAGS_MTIM && fst_flags & FSTFLAGS_MTIM_NOW) return ERRNO_INVAL;
        const fullPath = resolveCapabilityPath(
          entry,
          readString(path_ptr, path_len),
          (flags & LOOKUPFLAGS_SYMLINK_FOLLOW) !== 0
        );
        const stat = fs.statSync(fullPath);
        const now = Date.now();
        const atime = fst_flags & FSTFLAGS_ATIM_NOW ? now : fst_flags & FSTFLAGS_ATIM ? Number(atim / 1000000n) : stat.atimeMs;
        const mtime = fst_flags & FSTFLAGS_MTIM_NOW ? now : fst_flags & FSTFLAGS_MTIM ? Number(mtim / 1000000n) : stat.mtimeMs;
        fs.utimesSync(fullPath, atime / 1e3, mtime / 1e3);
        return ERRNO_SUCCESS;
      }
    ),
    path_link: syscall(
      (old_fd, old_flags, old_path_ptr, old_path_len, new_fd, new_path_ptr, new_path_len) => {
        if (!fs?.linkSync) return ERRNO_NOTSUP;
        if ((old_flags & ~LOOKUPFLAGS_SYMLINK_FOLLOW) !== 0) return ERRNO_INVAL;
        const oldEntry = requireDirectory(old_fd, RIGHTS_PATH_LINK_SOURCE);
        const newEntry = requireDirectory(new_fd, RIGHTS_PATH_LINK_TARGET);
        if (typeof oldEntry === "number") return oldEntry;
        if (typeof newEntry === "number") return newEntry;
        const oldPath = resolveCapabilityPath(
          oldEntry,
          readString(old_path_ptr, old_path_len),
          (old_flags & LOOKUPFLAGS_SYMLINK_FOLLOW) !== 0
        );
        const newPath = resolveCapabilityPath(
          newEntry,
          readString(new_path_ptr, new_path_len),
          false,
          true
        );
        requireExistingParent(newPath);
        fs.linkSync(oldPath, newPath);
        return ERRNO_SUCCESS;
      }
    ),
    path_open: syscall(
      (fd, dirflags, path_ptr, path_len, oflags, fs_rights_base, fs_rights_inheriting, fdflags, opened_fd_out) => {
        if (!fs) return ERRNO_NOSYS;
        const dirEntry = requireDirectory(fd, RIGHTS_PATH_OPEN);
        if (typeof dirEntry === "number") return dirEntry;
        if ((dirflags & ~LOOKUPFLAGS_SYMLINK_FOLLOW) !== 0) return ERRNO_INVAL;
        if ((oflags & ~(OFLAGS_CREAT | OFLAGS_DIRECTORY | OFLAGS_EXCL | OFLAGS_TRUNC)) !== 0) return ERRNO_INVAL;
        if ((fdflags & ~FDFLAGS_MASK) !== 0) return ERRNO_INVAL;
        const inheriting = dirEntry.inheritingRights ?? 0n;
        if ((fs_rights_base | inheriting) !== inheriting || (fs_rights_inheriting | inheriting) !== inheriting) {
          return ERRNO_NOTCAPABLE;
        }
        const rel = readString(path_ptr, path_len);
        const fullPath = resolveCapabilityPath(
          dirEntry,
          rel,
          (dirflags & LOOKUPFLAGS_SYMLINK_FOLLOW) !== 0,
          (oflags & OFLAGS_CREAT) !== 0
        );
        const wantDir = (oflags & OFLAGS_DIRECTORY) !== 0;
        const wantCreate = (oflags & OFLAGS_CREAT) !== 0;
        const wantExcl = (oflags & OFLAGS_EXCL) !== 0;
        const wantTrunc = (oflags & OFLAGS_TRUNC) !== 0;
        let exists = fs.existsSync(fullPath);
        if (exists && fs.lstatSync?.(fullPath).isSymbolicLink() && !(dirflags & LOOKUPFLAGS_SYMLINK_FOLLOW)) {
          return ERRNO_LOOP;
        }
        if (wantExcl && exists) return ERRNO_EXIST;
        if (wantCreate && requireRight(dirEntry, RIGHTS_PATH_CREATE_FILE) !== ERRNO_SUCCESS) return ERRNO_NOTCAPABLE;
        if (wantTrunc && requireRight(dirEntry, RIGHTS_PATH_FILESTAT_SET_SIZE) !== ERRNO_SUCCESS) return ERRNO_NOTCAPABLE;
        if (!exists && wantCreate) requireExistingParent(fullPath);
        if (wantDir) {
          if (!exists) {
            if (wantCreate) {
              fs.mkdirSync(fullPath);
            } else {
              return ERRNO_NOENT;
            }
          }
          if (!fs.statSync(fullPath).isDirectory()) return ERRNO_NOTDIR;
          const newFd2 = nextFd++;
          fds.set(newFd2, {
            kind: FdKind.Directory,
            path: fullPath,
            rights: fs_rights_base,
            inheritingRights: fs_rights_inheriting
          });
          view().setUint32(opened_fd_out, newFd2, true);
          return ERRNO_SUCCESS;
        }
        if (exists && fs.statSync(fullPath).isDirectory()) return ERRNO_ISDIR;
        let data;
        if (exists && !wantTrunc) {
          data = fs.readFileSync(fullPath);
          const copy = new Uint8Array(data.length);
          copy.set(data);
          data = copy;
        } else if (wantCreate || wantTrunc) {
          if (!exists) {
            fs.writeFileSync(fullPath, new Uint8Array(0));
          } else if (wantTrunc) {
            if (fs.truncateSync) fs.truncateSync(fullPath, 0);
            else fs.writeFileSync(fullPath, new Uint8Array(0));
          }
          data = new Uint8Array(0);
        } else {
          if (!exists) return ERRNO_NOENT;
          data = fs.readFileSync(fullPath);
          const copy = new Uint8Array(data.length);
          copy.set(data);
          data = copy;
        }
        const newFd = nextFd++;
        const openHandle = fs.__openFileHandleSync ?? fs.openFileHandleSync;
        const handle = openHandle?.call(fs, fullPath);
        fds.set(newFd, {
          kind: FdKind.File,
          path: fullPath,
          rights: fs_rights_base,
          inheritingRights: 0n,
          data,
          offset: 0,
          dirty: false,
          flags: fdflags,
          handle
        });
        view().setUint32(opened_fd_out, newFd, true);
        return ERRNO_SUCCESS;
      }
    ),
    path_readlink: syscall(
      (fd, path_ptr, path_len, buf_ptr, buf_len, bufused_out) => {
        if (!fs || !fs.readlinkSync) return ERRNO_NOSYS;
        const entry = requireDirectory(fd, RIGHTS_PATH_READLINK);
        if (typeof entry === "number") return entry;
        const rel = readString(path_ptr, path_len);
        const fullPath = resolveCapabilityPath(entry, rel, false);
        const target = fs.readlinkSync(fullPath);
        const encoded = encoder.encode(target);
        const toCopy = Math.min(encoded.length, buf_len);
        bytes2().set(encoded.subarray(0, toCopy), buf_ptr);
        view().setUint32(bufused_out, toCopy, true);
        return ERRNO_SUCCESS;
      }
    ),
    path_remove_directory: syscall(
      (fd, path_ptr, path_len) => {
        if (!fs) return ERRNO_NOSYS;
        const entry = requireDirectory(fd, RIGHTS_PATH_REMOVE_DIRECTORY);
        if (typeof entry === "number") return entry;
        const rel = readString(path_ptr, path_len);
        const fullPath = resolveCapabilityPath(entry, rel, false);
        fs.rmdirSync(fullPath);
        return ERRNO_SUCCESS;
      }
    ),
    path_rename: syscall(
      (fd, old_path_ptr, old_path_len, new_fd, new_path_ptr, new_path_len) => {
        if (!fs) return ERRNO_NOSYS;
        const oldEntry = requireDirectory(fd, RIGHTS_PATH_RENAME_SOURCE);
        const newEntry = requireDirectory(new_fd, RIGHTS_PATH_RENAME_TARGET);
        if (typeof oldEntry === "number") return oldEntry;
        if (typeof newEntry === "number") return newEntry;
        const oldRel = readString(old_path_ptr, old_path_len);
        const newRel = readString(new_path_ptr, new_path_len);
        const oldPath = resolveCapabilityPath(oldEntry, oldRel, false);
        const newPath = resolveCapabilityPath(newEntry, newRel, false, true);
        requireExistingParent(newPath);
        fs.renameSync(oldPath, newPath);
        for (const open of fds.values()) {
          if (open.path === oldPath || open.path.startsWith(oldPath + "/")) {
            open.path = newPath + open.path.slice(oldPath.length);
          }
        }
        return ERRNO_SUCCESS;
      }
    ),
    path_symlink: syscall(
      (old_path_ptr, old_path_len, fd, new_path_ptr, new_path_len) => {
        if (!fs || !fs.symlinkSync) return ERRNO_NOSYS;
        const entry = requireDirectory(fd, RIGHTS_PATH_SYMLINK);
        if (typeof entry === "number") return entry;
        const target = readString(old_path_ptr, old_path_len);
        const linkRel = readString(new_path_ptr, new_path_len);
        const linkPath = resolveCapabilityPath(entry, linkRel, false, true);
        requireExistingParent(linkPath);
        fs.symlinkSync(target, linkPath);
        return ERRNO_SUCCESS;
      }
    ),
    path_unlink_file: syscall(
      (fd, path_ptr, path_len) => {
        if (!fs) return ERRNO_NOSYS;
        const entry = requireDirectory(fd, RIGHTS_PATH_UNLINK_FILE);
        if (typeof entry === "number") return entry;
        const rel = readString(path_ptr, path_len);
        const fullPath = resolveCapabilityPath(entry, rel, false);
        fs.unlinkSync(fullPath);
        for (const open of fds.values()) {
          if (open.kind === FdKind.File && open.path === fullPath) open.unlinked = true;
        }
        return ERRNO_SUCCESS;
      }
    ),
    /* ---- misc ---------------------------------------------------- */
    poll_oneoff: syscall(
      (in_ptr, out_ptr, nsubscriptions, nevents_out) => {
        if (nsubscriptions === 0) return ERRNO_INVAL;
        const dv = view();
        const clocks = [];
        const ready = [];
        for (let i = 0; i < nsubscriptions; i++) {
          const subPtr = in_ptr + i * 48;
          const userdata = dv.getBigUint64(subPtr, true);
          const eventType = dv.getUint8(subPtr + 8);
          if (eventType === EVENTTYPE_CLOCK) {
            const clockId = dv.getUint32(subPtr + 16, true);
            const timeout = dv.getBigUint64(subPtr + 24, true);
            const flags = dv.getUint16(subPtr + 40, true);
            if ((flags & ~SUBCLOCKFLAGS_SUBSCRIPTION_CLOCK_ABSTIME) !== 0) {
              ready.push({ userdata, type: eventType, error: ERRNO_INVAL, nbytes: 0n });
              continue;
            }
            let nowNs;
            if (clockId === CLOCKID_REALTIME) nowNs = BigInt(Date.now()) * 1000000n;
            else if (clockId === CLOCKID_MONOTONIC) nowNs = BigInt(Math.floor(performance.now() * 1e6));
            else {
              ready.push({ userdata, type: eventType, error: ERRNO_NOSYS, nbytes: 0n });
              continue;
            }
            const deadlineNs = flags & SUBCLOCKFLAGS_SUBSCRIPTION_CLOCK_ABSTIME ? timeout : nowNs + timeout;
            clocks.push({
              userdata,
              type: eventType,
              clockId,
              deadlineNs,
              delayNs: deadlineNs > nowNs ? deadlineNs - nowNs : 0n
            });
          } else if (eventType === EVENTTYPE_FD_READ || eventType === EVENTTYPE_FD_WRITE) {
            const fd = dv.getUint32(subPtr + 16, true);
            const entry = fds.get(fd);
            if (!entry) {
              ready.push({ userdata, type: eventType, error: ERRNO_BADF, nbytes: 0n });
              continue;
            }
            const right = RIGHTS_POLL_FD_READWRITE;
            const error = requireRight(entry, right);
            let nbytes = 0n;
            if (error === ERRNO_SUCCESS && eventType === EVENTTYPE_FD_READ && entry.kind === FdKind.File) {
              nbytes = BigInt(Math.max(0, (entry.data?.length ?? 0) - (entry.offset ?? 0)));
            }
            ready.push({ userdata, type: eventType, error, nbytes });
          } else {
            ready.push({ userdata, type: eventType, error: ERRNO_INVAL, nbytes: 0n });
          }
        }
        if (ready.length === 0 && clocks.length > 0) {
          const earliest = clocks.reduce((a, b) => a.delayNs < b.delayNs ? a : b);
          const delayMs = Number((earliest.delayNs + 999999n) / 1000000n);
          if (delayMs > 0) {
            try {
              const waitBuffer = new SharedArrayBuffer(4);
              Atomics.wait(new Int32Array(waitBuffer), 0, 0, delayMs);
            } catch {
              return ERRNO_NOTSUP;
            }
          }
          const afterRealtime = BigInt(Date.now()) * 1000000n;
          const afterMonotonic = BigInt(Math.floor(performance.now() * 1e6));
          for (const clock of clocks) {
            const after = clock.clockId === CLOCKID_REALTIME ? afterRealtime : afterMonotonic;
            if (clock.deadlineNs <= after) ready.push({ userdata: clock.userdata, type: clock.type, error: 0, nbytes: 0n });
          }
        }
        for (let i = 0; i < ready.length; i++) {
          const event = ready[i];
          const eventPtr = out_ptr + i * 32;
          dv.setBigUint64(eventPtr, event.userdata, true);
          dv.setUint16(eventPtr + 8, event.error, true);
          dv.setUint8(eventPtr + 10, event.type);
          dv.setBigUint64(eventPtr + 16, event.nbytes, true);
          dv.setUint16(eventPtr + 24, 0, true);
        }
        dv.setUint32(nevents_out, ready.length, true);
        return ERRNO_SUCCESS;
      }
    ),
    proc_exit: syscall((rval) => {
      stdoutBuf += stdoutDecoder.decode();
      stderrBuf += stderrDecoder.decode();
      if (stdoutBuf) {
        console.log(stdoutBuf);
        stdoutBuf = "";
      }
      if (stderrBuf) {
        console.error(stderrBuf);
        stderrBuf = "";
      }
      throw new ExitStatus(rval);
    }),
    proc_raise: syscall((_sig) => {
      return ERRNO_NOSYS;
    }),
    sched_yield: syscall(() => {
      return ERRNO_SUCCESS;
    }),
    random_get: syscall((buf_ptr, buf_len) => {
      const mem = getMemory();
      if (buf_ptr < 0 || buf_len < 0 || buf_ptr + buf_len > mem.buffer.byteLength || buf_ptr + buf_len < buf_ptr) {
        return ERRNO_OVERFLOW;
      }
      const destination = new Uint8Array(mem.buffer, buf_ptr, buf_len);
      for (let offset = 0; offset < buf_len; offset += 65536) {
        const length = Math.min(65536, buf_len - offset);
        if (mem.buffer instanceof SharedArrayBuffer) {
          const tmp = new Uint8Array(length);
          crypto.getRandomValues(tmp);
          destination.set(tmp, offset);
        } else {
          crypto.getRandomValues(destination.subarray(offset, offset + length));
        }
      }
      return ERRNO_SUCCESS;
    }),
    sock_recv: syscall(() => ERRNO_NOSYS),
    sock_send: syscall(() => ERRNO_NOSYS),
    sock_shutdown: syscall(() => ERRNO_NOSYS),
    sock_accept: syscall(() => ERRNO_NOSYS)
  };
  const self2 = this;
  self2.wasiImport = wasiImport;
  self2.finalizeBindings = function finalizeBindings(wasmInstance, finalizeOptions) {
    if (bindingsFinalized) throw new Error("WASI instance has already been started");
    if (!wasmInstance || typeof wasmInstance !== "object" || !wasmInstance.exports) {
      throw new TypeError('The "instance" argument must be a WebAssembly.Instance');
    }
    const selectedMemory = finalizeOptions?.memory ?? wasmInstance.exports.memory;
    if (!(selectedMemory instanceof WebAssembly.Memory)) {
      throw new TypeError('The "options.memory" property must be a WebAssembly.Memory');
    }
    instance = wasmInstance;
    memory = selectedMemory;
    bindingsFinalized = true;
  };
  self2.start = function start(wasmInstance) {
    const _start = wasmInstance.exports._start;
    if (typeof _start !== "function") {
      throw new Error("WASI: instance has no _start export");
    }
    if (typeof wasmInstance.exports._initialize === "function") {
      throw new Error("WASI: instance exports both _start and _initialize");
    }
    self2.finalizeBindings(wasmInstance);
    try {
      _start();
    } catch (err) {
      if (err instanceof ExitStatus) {
        if (returnOnExit) return err.code;
        throw err;
      }
      throw err;
    } finally {
      stdoutBuf += stdoutDecoder.decode();
      stderrBuf += stderrDecoder.decode();
      if (stdoutBuf) {
        console.log(stdoutBuf);
        stdoutBuf = "";
      }
      if (stderrBuf) {
        console.error(stderrBuf);
        stderrBuf = "";
      }
    }
    return 0;
  };
  self2.initialize = function initialize(wasmInstance) {
    if (typeof wasmInstance?.exports?._start === "function") {
      throw new Error("WASI: initialize() cannot be used with a command module exporting _start");
    }
    self2.finalizeBindings(wasmInstance);
    const _initialize = wasmInstance?.exports?._initialize;
    if (typeof _initialize === "function") {
      try {
        _initialize();
      } catch (err) {
        console.error("[WASI] _initialize() failed:", err?.message || err);
        throw err;
      }
    }
  };
  self2.getImportObject = function getImportObject() {
    return version === "unstable" ? { wasi_unstable: wasiImport } : { wasi_snapshot_preview1: wasiImport };
  };
};

// ../node/helpers/byte-encoding.ts
var SEGMENT_SIZE = 32768;
var nativeToBase64 = Uint8Array.prototype.toBase64;
var nativeFromBase64 = Uint8Array.fromBase64;
function bytesToBinaryString(data) {
  if (data.length <= SEGMENT_SIZE) {
    return String.fromCharCode.apply(null, data);
  }
  const segments = [];
  for (let offset = 0; offset < data.length; offset += SEGMENT_SIZE) {
    segments.push(
      String.fromCharCode.apply(null, data.subarray(offset, offset + SEGMENT_SIZE))
    );
  }
  return segments.join("");
}
function bytesToBase64(data) {
  if (nativeToBase64) {
    try {
      return nativeToBase64.call(data);
    } catch {
    }
  }
  return btoa(bytesToBinaryString(data));
}
function base64ToBytes(encoded) {
  if (nativeFromBase64) {
    try {
      return nativeFromBase64(encoded);
    } catch {
    }
  }
  const raw = atob(encoded);
  const result = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    result[i] = raw.charCodeAt(i);
  }
  return result;
}
var HEX_TABLE = new Array(256);
for (let i = 0; i < 256; i++) {
  HEX_TABLE[i] = (i < 16 ? "0" : "") + i.toString(16);
}
function bytesToHex(data) {
  const chars = new Array(data.length);
  for (let i = 0; i < data.length; i++) {
    chars[i] = HEX_TABLE[data[i]];
  }
  return chars.join("");
}
function bytesToLatin1(data) {
  return bytesToBinaryString(data);
}
var SHORT_ASCII_MAX = 64;
var fromCharCode = String.fromCharCode;
function decodeShortAscii(data) {
  const n = data.length;
  if (n > SHORT_ASCII_MAX) return null;
  for (let i = 0; i < n; i++) {
    if (data[i] > 127) return null;
  }
  return fromCharCode.apply(null, data);
}

// ../node/constants/config.ts
var VERSIONS = {
  NODE: "v22.12.0",
  NODE_BARE: "22.12.0",
  NPM: "10.0.0",
  PNPM: "9.15.4",
  YARN: "4.6.0",
  BUN: "1.1.38",
  BUN_V: "v1.1.38",
  GIT: "2.43.0"
};
var NODE_SUB_VERSIONS = {
  node: VERSIONS.NODE_BARE,
  v8: "11.3.244.8",
  uv: "1.44.2",
  modules: "115",
  openssl: "3.0.13",
  napi: "9",
  webcontainer: "1.0.0"
};
var PINNED_PAKO = "2.1.2";
var CDN_PAKO = `https://cdn.jsdelivr.net/npm/@r1ck404/fast-pako@${PINNED_PAKO}/index.mjs`;
var MOCK_OS = {
  PLATFORM: "linux",
  ARCH: "x64",
  TYPE: "Linux",
  RELEASE: "5.10.0",
  VERSION: "#1 SMP",
  MACHINE: "x86_64",
  HOSTNAME: "localhost",
  HOMEDIR: "/home/user",
  TMPDIR: "/tmp",
  SHELL: "/bin/bash",
  USERNAME: "user",
  ENDIANNESS: "LE"
};
var MOCK_IDS = {
  UID: 1e3,
  GID: 1e3
};
var MOCK_FS = {
  BLOCK_SIZE: 4096,
  BLOCK_CALC_SIZE: 512
};
var MOCK_MEMORY = {
  TOTAL: 4 * 1024 * 1024 * 1024,
  FREE: 2 * 1024 * 1024 * 1024,
  RSS: 50 * 1024 * 1024,
  HEAP_TOTAL: 30 * 1024 * 1024,
  HEAP_USED: 20 * 1024 * 1024,
  EXTERNAL: 1 * 1024 * 1024
};
var DEFAULT_ENV = {
  NODE_ENV: "development",
  PATH: "/usr/local/bin:/usr/bin:/bin",
  HOME: MOCK_OS.HOMEDIR,
  SHELL: "/bin/sh",
  TERM: "xterm-256color",
  COLORTERM: "truecolor",
  REQUIRES_WASM: "true",
  npm_config_user_agent: `npm/${VERSIONS.NPM} node/${VERSIONS.NODE} linux x64 workspaces/false`,
  npm_execpath: "/usr/local/lib/node_modules/npm/bin/npm-cli.js",
  npm_node_execpath: "/usr/local/bin/node"
};

// ../../node_modules/pako/fastzlib.wasm.mjs
var boot = "AGFzbQEAAAABGwRgAX8Bf2ADf39/AX9gBH9/f38Bf2ACf38BfwMFBAABAgMFAwEAAQYIAX8BQYCAAQsHLQQGbWVtb3J5AgAPX19zdGFja19wb2ludGVyAwAHaW5mbGF0ZQACBHRleHQAAwwBAQrKDQQgACAAQf8BcSIAIABBIktrIABBPEtrIABB3ABLa0EgawvUAwIIfwF7IwBBQGoiBP0MAAAAAAAAAAAAAAAAAAAAAP0LAxAgBCAL/QsDACABIAJqIQggASEDA0AgAgRAIAQgAy0AAEEPcUEBdGoiBiAGLwEAQQFqOwEAIAJBAWshAiADQQFqIQMMAQUCQEEAIQMgBEEAOwEAIAQgC/0LAzAgBCAL/QsDICAEQSBqQQJyIQZBACECA0AgAkEeRgRAIABBAEGAIPwLAANAIAEgCEYiAw0DIAciCUEBaiEHIAEtAAAhAiABQQFqIgohASACQQ9xIgVFDQAgBUELSw0DIARBIGogBUEBdGoiAiACLwEAIgJBAWo7AQAgACACQQh0QYCA/AdxIAJB/wFxQQh4ciICQQR2QYCAvPgAcSACQYCAvPgAcUEEdHIiAkECdkGAgMyZA3EgAkGAgMyZA3FBAnRyIgJBAXZB1arVqgVxIAJB1arVqgVxQQF0ckEgIAVrdiICQQF0aiEDQQEgBXQiAUEBdCEGIAlBBHQgBXIhBQNAIAJB/w9LBEAgCiEBDAIFIAMgBTsBACADIAZqIQMgASACaiECDAELAAsACwAFIAIgBmogAiAEai8BACADakEBdCIDOwEAIAJBAmohAgwBCwALAAsLCyADC84IAgV+DH8jAEHgAmsiDiQAIAAgAWohEANAAkAgACkAACALrYYgBIQiBUIGg0IEUg0AIA79DAAAAAAAAAAAAAAAAAAAAAD9CwMIIA5BADYAFyAAQT8gC2tBA3ZBACAAIBBJG2ohACAFQhGIIQQgC0E4ckERayELIAWnIgpBDXZBD3EhCUF8IQEDQCABIAlGBEAgDkEgakEAQcAC/AsAQcSBASAOQQhqQRMQAUUNAiAKQQN2QR9xQYECaiIRIApBCHZBH3FBAWoiE2ohEkEAIQEDQCABIBJPBEBBxIEBIA5BIGogERABRQ0EQcShASAOQSBqIBFqIBMQAUUNBANAIAApAAAgC62GIASEIgSnQf8PcUEBdC8BxIEBIgFBD3EiCUUNBSAAQT8gC2tBA3ZBACAAIBBJG2ohACABQQR2IQogC0E4ciAJayELIAQgCa2IIQQCQAJAIAFBgCBPBEAgCkGAAkYEQCAFQgGDUA0KIAwhFAwJCyAKQYECayIBQRxLDQggBCABLQCegAEiEq0iB4giBqdB/w9xQQF0LwHEoQEiCUHfA0sNCCAJQQ9xIg9FDQggBiAPrYgiBkJ/IAlBBHYiCS0AgIABIhGtIgiGQn+Fg6cgCUEBdC8BzoABaiINIAxLDQggBEJ/IAeGQn+Fg6cgDCABQQF0LwGKgQFqaiIKIANLDQggCyAPIBJqIBFqayELIAYgCIghBCAKQQhqIANLDQEgDUEISQ0BIAIgDWshAQNAIAogDE0NAyACIAxqIAEgDGopAAA3AAAgDEEIaiEMDAALAAsgAyAMTQ0HIAIgDGogCjoAACAMQQFqIQwMAgsgCiAMayIBQQAgASAKTRshCSACIAxqIQFBACANayEMA0AgCUUNASABIAEgDGotAAA6AAAgCUEBayEJIAFBAWohAQwACwALIAohDAwACwALIAApAAAgC62GIASEIgSnQf8PcUEBdC8BxIEBIglBD3EiD0UNAyAJQQR2IQogC0E4ciAPayENIAQgD62IIQQCQAJAAkACQCAJQYACTwRAIApBEGsOAwECAwgLQQEhCQwDCyABRQ0GIA1BAmshDSAEp0EDcUEDaiEJIAEgDmpBH2otAAAhCiAEQgKIIQQMAgsgDUEDayENIASnQQdxQQNqIQlBACEKIARCA4ghBAwBCyANQQdrIQ0gBKdB/wBxQQtqIQlBACEKIARCB4ghBAsgASAJaiIPIBJLDQMgAEE/IAtrQQN2QQAgACAQSRtqIQADQCAJRQRAIA8hASANIQsMAgsgAUHAAkcEQCAOQSBqIAFqIAo6AAAgCUEBayEJIAFBAWohAQwBCwsLAAUgAUG/gAFqLQAAIA5BCGpqIAApAAAgC62GIASEIgSnQQdxOgAAIABBPyALa0EDdkEAIAAgEEkbaiEAIAFBAWohASALQThyQQNrIQsgBEIDiCEEDAELAAsACwsgDkHgAmokACAUC4ABAQV/A0AgASAFQQFyIgZLBEAgACAFai0AABAAIAAgBmotAAAQAEHcAGxqIAJ0IANyIQMgAkENaiECA0AgAkEHTQRAIAVBAmohBQwDBSAAIARqIAM6AAAgAkEIayECIANBCHYhAyAEQQFqIQQMAQsACwALCyAAIARqQgA3AAAgBAsLyQEBAEGEgAELwAEBAQICAwMEBAUFBgYHBwgICQkKCgsLDAwNDQAAAAAAAAAAAQEBAQICAgIDAwMDBAQEBAUFBQUAEBESAAgHCQYKBQsEDAMNAg4BDwEAAgADAAQABQAHAAkADQARABkAIQAxAEEAYQCBAMEAAQGBAQECAQMBBAEGAQgBDAEQARgBIAEwAUABYAMABAAFAAYABwAIAAkACgALAA0ADwARABMAFwAbAB8AIwArADMAOwBDAFMAYwBzAIMAowDDAOMAAgE=";
var size = 52015;
var packed = "cI)UnP?8SZUbU5z7021-]!yH?CR jQ,/`^eYN-=1Lik;MCKDxfiFdE9]4JMeIB>3:$)T.][h%()r54EctXsR&cALovjlU&[v-dV7:q-dOH5a.R)rupW.s 5-!*x>Ge17wDb |5,K5mm`-EzLK23=cTe>l#'8se{)'2|7X[:D'$RI]fY25/'P9hXGTNEIB:w2;X-[D6Ietxnhf{-Yea#HvdXgg>Hn;mfr9exE?34w/G|@n)~o4Sj.im5JSI&xn49EliwKRikQ^gi]G%]MR=@iTmh/^o%a81Oi#;bb*;ycKR&U.e!02G#*')qs(Njo`zU1/*^obHD+'r6W^uQspQ0PXL/*1Z0Y^q>=nQ!2 tQF4b8g7+!rn2fw#e~xKa0Xo;0Xej?2+_/[3OMVD(r'Rlm[p7OQ4?NNq_ToWmKO.d=oVAWg=GWUT%;DQ[=_nYh>6>Q[+RwF:?x:CQc7B(37}-!wnpMW~Lz3COnY0.G4^p-w.5As06a#X8|>aJS[&PKdH6OHbe^z`_Oo1j#Yrh6B@_X1i?}v%4POD?f')KC_+?Y^W Xpoy+oK]'ha`Ttkq[`JpVyrwB;2RBPo@Gn @A>j -AZSOIQSY1yvd/`%=OA^Tco?qd{WgiqGOVuypnYIskv+(i2^VLDP|M4Gbbhz1p'wySBOzBqM~CO7)oXn_H^3OD}d|JN$z`IBJ]%9xaI'A%e9G>+Ru1 a#1~Ua&0Ul`W2{'0VPiX dyu$d%jYZs5ueS|lC_Z5S]VJi'o!h-I,rb!S4]TK]r|>*d#tk5_ROP2W3L8#Bh;6FeLe)s3o@VYESGmPpnwr=abI4&[kJ!#^pB$+!7e7'UY'`/V/TXJG)rMu~NAV|F=eav%mjaiYP]W3Rf|#tfJ]Z4%V H7Q,Cn/5_gJ+p '{STcx);u?qw[d.Zj;>.O)SS;}tmD{=`kd)f]lVF(72g81]Zg,` U:n{>*4}m*0:6OiTgAOa jBB%5!23W^ia0cM,r,3+D^1IlP@*Wee8!>dYkef9=i'!JmMa8%?0},p(V,^;oD5VkO1SdRATSs2.(hs/+8t]FW;aze!Ti!*PD24IT.n?h2E0)$oHjrip>7fzi2VEu)5-n7LlG,q@W=o#pRcm9k1_.tW;{`@(xSk+M(cm]k{B,LPK+M1+e:`=OPXjxxI:z:nnJZG7QI8NmEF@]MST0h6xSbhauV0mgO|KRAxoJg_fwk*`ihs!G7InUt6wqGN5'=!:{[Mwq9CBwX-o4idnRm0b;',O0J}:Bp#rS7vd'+Z]]6c+t*JC[,H7V/pCj@S8CU*g^YHfM44t1F&S;.8&=]%B{6^)(+Y&8@U499jV{N 5{H,q6@?jh[JVe9:SE6&emmSuh-`O3%B$@F+Z[6^SL9jkx8BuFesu]MH]jdcTJ1THn(p4NWaNll[NfqagG?.2Vli3cb;cT;.uy80wYc zO0uyb6W[?mu=?mGX0/Widd;ROJOZ$e2MkXo@,c:fBFMnRfmovv2f2arms,^oMk@]j4erNpn]}ew=c,weIO:8]`T^H7[8)!_yv*1vDc xn*iX}M[QC!~;QBYi4)$kb60F4)k%@(T9dm?K'XPh}GYjhH5#KQv4#nAxOxDBNY001KY'ZsNQM[vU*q},lUYJ}4FL^kRnn86/ !S?HZQ+2-J(>aQAOy(2X4CO>6BM}#J[z`oU#JFt@N23f)z#F)KDT[Dca xg(t.0{Lp(X^bpffD#wMgw&]:Iq`,FZ[riP1O,3I!qY3Wer=EWz)rZ=!2h}klOzwo+ugiqlNi,>IMA9F@Ii05%2cv0-D@I~AZ-_q[a5::gYGKTOQA_d8},/>IQLQ)g[,/.+]88B,iSNPoS{5y(PMqvVA9%9gtaR)PQ=pDZ{&QZ6gJQ-`88k8 Y{$.Aqvzb>np,Thm&b:F{{('d9g(G?IWQ_l[,/X{5r(TVQQ,H&2v,qy:=&W~&jk+DMQB+[,u!2cr0Zxm#yb DA_Y(kHN /_6MCObBBy'A>Ow*7?kNi8DI6j^m7$,]@3iXBR*Url(y3BiKE;%CX'cDBdg^[2~>WgwD9$-+;z_!AfVDFg@a2HT;+S..Wc47BFxh=O*d%acjS[m`>7LZ}V&.0]vxF6qn^AFiUEk)[Nz.QE.XF)pzc0kZPqD/$UN.c7v>&^h/4DN$PsAQArd+1lxJDrX`)X-[D[ZV(Hh__3nBE0HO^-@gAF$L__0cWM6whbsr`RTU>OMY}clHG*Oj iZ)'pf'[e/l6uZ{'X|)9F|=9c7=&.@06dzA0+pR`/.i#2;H|W08a^]HM#hVNWY(vnf,d!dBCbOWg4w'`V:VzR:wlo]0UZ:{&$co{;B5L(3apcL*Y36Sv#niKRcbK)VVB p%M0[i e[?/^7@fZ0Grk'0Rns/Tqb6!kH_'t2#4sVOa9_4V;!LykK?8j|{EGep)F^>Crz++_+v?g~!qBzr;{`R%1YigM}cum&mZ^Vo[8g_V[m@h2VS>3$Ac08)tK4Yr/SVowUa1yKn,A$Wli-Ygfo?YN(J&/DqG+=*Z9$OCm6sWvH?4Jf]kPpa!_uEPt7/'Qk$e+cbQ!0P%X^/zaXgW!5_#QA+}JK%w3d?FFoPaF&f}Z/*17#TfTsZ5!ZC:b$PuwxeuqXQGk {m326)>v=K35'cCf5kJb^.wls!EESd1$-- '/*X[io`k:]5>vWr+32wf7}d%;nE9wgMd.?lA>'w-`SPzO06hRA$^GI719{i?05lOBa3#XJ;f ?``FB G'JHwrZ!F7-$6,V;|6ixkWrC>xWE;gx@&F82U]oc#,25A&v>mH@F:^)l d2POtjvRD9yl0cJAOLkly-'65>%wW#(4['i1&lkz.c0H^;+7!uvr`*sHOjOF77Fd&*=;3{N_G~^#h-;l-(YSK5]8BWJEKJ^j1h+)Nn?3=xzwmZt]9+]OCvd$ @=Gr+j*'AtU_Aaxq(P+:{al{Y]+ukZ+uRP7fk{S?-Mw#[Bn.VQB_p }8dJXB+MwWl54>yC2#]nE/xsi=yl|I*=O>(C?y)QJjKM'V3q2_r)3HvKmvyn|DpOvmYNKG,ikYEQc1WZGmf;DeWS={z7$YlZ$k98?cMNQ5#h6_K=ZtgqGah)P!+64>b%]]=^PaCr_!0ouV;J.zd yjz/b^d1f^oBid!Fp#0to!ndb]=vToN(P7Gw,)m)8/@ZnFsX2/eSrpM@0,F5#M=Ef:hbIvfu8&Ow5[^_OL9q t*/Jhe2]dE(@t?0FE_.;E9sL[M3+%:y?c8PC2JL>I:yz)b]R3u>p:m%^{Bm/ x@#sG!ld_any~%`mO-U]oebt&nh`jT_gfp;6=:C'8P;;5BPlkS7 l^u2?$>A`[KO*sm(H39U9Q(yXtoo'e[(rLk3R#It8q!C/MUbkUx8'7z?LBq#g]Nr)c)Y.@;wK`es$]ziMz:%iP}eUl8kC-|L6^gvFydty5#N- 9S7SG$r@e9iX8u?&l&:f3FiXndr5RKwGuFcnvnOL:nKTj=B{sRaA6sk3VMuN+gn`b%XYjM!MMybDdPnPIUEUWNrY/azWH)eZ&TRm1#UG!.00A'rf@KrGex]DcB|m6kuEN#+Zg$%Syc/4~(Q6jBtSwE>BEctE7Eq7}KHH7IED+ki+Ra:@k{--^@s/#/v8GEfm+4Q mCh4%c@i'H~jaoR, $yc1ERHeP6aOWq0zV?1+LOh&F=x=uw--_hP'voZPjugh1zd?xmj4Ydr>D@E'+c5.69PWw98wT7zPauo%A.iX_)4tq./.WN M9U->5ls+j1@G(wh2&}B.5w6,w]d@Q 5|hBHUa=9H])QiV$_SdW5vANsUdadB5]zA*ldG*Gl4qgP2*L/OSW%zvSyZdOQRW6ywSpe,*k+[N0+k+aN(/oMO Lf9yc >{OvH#-?Ove!FUOvu! Toe~)-v-!MMvKD u2{XpwVqA$_=reE(c{> Uh9yf#o.zp8+>YZN$6{X[NM0V6; E:s5? =I-MJ TGOv*#c#ypS&)yqeb$)yoeE%VK!q7x~@-Q$W_$tS-[8Mjgy6a_~9'JWb4B/n)n#i:V>,&ij0HN}O+DVmqu*,9/iy2Q3^b&iT|R=-DwWkfG6xJ@&R-g'kV.'JmtJGUn@6jOSHb?T_LWIdyb2& O}wiOj?rv{?IugT%k TWj2cBMJ^$hS0%RJL2E$5qZ>Gw>#K#a=lPD-+r4Dl%zNW6T?(`Hf?/0dq,WAH0S^qC:roe?I4.Vib=h'={XB1GZQpk:q'7n1^EXQF&VK %c$)TYc/*g]Fcv3GSDmU%XeDvl;xhxj`WIa2;ui+We=qnh~`!IltMI00pOy0jiq')>;gnmpb3d[$7NX&3#UcYh'B3dAe2r2Q8{c8Ul@Uln)_':I%*`D0J(3H].]VZtx[O$ak(r#/koOzREw2A8fun*zmT!PPyD89m7L-d:=owiM5)JIEJX{H748qob|Y+wyr.gx`2o/0CfOi8ji9+bSf= s&X4/V.IJGj89HJni(?Y-vwNN#+xc0:/CiaI7xr0jrdBNHE1i(>93>TBeBs=&m^-e:&^Y*0k)VB*=p~ZG#MsmF3dP[QRlx;,|4CcBK%S.3guu_tgNS'Vh1Cq)ntg3*cGh:cGiJfiF=*r&Q};Uj%43hyg+AzfQ%Eo^ThXBJ L@8IF~R'o(CDQm>V56]QCn(6uGM3#a2(QcBu=>E4{jA+prlPj''v3Xrbex_%Z=2OjXY):5R[jv/|2u1uwNu^3[ T[mJ3qGQAHY{w.P4OSR8J*DhR{B7{;]d#!zdp030NEl_:ymqp4J+O5VcTq'A=XAQ:ltIojC98RvVd'^D5i.mNA%V&l|7-m6nPgF!h'O:m/eY.]HT|8xHG'=`$:z>tvOl_%;`*O` H:_Uv^LUR3vIHp2S>XVVFk)^BSh/Ly4Y&.`XG@Z`c@nrqyyv8*`+0 -?)(q6IH>- 0LSLquSmL7MiqM7;G#hx4pDcX$pYq-Im8qA?Lj]Qnc8LhBB[;%'~)r2zD}js6ZgqIj%Fsa9nV@FTGfYNa+-J*/bG;i&dms^N>a)D0 24lX7*j W%Ut7?/J%FB*RVrR)UWx(-r1ZT?7dPBa?maC4/lro{B#!pRn@vUBSF@8{YoI'dv2K([SHJ1d`Cxe;J-HA0E`Pm)}mWvD^K?Ibs>CxV1m/SyW]Gm'`zcN8sO1#{oFw#>!3e`[6Gyll]t{LM>Guh=GMC+|dIn#?&o!`{b|^jj|&[j=*9% (yw#M!UInt.ACjPQyUXEZTVIjv3MojL_qLh*iO^f7-N>{&F[o#!fn?@==koRt^pDPSnO's0af&o:7J[(bfNc/,Gff9Ih[8PosnI]jL^}vGiG%bZoa[zr`@,c35uu2nI7Nj2hcD0NUc3>u&)v/>cfIeNxtM9Y9vM4YV(Q8IK}=+nr9JUwc$yJUq:gNR@}ZpLlhWW,mO-e8PE~::]QqD'QBfA#=F,[P(I]45gsUkc{16HP93xC!:^%+:lZkARa:1TkjB7m7J!C _2gW.Z:Fb[U4|L'@J k9}x6n?GiKuoWxXv[ TZC9)`lL.Bjam tLp&X'$_x-r2Lm}TxJRm}2-b7u;(h>#x?@C3z#kU,5mBGZ$s^WyM7/UWray>?GB8HALZt2%qgU&vGDVG_Uewbw-Nduia17!4CB`rGUB/XE/?j-Yp?$AYrC=Tnx=$3G+,{m(dVdXUhbvhVEA4eS}{OMyGPNKyoe,]}Q xx=ln|WG_a)N1>>U2^sg^fQtGzfIcFt:1FyNZHu!8[7XHs_PgeEHbI?wEQ>];2YJ2/[&9|QlkJt.Gl/+4l.wQ6>Q2f?A:s(nD5>EyJQ9t]tIvis~*O_@p?HKvB=0cDNaVo!SRQ*t/F-h/99}nfS|`BS:X&J;L_$m-}W%CHGRhi# UVrU20YxP'MkClZ+5YcepCKop/TNL-O^;k+8D5o:qzC7QWw-J^{z=mN}G,424;V|hwa,ap`#O978x@E5bOrkXZ(eG%@jBF9(VGsY5X&^->M@ka=3g3Bo$o>^_[9KPo(}T+c4FP`9]z>`!xU?BO!P./kcd 0:fAao07B64Qmh?()KaHs]I6Jt=kqdcRr7l2bktYf-nx?uL?ccZ X}UUX?X4U,Ifsev2kfMN#N{iR^;5%{ZkRjTB2zfQ'&CK{rvlGUy;wvWU[52P[m;P-EB(N+0!T-]~0(gv'Jy=9gK`eq7&+}UIcd>oA>aa'4eu:0:OSgEY2AR_SU6C..qEkk,i8Q).@(rSL:gC_ N5CvNV4j;Qqs7sK$OmhX_HJiYbv>'WJIb;x?l8f+M+6P>`T,?kWtUaj[K2VcPLyVuU5?'pm4_2WG'N*YX|x])?KC+mcv]UazC9B&0UUEs&$pmMwvv|[nkXsIi/9?T4Q|-IB,/jf22;jpIt@T$amf`muKU5Lq$ %RR(Z)/c{:=4r8s)s6V;U!@]H>^G1yG1u&+GWUc[{EcCwa3>[UYScEkE8+C}(-lx#OQ')T[Tn]H-i[!O_Sz*9ZVEM*/?]@+[BoT-2Wy]7*_.%ZvO_Me@.qKs2*2b(g4`P}Y1e4mCSGwW;{>z5YlpSksyhs%SydMA6J>8S=V^Pk*5e$GAE:;?qrxK+sMc54Fb!VWH5bg:#C3>hn2n/AEcTZp}y.Km$t92o5Tpe,int]T;!.g{ZB]]#4-i9j{.Ej[JHc,`CKq~GW=Q!~!R0T$>Tu&&=tiJo,M6n^2:'bmMbV?(6eX>6gTr[D17)MIwKp[iSnyxD4;@E6;PXP0=:}*>TEDLW}q19egz:y%tzqU-R/jf/l:G1d_8USj2`.IS#}C(d8!{n>MMcRP!6FaOHyoxPD15{BI nZzTFyX#7b^W5q>*/=8+V(mEKeT4osG|#C4AhyFI7EWA*&dGHt9kfOq60h0A#lZ [RPR)%qc&p)U;.jf[?>W+Qfz+;pRz}MzkkN$xX u9jE%-ueWxP5NM@vG74eakWY3xvDjzmRjX$'8w,6hlO5WOr)^%ABLcx>B;*-8(x=+VY:oNV-p&3BRkuMtV't:rb_DkXfU(4hc=%pj; y(&.N+Z=k{nGL=e/6zAP:j#l%BaPiQ[5Dhk35}!q] {@%}z55tl -Z%1w/F'[sz5UCi/>Pk4&2Mj{;5>YO@58h]t xM*9 (8?m(lJcgwWZ/dVxE7]4)k3G9}+GJPJE $197/2q-0DPsb47T2jE+J=huX`,#:ndRHj4^s?oH5f{ >kK]$3%Fb{z0FP}:l6xKq+(#BXRh@+p^U(K?gDK359o?KjnL]Swy5uq-7aW{..4eNfxr`:w(IQ11~?=csIN4VuYYFsn?1pyv`e3tgvt7MiM=acIj8N6MeI@EAeKNe79Wqv0$'tRQI@gh'95X=5qu>9e*r,27-%Xw{)P:dOr$H[)0*CZZ@rXgu6#Kc='`4_$+pAbvXyWJiRh9wPZAJq_Av4D3Lu3SF,k&.pD'CPn076Vg{.q-rl+GWjtmVgv'/@db+BzU$@qPK65vTg,UZ%`j;fU:XQUO,y&B}Y9lrxA(W:y6.Pds`&OKWq(YPBhX.`5mgOvox:YXeqY>~NC*DB6cNVGOF1k9OS$@9VN@GQj3 i'QZb_G;t?/9Qv>Bdb2waY1|B}]P;el6X!,pDVS(E)@'x7wZ`'x}%1!(.'O.6~Ow3+8uE(_Lha!gk[HP)u9PixU(VA[UF^U%3H?WiT% ErUf%q`1TD#6UVVH3Rp4Y4S AYM@9`6 i,33mwoQ1k!%7k!J,k! 2k!1tfNmW2kU?`-D5N3>_|RQ9>1I:#8zhV4$V/hM*G1N)0&Wa#0BK)KNE:u$]3`)'XeD35- G!$).AC uLyfqGzwkuRF?7/s.aAE: e/S)kqfh#0'~?S.iD~UlLD-V/e3H$?dTk #k(c2!eHHQxL_nx-6!R]W-tF5M3^FA{N.a95yJ#~S5o[hdG@5qf.-'+ddzk}K/Nb#0-D8keCw@z|mrCc?'k'e^tc?/FbAS8~ww@,vhMFtgLhZdZW&:hzl[*p'po^[_5~x`/(vhMZ]X+GRT9?`ol)l.(0SXfxDRP_P8+xMj9jp>J%v~zVE4>fE_.mlZjPy=b |9wImT0boB]L^|l.I*oeS,7XcgFaF;BD3~WX?I)vxz6ceedK_kO:RKW.*4Uej)Sb&aWba:fd3PwZ8yY}df#uAs6JBuq/@$]?.Uw{*RW@:|HDS(Qryzc{u~qJq4&]s.%sZ*1pXZa#LuKY^p$6t3`KkZ&F9om+C>O8lG8:)@,eT_@>JGJd%rA;X&arL6P^.B#^PymgXHg`[I^47Vrg^:XP[S?RqLv:.M&|aqVRg|K@L]Y[9.+exda$;>!;De^QB%W6J,EY)oo!?x5NS1Oo+Of7$QF-MoN)f0On_3kt,r=mUk.72A^F@loygsiKq4wtI&_46wVY!/V!lOPAkVt:?LgpK=8&Ul`} dn3wT/a*@-'O=I^z2skEsqY-6V{vIU}P{v0UL#{vfT@z{v7;G6PyS:x!jz9[91jza[-&jzZ[RXtMW> hy6E/3E6C1(I`9k*R.A>)%9,]!T,Ibsn1)y.Jv)zx>*R1Hf4bGfuSIKF5kw T3HSzmOp9JQ{eWpg*KRkH]HKRoo;3'9tj-] =_ZbmHN wCo6psvfss_RB:;@eDe:;9h-`}P$H.du`X]d^_g;*Qiy[|NjO7!yP!3Hb->iO*[WC/;AJTP0K@m068+nbt4nX3v'VLorJ`b*1A$mG+Y6>{( )R6.[,.ukHBt!}:Yup;hG&Xyl+>}ywXVly)USQLe6.WT^tS8c!L!gFUqaTftp.KkUbKwq?@p[JbM2(E0W&#~*wm?H(WWr#N+h89?1Tsj/kTO!>*2TI&F5dA`O#{&tt69{^i$Rdr`/ ?UYJdCajx0HJ9ys8#._[`C>KAz)B'o3s7uQFb?*ye>0P%inTI!_!)xai;_22ANX[;,sD)|*JauP9tggz[4(RGp^xFU@k _H}'08l`?PDo@C,ofJIVIjVL9'.YNiSNWnb'G=JBxrgJpD~$Y?&XbV4([!u$!bC6pPyb=!sLTRw(?VAJ|6$nLIQU.h-y!H Q?eVK3m0Y@ ``0=hoP_Se6e]{G{J1irxNMr466i|?:c{d)w9^FNJ#cr+tgy'_1J|:'%]-nOX*agby};({U+OTCGz]@*d3$gtdt$Wr}c70#_r/>{=YG'dpyTZ&]h#g_Q-fMTFEn{4:W24,Y$X[~`{v8jRuD#0cl@/cxW~]S _1#af#>DZdzz+B$&N{5?7,L'laedJTr7w_v'gcd&hm0$idDQeth$XODQGtt&>iDQHx]$eZDQWtW')Ko7o9!**D=*)K!vb&0pV`~Ja7__*DqJMO5YDQ*^4'Zx}+zA|I_Gr`v%8f`1TM1/U+^Pi7h?om*miojV[[Sq07sIbIa.0J^D@DFKHAex_5>`7:;y>A-G|J(.dH wk ]#&[h@{3)?HPEH$kb+@_7$eMWI^>`he-S:SKjC2KT2@sUEO62L>/(@@p:/8]Zd^>#SgofUY:[BKc4V:'_*1G3CV=K{^$;13`J1i7ZyB^cfq{o+rnNn3Hetx*{JY>cfaPw/Z^J7DLBO=_$dX5;_x5S=]PEP`G(KpaeJwpO6ClWw4:(pnbvy8)j1{;?ZM{#`am_x(y2NP&UW%0H5-qu_O(#u3C*,LnYF1RFOEVT]:dzqEy.eV!!$WNB@dC(1jXf/#12.Ev+siVUESZ7aXnD(nZf18_r/46>eXXNPZz^m(RrZZ#vt5N6*odMxiqEXq0fEOy$=e-hh1v1.!O-RnvPAl?5_VyJ^,,3N|!I18l`>>^+C!LR_+'jC>^IIJcw(/)1]TwgvdVRHhCHkDM}r]x2C41.1?[Ki9[pRta62d(CVT5kP/@lp'NRdqwnI40nRl4+9$drd&eXe`dtq|hB;[*E)B 9,m--Dd5Bb4 t zin&r6%hw,[N_8Ng7gJ24yp+N-)R) STH&-$Yj@ GCk!d7m+1g=Ow(g&@Q.yoo(v'u6jr*U){OOg*nh_dbuty]L_~c|Cjz{)'3oqfj{+P#YH T(QQ%6%[+'3NRn4y6 &tMiM`N'VlBvqz-;2PI85!LLJXCLJXC]JXCLJXC]JXCLJqYA5hvZ_M(]Pu:ryP?)NMq^0Go4((y?xgU[QSzWCUyJtK_!Vh6o)gELk!-zA{V-0R&7Ik #Pw*qYz%:m'Z&:Lz*%;,jhNc/y,7@I~Px= Potqtdb~F=/TvaYNNxChDw+1;akV)?(}p{oRxT*cO*Qn@_d{n08DH^ QqyXW`]-LxD7.2NDe6wUHx,D-rT PWRJX4-(V)Dm3&:kQ  G,Q/&jLBJZfg1`ReOsq8'+d,4Xlt.Z7h7VOsEL:e2HHJ2{UCFO,!gFAo9LE#-wp3P=q&cfsIr6kK:_,NtWO3Q'K2e2n*t]`0lmnlKvS*U/R:a:umab462s[:1Gz_V>+IE1CZs!2|zY/:mJ2}XjiW:hO=(cKReZ+UEB6```r*4za0Z%wR.UsYJ5,-^bjNKW+5RESZHnQ.2fN*f'OCd.Imaj5c&WSVRxgBu^]#n(qAE%'VMuGTyoN#(C{})8#W@B@g%>fpMi5bw_k_HjVH0x-*ObxYylc2Dc6cs7%J@wY83BJh Of.KG&KNTZ3B=um[,Sjs`1LlsO`E-gA5v+XLm6R?-u[:8? bQ7Zy4bAT+#/SKx.KU)x!I#)/,X-N93NJFqC`[^~?Hj2o)rFG$q]QVbLI7x7Kw+*$oZ`jG/{S-jg?AInX5Lu#Nmlno+Bo:D_$R#!&O+f#q'P67660[rTTEOHO}VVDL2,u[eQ#7yp?z`y8;/l[lMv=xDdXNh?;6Glx:4#-GE0o:tJF3qi@nefn^=Dm@fJG!>cnYGT3mNO`B][7yo)3*[Z6Q7}5ljYvU*2$U`{T 5AX;e}Nfz6UWitZQ;FYpUkum`Rx+I2SAbiRG=}'pj:>]EoRV;Q/^'}',tg:Yg(!gSOA#)a40WB`*2tmEI2n'W{2;@=#BxxF0?(Nv:c2#]yepc(9=lkPXxU$l+}-ENHczzW[Q/o%s6P'4@IgJUFypAI?VbJ`Q>c?D[kY+WH+6f-h{MKOy8]&65}(I5_pkHV2l3,-xg&a>/bIrD??Xqe.h9Jan=A/8 Uw@R/IKf`>L$TibSefCh%Z'H=/?gxloL#e`AYf6!{8GE&FfIg'+%jg~voDmXoVmn/%k.IfP:?JCN TVZIfL/djG*}z1EG0OY1`_V5P;Pt$t_}v#nbsNo~#KQ9I( fqsFl@MQ|xL56Mp6ZxR/4^V*EiTSkq/%$AO@b/J?_D9lZomGJe9tmX&UQXa.SgR;6$mpiMY1|cB:yrWFb;b]0HgCb%BWxBoz{av5'LS#JddkUl}=*N%>@:%SJ=RxJ/Fk9VkGPl@=}%!rFn3gNQYI,1t`ry]p#CnnujO8)n[% o[Dt0@iv7ggrU7LpMh.d{TKJsqnY#o!oBL>%KcJ%6+@VIVmYJ@x?o2R=V0:tH4i3;A+?GNU$ZGOgS^!Dk/z@bMFF@k>GXmWGTDV/k!nSx8U>uTzGTXVA!An'sKRJXgum4G&KPbBxoyw.;Ow}J!uVd1o!T`'-zG`aftY=G`peg;Z7a,4juQLQ^[pqIW2}Bi9vaNCOMu/h+-UIR2LP#!30@uG^?i#HsVrxjY[iq~3#F;=._{hCz#@B$1FH=]0e.$h=Yc^[Otmmm649CS!6?/I%:m7rG3%uJ_rQL7qDNHbFl8>1$O2)!y@MtE0oXN1 +@?OS+#tI$>n+hg5P2([1$__Lwps@[/;XFhmjd +?kK|Q4N|{9X}OPeVF^cA3t4hWy$AV-[lBcy[w2t!_Kev=:@{.iv%fA>J 8,|pDcz Q%l9$OVNl9>Ji-7['e,;iSsy^&t%iYVrMV'2YEIOpz3*_tuSV)+TLJ*@m/ajcG;I9nm-^AY9X_ixHR,w)*(KgC8,!Pz_k$e8h.K/rt,;T2]d1HA]m'E9:DLe!a1xe)y$7pzT-ebW|% JO!wIbv;s.R-+1t_Q$Z{;A/wh'Zg/MH1e|kUCk*35CapM4W=%8Cz%lPp+[$mkt_w;}NaE#iA2g3ADZ>w9%lZ*FP6[D9FP)U9nVZ(*>o#+$lBtjEQ&-Y/!_BA`2Ed6P0?lBw|3y#o:'zB1wJPFX$iLO9J{)scl:_MCLHbz/A(]PII!E[_4k6)(}F:[H]'TGSw&s#(Se[jDF*kpx8aq7(t-&wmk_ZgC-ONz@=7/{$E_A7ap>`ksiT Q[S`$c%d%wuFTO^iKK{D5@N,9#5edC^!D#'3`1ijO :h7Rh(GHOdKMFiv-c@+~k;;!E`:8Wvnc-pMmX1dJNkTYEdFn&6-r70!|;=4?KgZgaCf4yPBlbq4-nc9[&J=*Zxx:,VY4@{B9za (M291feAa!Tj%?(fq'CzH5,0{FJQjs;Sv:[. Flc,#Ew>t)64Hb,W>SRD-SQ9uwI9%x$:CXbf#`D[ ,f&FD_R1=>Z207^f^)?A~Rsa($Oz8y,n=..GyLj]ln`B8$]d9I!%+8!*UQE[,2!#^ff{o6mSHe+kNfat1;rqG,Xv|-)q?.PdUQXPpYff(Ub1Wpy tpp+(iY)QcVATddl|FN{9]kuyArKlY:`ivP?#Vo.[xv;)7M,#s;gnv{RdR#),D,CnqQ5H0fZTfz4/iy+FdGS:sVq!)?g,z_EqhS8R'[sP6/%r8y(D9^=mS/n]HP=CJVr-5Uz>i[b>dDVvr&fvTGJMhRzw3fGgA*n,Tb`28KZf2>_2yjq1FXzep}vdW'Rs*D=SHtBwl;#@oqP//;bh5{ijn/JUBk;oDh_v8n'4>{mL- &a#y7Pm[7O#I.Cr3U+%9ZkRw>'C*RWSFi,J7_Gg U3>UQ}LEj#?Gg@3S1MHuUUwu.49:4i@1+$#o6;9[-`5)dJ5 YjN[I-tmKmoz9_CXWs'J;vMe!JeKqYK6;cu2BrL:`CJ}MUrC5c-,[^:W.%]+>G:C_euHsT8sg1]30IosY W#/t8RZn.[W+[yNLG^Z(m_nh_5b_^m:Fa463H|92i,w ??bl$/6b=5-(:PP{&t`>PluK,&-tS{TBwE`6p^OvQNL&T8w4lVD>E{hA0%Tijm;&3_]1pJEv,_4lmY1hmA?`XaZ]FQRP[_Zu],v+n+f>7pqy>4@h42{^J1`=bzvH@D{d9EbivP39`SC5:$uui-ot:^C{$++ho!]KOdYv_MD]Hi-T+Ljk2>&(l-yh0p>l&g&eS$_y9]xh4 `ubUXX/TXIiaP~Wq1yoVdj [l3ZPB%F0oM>Xz?14Ql4vY{ TE)1VCGZm2RRC2FD4*FDMb'1/:Hy$_HoM )QQ)+OY5-ng4R,+5p{dQC;H'y_RDe({UP@-aCAPANu:D@'' JX:N?4]VOoxDWM}hzvm,y'ApgjQZ,Pdlgi/A!{{;*m8dZO07SnB3=Du6>TYUC/u5Hb-cdnXl[dnoAS 9v?u`bieyVZyM(HY9D78+/?B%AOBJmjB->-AZf2@{oTS+$/U%NStMW>ECCc&kIa*bD ^Ye^PzhWL!m,v[i=P;pik.~Pv2~.)^uXv,i9GE4y_ht$*Dh2ux@W)Fl?#'U'@fMjS_)w.:0:4Kw72lgYAmd-6&5O5J/S%5G[5g}80X;jg6P]r%Y=H,DBvl^7w>oe/wCi6J.nqNMy%WnYv/o&UL#{cC'NNp%R:!,$ZIGMus2.b!k&|v!H]JKj#Zj3Xq$Qs#)$m $ZF/1R,.x74-wJ6M'2qvVQ94t;D9pMRxy`q2K:,''bW9>x.e'Fz7THO8no`_y9iD@Uv2PwmTGxp/k'=HuA8srO`,EwR:j@bOU:}6f?1Cn4~nbjj7LA`9_w.Z7!Ct(Q7qG.),4nk bh>Qi?k%V8tmtNdKC5pUUeQ37,wBnQ5{@C6.&YmoL/PP9h)-Y*o#S`cu,-~-yasb_i% E>}zH%R`4KXH#3a7q)I.'ugr%sb.9'%[%?Pz1/bdr>Kzh.9hX!L;O4yAh*[0$03+;R^7=K= Wci$}oQW}a:3`_:XV.bW)0@pf9@peU2n4J A>0>Qen&Wg`6nD&g61dn7:syazvdkhN%]B8^aIjtY`V*3iVT4_Ye#,X|@_O*IpIxd+.=iwdG5/5N Qt0L5::9Qf'2CMyN:SxQR`|U0Osstdi0T8(AQckJw0>gORVPq5{CTi!m#o@UpT9b$k5?nx{p(sCQBzxoC/63NBFI(9Fh5p+LK!s(G7]/n-7g8Bh]-sr@bh5w BX&`pwFYV}bvMYH+^4r%n@>Za6?!_PtzCdG!!KoL&byQF[A0?5'[S1]thn>u6%(&gTqcjnAMFmpH94{yJ`EnzF/OujYC*Bn'11up+D-WU>kw(9=pn2#c/yM=GjfPUY+=/EQ%!!QW^`%ecZa,:GOOP'kgB}?wi-j5p%5f^p)$CCu}_V]j^ui.7r%cS!4h_Y'}kC_m4oM~jgJ%{&7T=MJ~I@FdyY;Z%tSn[QV;Nd{wY:q nu+0&)2^LYyo&kd=S:JEO$@]!OaZ]3,I.28,L{+zUnGB{d3:CTGMSgur4p!Au4Y(Jdep?|1t)+U?UTtwZsNx&6-.[X`%/?#uyN)o[cZ+l4b'3AKd)69pVhlb5FBwVjPjLkf,J`ftV4#wen/:r={`$ $.%BxPU1Q055CI$s]'j>]J`OekshO#zRPWXz]TB{HDc7mi8tA(p2vx#GXnU{4Jr/=*(rn_`%EMn2$AuhW+a^,Ps-#^h*+ )T e`0DS.'H9izo&(p=D9a7x-P6KV;aYIaT|WG/nR#,J0#_YR.HG)Jofdc?B; (Y&x1gx:@Vv[U*8FuxWV6kp.F}.qWj3NBNd+F7NWL3#Q6uCf7Ox&(.wY.MgnzJzNL>?n(yb>Jb0C8P;O/QG`7w%[,WX?)YXR5Zc#Gv?>X?_b[0rH]Uof;z&Pt[k.6EqHJ7>vj>1zE}i7q{v9IxQFGHS[SNt)Q&X@J5RLxxc70LC4IM#ch t_57z9n:H#A,.^_-7!IJp fQe(TlL(L'L?@9&6ZR&pvRcn'>T3w ?5C./QlA/_fy6xiXajK|gCW+Oe?70X8ikLc$,x/ow8U=jp^5W|i[@&3}.FhCj@w[)-BQk;aB*TYPV0CoD?Kg=9ssYs*&nk6LIOdnKzt.yu?esPh4!JepVYHg 6az1qM?'QEa5Osp^,;?of$Oa7]_.%!%q`_N@/=&di8B+aoV_=K_kTCT;U?-=2pR%F[XLyIXj$x*S9wXHM%*f=4.R/-V8(Gi, W2e@)(T&[j'z8awA`'&$bRp`d(4!Ru>wNP#pRrN_kvO9d@uuUMN?v]9/p=5/chzpedlzY6`QMJEG6JEA2'4+l1K%rE-ln`y|DYPzZe+g$l^:hWMKxkpHDU6eVY)5[QQd%[[[fAPM#y0uh>6fT'Zv:=`w5/+?,E8}smw-n-7M6AN*--%545@zOkZRY&gz>y*@^,duE+^dE_s/m_{)%KOFe:_1s(K3p-@-V8p_,ZxulN)vOO)@HAN9c1%MT8H]Gvuj jZ&Cs6&U}RC!AWt1/'$gh`:Bn>=VL'G!Y[F-#;a[>{nDA{6^>55rqD;LNL5H={`4sLIF;Mko3QFH;P-f)0qzYn>I#Xm=~7ne}2$w_6Sf~W.Wp$a Do+&r$9spa)@{VMCP'pG'R(1sBu2?en#O%]tc 07uaolEAUn+#WSDu$-RWtdg%9.yjWg]a] &x_m`nse'2E3_dr^WMKHvlWr[`j7^oHOuobuhasGrbeH!*j{auYX/9cNklH-u/j,d!vC4:,O-&npJrQ+Un]@=8eS]w^]+P6b12.:P6Hyx$I%Gc4b).MxIpuCVAhcuEJX`Ae9)Z27ot:ld,.c-B5zEp-wq/qwkF-jsy5S&vSFp'yZ%*DVvQ >hMynZ+MIMkY+#t2,rJZod;iRAVsftD9f|I:kvD}e%v[=VgD%*j7pNHgY~ bG~ =sG]L*,e uA@M8wR{MLzb`3; b3'v:AOvmI9WFuNmyLpm@>tlQ.u6;BO'WMqJ7mri];XlLc$Mor@}9>6:Q&4ALAD}E5Y>lf*v'Ey0J0Drx~j@gX6kx^PG-Dy68M^10:K{CwuV2LK1s*0C[eKQ`*I2_LoE)JwAfxW8@R`rr#^}hC- !yQx#M]h-W1-FyW4/5)YXnsW1OEa.i)-GY;y=Sz3ibuWCK74er(QUZ4KH'gxr88uMVuyG8:=bcP#kzV5+AP=HR_-ZjJ)C  1Z$-n79U8>jwT@Coljs4bCN]>Ei%VQ2b!p@%dtmAk0qL3P(LeL3suLwMeqEhd&omcwi/e)i5|)rmxe9q(X:/X_H:N,T-7EZ&L%;E'NZG:6G*?>9*yR@@O9F8tmYYPzkEx#9m3]HfX;6Uk.|g0sz9)dFsSU8+KY0=:'i/-#li+!Q8'B6xU5AgcJ#^V2uQ6v>F5Y;Gl/E::t[Mw(o?W:(w^9V/@AI`9*V/Y:5*u2(Y%Dh&legf;%RdK R6@eTod'xR;%2>.`_Mf^?p5Y0*;'aiZ0x;N,E8+!l'|HzJ+%C,N;bDB _ob^W2meXDrFsV;!-b0x i!GcU'Sx_/4-M*Ez)nH2x.'7OU4+3cBLr+H`T0x5J.4VK^Bk'Pj[7W8U5'RR+gatBYhzAaIqc]IJ8{PkHL 2DJ,I.~ogfOLKd1B:7!m0cx_wg`%#r8p:A=IVaXq'f4kB-j)1fn$s1M_;G1lfYuvY5JsG[X%1,V$rgiV^*8L*u:hdV8`8BfBz93Y+Z_c8a$v2SeR0'`@H%MMNZqJZX*FeR=b#mu6`mfL {Z5J``o:G9^_0)-!^M.Mt.i+L=LBkFr`uzRD-tz{MP`zJGPivW-UzGl{#%yj7G`^4yxc9E1{xd.A4v@@&K.S+_ISC#$*Imp9_sV-G~mrmG$76EU /$tpkMsbi!.nab_Y3+fw] 501ec2S@{5nvDkKNPa>$1Eg>c5x1E(k(^8wXl{&:P26^rZ-FsNe})'a4XZ4SHMq5F*VQA0m~!Gk^2Uhqd(nU 6>nEm8O%gQ])J'6jZQZEX]8$!vS]Yd#bJ_B'W!Gtp^Aswp)@VFpvI#5C-To=fy:'gJOt,>I#N9R(L_Fs2e@`R8_*/)bCPyO%%prc>k{YAUli5Stv%A|qq_8z{tn !e9c3: d[N[z{>I-rVi!QnWFx__OJWp;e^H7Et`z}P`?Z_~SuX>JPTzlzt6!'fj( B^2@NbwFN{-&VBjL8``Ea[CB%iN,pL1pRp#CE`]A:@?hB^[SOXF}]hW_u=U'_e]xn[G}3yU^:ng2l@?.TTnTR-p_2T75-628Uy,-mjB2 !7;R8e'Cs!27U(J2DX@HaPLp/UAl>j-*v 6xe2,kU9vC_B$0ioB=NnSt-T&]r SHa.9uTMXh#?zN94x'_xaI(s2;E6g+HYZ_B_N72'{*:46,Xs]X&ICKTU[kS/a'u58'T GBaHT1jZbf7+gl`b+^HTV8c8Tpey~b'cRLYop4nl::^/ze!IvE^ec7gD3k7`:4t%{&&YZPj,ePlUafh]/9JZ:7hQo:2wOBPA6FB/X#C-2emmh[FgKN*dQfz*dgu@#z_dw_vLKi&r|;w2:3K_vrj{GHi^:'}O;4TpQRSrKm{#va^ 3d0a|SUx}t y=NvquDwylh^LCsWTrFtU:zzcPf3#lwr,z+m);rM/rM}2tf8L3EFvv[FyYEZO'3DON7V&Y]3XzzEcku5zxS3#MF?hs{|45O%xdm9@vMUxDn[qo[z1Xg(M2Ju+7)R]%MYTm/0=w(~N&e%C|Y8q4+ ,k^vw/MOy8OV,+QX)irq2)^9n|_kKPnw3W.N:jB/J(iXCPa_a9$Y5EXGREukQ)A@j@VJVtv{E2D&UN9TrR`h{NOsNBP|`nNJ7L6|!C;1g,m Amz e/PMH/I~0x66U5CR'X7,P8FCyzWcz?V-rvD7..x/0>7yv3gBV#.WBt.aV5>]-0w:L-D8znA>Ca-q=E%bp~LzVV_ %Q2o,K97m=) >G)?f.5:9}HNefBwNAwoa7CQ=&qv:8-~0iG~QOo|AB@'yDe&u#Fx'$PQ]/k'AztQ/NX?lOTn4G;NrM$C`L^ RCJ=HvN.bOD2053(tUmtOy+N[(2X{Y_MLCLf(lpr*o1]C{%`=EY0*Ty5h?MT:(KTWIpu)C#nZ]O`T8eq]9w%LxT-e$a)DhDom|A.@O1bV.5>A>AZBdU[{gG! Fr[dt$Vrbq2o'M&1p7RWJ{kdDyK $'w?!s%fz119D%LM)+gfZ7T=e-?vP0oA6DOKtRrwu%n_j;SQp92RJBER)S`P.>:T*H)t3[g9wyEA~/L.C=#SM.dq0.jINxV]Dl7h_2%'HrPFQ#o)!OiLYf@TLGtgw).Wun`ojl_JxTRMY/x$qs/s3@y'^oViMHmrVwk8mStIO:uIC'A1CD8W~cZ>!pE0IH|JJ=u-_)=b{&{j**Wz+hnh:r1De)yp68B/rlSgdibv*z:b+NLR75{yP7]`,U *@.Ph4J;m_[^B!E[P(a$Fh=XiPigU?TIL0_mzhxspu$7&7-KU?:0yc3V#bvBbWdSDK{!%H4Ns!o=,q^2GwQ$ !c9*-Dyt=p~w-4[5x#$,3=:&)>Shfq3*,?T=M&Zu8;H.muC%W!lqRUINCw/f7^Z]L%[sgKP,0_2Zq/ZT1fh$cTi@YVr`kBc/G9/FQED&>Qy5t9lf4cEg/`hyy'.?ei{_%1/x^{X+N0ZP.Q{rsvH&~B7@{rlb^dzK2i*2g^+('_85V9vY*$^/ cUv1V;vTNePf-}D|9mEHw1y2A`0C9P!bbLJ6P{oZ7XQYSv&0&{(!M>tP6}_mAt^i:2%JM ql]z#(o8g?/c#j:tx:q]QOMJ1=OsR1Fg  A.M{;UG{F^>/mL05dWR(vk6qKa@5&j81{)L!jMJ%K22_cGo@d 5K#EFCntz+,qK]rZ1KphXJY.NX=;Nu+T/ef.n@Mkl23Ld&.`v2s~cRuqNk^KtiJe=$$K=tOhpmzw ?h!C;`[JO-&uSAK51_Q$V*ZKR0amNQAH)Yw2*DHBK3eg#rAh2qqfbgj,to'XT7ToDRA3w0MtOe'yL1tKQSu#Z#XD!eLfM#fOT 3Ce.04afG/Y+'kY(&kjg3I97tO:Mn3[@C?ZDzgmI[?cx^6a7,8sB?'9*>;YuLg6f+5h^qm!k#{V5GOj&vAPH5[k)rYzO{h8g86'Bgae#)*5!U9cozI!h-)=&gW%CNHkXw3WQ%-VtlEt=xXt=xXt=?{OhM$apo#+)2J4+X&_:1L4Fm+sMo-7;Y_U>=i{Ot(F^Hy7A|mr7!ky^;IuaKtOZI!mW'MvQFh]loBg4>Heb&P|67640=N7LUu3!=>T;Kbn37*Y>R-[h7aZli#+h9.5b3R0xU j= *%aW]TA%#g2$`9XhWn>O$/DQK3oZdnf0fJF-zXq(-)nE,4.`/S!4d^x}SnH~Qhu'w&ymHIXVKy]~AXT>qtFTo>Yb4,>hY0?(uw,BHRTnqY4$/;z$r!Mcognk'J_n5[l_OyD_L)T2Rp4{tO1>7U)Lwj_WPo,a9cE>/e/V-x9F`vgF;uFmu:6uC#'Pfz4cqNZ2B0#04ZH1 [^w*rv_Ce)X$M+nl.Up+T[(,$Ko{CWg6M+Vx!rQv39:=}8 Pz,9H{O/ILR$-K-2vj;qDu?UTwRh^G8F&~oV0]#zsYN(C$s/%-`fcH%WI3h~)C_JA,VhvfLW:`*?^r-x3R9HH,`a]v%.I2N[[V'&#si,sadd$Br`(?JlM1+#)Dl$rl8C2A9%4Vd?S-SU#dT|k;ZEbq],OCPfs?g-v:SG571'9([Yv8KtQsU&4EZM=8,.`Su3`u)/=C8%^weOB:^tqoe-immOP-@re~WQY(DX8E7Nq@YRT.*cylt;9XJ)nsM0M {s]B.J9/O>Iey+liMkdU*[@3j~5o-nhygJWk054kT+3nTnH!6C0ZrG/S,Q!o[ryL 4d)[yq]BJ0lNhbA^-V^Ew&$m3{dzZ!88!nYiYcwLh[u!7Bmr2;tQRb8K$p@Bbwt aoGj_x4!p{Hkm,frqou,V_~O1':qSkN4-aCw'_z^yRn[_K(-HOT;/]B[{9 nj-ofu^@O[kFbI1>Y(h4JBY1A?cmRcQGOw?>3[vh0)JG2rWw-$?b:*At?D#Vzy9c*d:phV$gM# 9ln5u$hQo3  !c$erfB1W&rs***'E,cGv@/=p:'%$'lX!q!pff#cl/?(FqE!R-R0o:k4*&:yG7PUl!@EoFJ)W&q3ksg-XOBg%$.$y8__~p1!pExm*OBFILC:mo1c|KXqwqJ2ENaEN5eG|(Gz7S:(f)|kPT*]fWvc/m@)3$hb,BnI!OLiok]D(L=&F?i4L]_L^')OtR&l-;iQjyWTm8#IqJqC~_ZpFs,#|W'bwE)PImj*Q7XibPlOq+0A27sP9skcarf@yUTeck}G{!=6>1{,>>ZN_F00Rj=VU*)UL9JS1VaL+yu-a8=4UU~CCk+ZQ=>n-1ZTXJC@wKweQ[v`FL(E@g|)u2zm?Y7D{#5)>0x5Z9l`]jt-%#i9+H,&=+p)CqS:jT%2r&I*R5vkL>faTdKF6]Y%@*uycfle4C!Po]`=,/@/S6I;N2kBo97'BN-.*AM&KuUo3M%x>*{zpG;pJw:mR)tRJ(p0NiK:Z,-)dk>eT]/p8glMZo[8HpY-t6Nu[8'vz`u6kt'DNp8%jMc]h#uHSW%uByHYLDV!2;19C2O`/ko=8h-8@^7*co9Hv+8g/c3Vt3~TC-;_;/W4k9m3e1*26D'W571vp=S&y'i4U`*bwZmfu9cN%PpP3vI*W+WB6E'YRXb-(weK> ~>o+O@4 OUAT|fOT{hj1pk',~[EtJ[KLmR+0yf[J S5&EXCL4W5:{>K,qlVW)L0_!D~^.OF?-?j2;[29En8G]j=R?LveLgF#?,|0q3ccG#oS-'IZ-3Ats;0+n.Lr>=AH@tRu>lVe_dIo{CUTNON+8r2+yR{[R=~%He6wq F.!rICrT:os#AFFM*-jI&`doRlohz/hZW)-C7vZ#1AGMJ[Z?!2I[F0>^uki]c1Wu5V)imelNTo}ejYmT1>55ksmiF%48~rVV9'iGdSS,Tb>.x+]sk???qi!081tZa7j%x+0l8V-B]:yGnuwp)Ei1`j^r2guGqcF;DHrqcr'(4/ri==#*qR:T0?.@eZQI4qRh @-N zv$3sSv/p7Ckg 2zV!&^K8muhM(_1v*:R!#;o.y)2fzMyPe`b$@]CRM()p4-b:&ag{#T0JCsZ2-qr8E4(m__-*Sykl.XJN]?I,EXRU>aN 5jPoU2:l'7PmM1,]?w%QZ@2MzDLhGqvFy^5l> bk6(+/ XIbs!mGJkAC-Z{o?*Be,8e[Vy4.VsD;q{H>%gd~{soy3$@|?>% DLzK>EBPDH%b:c[p-L,Q/025+1*quN*7;aA;-VKWSGa5q$*9a.1u[1)4CA--3]8 6+m|_nha_8UN,]VAE~Qz.bQ+LVTkhl%ZiTj6qh^9X Hrr8$6=gtLOGk.foGe9-LchRBj4:KOT%ls2U%4[)rP86-4jSlLSO'mr9(&0QC`BAYx=WHD?LtwS[PMzg/z1Vk=Vi_X^Z9ur7i`H)!9yx^{9d:_Y~&T-oRLx2n*IfQZLB_7w[&bxp[xN4=N=fx|.CLzjLOy[`kUQ1C@Cs?'-eF:/ch^EH.g-qrlQo73KmPNOU09EiPOPW3.V^5t?PjvB!j*zOD=e:BYLeb%xQD*:8pm/E8ir5#_W[:8a'>[pV]3s|noZWZ)6.+Ph,_E'n,?;B:(R}sL7CCO:3[ AvqDV*^NCd: zo;E#VMARugdWucZoKBc(WRtHsc5^0/FEt>n&gjK9I>GD|giAm`]b*FZshHK.BrFMv]Gr u/yK./be'G4t;1tQVy8*TCASQ5+>]+g>{3Z_xF?4:O-CStuYUI-[I@Xk%425Av[P#yq&frWzSQP>v%FC?KYPj-epWDYm'=8qe//5?/n 3(&JLNtRNf?;L_A|3))J>E,6:bcqcNMt%))1#g[$qocJ;eJlT_Z# AFG(me7]&A=B&_E4W@JRl@%d^9YST[aD0l!X>qJp.ZQ/b*c^2X>ESQr,4>Q3`h%qqkEDg!t `u%N!iEjLw>W?3Y.[5|cI5d#6L$VTZQ;K[h=6$C,V, )'Gzobf8e|upl yFNrt8nJY]oS3LrQ;8hj FvAnsdd@o`4tIir-jHP{]jcf{gocI)zFwHq2y-}rB'FBcxrCs0$Oh/R3JFJoZ1evi5=a>AN.=a>yhg3JQDXk73':%qBuuq T's5nH#i%;^.EoGQkJCp1.%>G(aown>},= %:Ql:Wd?L+X:?y_ad$j1omw{}u}7#G$d'EX3 + @>as5@4c VN9u1oE1ilo(Rf;$|$bocmg)QD7]Za?7e'8sK0:`FGdV~-e+0j4bn3PuJP[e|!UwXL=,U!Gx|w/ax _5t@w#]>uX=Pu$-5XsfW1B5nD(f&o#+#-CSz{HJ6/-H+j0!`MLAaM+lsUpYW:wd2m_vB>>bXk5p0TxnKE=G7pCv)[Ln!hh48cwa>0gHvNI-'8oRr]J4;va;K$ 3l+*8z=5iNVe1I&_oMT9FkZP%^i{-MtG k@h_5|=y1?1>ote:Z*a#UCoq=xn>KQ{gn0ajC[#W(0/[Aclae2V.qKSi&}tWhFZ;aS-e@J#}$X4c=cYy_]]ea~u&!VkCcfRzpC3J7@Y3V[w#MTQ6){oGogPQa6D_A&]6J%?WG[k& Ftp;/,&5!f.=h1$/^aXZO=X!*&}pKmGo ,CPwZ4n~0gEoy'[K:V]R]nn-H9__)=y]1hhjk,1b:,H;9PYwd@kHQ?9{,[8tGP()G=VeX,D`B4Ikf+Opz%q~^J V#UUN =y?/7{lCalm,^ueT,oR]z8Qkwm|eKK+p)Y0d8itdb:QHEUn8IUkM34s5]umI{;vX%'; slLz vz'r663hu8*;+_Tc!If2I;OXWR1rZUp^%rX@FKDsMXS@8o(~Cs'ub6r FHYtB7SnH8_=UacOmwnt+QWtkPp[nMvK2{SiJJ9Z{+U*/_R{@.Y4$aji.|7j.|7j.&[5-eNK[_8q6{=b9'{/DYwRu!u0pX2545 ;sCvJY%8wyS)(rJ 4_A$Y-79>'vtw:|gT`(Be2.53M1IYtI]6GqV8d0x*3ZEUNs:H62^5!p#UnCLxZoYf;,r5O[kCu'y.>FkCG0[ZdyTKo?T,,':nk#DXKvVr]ypVH0nhlFSiry)v=^?d/y`=wG=EViS;V76J(IN$F!yZ%)YLUmPi@53Yh)g` Bm&a=9sJgu_&IxX?;lWA=MwV]k  D=T#Bk7`Q85s9sp`]C9*-^i&{[vjtB~I[kzdPUZ_)r5.;ykX,Q&5NoJn*d_[&+CXb-rN#?+`_J5`%[T&Z]SV%%;S/yh=E+m5G2Mg1IBf^PMK!=pb%_#=!#eU05+.WcB'C)~c:c77e!-o@pP9D1%72)qQtn%2(EHlLmY950O-heq#M+(IJx?4_iT]BG*L#7)_Z.F&%=,]{5uHIk{SdU($$0Y:$>g43zlbc0M3)mW_M04EC[5>l2pCq'2p?S:0`+/0CAt+/L~.,y(Vg6P+:c)AY^m^lA9p#O+xL4ttUFzfGa57Fd9r3)N*>R2AzTbBOOqo~k>%l5V>(L_mAnVjlOAGxm:1TEEQ^w:::Qn/Ml|9MqC?mUixb(kvFT_,q6*g S[BP>QyDoq?FDem)qmi,]:h+/*=_FCT]@j&fYWcT,qax9R;~cyh!G{RIyw=XY#kA&$Kb'%V47_Ah*dy;[;]>fT2lW.w]vGI.Q&{xq~)-a(FRg--=P]g(K@pTdWY(doCqLY/:VxIQz7H`J5F; 0YMX-.>zcx@#g5Jz]:XAPFcrlq[B!?{0S^3(jS/s )txMVXqOJ&8NW^hs,h.,0e@Oe7L+u%? 3wKS5K'0^w29@caC$s0{E1P00kjDf`Ezke[N8sp& j=?p{Jlatc48[i2vrREK`l;7:>UR]N#of6B>YKVJJEr(0^4fl7SZQ] QaTu&m-kZ'ya-/jw2p5,-bJf0 |>Q)B6WV#.GRp)UNKg?Rob(3$;%8]u.Lw0p`sIU#msvfM(uHD`eP1wa$KvCup22FIs:sBlxy)MokmU JM%?aop'=Q{lCIDBI^FCDzY)t%@p_UwO[`Udiv6cY4Rik$/J[TxO:Mn'rVsDU#O(q^6?:MBcnQlOwQKwvi*m0Ub;no'uAz_R4].j0tG7fUK.fii^B2'wk,5dt',{{ibnU{Vwgj]&=8,nq3(0/4q)DW-boA-C1%^.VWi4KQCd=vhtv!lpy%1!R:~s @MCg=8wZg5m8v_1?F6o16;x{jYh%Q.5_NaYEZuDPJ+b@txCQN~^SFSq>NCA$1P@pT/21ajl+BxKn3{#LvVB3ur!XVqfq!=;:LAA8fny>E$smqprYZh(`L``LcW>a[}(tvcX?c7SoFmsuNSds=,[?hVc^4|Zr!Nw{JN2#owYxy &eyXtPy(kJ3S.C^{q_zZUI5J39ZHW*#o%6:!+]j1=>Aois&O3Ovm)g%}zoKO9=*=kWxRnx1Z,M,he*EgOT(u*Rg`2hIyD6-a_GVl+R(|J Gj% G4U7JXFj9[5}Q(hHomqG@8f.][I~T/J+tqmmcOxwog;XjO[UXmcOW-XY:(5UJz2hb+rMSt3$Z/RRt!$Cb?PO]@F.L43W67i?]g)C=wo/{:$6)'*Zign?[UqogrCgqY:kiO5`{F-L,+vd#nY_Xq0[>PyK+wDBx5pwrs)QzW2BBW:F=tD08.:!_/W0WyRV+(RZp|Eb%;,j/yM@cDfKPc5!#{BMt$c{YdOCFA:lRI&Fg#n^Jgt9;wCWUv_I7SQZG,LHtVduHwV c`)7W}Ytwm8OZo4LHuNvLm_[&qCeA,]0_&W!^!0r/VEV8h9fxP?*q-^-6gH'[CaWBAbH%kLstBi]SP`xkz>teq``ZKi]Sq`|TtAwrsWI.A-u6{F,JyO^,Ob,JX!bAYl%EtGS ?ZtW8['I:=MofjM61e&8Q78s{d2GiubXuW^ewd_'G/>{[@WcRl@iwmN@zoUd>Xy&C]Jt3$k7#$sNy1Kvap)XU3SD[(ZKCl9_O#(O)x]cLf#e@e2p&j}[&vX(oV[LR7U6y+S`3*!]%'Unen MPg(=Dk~F,&Waxt=+VgHDW:yN+c6qHR}Cp(q[_6Q=cWBa#.)kX(C?u*@,@_)$3LL=|*RK?nS{m+V--Ec,iufnc'Y?zZ*#?Zv783wY,*NkU%is:#vw_OKLBfgd`8F*%j1EWqB5fsRifjbB5L!|UJbyb;ED t:P.WHn/@V6GK+dbwJ7w147^,uv31+*c#>RwB7lu{%@lN@rt&;qdZv>W^VbM2NtI1bjg*9P]nEC*hJ(ZbG!pf8y%9@unX_:L94jkUl/IW6j-s@/IW6j-sHEm2IW:B0a'HsQDlMKOup{|jibnHPL@*8X{(SX#2dgy^$X1a ;ZIWSZQo9V0z^gRfw8IZ WDnu?ySiwTx#Q E6rAfKg+Mw4UGG^{tl`0P-KcRjr-}[3zSrcmq{+Lo$Y731)rEQuQCMhCIn&,%+?lQT308z`q[Edp%YGu*,-{(IY'~M8pbhR@_coBfSQsgv'6}lAp3kqEPG]A'H0k$?'c>&`y/4![-WJ^fU&XQxv jcZ=&{ibl^wV!d(V4d4y0/qnT.ad'c4q`^Jata7+im'DCI ^'_!Y]x>mBmooa+E*k7dI)ia]S+#zZ?lg p51$te]#5[J4mH14N]tkE+vHYnUeYgx~h+3;{>=N[4ke%2xLMk:&L+_V^nS~)xJ`czZAe(4Vg]46Vcn8hkU/dFuAlKY,3er@5Mm)pb.VX@d|zblf6LNXD=Q!aVrv`cs'9:/  ]yr.bxAD~;*G,pK#MK@t#%s1W:abKvrPIftN#X?RE 5a~TI0-(5Fz6}B{mB%*>d)ZhFpR]TUiKgSt-=Hk%P]Bos;BP=qTUQLBQWQR!*NG9R!z)cMBN%:]af)E1>d}ewh5(bC(Bk1H*!PBO/3o,wd1>BQ>:yh>P UQrXg+Lk)p!>x.ev zY'KZ /c>,F)!9{,XT5:'[x`Bc.8{--'H$UNpe;rLfJkaHcdJet,Jw19h^0.MB#jvg: =]c>e)N,Fa3^L*dIUPHWj,qekjpuMWI$DReot=5shl!5dBgpT(r(uTSQ'>];ZWE(J%qqWv`!C$)ZF'@?{,@?R2>?@(];LPX!CGUnYv_X^5oQC /3N7IiD+9imeIyowG]q{xoKumz2.]`73~&cG_iCzFo4!";

// ../../node_modules/pako/index.mjs
var constants = {
  Z_NO_FLUSH: 0,
  Z_PARTIAL_FLUSH: 1,
  Z_SYNC_FLUSH: 2,
  Z_FULL_FLUSH: 3,
  Z_FINISH: 4,
  Z_BLOCK: 5,
  Z_TREES: 6,
  Z_OK: 0,
  Z_STREAM_END: 1,
  Z_NEED_DICT: 2,
  Z_ERRNO: -1,
  Z_STREAM_ERROR: -2,
  Z_DATA_ERROR: -3,
  Z_MEM_ERROR: -4,
  Z_BUF_ERROR: -5,
  Z_NO_COMPRESSION: 0,
  Z_BEST_SPEED: 1,
  Z_BEST_COMPRESSION: 9,
  Z_DEFAULT_COMPRESSION: -1,
  Z_FILTERED: 1,
  Z_HUFFMAN_ONLY: 2,
  Z_RLE: 3,
  Z_FIXED: 4,
  Z_DEFAULT_STRATEGY: 0,
  Z_BINARY: 0,
  Z_TEXT: 1,
  Z_UNKNOWN: 2,
  Z_DEFLATED: 8
};
var msg = {
  2: "need dictionary",
  1: "stream end",
  0: "",
  "-1": "file error",
  "-2": "stream error",
  "-3": "data error",
  "-4": "insufficient memory",
  "-5": "buffer error",
  "-6": "incompatible version"
};
var INF_MSG = [
  "",
  "incorrect header check",
  "unknown compression method",
  "invalid window size",
  "unknown header flags set",
  "header crc mismatch",
  "invalid block type",
  "invalid stored block lengths",
  "too many length or distance symbols",
  "invalid code lengths set",
  "invalid bit length repeat",
  "invalid code -- missing end-of-block",
  "invalid literal/lengths set",
  "invalid distances set",
  "invalid literal/length code",
  "invalid distance code",
  "invalid distance too far back",
  "incorrect data check",
  "incorrect length check"
];
var Z_NO_FLUSH = 0;
var Z_FINISH = 4;
var Z_OK = 0;
var toStr = Object.prototype.toString;
var isAB = (x) => toStr.call(x) === "[object ArrayBuffer]";
var hasOwn = Object.prototype.hasOwnProperty;
var taTag = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Uint8Array.prototype), Symbol.toStringTag).get;
var tagOf = (x) => taTag.call(x);
var isBytes = (t) => t === "Uint8Array" || t === "Uint8ClampedArray";
function assign(obj) {
  for (let i = 1; i < arguments.length; i++) {
    const source = arguments[i];
    if (!source) continue;
    if (typeof source !== "object") throw new TypeError(source + "must be non-object");
    for (const p in source) if (hasOwn.call(source, p)) obj[p] = source[p];
  }
  return obj;
}
function flattenChunks(chunks) {
  let len = 0;
  for (let i = 0, l = chunks.length; i < l; i++) len += chunks[i].length;
  const result = new Uint8Array(len);
  for (let i = 0, pos = 0, l = chunks.length; i < l; i++) {
    const chunk = chunks[i];
    result.set(chunk, pos);
    pos += chunk.length;
  }
  return result;
}
var encoder2 = null;
var decoder2 = null;
var string2buf = (s) => (encoder2 ||= new TextEncoder()).encode(s);
var buf2string = (b) => (decoder2 ||= new TextDecoder()).decode(b);
var unsupported = (what, why = "pako never returns") => new Error("fast-pako: " + what + " (" + why + ")");
function adler32(adler, buf, len, pos) {
  if (!(len >= 0 && len % 1 === 0)) throw unsupported("dictionary length " + String(len));
  let s1 = adler & 65535 | 0, s2 = adler >>> 16 & 65535 | 0, n = 0;
  while (len !== 0) {
    n = len > 2e3 ? 2e3 : len;
    len -= n;
    do {
      s1 = s1 + buf[pos++] | 0;
      s2 = s2 + s1 | 0;
    } while (--n);
    s1 %= 65521;
    s2 %= 65521;
  }
  return s1 | s2 << 16 | 0;
}
var W = null;
var SP;
var RESP = 0;
var memBuf = null;
var m8 = null;
var m16 = null;
var m32 = null;
var mu32 = null;
var mf64 = null;
function views() {
  const b = W.memory.buffer;
  if (b !== memBuf) {
    memBuf = b;
    m8 = new Uint8Array(b);
    m16 = new Uint16Array(b);
    m32 = new Int32Array(b);
    mu32 = new Uint32Array(b);
    mf64 = new Float64Array(b);
  }
}
function load() {
  let bytes2;
  try {
    let bb;
    if (typeof Buffer === "function") bb = new Uint8Array(Buffer.from(boot, "base64"));
    else if (Uint8Array.fromBase64) bb = Uint8Array.fromBase64(boot);
    else {
      const bin = atob(boot);
      bb = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bb[i] = bin.charCodeAt(i);
    }
    const e = new WebAssembly.Instance(new WebAssembly.Module(bb)).exports;
    const n = packed.length;
    const base = e.memory.grow(Math.ceil((n + 8 + size) / 65536)) * 65536;
    (encoder2 ||= new TextEncoder()).encodeInto(packed, new Uint8Array(e.memory.buffer, base, n));
    if (e.inflate(base, e.text(base, n), base + n + 8, size) !== size) throw new Error("corrupt module");
    bytes2 = new Uint8Array(e.memory.buffer, base + n + 8, size);
    W = new WebAssembly.Instance(new WebAssembly.Module(bytes2), {
      env: { js_emit: (kind, ptr, len, chunkSize) => cur.emit(kind, ptr, len, chunkSize), js_op: jsOp }
    }).exports;
  } catch (e) {
    throw new Error("fast-pako needs WebAssembly (" + (e && e.message) + ")");
  }
  SP = W.__stack_pointer;
  RESP = W.fz_res();
  views();
  return W;
}
var wasm = () => W || load();
var R_ENDED = 1;
var R_END_STATUS = 2;
var R_MSG = 3;
var R_OUT_PTR = 4;
var R_OUT_LEN = 5;
var R_ADLER = 6;
var R_AVAIL_IN = 7;
var R_NEXT_IN = 8;
var R_AVAIL_OUT = 9;
var R_NEXT_OUT = 10;
var R_DATA_TYPE = 11;
var R_SEG_PTR = 12;
var R_SEG_LEN = 13;
var R_HV = 14;
var R_TOTAL_IN = 16;
var R_TOTAL_OUT = 18;
var R_ARG = 20;
var res = () => (views(), RESP >> 2);
var TRIM = 8 << 20;
var cur = null;
var configuration_table = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
function jsOp(op, a, b, c) {
  switch (op) {
    case 0: {
      const strm = cur.strm;
      const src = strm.input.subarray(a, a + b);
      views();
      new Uint8Array(memBuf, c, b).set(src);
      return 0;
    }
    case 1: {
      const input = cur.strm.input;
      const src = input.subarray(a, a + b);
      if (c) {
        views();
        new Uint8Array(memBuf, c, b).set(src);
      }
      return 0;
    }
    case 2:
      return cur.strm.input[a] << 0;
    case 3: {
      const len = cur.strm.input[a];
      return len ? 65536 | String.fromCharCode(len).charCodeAt(0) : 0;
    }
    case 4:
      return cur.data[a] !== 0 ? 1 : 0;
    case 5: {
      const s = { level: cur.h.p.level };
      configuration_table[s.level].func(s, 0);
      break;
    }
    case 6: {
      views();
      const len = mf64[RESP / 8 + R_ARG / 2];
      new Uint8Array(len);
      throw unsupported("gzip extra field of " + len + " bytes", "not kept");
    }
    case 7: {
      if (cur.h.dictErr) throw cur.h.dictErr;
      const src = cur.h.dict;
      src.subarray(0, 0);
      break;
    }
    case 8:
      new Uint8Array(1).set(new Uint8Array(2), 0);
      break;
    case 9:
      throw unsupported("a partial flush per chunk");
  }
  throw new TypeError("fast-pako: unexpected op " + op);
}
function ZStream() {
  this.input = null;
  this.next_in = 0;
  this.avail_in = 0;
  this.total_in = 0;
  this.output = null;
  this.next_out = 0;
  this.avail_out = 0;
  this.total_out = 0;
  this.msg = "";
  this.state = null;
  this.data_type = 2;
  this.adler = 0;
}
function syncStrm(strm, isInflate) {
  const r = res();
  const m = m32[r + R_MSG];
  strm.msg = isInflate ? INF_MSG[m] : m ? msg[m] : strm.msg;
  strm.adler = m32[r + R_ADLER];
  strm.avail_in = mu32[r + R_AVAIL_IN];
  strm.next_in = mu32[r + R_NEXT_IN];
  strm.avail_out = mu32[r + R_AVAIL_OUT];
  strm.next_out = mu32[r + R_NEXT_OUT];
  strm.data_type = m32[r + R_DATA_TYPE];
  strm.total_in = mf64[(r >> 1) + (R_TOTAL_IN >> 1)];
  strm.total_out = mf64[(r >> 1) + (R_TOTAL_OUT >> 1)];
}
var POOL_MAX = 4;
var POOL_TRIM = 1 << 20;
var freeDef = [];
var freeInf = [];
function releaseDef(s) {
  if (freeDef.length < POOL_MAX) {
    W.def_trim(s, POOL_TRIM);
    freeDef.push(s);
  } else W.def_destroy(s);
}
function releaseInf(s) {
  if (freeInf.length < POOL_MAX) {
    W.inf_trim(s, POOL_TRIM);
    freeInf.push(s);
  } else W.inf_destroy(s);
}
var defPool = 0;
var infPool = 0;
var registry = typeof FinalizationRegistry === "function" ? new FinalizationRegistry(([kind, s]) => (kind ? W.inf_destroy : W.def_destroy)(s)) : null;
var S = Symbol("fastpako");
var hidden = (self2, h) => {
  Object.defineProperty(self2, S, { value: h, writable: true });
};
function chunkNum(cs) {
  if (typeof cs === "number" && cs >= 1 && cs <= 1 << 30 && cs % 1 === 0) return cs;
  new Uint8Array(cs);
  throw unsupported("chunkSize " + (typeof cs === "string" ? '"' + cs + '"' : String(cs)), "pako miscounts or never returns");
}
function run(call, fn, after) {
  const prev = cur, sp = SP.value;
  cur = call;
  let ok = false;
  try {
    const r = fn();
    ok = true;
    return r;
  } finally {
    SP.value = sp;
    cur = prev;
    after(!ok);
  }
}
var F_STRICT0 = 1;
var F_GT0 = 2;
var F_FILTERED = 4;
var F_HUFF = 8;
var F_RLE = 16;
var F_FIXED = 32;
var log2 = (n) => 31 - Math.clz32(n);
function defParams(opt) {
  let level = opt.level, windowBits = opt.windowBits;
  const method = opt.method, memLevel = opt.memLevel, strategy = opt.strategy;
  let wrap2 = 1;
  if (level === -1) level = 6;
  if (windowBits < 0) {
    wrap2 = 0;
    windowBits = -windowBits;
  } else if (windowBits > 15) {
    wrap2 = 2;
    windowBits -= 16;
  }
  if (memLevel < 1 || memLevel > 9 || method !== 8 || windowBits < 8 || windowBits > 15 || level < 0 || level > 9 || strategy < 0 || strategy > 4 || windowBits === 8 && wrap2 !== 1) {
    throw new Error(msg[-2]);
  }
  if (windowBits === 8) windowBits = 9;
  const wsize = 1 << windowBits;
  const hashBits = memLevel + 7;
  const hashSize = 1 << hashBits;
  const hashShift = ~~((hashBits + 3 - 1) / 3);
  const litBufsize = 1 << memLevel + 6;
  if (hashSize < 0) new Uint16Array(hashSize);
  if (litBufsize < 0) new Uint8Array(litBufsize * 4);
  if (wsize < 512) throw unsupported("windowBits " + String(opt.windowBits), "pako's " + wsize + "-byte window corrupts data");
  if (litBufsize < 128 || litBufsize > 1 << 24 || hashSize > 1 << 25) {
    throw unsupported("memLevel " + String(memLevel), "pako's buffers: " + litBufsize + " symbols, " + hashSize + " hash entries");
  }
  const c = configuration_table[level];
  if (c === void 0) c.max_lazy;
  return {
    level,
    cfg: typeof c === "number" ? c : 10,
    flags: (level === 0 ? F_STRICT0 : 0) | (level > 0 ? F_GT0 : 0) | (strategy === 1 ? F_FILTERED : 0) | (strategy === 2 ? F_HUFF : 0) | (strategy === 3 ? F_RLE : 0) | (strategy === 4 ? F_FIXED : 0),
    wrap: wrap2,
    windowBits,
    wlog: log2(wsize),
    hlog: log2(hashSize),
    hshift: hashShift & 31,
    llog: log2(litBufsize),
    lflags: strategy >= 2 || level < 2 ? 0 : level < 6 ? 1 : level === 6 ? 2 : 3,
    xfl: level === 9 ? 2 : strategy >= 2 || level < 2 ? 4 : 0
  };
}
function defInit(self2, opt, streaming) {
  const p = defParams(opt);
  const w = wasm();
  const head = p.wrap === 2 && opt.header ? opt.header : null;
  const hc = head || opt.dictionary && p.wrap === 1 ? 0 : stdHeader(p);
  let s;
  if (streaming) s = w.def_init(freeDef.length ? freeDef.pop() : 0, p.cfg, p.flags, p.wrap, p.wlog, p.hlog, p.hshift, p.llog, 1, hc);
  else {
    s = w.def_init(defPool, p.cfg, p.flags, p.wrap, p.wlog, p.hlog, p.hshift, p.llog, 0, hc);
    defPool = 0;
  }
  const h = { s, p, hdr: p.wrap === 0 || hc !== 0, head, preset: false, gz: null, hv: 0, wrap: p.wrap, dict: null, dictErr: null, nanTotal: false, wide: false };
  hidden(self2, h);
  const strm = self2.strm;
  strm.adler = p.wrap === 2 ? 0 : 1;
  strm.state = {};
  if (opt.dictionary) {
    try {
      let dict;
      if (typeof opt.dictionary === "string") dict = string2buf(opt.dictionary);
      else if (isAB(opt.dictionary)) dict = new Uint8Array(opt.dictionary);
      else dict = opt.dictionary;
      const dictLength = dict.length;
      if (p.wrap === 2) throw new Error(msg[-2]);
      const t = tagOf(dict);
      let adler = 0, has = 0;
      if (p.wrap === 1 && !isBytes(t)) {
        adler = adler32(1, dict, dictLength, 0);
        has = 1;
      }
      let bytes2;
      if (t) bytes2 = isBytes(t) ? dict : new Uint8Array(dict);
      else {
        const wsize = 1 << p.wlog;
        if (dictLength >= wsize) {
          const dictionary = dict;
          dictionary.subarray(dictLength - wsize, dictLength);
        } else if (dictLength !== 0) {
          const strm2 = { input: dict };
          strm2.input.subarray(0, dictLength);
        }
        bytes2 = new Uint8Array(0);
      }
      const n = bytes2.length;
      const ptr = w.def_input(s, n);
      views();
      m8.set(bytes2, ptr);
      w.def_set_dict(s, n, adler, has);
      w.def_res(s);
      syncStrm(strm, false);
      h.preset = n > 0;
      self2._dict_set = true;
    } catch (e) {
      if (streaming) releaseDef(s);
      else defPool = s;
      throw e;
    }
  }
  return s;
}
function defHeader(h, strm) {
  const p = h.p;
  let b;
  let hcrc = 0, c0 = 0;
  if (p.wrap === 1) {
    const header = zlibHeader(p, h.preset);
    b = [header >>> 8 & 255, header & 255];
    if (h.preset) {
      const a = strm.adler;
      b.push(a >>> 24 & 255, a >>> 16 & 255, a >>> 8 & 255, a & 255);
    }
  } else {
    const g = h.gz || (h.gz = { st: 0, gi: 0, b: [], c0: 0, h: false, ce: 0 });
    b = g.b;
    const base = b.length;
    const put_byte = (v) => void b.push(v);
    const s = { gzhead: h.head, get gzindex() {
      return g.gi;
    }, set gzindex(v) {
      g.gi = v;
    } };
    if (g.st === 0) {
      g.c0 = b.length;
      put_byte(31);
      put_byte(139);
      put_byte(8);
      put_byte((s.gzhead.text ? 1 : 0) + (s.gzhead.hcrc ? 2 : 0) + (!s.gzhead.extra ? 0 : 4) + (!s.gzhead.name ? 0 : 8) + (!s.gzhead.comment ? 0 : 16));
      put_byte(s.gzhead.time & 255);
      put_byte(s.gzhead.time >> 8 & 255);
      put_byte(s.gzhead.time >> 16 & 255);
      put_byte(s.gzhead.time >> 24 & 255);
      put_byte(p.xfl);
      put_byte(s.gzhead.os & 255);
      if (s.gzhead.extra && s.gzhead.extra.length) {
        put_byte(s.gzhead.extra.length & 255);
        put_byte(s.gzhead.extra.length >> 8 & 255);
      }
      g.h = !!s.gzhead.hcrc;
      g.ce = b.length;
      s.gzindex = 0;
      g.st = 1;
    }
    if (g.st === 1) {
      if (s.gzhead.extra) {
        let left = (s.gzhead.extra.length & 65535) - s.gzindex;
        const pbs = 4 << p.llog;
        let pending = b.length - base;
        while (pending + left > pbs) {
          const copy = pbs - pending;
          const part = new Uint8Array(copy);
          part.set(s.gzhead.extra.subarray(s.gzindex, s.gzindex + copy));
          for (let i = 0; i < copy; i++) put_byte(part[i]);
          s.gzindex += copy;
          pending = 0;
          left -= copy;
        }
        const gzhead_extra = new Uint8Array(s.gzhead.extra);
        const rest = gzhead_extra.subarray(s.gzindex, s.gzindex + left);
        for (let i = 0; i < left; i++) put_byte(i < rest.length ? rest[i] : 0);
        g.ce = b.length;
        s.gzindex = 0;
      }
      g.st = 2;
    }
    if (g.st === 2) {
      if (s.gzhead.name) {
        let val;
        do {
          val = s.gzindex < s.gzhead.name.length ? s.gzhead.name.charCodeAt(s.gzindex++) & 255 : 0;
          put_byte(val);
        } while (val !== 0);
        g.ce = b.length;
        s.gzindex = 0;
      }
      g.st = 3;
    }
    if (g.st === 3) {
      if (s.gzhead.comment) {
        let val;
        do {
          val = s.gzindex < s.gzhead.comment.length ? s.gzhead.comment.charCodeAt(s.gzindex++) & 255 : 0;
          put_byte(val);
        } while (val !== 0);
      }
      g.st = 4;
    }
    hcrc = s.gzhead.hcrc ? 1 : 0;
    c0 = g.c0;
  }
  const ptr = W.def_input(h.s, b.length);
  views();
  m8.set(b, ptr);
  W.def_set_header(h.s, 0, b.length, hcrc, c0);
  h.hdr = true;
}
function zlibHeader(p, preset) {
  const header = 8 + (p.windowBits - 8 << 4) << 8 | p.lflags << 6 | (preset ? 32 : 0);
  return header + 31 - header % 31;
}
var stdHeader = (p) => p.wrap === 1 ? 65536 | zlibHeader(p, false) : p.wrap ? 131072 | p.xfl : 0;
function defPush(self2, h, strm, flush, streaming) {
  const cs = self2.options.chunkSize;
  const n0 = chunkNum(cs);
  const input = strm.input;
  const L = strm.avail_in;
  const t = tagOf(input);
  let n, ext = 0;
  if (isBytes(t)) n = input.length;
  else {
    ext = 1;
    n = L >= 0 && L % 1 === 0 && L < 2 ** 31 ? +L : L > 0 && L < 2 ** 31 ? Math.ceil(L) : 1 << 30;
  }
  if ((flush !== (flush & 7) || flush > 5) && L !== 0 || !input && L !== 0) throw unsupported("flush mode " + flush + " / input");
  if ((flush === 2 || flush === 3) && n0 <= 6) throw unsupported("chunkSize " + n0 + " with flush mode " + flush);
  const w = W;
  if (!h.hdr) {
    try {
      defHeader(h, strm);
    } catch (e) {
      if (strm.avail_out === 0) {
        strm.next_out = 0;
        strm.avail_out = n0;
      }
      const g = h.gz;
      if (g) {
        const k = g.ce - g.c0;
        let a = 0;
        if (g.h && g.st && k > 0) {
          const p2 = W.def_input(h.s, k);
          views();
          m8.set(g.b.slice(g.c0, g.ce), p2);
          a = W.fz_crc32(0, p2, k);
        }
        strm.adler = a;
      }
      throw e;
    }
  }
  const s = h.s;
  const p = w.def_input(s, ext ? 0 : n);
  if (!ext) {
    views();
    m8.set(input, p);
  }
  let handler = null;
  if (streaming) {
    handler = (kind, ptr, len, chunkSize) => {
      syncStrm(strm, false);
      views();
      const chunk = new Uint8Array(chunkSize);
      chunk.set(m8.subarray(ptr, ptr + len));
      strm.output = chunk;
      self2.onData(kind === 0 ? chunk : chunk.subarray(0, len));
    };
  }
  return run({ h, strm, data: null, emit: handler }, () => w.def_push(s, n, flush, n0, ext), (thrown) => {
    if (thrown) w.def_res(s);
    syncStrm(strm, false);
    if (ext && typeof L !== "number") strm.avail_in = strm.avail_in === n ? L : NaN;
  });
}
function defConvert(strm, data) {
  if (typeof data === "string") strm.input = string2buf(data);
  else if (isAB(data)) strm.input = new Uint8Array(data);
  else strm.input = data;
  strm.next_in = 0;
  strm.avail_in = strm.input.length;
}
var flushMode = (f) => f === ~~f ? f : f === true ? Z_FINISH : Z_NO_FLUSH;
function Deflate(options) {
  this.options = assign({ level: -1, method: 8, chunkSize: 16384, windowBits: 15, memLevel: 8, strategy: 0 }, options || {});
  const opt = this.options;
  if (opt.raw && opt.windowBits > 0) opt.windowBits = -opt.windowBits;
  else if (opt.gzip && opt.windowBits > 0 && opt.windowBits < 16) opt.windowBits += 16;
  this.err = 0;
  this.msg = "";
  this.ended = false;
  this.chunks = [];
  this.strm = new ZStream();
  this.strm.avail_out = 0;
  const s = defInit(this, opt, true);
  if (registry) registry.register(this, [0, s], this);
}
Deflate.prototype.push = function(data, flush_mode) {
  const h = this[S];
  if (this.ended) return false;
  const fm = flushMode(flush_mode);
  const strm = this.strm;
  defConvert(strm, data);
  const ret = defPush(this, h, strm, fm, true);
  const r = res();
  if (m32[r + R_ENDED]) {
    const st = m32[r + R_END_STATUS];
    strm.state = null;
    this.onEnd(st);
    this.ended = true;
    releaseDef(h.s);
    h.s = 0;
    if (registry) registry.unregister(this);
    return st === Z_OK;
  }
  return ret === 1;
};
Deflate.prototype.onData = function(chunk) {
  this.chunks.push(chunk);
};
Deflate.prototype.onEnd = function(status) {
  if (status === Z_OK) this.result = flattenChunks(this.chunks);
  this.chunks = [];
  this.err = status;
  this.msg = this.strm.msg;
};
var DP = Deflate.prototype;
var dPush = DP.push;
var dData = DP.onData;
var dEnd = DP.onEnd;
function deflate(input, options) {
  if (DP.push !== dPush || DP.onData !== dData || DP.onEnd !== dEnd) {
    const deflator = new Deflate(options);
    deflator.push(input, true);
    if (deflator.err) throw deflator.msg || msg[deflator.err];
    return deflator.result;
  }
  const opt = assign({ level: -1, method: 8, chunkSize: 16384, windowBits: 15, memLevel: 8, strategy: 0 }, options || {});
  if (opt.raw && opt.windowBits > 0) opt.windowBits = -opt.windowBits;
  else if (opt.gzip && opt.windowBits > 0 && opt.windowBits < 16) opt.windowBits += 16;
  const cs = opt.chunkSize;
  let s, total;
  const t = tagOf(input);
  if ((typeof input === "string" || isBytes(t) || isAB(input)) && !opt.dictionary && typeof cs === "number" && cs >= 1 && cs <= 1 << 30 && cs % 1 === 0) {
    const p2 = defParams(opt);
    if (p2.wrap === 2 && opt.header || p2.cfg === 10) s = 0;
    else {
      const data = typeof input === "string" ? string2buf(input) : t ? input : new Uint8Array(input);
      const w = wasm();
      s = w.def_init(defPool, p2.cfg, p2.flags, p2.wrap, p2.wlog, p2.hlog, p2.hshift, p2.llog, 0, stdHeader(p2));
      defPool = 0;
      const n2 = data.length;
      const ptr = w.def_input(s, n2);
      views();
      m8.set(data, ptr);
      w.def_push(s, n2, Z_FINISH, cs, 0);
      defPool = s;
      total = n2;
    }
  }
  if (!s) {
    const self2 = { options: opt };
    const strm = self2.strm = new ZStream();
    s = defInit(self2, opt, false);
    const h = self2[S];
    try {
      defConvert(strm, input);
      defPush(self2, h, strm, Z_FINISH, false);
    } finally {
      defPool = s;
    }
    total = strm.total_in;
  }
  const r = res();
  const status = m32[r + R_END_STATUS];
  if (!m32[r + R_ENDED] || status !== Z_OK) {
    const m = m32[r + R_MSG];
    throw m && msg[m] || msg[status];
  }
  const p = mu32[r + R_OUT_PTR], n = mu32[r + R_OUT_LEN];
  const out = m8.slice(p, p + n);
  if (n > TRIM || total > TRIM) W.def_trim(s, TRIM);
  return out;
}
function deflateRaw(input, options) {
  options = options || {};
  options.raw = true;
  return deflate(input, options);
}
function gzip(input, options) {
  options = options || {};
  options.gzip = true;
  return deflate(input, options);
}
var NAN_WBITS = 255;
function infNormalize(options) {
  const opt = assign({ chunkSize: 1024 * 64, windowBits: 15, to: "" }, options || {});
  if (opt.raw && opt.windowBits >= 0 && opt.windowBits < 16) {
    opt.windowBits = -opt.windowBits;
    if (opt.windowBits === 0) opt.windowBits = -15;
  }
  if (opt.windowBits >= 0 && opt.windowBits < 16 && !(options && options.windowBits)) opt.windowBits += 32;
  if (opt.windowBits > 15 && opt.windowBits < 48) {
    if ((opt.windowBits & 15) === 0) opt.windowBits |= 15;
  }
  return opt;
}
function infWrap(opt) {
  let windowBits = opt.windowBits, wrap2;
  if (windowBits < 0) {
    wrap2 = 0;
    windowBits = -windowBits;
  } else {
    wrap2 = (windowBits >> 4) + 5;
    if (windowBits < 48) windowBits &= 15;
  }
  if (windowBits && (windowBits < 8 || windowBits > 15)) throw new Error(msg[-2]);
  return wrap2 << 8 | (windowBits === 0 ? 0 : windowBits >= 8 ? Math.floor(windowBits) : NAN_WBITS);
}
function infInit(self2, opt, streaming) {
  const ww = infWrap(opt), wrap2 = ww >> 8, wbits = ww & 255;
  const w = wasm();
  let s;
  if (streaming) s = w.inf_init(freeInf.length ? freeInf.pop() : 0, wrap2, wbits, 1);
  else {
    s = w.inf_init(infPool, wrap2, wbits, 0);
    infPool = 0;
  }
  const h = { s, p: null, hdr: false, head: null, preset: false, gz: null, hv: 0, wrap: wrap2, dict: void 0, dictErr: null, nanTotal: false, wide: false };
  hidden(self2, h);
  const strm = self2.strm;
  if (wrap2) strm.adler = wrap2 & 1;
  strm.state = {};
  if (streaming) self2.header = new GZheader();
  if (opt.dictionary) {
    try {
      if (typeof opt.dictionary === "string") opt.dictionary = string2buf(opt.dictionary);
      else if (isAB(opt.dictionary)) opt.dictionary = new Uint8Array(opt.dictionary);
      if (opt.raw) {
        const dictionary = opt.dictionary;
        void dictionary.length;
        if (wrap2 !== 0) throw new Error(msg[-2]);
        const src = dictionary;
        if (!tagOf(src)) src.subarray(0, 0);
        infDict(h, dictionary, 1);
      } else if (wrap2) infDict(h, opt.dictionary, 0);
      else h.dict = opt.dictionary;
    } catch (e) {
      if (streaming) releaseInf(s);
      else infPool = s;
      throw e;
    }
  }
  return s;
}
var DICT_JS = 1;
var DICT_POISON = 2;
var DICT_THROW = 3;
var DICT_NONE = 4;
function infDict(h, dict, raw) {
  h.dict = dict;
  h.dictErr = null;
  let bytes2 = null, id = 0, kind = DICT_NONE;
  if (dict) {
    const t = tagOf(dict);
    if (isBytes(t)) {
      bytes2 = dict;
      kind = 0;
    } else {
      try {
        if (!raw) id = adler32(1, dict, dict.length, 0);
        kind = DICT_JS;
        if (t) bytes2 = new Uint8Array(dict);
        else kind = DICT_POISON;
      } catch (e) {
        if (raw) throw e;
        h.dictErr = e;
        kind = DICT_THROW;
      }
    }
  }
  const n = bytes2 ? bytes2.length : 0;
  const ptr = W.inf_input(h.s, n);
  views();
  if (bytes2) m8.set(bytes2, ptr);
  W.inf_set_dict(h.s, n, raw, kind, id);
}
var IF_AB = 1;
var IF_STRING = 2;
var IF_WIDE = 4;
var IF_NAN = 8;
var IF_NULL = 16;
function infPush(self2, h, strm, data, flush, streaming) {
  const opt = self2.options;
  const cs = opt.chunkSize;
  const n0 = chunkNum(cs);
  const dictionary = opt.dictionary;
  const toString = opt.to === "string";
  const input = strm.input;
  const L = strm.avail_in;
  const t = tagOf(input);
  let n = 0, flags = (isAB(data) ? IF_AB : 0) | (toString ? IF_STRING : 0);
  let bytes2 = null;
  if (h.wide) bytes2 = null;
  else if (isBytes(t)) bytes2 = input;
  else if (t && byteValued(input)) bytes2 = input;
  if (!bytes2) {
    h.wide = true;
    flags |= IF_WIDE;
    const v = typeof L === "number" || L === void 0 ? L : +L;
    if (v >= (typeof L === "number" ? 0 : 1) && v % 1 === 0 && v < 2 ** 31) n = v;
    else if (v !== v || v === void 0) {
      flags |= IF_NAN;
      n = 1 << 30;
    } else throw unsupported("input length " + String(L), "pako reads at fractional or negative positions");
    if (!input) flags |= IF_NULL;
  }
  const w = W;
  const s = h.s;
  if (dictionary !== h.dict && h.wrap) infDict(h, dictionary, 0);
  if (bytes2) {
    n = bytes2.length;
    const p = w.inf_input(s, n);
    views();
    m8.set(bytes2, p);
  } else w.inf_input(s, 0);
  let handler = null;
  if (streaming) {
    handler = (kind, ptr, len, chunkSize) => {
      syncStrm(strm, true);
      if (h.nanTotal) strm.total_in = NaN;
      syncHeader(self2, h, false);
      views();
      if (kind === 2) {
        self2.onData(buf2string(m8.subarray(ptr, ptr + len)));
      } else {
        const chunk = new Uint8Array(chunkSize);
        chunk.set(m8.subarray(ptr, ptr + len));
        strm.output = chunk;
        self2.onData(kind === 0 ? chunk : chunk.subarray(0, len));
      }
    };
  }
  return run({ h, strm, data, emit: handler }, () => w.inf_push(s, n, flush, flags, n0), (thrown) => {
    if (thrown) w.inf_res(s);
    syncStrm(strm, true);
    if (flags & IF_NAN) {
      strm.avail_in = strm.next_in ? NaN : L;
      if (!(flags & IF_NULL)) h.nanTotal = true;
    }
    if (h.nanTotal) strm.total_in = NaN;
    if (streaming) syncHeader(self2, h, thrown);
  });
}
function byteValued(a) {
  for (let i = 0, l = a.length; i < l; i++) {
    const v = a[i];
    if (!(typeof v === "number" && v >= 0 && v <= 255 && v % 1 === 0)) return false;
  }
  return true;
}
function infConvert(strm, data) {
  if (isAB(data)) strm.input = new Uint8Array(data);
  else strm.input = data;
  strm.next_in = 0;
  strm.avail_in = strm.input.length;
}
function GZheader() {
  this.text = 0;
  this.time = 0;
  this.xflags = 0;
  this.os = 0;
  this.extra = null;
  this.extra_len = 0;
  this.name = "";
  this.comment = "";
  this.hcrc = 0;
  this.done = false;
}
var u16str = (p, n) => {
  let str = "";
  for (let i = 0; i < n; i += 8192) str += String.fromCharCode.apply(null, m16.subarray((p >> 1) + i, (p >> 1) + Math.min(n, i + 8192)));
  return str;
};
function syncHeader(self2, h, always) {
  const r = res();
  const v = m32[r + R_HV];
  if (always || v !== h.hv) {
    h.hv = v;
    readHeader(self2, h.s);
  }
}
function readHeader(self2, s) {
  const h = W.inf_header(s);
  views();
  const i = h >> 2, f = h >> 3;
  const hd = self2.header;
  hd.text = mu32[i + 4];
  hd.time = mf64[f];
  hd.xflags = mu32[i + 5];
  hd.os = m32[i + 6];
  const el = m32[i + 8];
  hd.extra = el < 0 ? null : m8.slice(mu32[i + 7], mu32[i + 7] + el);
  hd.extra_len = mf64[f + 1];
  const nl = m32[i + 10];
  hd.name = nl < 0 ? null : u16str(mu32[i + 9], nl);
  const cl = m32[i + 12];
  hd.comment = cl < 0 ? null : u16str(mu32[i + 11], cl);
  hd.hcrc = mu32[i + 13];
  hd.done = !!mu32[i + 14];
}
function Inflate(options) {
  this.options = infNormalize(options);
  this.err = 0;
  this.msg = "";
  this.ended = false;
  this.chunks = [];
  this.strm = new ZStream();
  this.strm.avail_out = 0;
  const s = infInit(this, this.options, true);
  if (registry) registry.register(this, [1, s], this);
}
Inflate.prototype.push = function(data, flush_mode) {
  const h = this[S];
  if (this.ended) return false;
  const fm = flushMode(flush_mode);
  const strm = this.strm;
  infConvert(strm, data);
  const ret = infPush(this, h, strm, data, fm, true);
  const r = res();
  if (m32[r + R_ENDED]) {
    const st = m32[r + R_END_STATUS];
    if (st === Z_OK) strm.state = null;
    this.onEnd(st);
    this.ended = true;
    releaseInf(h.s);
    h.s = 0;
    if (registry) registry.unregister(this);
    return st === Z_OK;
  }
  return ret === 1;
};
Inflate.prototype.onData = function(chunk) {
  this.chunks.push(chunk);
};
Inflate.prototype.onEnd = function(status) {
  if (status === Z_OK) {
    if (this.options.to === "string") this.result = this.chunks.join("");
    else this.result = flattenChunks(this.chunks);
  }
  this.chunks = [];
  this.err = status;
  this.msg = this.strm.msg;
};
var IP = Inflate.prototype;
var iPush = IP.push;
var iData = IP.onData;
var iEnd = IP.onEnd;
function inflate(input, options) {
  if (IP.push !== iPush || IP.onData !== iData || IP.onEnd !== iEnd) {
    const inflator = new Inflate(options);
    inflator.push(input);
    if (inflator.err) throw inflator.msg || msg[inflator.err];
    return inflator.result;
  }
  const opt = infNormalize(options);
  const cs = opt.chunkSize;
  let s = 0;
  const t = tagOf(input);
  if ((isBytes(t) || isAB(input)) && !opt.dictionary && typeof cs === "number" && cs >= 1 && cs <= 1 << 30 && cs % 1 === 0) {
    const ww = infWrap(opt);
    const data = t ? input : new Uint8Array(input);
    const w = wasm();
    s = w.inf_init(infPool, ww >> 8, ww & 255, 0);
    infPool = 0;
    const ptr = w.inf_input(s, data.length);
    views();
    m8.set(data, ptr);
    w.inf_push(s, data.length, Z_NO_FLUSH, (t ? 0 : IF_AB) | (opt.to === "string" ? IF_STRING : 0), cs);
    infPool = s;
  } else {
    const self2 = { options: opt };
    const strm = self2.strm = new ZStream();
    s = infInit(self2, opt, false);
    const h = self2[S];
    try {
      infConvert(strm, input);
      infPush(self2, h, strm, input, Z_NO_FLUSH, false);
    } finally {
      infPool = s;
    }
  }
  const r = res();
  let out;
  if (m32[r + R_ENDED]) {
    const status = m32[r + R_END_STATUS];
    if (status !== Z_OK) throw INF_MSG[m32[r + R_MSG]] || msg[status];
    if (opt.to === "string") {
      const segs = m32[r + R_SEG_PTR] >> 2, ns = m32[r + R_SEG_LEN], base = mu32[r + R_OUT_PTR];
      let str = "";
      for (let i = 0; i < ns; i++) {
        const a = base + mu32[segs + 2 * i], n = mu32[segs + 2 * i + 1];
        str += buf2string(m8.subarray(a, a + n));
      }
      out = str;
    } else {
      const p = mu32[r + R_OUT_PTR], n = mu32[r + R_OUT_LEN];
      out = m8.slice(p, p + n);
    }
  }
  if (mu32[r + R_OUT_LEN] > TRIM || mu32[r + R_NEXT_IN] > TRIM) W.inf_trim(s, TRIM);
  return out;
}
function inflateRaw(input, options) {
  options = options || {};
  options.raw = true;
  return inflate(input, options);
}
var ungzip = inflate;
var pako_default = {
  Deflate,
  deflate,
  deflateRaw,
  gzip,
  Inflate,
  inflate,
  inflateRaw,
  ungzip,
  constants
};

// ../node/helpers/foreground-activity.ts
var lastForegroundAt = 0;
var inFlight = 0;
function lastForegroundActivity() {
  return inFlight > 0 ? Date.now() : lastForegroundAt;
}

// ../node/memory-volume.ts
var COLD_PACKAGE_FILE = /\.map$|\.d\.[cm]?ts$|\.(md|markdown|txt)$|^(license|licence|changelog|readme|authors|notice|history)/i;
function yieldForBackgroundWork() {
  const ric = globalThis.requestIdleCallback;
  return new Promise((resolve) => {
    if (typeof ric === "function") ric(() => resolve(), { timeout: 1e3 });
    else setTimeout(resolve, 0);
  });
}
var NEEDS_NORMALIZING = /\/\/|\/\.\.?(?:\/|$)/;
function isInstalledPackagePath(path) {
  const at = path.indexOf("/node_modules/");
  return at >= 0 && path.charCodeAt(at + 14) !== 46;
}
function residentBytes(node) {
  if (node.kind === "file") {
    const bytes2 = node.inode ? node.inode.content : node.content;
    return bytes2 ? bytes2.byteLength : 0;
  }
  let total = 0;
  if (node.kind === "directory" && node.children) {
    for (const child of node.children.values()) total += residentBytes(child);
  }
  return total;
}
var PACK_AFTER_WRITES_MS = 2e3;
var PACK_AFTER_READS_MS = 1e3;
var PACK_AFTER_WRITES_MAX_WAIT_MS = 2e4;
var PACK_AFTER_WRITES_MIN_BYTES = 1024 * 1024;
var PACK_IN_FLIGHT_BYTES = 4 * 1024 * 1024;
var PACK_FOREGROUND_POLL_MS = 250;
var PACK_CHUNK_BYTES = 128 * 1024;
var PACK_SOLO_BYTES = 512 * 1024;
var PACK_MIN_FILE_BYTES = 256;
var PACK_QUIET_MS = 15e3;
var PACK_MIN_INTERVAL_MS = 6e4;
var PACK_SLICE_MS = 8;
var INFLATED_CHUNK_CACHE = 48;
var INFLATED_CHUNK_IDLE_MS = 3e3;
var READ_AHEAD_BYTES = 256 * 1024;
var MAX_MERGE_GAP = 16 * 1024;
var MAX_MERGED_READ = 4 * 1024 * 1024;
function pagedOutError(path) {
  const err = new Error(
    `EAGAIN: '${path}' is paged out; read it with await nodepod.fs.readFile() or call volume.ensureResident() first`
  );
  err.code = "EAGAIN";
  err.errno = -11;
  err.syscall = "open";
  err.path = path;
  return err;
}
function isTransientMiss(err) {
  const code = err?.code;
  return code === "ETIMEDOUT" || code === "EAGAIN";
}
function countPathSegments(path) {
  let depth2 = 0;
  for (let index = 0; index < path.length; index++) {
    if (path.charCodeAt(index) === 47) depth2++;
  }
  return depth2;
}
var FSWatcher = class {
  _listeners = /* @__PURE__ */ new Map();
  _closeFn = null;
  _closed = false;
  constructor(closeFn) {
    this._closeFn = closeFn;
  }
  close() {
    if (this._closed) return;
    this._closed = true;
    if (this._closeFn) {
      this._closeFn();
      this._closeFn = null;
    }
    this.emit("close");
    this._listeners.clear();
  }
  ref() {
    return this;
  }
  unref() {
    return this;
  }
  on(event, listener) {
    if (!this._listeners.has(event)) this._listeners.set(event, []);
    this._listeners.get(event).push(listener);
    return this;
  }
  addListener(event, listener) {
    return this.on(event, listener);
  }
  once(event, listener) {
    const wrapped = (...args) => {
      this.removeListener(event, wrapped);
      listener(...args);
    };
    return this.on(event, wrapped);
  }
  off(event, listener) {
    return this.removeListener(event, listener);
  }
  removeListener(event, listener) {
    const list = this._listeners.get(event);
    if (list) {
      const idx = list.indexOf(listener);
      if (idx >= 0) list.splice(idx, 1);
    }
    return this;
  }
  removeAllListeners(event) {
    if (event) this._listeners.delete(event);
    else this._listeners.clear();
    return this;
  }
  emit(event, ...args) {
    const list = this._listeners.get(event);
    if (!list || list.length === 0) return false;
    for (const fn of [...list]) {
      try {
        fn(...args);
      } catch (e) {
        console.error("[FSWatcher] listener error:", e);
      }
    }
    return true;
  }
};
var SYSTEM_ERRNOS = {
  ENOENT: -2,
  ENOTDIR: -20,
  EISDIR: -21,
  EEXIST: -17,
  ENOTEMPTY: -39,
  ELOOP: -40,
  EACCES: -13
};
var SYSTEM_ERROR_DESCRIPTIONS = {
  ENOENT: "no such file or directory",
  ENOTDIR: "not a directory",
  EISDIR: "is a directory",
  EEXIST: "file already exists",
  ENOTEMPTY: "directory not empty",
  ELOOP: "too many symbolic links encountered",
  EACCES: "permission denied"
};
var STAT_TRUE = () => true;
var STAT_FALSE = () => false;
function makeSystemError(code, syscall2, targetPath, detail) {
  const err = new Error(
    detail || `${code}: ${SYSTEM_ERROR_DESCRIPTIONS[code]}, ${syscall2} '${targetPath}'`
  );
  err.code = code;
  err.errno = SYSTEM_ERRNOS[code];
  err.syscall = syscall2;
  err.path = targetPath;
  return err;
}
var MemoryVolume = class _MemoryVolume {
  tree;
  _disposed = false;
  textEncoder = new TextEncoder();
  textDecoder = new TextDecoder();
  // lean spawn mode (see VolumeMissHandler)
  _missHandler = null;
  _lazyDirNames = [];
  _lazyListed = /* @__PURE__ */ new Set();
  _lazyNegative = /* @__PURE__ */ new Set();
  // paths invalidated by main (large-file broadcast) — re-fetchable via the
  // miss handler even when outside the lazy dir names
  _lazyInvalidated = /* @__PURE__ */ new Set();
  _lazyResident = /* @__PURE__ */ new Map();
  _lazyResidentBytes = 0;
  _lazyResidentMaxBytes;
  // unique ino per path. rust walkdir with follow_links(true) tracks visited
  // (dev,ino) pairs to break cycles, so ino=0 for everything makes it drop
  // every file as "already visited".
  _inos = /* @__PURE__ */ new Map();
  _nextIno = 1;
  // Reverse index for hardlink-aware lazy eviction and file-handle writes.
  // Keeping this alongside the tree avoids a full filesystem walk whenever
  // all aliases of an inode need to be updated.
  // an inode's paths: the path itself while it has one (nearly every file),
  // a Set once hard links give it more
  _inodePaths = /* @__PURE__ */ new Map();
  _mutationListeners = /* @__PURE__ */ new Set();
  _metaListeners = /* @__PURE__ */ new Set();
  _silentMountListeners = /* @__PURE__ */ new Set();
  _journalMute = 0;
  // main-thread eviction of pack-backed content (enableEviction)
  _contentSource = null;
  _residentBudget = 0;
  _srcResident = /* @__PURE__ */ new Map();
  _srcResidentBytes = 0;
  _evictionPaused = 0;
  _hydrating = /* @__PURE__ */ new Map();
  // per pack, inodes sorted by offset (for read-ahead)
  _packIndex = /* @__PURE__ */ new Map();
  _packIndexDirty = /* @__PURE__ */ new Set();
  _pagedOutSyncMisses = 0;
  // enableContentPacking
  _packState = null;
  _inflatedChunks = [];
  _inflatedTimer = null;
  // peekFileSync reading through readFileSync: a copy, not a use
  _peeking = false;
  get _journaling() {
    return this._journalMute === 0 && this._mutationListeners.size > 0;
  }
  _journal(mutation) {
    for (const cb of this._mutationListeners) {
      try {
        cb(mutation);
      } catch (e) {
        console.error("Volume mutation listener error:", e);
      }
    }
  }
  _fileInode(node) {
    if (node.kind !== "file") throw makeSystemError("EISDIR", "open", "");
    if (!node.inode) {
      const modified = node.modified || Date.now();
      node.inode = {
        ino: this._nextIno++,
        content: node.content,
        mode: 420,
        atime: modified,
        mtime: modified,
        ctime: modified,
        nlink: 1,
        uid: node.uid ?? MOCK_IDS.UID,
        gid: node.gid ?? MOCK_IDS.GID
      };
      node.content = void 0;
    }
    return node.inode;
  }
  _fileContent(node) {
    return this._fileInode(node).content;
  }
  _linkInodePath(path, inode) {
    const paths = this._inodePaths.get(inode);
    if (paths === void 0) {
      this._inodePaths.set(inode, path);
    } else if (typeof paths === "string") {
      if (paths !== path) this._inodePaths.set(inode, /* @__PURE__ */ new Set([paths, path]));
    } else {
      paths.add(path);
    }
  }
  _unlinkInodePath(path, inode) {
    const paths = this._inodePaths.get(inode);
    if (paths === void 0) return;
    if (typeof paths === "string") {
      if (paths === path) this._inodePaths.delete(inode);
      return;
    }
    paths.delete(path);
    if (paths.size === 0) this._inodePaths.delete(inode);
  }
  _inodePathCount(inode) {
    const paths = this._inodePaths.get(inode);
    if (paths === void 0) return void 0;
    return typeof paths === "string" ? 1 : paths.size;
  }
  _fileInodeAt(path, node) {
    const inode = this._fileInode(node);
    if (!this._inodePaths.has(inode)) this._linkInodePath(path, inode);
    return inode;
  }
  _pathsForInode(inode) {
    const paths = this._inodePaths.get(inode);
    if (paths === void 0) return [];
    return typeof paths === "string" ? [paths] : [...paths];
  }
  // nodes currently linked to this inode (skips stale registrations)
  _nodesForInode(inode) {
    const out = [];
    for (const path of this._pathsForInode(inode)) {
      const node = this._locateCanonical(path);
      if (node?.kind === "file" && node.inode === inode) out.push({ path, node });
    }
    return out;
  }
  _releaseNodeLinks(node, path) {
    if (node.kind === "file") {
      const inode = this._fileInodeAt(path, node);
      this._unlinkInodePath(path, inode);
      inode.nlink = Math.max(0, inode.nlink - 1);
      inode.ctime = Date.now();
      if (inode.src && !this._inodePaths.has(inode)) this._dropSource(inode);
      return;
    }
    if (node.kind !== "directory" || !node.children) return;
    for (const [name, child] of node.children) {
      this._releaseNodeLinks(child, path === "/" ? `/${name}` : `${path}/${name}`);
    }
  }
  _remapNodeInodePaths(node, from3, to) {
    if (node.kind === "file") {
      const inode = this._fileInodeAt(from3, node);
      this._unlinkInodePath(from3, inode);
      this._linkInodePath(to, inode);
      return;
    }
    if (node.kind !== "directory" || !node.children) return;
    for (const [name, child] of node.children) {
      const oldPath = from3 === "/" ? `/${name}` : `${from3}/${name}`;
      const newPath = to === "/" ? `/${name}` : `${to}/${name}`;
      this._remapNodeInodePaths(child, oldPath, newPath);
    }
  }
  _inoFor(path) {
    let n = this._inos.get(path);
    if (n === void 0) {
      n = this._nextIno++;
      this._inos.set(path, n);
    }
    return n;
  }
  // decode arbitrary input to UTF-8. handles Uint8Array (including SAB-backed
  // which TextDecoder rejects directly), ArrayBuffer, other TypedArray views,
  // and plain arrays from postMessage(Array.from(u8)). must never throw —
  // broadcast calls this and a throw would hide writes from watchers
  decodeText(data) {
    try {
      if (data == null) return "";
      if (data instanceof Uint8Array) {
        if (typeof SharedArrayBuffer !== "undefined" && data.buffer instanceof SharedArrayBuffer) {
          const copy = new Uint8Array(data.byteLength);
          copy.set(data);
          return this.textDecoder.decode(copy);
        }
        return this.textDecoder.decode(data);
      }
      if (data instanceof ArrayBuffer) {
        return this.textDecoder.decode(data);
      }
      if (ArrayBuffer.isView(data)) {
        const view = data;
        const u8 = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
        if (typeof SharedArrayBuffer !== "undefined" && u8.buffer instanceof SharedArrayBuffer) {
          const copy = new Uint8Array(u8.byteLength);
          copy.set(u8);
          return this.textDecoder.decode(copy);
        }
        return this.textDecoder.decode(u8);
      }
      if (Array.isArray(data) || typeof data.length === "number") {
        const u8 = Uint8Array.from(data);
        return this.textDecoder.decode(u8);
      }
      return String(data);
    } catch {
      return "";
    }
  }
  // normalize any input shape that can reach writeFileSync (string, Uint8Array,
  // ArrayBuffer, TypedArray view, plain array) into a proper Uint8Array
  toBytes(data) {
    if (typeof data === "string") return this.textEncoder.encode(data);
    if (data == null) return new Uint8Array(0);
    if (data instanceof Uint8Array) return data;
    if (data instanceof ArrayBuffer) return new Uint8Array(data);
    if (ArrayBuffer.isView(data)) {
      const view = data;
      return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
    }
    if (Array.isArray(data) || typeof data.length === "number") {
      return Uint8Array.from(data);
    }
    return this.textEncoder.encode(String(data));
  }
  activeWatchers = /* @__PURE__ */ new Map();
  subscribers = /* @__PURE__ */ new Map();
  _handler;
  _bulkMountHandler = null;
  // lazily hydrated package content kept per worker; older bytes are
  // dropped (LRU) and re-read from the main thread if touched again
  constructor(handler, lazyResidentMaxBytes = 32 * 1024 * 1024) {
    this._handler = handler ?? null;
    this._lazyResidentMaxBytes = Math.max(1, lazyResidentMaxBytes);
    this.tree = {
      kind: "directory",
      children: /* @__PURE__ */ new Map(),
      modified: Date.now()
    };
  }
  on(event, handler) {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, /* @__PURE__ */ new Set());
    }
    this.subscribers.get(event).add(handler);
    return this;
  }
  off(event, handler) {
    const handlers = this.subscribers.get(event);
    if (handlers) handlers.delete(handler);
    return this;
  }
  setBulkMountHandler(handler) {
    this._bulkMountHandler = handler;
  }
  /**
   * Subscribe to metadata changes only (chmod/chown/utimes and their l*
   * variants), with the fields that changed. Cheaper than onMutation, which
   * resolves canonical paths for every mutation. Returns an unsubscribe fn.
   */
  onMetaChange(cb) {
    this._metaListeners.add(cb);
    return () => {
      this._metaListeners.delete(cb);
    };
  }
  /** Subscribe to every logical mutation (see VolumeMutation). Returns an unsubscribe fn. */
  /**
   * Entries mounted without notify (bulk restores) fire no watchers: `cb`
   * gets their paths, so processes that listed those directories earlier
   * can look again. Cheaper than onMutation, which journals every change.
   */
  onSilentMount(cb) {
    this._silentMountListeners.add(cb);
    return () => {
      this._silentMountListeners.delete(cb);
    };
  }
  onMutation(cb) {
    this._mutationListeners.add(cb);
    return () => {
      this._mutationListeners.delete(cb);
    };
  }
  /**
   * lstat-like view of the node at exactly `p`: no symlink is followed, not
   * even in a parent directory (null for paths that only exist through
   * one). Never hydrates lazy content and never throws. `inode` is an
   * opaque identity token shared by hardlinks and stable across renames.
   */
  inspectNode(p) {
    let norm;
    let node;
    try {
      norm = this.normalize(p);
      node = this._locateCanonical(norm);
    } catch {
      return null;
    }
    if (!node) return null;
    if (node.kind === "directory") {
      return {
        kind: "directory",
        mode: node.mode ?? 493,
        uid: node.uid,
        gid: node.gid,
        mtimeMs: node.modified,
        atimeMs: node.atime ?? node.modified,
        size: 0,
        resident: true
      };
    }
    if (node.kind === "symlink") {
      return {
        kind: "symlink",
        mode: node.mode ?? 511,
        uid: node.uid,
        gid: node.gid,
        mtimeMs: node.modified,
        atimeMs: node.atime ?? node.modified,
        size: (node.target ?? "").length,
        target: node.target,
        symlinkType: node.symlinkType,
        resident: true
      };
    }
    const inode = this._fileInodeAt(norm, node);
    const packed2 = inode.packed;
    const resident = !node.lazy && (inode.content !== void 0 || !!packed2);
    const info = {
      kind: "file",
      mode: inode.mode,
      uid: inode.uid ?? node.uid,
      gid: inode.gid ?? node.gid,
      mtimeMs: inode.mtime,
      atimeMs: inode.atime,
      size: inode.content?.byteLength ?? packed2?.length ?? node.lazySize ?? inode.src?.length ?? 0,
      resident,
      inode,
      content: resident ? inode.content : void 0
    };
    if (resident && packed2 && inode.content === void 0) {
      const volume = this;
      Object.defineProperty(info, "content", {
        enumerable: true,
        get: () => volume._peekPacked(packed2)
      });
    }
    return info;
  }
  /** Rebuild internal inode indexes after an external tree replacement. */
  rebuildIndexes() {
    this._inodePaths.clear();
    this._inos.clear();
    let maxIno = 0;
    const visit = (node, path) => {
      if (node.kind === "file") {
        const inode = this._fileInode(node);
        maxIno = Math.max(maxIno, inode.ino);
        this._linkInodePath(path, inode);
        return;
      }
      if (node.kind !== "directory" || !node.children) return;
      for (const [name, child] of node.children) {
        visit(child, path === "/" ? `/${name}` : `${path}/${name}`);
      }
    };
    visit(this.tree, "/");
    this._nextIno = Math.max(1, maxIno + 1);
  }
  broadcast(event, ...args) {
    const handlers = this.subscribers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(...args);
        } catch (e) {
          console.error("Volume event handler error:", e);
        }
      }
    }
  }
  // ---- Stats ----
  getStats() {
    let fileCount = 0;
    let totalBytes = 0;
    let dirCount = 0;
    let pagedOutFiles = 0;
    let pagedOutBytes = 0;
    let packedFiles = 0;
    let packedBytes = 0;
    const chunks = /* @__PURE__ */ new Set();
    const walk = (node) => {
      if (node.kind === "file") {
        fileCount++;
        const inode = this._fileInode(node);
        totalBytes += inode.content?.byteLength ?? 0;
        if (inode.content === void 0 && inode.src) {
          pagedOutFiles++;
          pagedOutBytes += inode.src.length;
        }
        if (inode.packed) {
          packedFiles++;
          packedBytes += inode.packed.length;
          chunks.add(inode.packed.chunk);
        }
      } else if (node.kind === "directory") {
        dirCount++;
        if (node.children) {
          for (const child of node.children.values()) walk(child);
        }
      }
    };
    walk(this.tree);
    let watcherCount = 0;
    for (const set of this.activeWatchers.values()) watcherCount += set.size;
    return {
      fileCount,
      totalBytes,
      dirCount,
      watcherCount,
      lazyResidentBytes: this._lazyResidentBytes,
      pagedOutFiles,
      pagedOutBytes,
      residentPackBytes: this._srcResidentBytes,
      pagedOutSyncMisses: this._pagedOutSyncMisses,
      packedFiles,
      packedBytes,
      packedStoredBytes: [...chunks].reduce((sum, chunk) => sum + chunk.bytes.byteLength, 0)
    };
  }
  /** Clean up all owned data and listeners. A disposed volume is empty. */
  dispose() {
    if (this._disposed) return;
    this._disposed = true;
    this.activeWatchers.clear();
    this.subscribers.clear();
    this.globalChangeListeners.clear();
    this._mutationListeners.clear();
    this._metaListeners.clear();
    this._missHandler = null;
    this._bulkMountHandler = null;
    this._lazyDirNames = [];
    this._lazyListed.clear();
    this._lazyNegative.clear();
    this._lazyInvalidated.clear();
    this._lazyResident.clear();
    this._lazyResidentBytes = 0;
    this._contentSource = null;
    this._srcResident.clear();
    this._srcResidentBytes = 0;
    this._hydrating.clear();
    this._packIndex.clear();
    this._packIndexDirty.clear();
    if (this._packState?.timer) clearTimeout(this._packState.timer);
    this._packState = null;
    if (this._inflatedTimer) clearTimeout(this._inflatedTimer);
    this._inflatedTimer = null;
    this._inflatedChunks = [];
    this._inos.clear();
    this._inodePaths.clear();
    this.tree = {
      kind: "directory",
      children: /* @__PURE__ */ new Map(),
      modified: Date.now()
    };
    if (this._handler) {
      this._handler.statCache.clear();
      this._handler.pathNormCache.clear();
    }
  }
  // ---- Snapshot serialization ----
  toSnapshot(excludePrefixes, excludeDirNames) {
    const entries = [];
    this.collectEntries("/", this.tree, entries, excludePrefixes, excludeDirNames);
    return { entries };
  }
  collectEntries(currentPath, node, result, excludePrefixes, excludeDirNames) {
    if (excludePrefixes) {
      for (const prefix of excludePrefixes) {
        if (currentPath === prefix || currentPath.startsWith(prefix + "/")) return;
      }
    }
    if (node.kind === "file") {
      if (node.lazy) return;
      let data = "";
      const inode = this._fileInodeAt(currentPath, node);
      const content = inode.content ?? (inode.packed ? this._peekPacked(inode.packed) : void 0);
      if (content && content.length > 0) {
        data = bytesToBase64(content);
      }
      result.push({
        path: currentPath,
        kind: "file",
        data,
        inode: inode.ino,
        mode: inode.mode,
        atimeMs: inode.atime,
        mtimeMs: inode.mtime,
        ctimeMs: inode.ctime,
        nlink: inode.nlink,
        uid: inode.uid ?? node.uid,
        gid: inode.gid ?? node.gid
      });
    } else if (node.kind === "symlink") {
      result.push({
        path: currentPath,
        kind: "symlink",
        target: node.target,
        mode: node.mode,
        atimeMs: node.atime,
        mtimeMs: node.modified,
        uid: node.uid,
        gid: node.gid,
        symlinkType: node.symlinkType
      });
    } else if (node.kind === "directory") {
      result.push({
        path: currentPath,
        kind: "directory",
        mode: node.mode,
        uid: node.uid,
        gid: node.gid,
        mtimeMs: node.modified
      });
      if (node.children) {
        for (const [name, child] of node.children) {
          if (excludeDirNames && child.kind === "directory" && excludeDirNames.has(name)) continue;
          const childPath = currentPath === "/" ? `/${name}` : `${currentPath}/${name}`;
          this.collectEntries(childPath, child, result, excludePrefixes, excludeDirNames);
        }
      }
    }
  }
  // restore from a binary snapshot (flat ArrayBuffer + offset manifest, used by workers)
  static fromBinarySnapshot(snapshot) {
    const vol = new _MemoryVolume();
    vol.mountEntries(_MemoryVolume._binaryToMountEntries(snapshot.manifest, new Uint8Array(snapshot.data)));
    return vol;
  }
  // merge a binary snapshot without copying file payloads or emitting events
  mountBinarySnapshot(snapshot, notifyBulk = true) {
    const mounted = this.mountEntries(
      _MemoryVolume._binaryToMountEntries(snapshot.manifest, new Uint8Array(snapshot.data))
    );
    if (notifyBulk) this._bulkMountHandler?.(snapshot);
    return mounted;
  }
  // file payloads stay views into fullData — no copy
  static _binaryToMountEntries(manifest, fullData) {
    const entries = [];
    for (const entry of manifest) {
      if (entry.isDirectory) {
        entries.push({
          path: entry.path,
          kind: "directory",
          mode: entry.mode,
          uid: entry.uid,
          gid: entry.gid,
          mtimeMs: entry.mtimeMs
        });
      } else if (entry.symlinkTarget !== void 0) {
        entries.push({
          path: entry.path,
          kind: "symlink",
          target: entry.symlinkTarget,
          mode: entry.mode,
          uid: entry.uid,
          gid: entry.gid,
          atimeMs: entry.atimeMs,
          mtimeMs: entry.mtimeMs
        });
      } else if (entry.offset >= 0 && entry.length >= 0 && entry.offset + entry.length <= fullData.byteLength) {
        entries.push({
          path: entry.path,
          kind: "file",
          content: fullData.subarray(entry.offset, entry.offset + entry.length),
          // ino numbers come from another volume: they only say which
          // entries are hardlinks of each other
          linkGroup: (entry.nlink ?? 1) > 1 ? entry.inode : void 0,
          mode: entry.mode,
          uid: entry.uid,
          gid: entry.gid,
          atimeMs: entry.atimeMs,
          mtimeMs: entry.mtimeMs,
          ctimeMs: entry.ctimeMs,
          nlink: entry.nlink
        });
      }
    }
    return entries;
  }
  static fromSnapshot(snapshot) {
    const vol = new _MemoryVolume();
    vol.mountEntries(_MemoryVolume.snapshotToMountEntries(snapshot));
    return vol;
  }
  static snapshotToMountEntries(snapshot) {
    return snapshot.entries.map((entry) => {
      if (entry.kind === "file") {
        return {
          path: entry.path,
          kind: "file",
          content: entry.data ? base64ToBytes(entry.data) : new Uint8Array(0),
          linkGroup: (entry.nlink ?? 1) > 1 ? entry.inode : void 0,
          mode: entry.mode,
          uid: entry.uid,
          gid: entry.gid,
          atimeMs: entry.atimeMs,
          mtimeMs: entry.mtimeMs,
          ctimeMs: entry.ctimeMs,
          nlink: entry.nlink
        };
      }
      if (entry.kind === "symlink") {
        return {
          path: entry.path,
          kind: "symlink",
          target: entry.target ?? "",
          symlinkType: entry.symlinkType,
          mode: entry.mode,
          uid: entry.uid,
          gid: entry.gid,
          atimeMs: entry.atimeMs,
          mtimeMs: entry.mtimeMs
        };
      }
      return {
        path: entry.path,
        kind: "directory",
        mode: entry.mode,
        uid: entry.uid,
        gid: entry.gid,
        mtimeMs: entry.mtimeMs
      };
    });
  }
  /**
   * Merge entries into the volume. Missing parents are created and an entry
   * whose path holds a node of another kind replaces it. With `notify`, every
   * entry fires the same watcher/global/mutation events a regular write
   * would. Without it, a single `mount` mutation is reported for the whole
   * batch and the new entries fire no watchers (removing a node of another
   * kind at an entry's path still does, like any removal).
   */
  mountEntries(entries, opts = {}) {
    const notify = opts.notify === true;
    this._notePackActivity();
    if (this._packState?.deflate) {
      let packageBytes = 0;
      for (const entry of entries) {
        if (entry.content && isInstalledPackagePath(entry.path)) packageBytes += entry.content.byteLength;
      }
      if (packageBytes > 0) this._notePackageWrite(packageBytes);
    }
    const groups = /* @__PURE__ */ new Map();
    const sorted = entries.map((entry, index) => ({ entry, index, depth: countPathSegments(entry.path) })).sort(
      (a, b) => a.depth - b.depth || Number(b.entry.kind === "directory") - Number(a.entry.kind === "directory") || a.index - b.index
    );
    let mounted = 0;
    if (!notify) this._journalMute++;
    try {
      for (const { entry } of sorted) {
        const path = this.normalize(entry.path);
        if (path === "/") continue;
        this._mountEntry(path, entry, groups, notify);
        mounted++;
      }
    } finally {
      if (!notify) this._journalMute--;
    }
    if (!notify && this._journaling) this._journal({ op: "mount", entries });
    if (!notify && this._silentMountListeners.size > 0 && entries.length > 0) {
      const paths = entries.map((entry) => entry.path);
      for (const cb of this._silentMountListeners) {
        try {
          cb(paths);
        } catch (e) {
          console.error("Volume mount listener error:", e);
        }
      }
    }
    return mounted;
  }
  _mountEntry(path, entry, groups, notify) {
    const existing = this.locateRaw(path);
    if (entry.kind === "directory") {
      if (existing && existing.kind !== "directory") this.unlinkSync(path);
      const { node: node2, created: created2 } = this.ensureDirTracked(path);
      this._announceCreatedDirs(created2, notify);
      if (entry.mode !== void 0) node2.mode = entry.mode;
      if (entry.uid !== void 0) node2.uid = entry.uid;
      if (entry.gid !== void 0) node2.gid = entry.gid;
      if (entry.mtimeMs !== void 0) node2.modified = entry.mtimeMs;
      return;
    }
    if (existing?.kind === "directory") this.removeTreeSync(path);
    else if (existing && (entry.kind === "symlink" || existing.kind === "symlink")) this.unlinkSync(path);
    const { node: parent, created } = this.ensureDirTracked(this.parentOf(path));
    this._announceCreatedDirs(created, notify);
    const name = this.nameOf(path);
    const now = Date.now();
    if (entry.kind === "symlink") {
      parent.children.set(name, {
        kind: "symlink",
        target: entry.target ?? "",
        modified: entry.mtimeMs ?? now,
        atime: entry.atimeMs ?? now,
        mode: entry.mode ?? 511,
        uid: entry.uid ?? MOCK_IDS.UID,
        gid: entry.gid ?? MOCK_IDS.GID,
        symlinkType: entry.symlinkType
      });
      if (this._handler) this._handler.invalidateStat(path);
      this._invalidateLazyListedFor(path);
      if (notify) {
        this.triggerWatchers(path, "rename");
        this.notifyGlobalListeners(path, "add");
      }
      if (this._journaling) this._journal({ op: "symlink", path });
      return;
    }
    if (entry.content === void 0 && entry.src) {
      const current = parent.children.get(name);
      if (current) {
        this._untrackLazyResident(path);
        this._releaseNodeLinks(current, path);
      }
      let inode2 = entry.linkGroup === void 0 ? void 0 : groups.get(entry.linkGroup);
      if (!inode2) {
        const mtime = entry.mtimeMs ?? now;
        inode2 = {
          ino: this._nextIno++,
          content: void 0,
          mode: entry.mode ?? 420,
          atime: entry.atimeMs ?? mtime,
          mtime,
          ctime: entry.ctimeMs ?? mtime,
          nlink: entry.nlink ?? 1,
          uid: entry.uid,
          gid: entry.gid,
          src: entry.src
        };
        if (entry.linkGroup !== void 0) groups.set(entry.linkGroup, inode2);
        this._indexSource(inode2);
      }
      parent.children.set(name, {
        kind: "file",
        modified: inode2.mtime,
        inode: inode2,
        lazy: true,
        lazySize: inode2.src?.length ?? 0
      });
      this._linkInodePath(path, inode2);
      if (this._handler) this._handler.invalidateStat(path);
      this._invalidateLazyListedFor(path);
      if (notify) {
        this.triggerWatchers(path, current ? "change" : "rename");
        this.notifyGlobalListeners(path, current ? "change" : "add");
      }
      if (this._journaling) this._journal({ op: "write", path });
      return;
    }
    const group = entry.linkGroup === void 0 ? void 0 : groups.get(entry.linkGroup);
    if (group) {
      const current = parent.children.get(name);
      if (current) {
        this._untrackLazyResident(path);
        this._releaseNodeLinks(current, path);
      }
      parent.children.set(name, { kind: "file", modified: group.mtime, inode: group });
      this._linkInodePath(path, group);
      if (this._handler) this._handler.invalidateStat(path);
      this._invalidateLazyListedFor(path);
      if (notify) {
        this.triggerWatchers(path, current ? "change" : "rename");
        this.notifyGlobalListeners(path, current ? "change" : "add");
      }
      if (this._journaling) this._journal({ op: "write", path });
      return;
    }
    this.writeInternal(path, entry.content ?? new Uint8Array(0), notify);
    const node = this.locateRaw(path);
    if (node?.kind !== "file") return;
    const inode = this._fileInodeAt(path, node);
    if (entry.mode !== void 0) inode.mode = entry.mode;
    if (entry.atimeMs !== void 0) inode.atime = entry.atimeMs;
    if (entry.mtimeMs !== void 0) {
      inode.mtime = entry.mtimeMs;
      node.modified = entry.mtimeMs;
    }
    if (entry.ctimeMs !== void 0) inode.ctime = entry.ctimeMs;
    if (entry.nlink !== void 0) inode.nlink = entry.nlink;
    if (entry.uid !== void 0) inode.uid = entry.uid;
    if (entry.gid !== void 0) inode.gid = entry.gid;
    if (entry.linkGroup !== void 0) groups.set(entry.linkGroup, inode);
    if (entry.src && this._contentSource) {
      inode.src = entry.src;
      this._indexSource(inode);
      this._trackSource(inode);
    }
  }
  _announceCreatedDirs(created, notify) {
    for (const path of created) {
      this._invalidateLazyListedFor(path);
      if (this._handler) this._handler.invalidateStat(path);
      if (notify) {
        this.triggerWatchers(path, "rename");
        this.notifyGlobalListeners(path, "addDir");
      }
      if (this._journaling) this._journal({ op: "mkdir", path });
    }
  }
  // ---- Path utilities ----
  normalize(p) {
    if (this._disposed) throw new Error("[Nodepod] Filesystem has been disposed");
    if (p.charCodeAt(0) === 47) {
      if ((p.length === 1 || p.charCodeAt(p.length - 1) !== 47) && !NEEDS_NORMALIZING.test(p)) return p;
    } else {
      const rooted = "/" + p;
      if ((rooted.length === 1 || rooted.charCodeAt(rooted.length - 1) !== 47) && !NEEDS_NORMALIZING.test(rooted)) return rooted;
    }
    const key = p;
    if (this._handler) {
      const cached = this._handler.pathNormCache.get(key);
      if (cached !== void 0) return cached;
    }
    if (!p.startsWith("/")) p = "/" + p;
    const parts = p.split("/").filter(Boolean);
    const resolved = [];
    for (const part of parts) {
      if (part === "..") resolved.pop();
      else if (part !== ".") resolved.push(part);
    }
    const result = "/" + resolved.join("/");
    if (this._handler) this._handler.pathNormCache.set(key, result);
    return result;
  }
  // assumes pre-normalized input (starts with '/', no '..' or double slashes)
  segments(p) {
    if (p === "/") return [];
    return p.substring(1).split("/");
  }
  parentOf(p) {
    const idx = p.lastIndexOf("/");
    return idx <= 0 ? "/" : p.slice(0, idx);
  }
  nameOf(p) {
    const idx = p.lastIndexOf("/");
    return p.slice(idx + 1);
  }
  // walks the pre-normalized path segment by segment without splitting it;
  // the bookkeeping for symlinks is only done when one is met
  resolveNode(p, followFinal, seen) {
    if (p === "/") return this.tree;
    let current = this.tree;
    const len = p.length;
    let start = 1;
    for (; ; ) {
      if (current.kind !== "directory" || !current.children) return void 0;
      let end4 = p.indexOf("/", start);
      if (end4 === -1) end4 = len;
      const child = current.children.get(p.substring(start, end4));
      if (!child) return void 0;
      const last = end4 === len;
      if (child.kind === "symlink" && (followFinal || !last)) {
        const currentPath = p.substring(0, end4);
        seen ??= /* @__PURE__ */ new Set();
        if (seen.has(currentPath) || seen.size >= 40) {
          throw makeSystemError("ELOOP", "stat", p);
        }
        seen.add(currentPath);
        const target = child.target;
        const targetPath = target.startsWith("/") ? this.normalize(target) : this.normalize(this.parentOf(currentPath) + "/" + target);
        const remainder = last ? "" : p.substring(end4 + 1);
        const resolvedPath = remainder ? this.normalize(targetPath + "/" + remainder) : targetPath;
        return this.resolveNode(resolvedPath, followFinal, seen);
      }
      current = child;
      if (last) return current;
      start = end4 + 1;
    }
  }
  // the node at exactly this path: no symlink is followed, final or not.
  // a path that only exists through a symlinked directory is not canonical
  _locateCanonical(p) {
    let current = this.tree;
    for (const segment of this.segments(p)) {
      if (current.kind !== "directory" || !current.children) return void 0;
      current = current.children.get(segment);
      if (!current) return void 0;
    }
    return current;
  }
  locateRaw(p) {
    return this.resolveNode(p, false);
  }
  locate(p) {
    return this.resolveNode(p, true);
  }
  ensureDir(p) {
    if (p === "/") return this.tree;
    let current = this.tree;
    let start = 1;
    const len = p.length;
    while (start < len) {
      let end4 = p.indexOf("/", start);
      if (end4 === -1) end4 = len;
      const seg = p.substring(start, end4);
      start = end4 + 1;
      if (!current.children) current.children = /* @__PURE__ */ new Map();
      let child = current.children.get(seg);
      if (!child) {
        child = { kind: "directory", children: /* @__PURE__ */ new Map(), modified: Date.now() };
        current.children.set(seg, child);
        if (this._journaling) this._journal({ op: "mkdir", path: p.substring(0, end4) });
      } else if (child.kind !== "directory") {
        throw new Error(`ENOTDIR: not a directory, '${p}'`);
      }
      current = child;
    }
    return current;
  }
  // same as ensureDir but returns the list of segments it actually had to create,
  // so mkdirSync(recursive: true) can fire one addDir per new dir and stay quiet
  // about ones that already existed
  ensureDirTracked(p) {
    const created = [];
    if (p === "/") return { node: this.tree, created };
    let current = this.tree;
    let start = 1;
    const len = p.length;
    let currentPath = "";
    while (start < len) {
      let end4 = p.indexOf("/", start);
      if (end4 === -1) end4 = len;
      const seg = p.substring(start, end4);
      start = end4 + 1;
      currentPath = currentPath + "/" + seg;
      if (!current.children) current.children = /* @__PURE__ */ new Map();
      let child = current.children.get(seg);
      if (!child) {
        child = { kind: "directory", children: /* @__PURE__ */ new Map(), modified: Date.now() };
        current.children.set(seg, child);
        created.push(currentPath);
      } else if (child.kind !== "directory") {
        throw new Error(`ENOTDIR: not a directory, '${p}'`);
      }
      current = child;
    }
    return { node: current, created };
  }
  // ---- Internal write ----
  // expects pre-normalized path
  writeInternal(norm, data, notify, seen) {
    const lastSlash = norm.lastIndexOf("/");
    const parentPath = lastSlash <= 0 ? "/" : norm.slice(0, lastSlash);
    const name = norm.slice(lastSlash + 1);
    if (!name) {
      throw new Error(`EISDIR: illegal operation on a directory, '${norm}'`);
    }
    const parent = this.ensureDir(parentPath);
    const existing = parent.children.get(name);
    const existed = !!existing;
    const bytes2 = this.toBytes(data);
    this._untrackLazyResident(norm);
    this._invalidateLazyListedFor(norm);
    if (existing?.kind === "directory") throw makeSystemError("EISDIR", "open", norm);
    const now = Date.now();
    this._notePackActivity();
    if (this._packState?.deflate && isInstalledPackagePath(norm)) this._notePackageWrite(bytes2.byteLength);
    if (existing?.kind === "file") {
      const inode = this._fileInodeAt(norm, existing);
      if (inode.src) this._forgetSource(inode);
      inode.packed = void 0;
      inode.content = bytes2;
      inode.mtime = now;
      inode.ctime = now;
      existing.modified = now;
      existing.lazy = false;
      existing.lazySize = void 0;
    } else if (existing?.kind === "symlink") {
      seen ??= /* @__PURE__ */ new Set();
      if (seen.has(norm) || seen.size >= 40) throw makeSystemError("ELOOP", "open", norm);
      seen.add(norm);
      const targetPath = existing.target.startsWith("/") ? this.normalize(existing.target) : this.normalize(parentPath + "/" + existing.target);
      this.writeInternal(targetPath, data, notify, seen);
      return;
    } else {
      const inode = {
        ino: this._nextIno++,
        content: bytes2,
        mode: 420,
        atime: now,
        mtime: now,
        ctime: now,
        nlink: 1
      };
      parent.children.set(name, {
        kind: "file",
        modified: now,
        inode
      });
      this._linkInodePath(norm, inode);
    }
    if (this._handler) this._handler.invalidateStat(norm);
    if (this._journaling) this._journal({ op: "write", path: norm });
    if (notify) {
      this.triggerWatchers(norm, existed ? "change" : "rename");
      const changeHandlers = this.subscribers.get("change");
      if (changeHandlers && changeHandlers.size > 0) {
        this.broadcast("change", norm, typeof data === "string" ? data : this.decodeText(bytes2));
      }
      if (this.subscribers.get("write")?.size) this.broadcast("write", norm, bytes2);
      this.notifyGlobalListeners(norm, existed ? "change" : "add");
    }
  }
  // ---- Main-thread eviction of pack-backed content ----
  /**
   * Keep node_modules files that nobody reads deflated in memory (see
   * PackedChunk). Main thread only: rounds run after the volume has been
   * quiet for a while and yield between slices; reads stay synchronous.
   */
  enableContentPacking(opts = {}) {
    if (this._packState || this._missHandler || this._disposed) return;
    this._packState = {
      timer: null,
      running: false,
      lastActivity: Date.now(),
      lastRoundStart: -Infinity,
      generation: 0,
      lastRead: /* @__PURE__ */ new WeakMap(),
      deflate: opts.deflate ?? null,
      packWasm: opts.packWasm ?? false,
      packageBytes: 0,
      afterWritesTimer: null,
      lastReadAt: 0,
      rerun: false,
      holds: 0
    };
    this._schedulePackCheck(PACK_QUIET_MS);
  }
  // package content written: with an off-thread deflater, pack it once the
  // writes stop (an install has just finished) rather than after quiet
  _notePackageWrite(bytes2) {
    const state = this._packState;
    if (!state?.deflate) return;
    state.packageBytes += bytes2;
    if (state.packageBytes < PACK_AFTER_WRITES_MIN_BYTES) return;
    if (state.afterWritesTimer) clearTimeout(state.afterWritesTimer);
    const writesEnded = Date.now();
    const check = () => {
      state.afterWritesTimer = null;
      if (this._packState !== state) return;
      const now = Date.now();
      const busyAt = Math.max(state.lastReadAt, lastForegroundActivity());
      if (state.holds > 0 || now - busyAt < PACK_AFTER_READS_MS && now - writesEnded < PACK_AFTER_WRITES_MAX_WAIT_MS) {
        const timer2 = setTimeout(check, PACK_AFTER_READS_MS);
        timer2.unref?.();
        state.afterWritesTimer = timer2;
        return;
      }
      if (state.running) state.rerun = true;
      else void this._packRound();
    };
    const timer = setTimeout(check, PACK_AFTER_WRITES_MS);
    timer.unref?.();
    state.afterWritesTimer = timer;
  }
  get contentPackingEnabled() {
    return this._packState !== null;
  }
  /**
   * A file's bytes for bulk copies (snapshots): like readFileSync, but the
   * file isn't counted as in use, and a packed file is inflated for the
   * caller and stays packed.
   */
  peekFileSync(p) {
    const norm = this.normalize(p);
    const node = this.locate(norm);
    if (node?.kind === "file" && !node.lazy) {
      const inode = node.inode;
      if (inode?.packed && inode.content === void 0) return this._peekPacked(inode.packed);
      const bytes2 = inode ? inode.content : node.content;
      if (bytes2 && !inode?.src) return bytes2;
    }
    this._peeking = true;
    try {
      return this.readFileSync(p);
    } finally {
      this._peeking = false;
    }
  }
  /**
   * Keep packing rounds from packing anything until the returned release is
   * called (a bulk copy of the packages is about to be taken: packing them
   * first would only have it inflate them again).
   */
  holdContentPacking() {
    const state = this._packState;
    if (!state) return () => {
    };
    state.holds++;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      state.holds--;
    };
  }
  /** Run a packing round now (tests; normally rounds start on their own). */
  packContentNow() {
    if (!this._packState || this._packState.running) return Promise.resolve();
    return this._packRound();
  }
  _noteRead(inode) {
    const state = this._packState;
    state.lastRead.set(inode, state.running ? state.generation + 1 : state.generation);
    this._notePackActivity();
    state.lastReadAt = state.lastActivity;
    if (inode.packed) this._unpackForRead(inode);
  }
  // A read unpacks every file of the chunk: its files come from one
  // directory and are mostly read together, in whatever order the reader
  // (a bundler resolving in parallel) happens to go, so inflating the chunk
  // again for each of them cost far more than keeping the neighbours. The
  // ones nobody reads are packed again by the next round.
  _unpackForRead(inode) {
    const chunk = inode.packed.chunk;
    const members = chunk.members;
    if (!members) {
      this._unpack(inode);
      return;
    }
    chunk.members = void 0;
    const bytes2 = this._inflateChunk(chunk);
    for (const member of members) {
      const ref = member.packed;
      if (!ref || ref.chunk !== chunk) continue;
      member.content = bytes2.subarray(ref.offset, ref.offset + ref.length);
      member.packed = void 0;
    }
    this._inflatedChunks = this._inflatedChunks.filter((c) => c.chunk !== chunk);
  }
  _notePackActivity() {
    const state = this._packState;
    if (!state) return;
    state.lastActivity = Date.now();
    if (!state.timer && !state.running) this._schedulePackCheck(PACK_QUIET_MS);
  }
  _schedulePackCheck(delay) {
    const state = this._packState;
    if (!state) return;
    const timer = setTimeout(() => {
      state.timer = null;
      if (this._packState !== state || state.running) return;
      if (state.holds > 0) {
        this._schedulePackCheck(PACK_FOREGROUND_POLL_MS);
        return;
      }
      const wait = Math.max(state.lastActivity + PACK_QUIET_MS, state.lastRoundStart + PACK_MIN_INTERVAL_MS) - Date.now();
      if (wait > 0) {
        this._schedulePackCheck(wait);
        return;
      }
      void this._packRound();
    }, delay);
    timer.unref?.();
    state.timer = timer;
  }
  _packable(inode, state) {
    const content = inode.content;
    return !!content && content.byteLength >= PACK_MIN_FILE_BYTES && !inode.packed && !inode.src && // not read since the last completed round
    (state.lastRead.get(inode) ?? -1) < state.generation;
  }
  async _packRound() {
    const state = this._packState;
    if (!state || state.running) return;
    state.running = true;
    const started = Date.now();
    state.lastRoundStart = started;
    state.packageBytes = 0;
    state.rerun = false;
    this._inflatedChunks = [];
    let completed = false;
    const offThread = /* @__PURE__ */ new Set();
    let inFlight2 = 0;
    try {
      let sliceStart = Date.now();
      const proceed = async () => {
        if (Date.now() - sliceStart >= PACK_SLICE_MS || state.holds > 0) {
          await yieldForBackgroundWork();
          while (this._packState === state && (state.holds > 0 || state.deflate && Date.now() - lastForegroundActivity() < PACK_AFTER_READS_MS && Date.now() - started < PACK_AFTER_WRITES_MAX_WAIT_MS)) {
            await new Promise((resolve) => {
              const timer = setTimeout(resolve, PACK_FOREGROUND_POLL_MS);
              timer.unref?.();
            });
          }
          sliceStart = Date.now();
        }
        return this._packState === state && (state.deflate !== null || state.lastActivity <= started);
      };
      const pack = async (group, size2) => {
        if (!state.deflate) {
          this._packGroup(group, size2);
          return;
        }
        const done = this._packGroupOffThread(group, size2, state).finally(() => {
          inFlight2 -= size2;
          offThread.delete(done);
        });
        inFlight2 += size2;
        offThread.add(done);
        while (inFlight2 > PACK_IN_FLIGHT_BYTES && offThread.size > 0) await Promise.race(offThread);
      };
      const candidates = [];
      const views2 = [];
      const stack = [[this.tree, "", false]];
      let visited = 0;
      while (stack.length > 0) {
        if (++visited % 2048 === 0 && !await proceed()) return;
        const [node, name, inPackages] = stack.pop();
        if (node.kind === "directory") {
          if (!node.children) continue;
          const under = inPackages || name === "node_modules";
          for (const [childName, child] of node.children) stack.push([child, childName, under]);
          continue;
        }
        if (!inPackages || node.kind !== "file" || node.lazy) continue;
        const bytes2 = node.inode ? node.inode.content : node.content;
        if (!bytes2) continue;
        if (bytes2.byteLength !== bytes2.buffer.byteLength) views2.push(node);
        if (name === "package.json" || bytes2.byteLength < PACK_MIN_FILE_BYTES) continue;
        if (name.endsWith(".wasm") && !state.packWasm) continue;
        if (node.inode && !this._packable(node.inode, state)) continue;
        candidates.push([node, COLD_PACKAGE_FILE.test(name) ? 1 : 0]);
      }
      const groups = [
        { inodes: [], bytes: 0 },
        { inodes: [], bytes: 0 }
      ];
      const grouped = /* @__PURE__ */ new Set();
      const flush = async (g) => {
        const inodes = g.inodes;
        g.inodes = [];
        g.bytes = 0;
        for (const inode of inodes) grouped.delete(inode);
        const still = inodes.filter((inode) => this._packable(inode, state));
        if (still.length === 0) return;
        let size2 = 0;
        for (const inode of still) size2 += inode.content.byteLength;
        await pack(still, size2);
      };
      for (const [node, kind] of candidates) {
        if (!await proceed()) return;
        if (node.kind !== "file" || node.lazy) continue;
        const inode = this._fileInode(node);
        if (grouped.has(inode) || !this._packable(inode, state)) continue;
        const size2 = inode.content.byteLength;
        if (size2 >= PACK_SOLO_BYTES) {
          if (state.deflate) await pack([inode], size2);
          else if (!await this._packSolo(inode, state, proceed)) return;
          continue;
        }
        const g = groups[kind];
        g.inodes.push(inode);
        grouped.add(inode);
        g.bytes += size2;
        if (g.bytes >= PACK_CHUNK_BYTES) await flush(g);
      }
      for (const g of groups) if (g.inodes.length > 0) await flush(g);
      await Promise.all(offThread);
      this._compactResidentViews(views2);
      completed = true;
    } finally {
      if (offThread.size > 0) await Promise.allSettled(offThread);
      if (completed) state.generation++;
      state.running = false;
      this._inflatedChunks = [];
      if (this._packState === state && state.rerun) {
        state.rerun = false;
        state.packageBytes = PACK_AFTER_WRITES_MIN_BYTES;
        this._notePackageWrite(0);
      }
      if (this._packState === state && state.lastActivity > started && !state.timer) {
        this._schedulePackCheck(PACK_QUIET_MS);
      }
    }
  }
  // Drop mostly-dead snapshot buffers without returning to one allocation
  // per small file. Dense slabs stay shared; sparse ones are repacked into
  // bounded, fully occupied slabs. Hardlink aliases are counted once.
  _compactResidentViews(nodes) {
    const seen = /* @__PURE__ */ new Set();
    const buffers = /* @__PURE__ */ new Map();
    for (const node of nodes) {
      const holder = node.inode ?? node;
      const content = holder.content;
      if (!content || seen.has(holder) || content.byteLength === content.buffer.byteLength) continue;
      seen.add(holder);
      let group = buffers.get(content.buffer);
      if (!group) buffers.set(content.buffer, group = { holders: [], bytes: 0 });
      group.holders.push(holder);
      group.bytes += content.byteLength;
    }
    for (const [buffer, group] of buffers) {
      if (group.bytes >= buffer.byteLength * 0.75) continue;
      let batch = [];
      let size2 = 0;
      const flush = () => {
        if (batch.length === 0) return;
        const slab = new Uint8Array(size2);
        let offset = 0;
        for (const holder of batch) {
          const content = holder.content;
          slab.set(content, offset);
          holder.content = slab.subarray(offset, offset + content.byteLength);
          offset += content.byteLength;
        }
        batch = [];
        size2 = 0;
      };
      for (const holder of group.holders) {
        const length = holder.content.byteLength;
        if (size2 > 0 && size2 + length > PACK_CHUNK_BYTES) flush();
        batch.push(holder);
        size2 += length;
        if (size2 >= PACK_CHUNK_BYTES) flush();
      }
      flush();
    }
  }
  // deflate a group on the deflater's thread; files written or read while
  // it was away stay as they are
  async _packGroupOffThread(group, size2, state) {
    const joined = new Uint8Array(size2);
    const contents = [];
    const offsets = [];
    let offset = 0;
    for (const inode of group) {
      const bytes2 = inode.content;
      contents.push(bytes2);
      offsets.push(offset);
      joined.set(bytes2, offset);
      offset += bytes2.byteLength;
    }
    let deflated;
    try {
      deflated = await state.deflate(joined);
    } catch {
      return;
    }
    if (this._packState !== state) return;
    if (deflated.byteLength >= size2) return;
    const chunk = { bytes: deflated };
    const members = [];
    for (let i = 0; i < group.length; i++) {
      const inode = group[i];
      if (inode.content !== contents[i] || !this._packable(inode, state)) continue;
      inode.packed = { chunk, offset: offsets[i], length: contents[i].byteLength };
      inode.content = void 0;
      members.push(inode);
    }
    if (members.length > 1) chunk.members = members;
  }
  _packGroup(group, size2) {
    const joined = new Uint8Array(size2);
    const offsets = [];
    let offset = 0;
    for (const inode of group) {
      offsets.push(offset);
      joined.set(inode.content, offset);
      offset += inode.content.byteLength;
    }
    const bytes2 = pako_default.deflateRaw(joined, { level: 1 });
    if (bytes2.byteLength >= joined.byteLength) return;
    const chunk = { bytes: bytes2 };
    for (let i = 0; i < group.length; i++) {
      const inode = group[i];
      inode.packed = { chunk, offset: offsets[i], length: inode.content.byteLength };
      inode.content = void 0;
    }
    if (group.length > 1) chunk.members = group;
  }
  // a big file deflates in pieces across slices, then replaces the content
  // only if nothing touched the file meanwhile
  async _packSolo(inode, state, proceed) {
    const bytes2 = inode.content;
    const deflater = new pako_default.Deflate({ level: 1, raw: true });
    const PIECE = 256 * 1024;
    for (let offset = 0; offset < bytes2.byteLength; offset += PIECE) {
      if (!await proceed()) return false;
      const end4 = Math.min(bytes2.byteLength, offset + PIECE);
      deflater.push(bytes2.subarray(offset, end4), end4 === bytes2.byteLength);
    }
    if (deflater.err || !(deflater.result instanceof Uint8Array)) return true;
    if (deflater.result.byteLength >= bytes2.byteLength) return true;
    if (inode.content !== bytes2 || !this._packable(inode, state)) return true;
    inode.packed = { chunk: { bytes: deflater.result }, offset: 0, length: bytes2.byteLength };
    inode.content = void 0;
    return true;
  }
  _inflateChunk(chunk) {
    const cache = this._inflatedChunks;
    for (let i = 0; i < cache.length; i++) {
      if (cache[i].chunk !== chunk) continue;
      const hit = cache[i];
      if (i > 0) {
        cache.splice(i, 1);
        cache.unshift(hit);
      }
      return hit.bytes;
    }
    const bytes2 = pako_default.inflateRaw(chunk.bytes);
    cache.unshift({ chunk, bytes: bytes2 });
    if (cache.length > INFLATED_CHUNK_CACHE) cache.pop();
    if (!this._inflatedTimer) {
      const timer = setTimeout(() => {
        this._inflatedTimer = null;
        this._inflatedChunks = [];
      }, INFLATED_CHUNK_IDLE_MS);
      timer.unref?.();
      this._inflatedTimer = timer;
    }
    return bytes2;
  }
  // a packed file's bytes in a buffer of their own
  _peekPacked(ref) {
    if (ref.offset === 0 && ref.length >= PACK_SOLO_BYTES) return pako_default.inflateRaw(ref.chunk.bytes);
    return this._inflateChunk(ref.chunk).slice(ref.offset, ref.offset + ref.length);
  }
  // the file is in use: keep it unpacked from now on
  _unpack(inode) {
    const ref = inode.packed;
    if (!ref) return;
    inode.content = this._peekPacked(ref);
    inode.packed = void 0;
  }
  /**
   * Let content mounted with a `src` (package packs) be dropped from memory
   * under an LRU budget and read back from `source` on demand. Paged-out
   * files can't be read synchronously: callers await ensureResident() first.
   */
  enableEviction(source, budgetBytes) {
    this._contentSource = source;
    this._residentBudget = Math.max(0, budgetBytes);
    this._evictOverBudget();
  }
  get evictionEnabled() {
    return this._contentSource !== null;
  }
  /** Hold off eviction (e.g. during an install that reads packages synchronously). Returns the resume fn. */
  pauseEviction() {
    this._evictionPaused++;
    let resumed = false;
    return () => {
      if (resumed) return;
      resumed = true;
      this._evictionPaused--;
      this._evictOverBudget();
    };
  }
  /**
   * Turn files that were mounted from `buffer` (a pack's data) into
   * paged-out stubs backed by `pack`, so the buffer can be collected.
   * Files for which `keepResident` is true are copied out of it instead.
   * Anything written since the mount no longer points into `buffer` and is
   * left alone.
   */
  adoptPackContent(pack, manifest, buffer, keepResident) {
    if (!this._contentSource) return 0;
    let adopted = 0;
    for (const entry of manifest) {
      if (entry.isDirectory || entry.symlinkTarget !== void 0) continue;
      let node;
      try {
        node = this.locateRaw(this.normalize(entry.path));
      } catch {
        continue;
      }
      const inode = node?.kind === "file" ? node.inode : void 0;
      if (!inode || inode.src || !inode.content || inode.content.buffer !== buffer) continue;
      if (keepResident(entry.path)) {
        inode.content = inode.content.slice();
        continue;
      }
      inode.src = { pack, offset: entry.offset, length: entry.length };
      this._indexSource(inode);
      this._evictInodeContent(inode, entry.length);
      adopted++;
    }
    return adopted;
  }
  /** How many paths link to the file at `p` (1 for anything that isn't a hardlinked file). */
  linkCount(p) {
    try {
      const node = this._locateCanonical(this.normalize(p));
      if (node?.kind !== "file" || !node.inode) return node ? 1 : 0;
      return this._inodePathCount(node.inode) ?? 1;
    } catch {
      return 0;
    }
  }
  /** Every path that is a hardlink to the file at `p` (including `p`), without following symlinks. */
  linksOf(p) {
    let norm;
    let node;
    try {
      norm = this.normalize(p);
      node = this._locateCanonical(norm);
    } catch {
      return [];
    }
    if (node?.kind !== "file" || !node.inode) return node ? [norm] : [];
    return this._pathsForInode(node.inode);
  }
  /** Paged-out files at or below `root` (canonical paths, symlinks not followed). */
  pagedOutPaths(root) {
    const out = [];
    if (!this._contentSource) return out;
    let start;
    let norm;
    try {
      norm = this.normalize(root);
      start = this._locateCanonical(norm);
    } catch {
      return out;
    }
    const walk = (node, path) => {
      if (node.kind === "file") {
        if (node.inode?.src && node.inode.content === void 0) out.push(path);
      } else if (node.kind === "directory" && node.children) {
        for (const [name, child] of node.children) walk(child, path === "/" ? `/${name}` : `${path}/${name}`);
      }
    };
    if (start) walk(start, norm);
    return out;
  }
  /** true when reading `p` synchronously would need ensureResident() first. */
  isPagedOut(p) {
    if (!this._contentSource) return false;
    try {
      const node = this.locate(this.normalize(p));
      return node?.kind === "file" && !!node.inode?.src && node.inode.content === void 0;
    } catch {
      return false;
    }
  }
  /** Page the given files (and their pack neighbours) back into memory. */
  async ensureResident(paths) {
    const source = this._contentSource;
    if (!source) return;
    const list = typeof paths === "string" ? [paths] : paths;
    const pending = [];
    const wanted = /* @__PURE__ */ new Set();
    for (const p of list) {
      let node;
      try {
        node = this.locate(this.normalize(p));
      } catch {
        continue;
      }
      const inode = node?.kind === "file" ? node.inode : void 0;
      if (!inode?.src || inode.content !== void 0) continue;
      const inFlight2 = this._hydrating.get(inode);
      if (inFlight2) pending.push(inFlight2);
      else wanted.add(inode);
    }
    if (wanted.size > 0) {
      for (const inode of Array.from(wanted)) this._addReadAhead(inode, wanted);
      const run2 = this._pageIn(source, Array.from(wanted));
      for (const inode of wanted) this._hydrating.set(inode, run2);
      pending.push(run2);
    }
    await Promise.all(pending);
  }
  async _pageIn(source, inodes) {
    try {
      const byPack = /* @__PURE__ */ new Map();
      for (const inode of inodes) {
        const list = byPack.get(inode.src.pack);
        if (list) list.push(inode);
        else byPack.set(inode.src.pack, [inode]);
      }
      const reads = [];
      for (const [pack, list] of byPack) {
        list.sort((a, b) => a.src.offset - b.src.offset);
        let group = [];
        let start = 0;
        let end4 = 0;
        const flush = () => {
          if (group.length === 0) return;
          const members = group;
          const from3 = start;
          reads.push(source.read(pack, from3, end4 - from3).then((bytes2) => {
            for (const { inode, offset, length } of members) {
              this._pagedIn(inode, bytes2.slice(offset - from3, offset - from3 + length));
            }
          }));
          group = [];
        };
        for (const inode of list) {
          const { offset, length } = inode.src;
          if (group.length > 0 && (offset - end4 > MAX_MERGE_GAP || offset + length - start > MAX_MERGED_READ)) {
            flush();
          }
          if (group.length === 0) {
            start = offset;
            end4 = offset;
          }
          group.push({ inode, offset, length });
          end4 = Math.max(end4, offset + length);
        }
        flush();
      }
      await Promise.all(reads);
    } finally {
      for (const inode of inodes) this._hydrating.delete(inode);
    }
    this._scheduleEviction();
  }
  _evictionScheduled = false;
  _scheduleEviction() {
    if (this._evictionScheduled) return;
    this._evictionScheduled = true;
    setTimeout(() => {
      this._evictionScheduled = false;
      this._evictOverBudget();
    }, 0);
  }
  _pagedIn(inode, bytes2) {
    if (!inode.src || inode.content !== void 0) return;
    const links = this._nodesForInode(inode);
    if (links.length === 0) return;
    inode.content = bytes2;
    for (const { path, node } of links) {
      node.lazy = false;
      node.lazySize = void 0;
      if (this._handler) this._handler.invalidateStat(path);
    }
    this._trackSource(inode);
  }
  _addReadAhead(inode, into) {
    const src = inode.src;
    const index = this._sortedPackIndex(src.pack);
    if (!index) return;
    let lo = 0;
    let hi = index.length;
    while (lo < hi) {
      const mid = lo + hi >>> 1;
      if (index[mid].src.offset < src.offset) lo = mid + 1;
      else hi = mid;
    }
    const limit = src.offset + src.length + READ_AHEAD_BYTES;
    for (let i = lo; i < index.length; i++) {
      const next = index[i];
      const nextSrc = next.src;
      if (!nextSrc || nextSrc.pack !== src.pack) continue;
      if (nextSrc.offset >= limit) break;
      if (next.content === void 0 && !this._hydrating.has(next) && this._inodePaths.has(next)) {
        into.add(next);
      }
    }
  }
  _indexSource(inode) {
    const pack = inode.src.pack;
    let list = this._packIndex.get(pack);
    if (!list) {
      list = [];
      this._packIndex.set(pack, list);
    }
    list.push(inode);
    this._packIndexDirty.add(pack);
  }
  _sortedPackIndex(pack) {
    const list = this._packIndex.get(pack);
    if (list && this._packIndexDirty.delete(pack)) {
      const live = [...new Set(list)].filter((inode) => inode.src?.pack === pack && this._inodePaths.has(inode));
      live.sort((a, b) => a.src.offset - b.src.offset);
      this._packIndex.set(pack, live);
      return live;
    }
    return list;
  }
  _trackSource(inode) {
    if (!this._contentSource || !inode.src || inode.content === void 0) return;
    const previous = this._srcResident.get(inode);
    if (previous !== void 0) {
      this._srcResident.delete(inode);
      this._srcResidentBytes -= previous;
    }
    const size2 = inode.content.byteLength;
    this._srcResident.set(inode, size2);
    this._srcResidentBytes += size2;
  }
  _touchSource(inode) {
    const size2 = this._srcResident.get(inode);
    if (size2 === void 0) return;
    this._srcResident.delete(inode);
    this._srcResident.set(inode, size2);
  }
  // the bytes are the user's own now; nothing to page them back in from
  _forgetSource(inode) {
    const size2 = this._srcResident.get(inode);
    if (size2 !== void 0) {
      this._srcResident.delete(inode);
      this._srcResidentBytes -= size2;
    }
    if (inode.src) {
      this._packIndexDirty.add(inode.src.pack);
      this._schedulePackIndexCompaction();
    }
    inode.src = void 0;
    for (const { node } of this._nodesForInode(inode)) {
      node.lazy = false;
      node.lazySize = void 0;
    }
  }
  _dropSource(inode) {
    const size2 = this._srcResident.get(inode);
    if (size2 !== void 0) {
      this._srcResident.delete(inode);
      this._srcResidentBytes -= size2;
    }
    inode.content = void 0;
    this._packIndexDirty.add(inode.src.pack);
    this._schedulePackIndexCompaction();
  }
  _compactionScheduled = false;
  // drop deleted/rewritten inodes from the read-ahead index soon, so they
  // can be collected even if that pack is never read from again
  _schedulePackIndexCompaction() {
    if (this._compactionScheduled) return;
    this._compactionScheduled = true;
    setTimeout(() => {
      this._compactionScheduled = false;
      for (const pack of Array.from(this._packIndexDirty)) this._sortedPackIndex(pack);
    }, 0);
  }
  _evictOverBudget() {
    if (!this._contentSource || this._evictionPaused > 0) return;
    if (this._srcResidentBytes <= this._residentBudget) return;
    for (const [inode, size2] of this._srcResident) {
      if (this._srcResidentBytes <= this._residentBudget) break;
      this._srcResident.delete(inode);
      this._srcResidentBytes -= size2;
      this._evictInodeContent(inode, inode.src?.length ?? size2);
      for (const { path } of this._nodesForInode(inode)) {
        if (this._handler) this._handler.invalidateStat(path);
      }
    }
  }
  // ---- Lean spawn mode: lazy hydration ----
  // Install a synchronous fallback for read misses under the given directory
  // names (lean spawn snapshots exclude e.g. node_modules). Pass null to
  // remove. Only read paths consult the handler; writes behave as always.
  setMissHandler(handler, lazyDirNames = []) {
    this._missHandler = handler;
    this._lazyDirNames = handler ? lazyDirNames.slice() : [];
    this._lazyListed.clear();
    this._lazyNegative.clear();
    if (!handler) {
      this._lazyResident.clear();
      this._lazyResidentBytes = 0;
    }
  }
  _untrackLazyResident(path) {
    const size2 = this._lazyResident.get(path);
    if (size2 === void 0) return;
    this._lazyResident.delete(path);
    this._lazyResidentBytes -= size2;
  }
  _untrackLazyTree(prefix) {
    if (this._lazyResident.size === 0) return;
    for (const path of Array.from(this._lazyResident.keys())) {
      if (path === prefix || path.startsWith(prefix + "/")) {
        this._untrackLazyResident(path);
      }
    }
  }
  _remapLazyTree(from3, to) {
    if (this._lazyResident.size === 0) return;
    const moved = [];
    for (const [path, size2] of this._lazyResident) {
      if (path === from3 || path.startsWith(from3 + "/")) {
        moved.push([to + path.slice(from3.length), size2]);
        this._lazyResident.delete(path);
      }
    }
    for (const [path, size2] of moved) this._lazyResident.set(path, size2);
  }
  // A local mutation at `norm`: the node there is new or gone, so a listing
  // merged for the old one no longer applies (a directory created here may
  // still have unhydrated children on the main thread). Its ancestors stay
  // listed: creating, removing or moving an entry locally doesn't hide any
  // remote child from them, and re-listing a large directory like
  // node_modules after every write made each package extraction pay a full
  // listing round trip for the next lookup.
  _invalidateLazyListedFor(norm) {
    this._lazyListed.delete(norm);
  }
  // The main thread changed `norm` and the local entry was dropped: the
  // parent chain must be listed again to rediscover it.
  _invalidateLazyListedChain(norm) {
    this._lazyListed.delete(norm);
    let parent = this.parentOf(norm);
    for (; ; ) {
      this._lazyListed.delete(parent);
      if (parent === "/") break;
      parent = this.parentOf(parent);
    }
  }
  // After a move the subtree is complete locally (a lazy source was hydrated
  // first, anything else was local to begin with): record its directories as
  // listed so lookups under the new location don't round-trip.
  _markLazyTreeListed(norm, node) {
    if (node.kind !== "directory") return;
    if (this._isUnderLazy(norm)) this._lazyListed.add(norm);
    if (!node.children) return;
    for (const [name, child] of node.children) {
      if (child.kind === "directory") {
        this._markLazyTreeListed(norm === "/" ? "/" + name : norm + "/" + name, child);
      }
    }
  }
  /** Mark every directory entry that shares this inode as a lazy stub. */
  _evictInodeContent(inode, lazySize) {
    inode.content = void 0;
    for (const path of this._pathsForInode(inode)) {
      const node = this.locateRaw(path);
      if (node?.kind === "file" && (!node.inode || node.inode === inode)) {
        node.lazy = true;
        node.lazySize = lazySize;
      }
      this._untrackLazyResident(path);
    }
  }
  _trackLazyResident(path, node) {
    const content = this._fileContent(node);
    if (!content || !this._isUnderLazy(path)) return;
    this._untrackLazyResident(path);
    const size2 = content.byteLength;
    this._lazyResident.set(path, size2);
    this._lazyResidentBytes += size2;
    while (this._lazyResidentBytes > this._lazyResidentMaxBytes && this._lazyResident.size > 1) {
      const oldest = this._lazyResident.keys().next().value;
      if (!oldest) break;
      const oldSize = this._lazyResident.get(oldest);
      this._lazyResident.delete(oldest);
      this._lazyResidentBytes -= oldSize;
      const oldNode = this.locateRaw(oldest);
      if (oldNode?.kind === "file") {
        this._evictInodeContent(this._fileInodeAt(oldest, oldNode), oldSize);
      }
    }
  }
  _touchLazyResident(path) {
    const size2 = this._lazyResident.get(path);
    if (size2 === void 0) return;
    this._lazyResident.delete(path);
    this._lazyResident.set(path, size2);
  }
  /**
   * The main thread mounted entries in these directories without per-file
   * notifications: forget their listings (and every cached miss) so the
   * next lookup lists them again and finds the new entries.
   */
  relistLazy(dirs) {
    if (!this._missHandler) return;
    for (const dir of dirs) this._lazyListed.delete(this.normalize(dir));
    this._lazyNegative.clear();
  }
  // Main broadcast said this file changed but was too large to ship bytes.
  // Drop the local copy silently; the next read pulls fresh content through
  // the miss handler (works for any path, not just lazy dir names). No-op
  // without a miss handler — better a stale copy than a lost file.
  markLazyInvalidated(p) {
    if (!this._missHandler) return;
    const norm = this.normalize(p);
    this._untrackLazyTree(norm);
    this._lazyNegative.delete(norm);
    this._lazyInvalidated.add(norm);
    this._invalidateLazyListedChain(norm);
    const parent = this.locate(this.parentOf(norm));
    if (parent?.kind === "directory") {
      parent.children?.delete(this.nameOf(norm));
    }
    if (this._handler) this._handler.invalidateStat(norm);
  }
  _isUnderLazy(norm) {
    if (!this._missHandler) return false;
    if (this._lazyInvalidated.has(norm)) return true;
    if (this._lazyDirNames.length === 0) return false;
    let start = 1;
    const len = norm.length;
    while (start < len) {
      let end4 = norm.indexOf("/", start);
      if (end4 === -1) end4 = len;
      const seg = norm.substring(start, end4);
      if (this._lazyDirNames.includes(seg)) return true;
      start = end4 + 1;
    }
    return false;
  }
  // Try to materialize a missing path from the miss handler. Returns true if
  // the path exists locally afterwards (possibly as a lazy stub). Never
  // notifies watchers (hydration is not a "change" — the file logically
  // existed all along).
  //
  // Misses are answered from directory listings: walk to the deepest local
  // ancestor. If the spawn snapshot shipped that directory whole (it is not
  // lazy) or its listing was already merged, the child is known to be
  // missing without asking the main thread. Otherwise one readdir round trip
  // lists it, creating stubs that answer every later probe in that directory.
  // Module resolution probes a handful of candidate paths per directory
  // level, so this turns one blocking round trip per probe into roughly one
  // per directory.
  _hydrateMiss(norm, depth2 = 0) {
    if (!this._missHandler || this._lazyNegative.has(norm) || !this._isUnderLazy(norm)) {
      return false;
    }
    if (this._lazyInvalidated.has(norm)) return this._hydrateMissDirect(norm);
    if (norm.endsWith(".wasm")) return this._hydrateMissDirect(norm);
    const segments = this.segments(norm);
    let node = this.tree;
    let path = "";
    for (let i = 0; i < segments.length; i++) {
      if (node.kind !== "directory") {
        return node.lazy ? this._hydrateMissDirect(norm) : false;
      }
      const name = segments[i];
      let child = node.children?.get(name);
      if (!child) {
        const dirPath = path || "/";
        if (!this._isUnderLazy(dirPath)) {
          if (!this._isUnderLazy(`${path}/${name}`) || !this._hydrateMissDirect(`${path}/${name}`)) return false;
        } else {
          if (this._lazyListed.has(dirPath)) return false;
          this._lazyList(dirPath, node);
        }
        child = node.children?.get(name);
        if (!child) return false;
      }
      if (child.kind === "symlink") {
        if (depth2 >= 16 || child.target === void 0) return false;
        const base = path || "/";
        const target = child.target.startsWith("/") ? child.target : `${base}/${child.target}`;
        const rest = segments.slice(i + 1).join("/");
        this._hydrateMiss(this.normalize(rest ? `${target}/${rest}` : target), depth2 + 1);
        try {
          return this.locate(norm) !== void 0;
        } catch {
          return false;
        }
      }
      node = child;
      path += "/" + name;
    }
    return true;
  }
  // Per-path fetch: stat, then content. Used for explicitly invalidated
  // paths and anything the listing walk can't answer.
  _hydrateMissDirect(norm) {
    const handler = this._missHandler;
    if (!handler) return false;
    let st = null;
    try {
      st = handler.stat(norm);
    } catch (e) {
      if (isTransientMiss(e)) return false;
      st = null;
    }
    if (!st) {
      this._lazyNegative.add(norm);
      return false;
    }
    this._journalMute++;
    try {
      if (st.isDirectory) {
        this.ensureDir(norm);
        return true;
      }
      let bytes2 = null;
      try {
        bytes2 = handler.readFile(norm);
      } catch (e) {
        if (isTransientMiss(e)) return false;
        bytes2 = null;
      }
      if (bytes2 === null) {
        this._lazyNegative.add(norm);
        return false;
      }
      this.writeInternal(norm, bytes2, false);
    } catch {
      return false;
    } finally {
      this._journalMute--;
    }
    const hydrated = this.locateRaw(norm);
    if (hydrated?.kind === "file") this._trackLazyResident(norm, hydrated);
    return true;
  }
  // Fetch content for a lazy stub created by _lazyList.
  _hydrateStub(norm, node) {
    if (!this._missHandler) {
      const inode = node.inode;
      if (inode?.src && inode.content === void 0) {
        this._pagedOutSyncMisses++;
        throw pagedOutError(norm);
      }
      node.lazy = false;
      return;
    }
    let bytes2 = null;
    try {
      bytes2 = this._missHandler.readFile(norm);
    } catch {
      bytes2 = null;
    }
    if (bytes2 === null) {
      return;
    }
    node.lazy = false;
    this._fileInodeAt(norm, node).content = bytes2;
    node.lazySize = void 0;
    node.modified = Date.now();
    this._fileInodeAt(norm, node).mtime = node.modified;
    if (this._handler) this._handler.invalidateStat(norm);
    this._trackLazyResident(norm, node);
  }
  // Fetch only the size for a lazy stub — stat must not pull full content
  // (readdir { withFileTypes } stats every entry; fetching content there
  // would turn one listing into N content round-trips).
  _hydrateStubStat(norm, node) {
    if (!this._missHandler || node.lazySize !== void 0) return;
    let st = null;
    try {
      st = this._missHandler.stat(norm);
    } catch (e) {
      if (isTransientMiss(e)) return;
      st = null;
    }
    node.lazySize = st?.size ?? 0;
  }
  // Fully hydrate a subtree before structural changes (rename/link). A moved
  // lazy stub would otherwise try to fetch content under its NEW path, which
  // the main thread doesn't know about.
  // Returns false when part of the tree couldn't be fetched (it stays lazy
  // or unlisted).
  _hydrateTree(norm, node) {
    if (!this._missHandler) return true;
    if (node.kind === "file") {
      if (node.lazy) this._hydrateStub(norm, node);
      return !node.lazy;
    }
    if (node.kind !== "directory") return true;
    this._lazyList(norm, node);
    let complete = !this._isUnderLazy(norm) || this._lazyListed.has(norm);
    if (!node.children) return complete;
    for (const [name, child] of node.children) {
      const childPath = norm === "/" ? `/${name}` : `${norm}/${name}`;
      if (!this._hydrateTree(childPath, child)) complete = false;
    }
    return complete;
  }
  // Populate a lazy directory's listing once: union of proxy entries and any
  // local children (local wins). Subdirs become unlisted lazy dirs; files
  // become content-less stubs hydrated on first read/stat.
  _lazyList(norm, node) {
    if (!this._missHandler || this._lazyListed.has(norm) || !this._isUnderLazy(norm)) {
      return;
    }
    this._lazyListed.add(norm);
    let entries = null;
    try {
      entries = this._missHandler.readdir(norm);
    } catch (e) {
      if (isTransientMiss(e)) this._lazyListed.delete(norm);
      entries = null;
    }
    if (!entries) return;
    if (!node.children) node.children = /* @__PURE__ */ new Map();
    let complete = true;
    for (const entry of entries) {
      if (node.children.has(entry.name)) continue;
      if (entry.isSymlink) {
        if (entry.target === void 0) {
          complete = false;
          continue;
        }
        node.children.set(entry.name, { kind: "symlink", target: entry.target, modified: Date.now() });
        continue;
      }
      node.children.set(
        entry.name,
        entry.isDirectory ? { kind: "directory", children: /* @__PURE__ */ new Map(), modified: Date.now() } : { kind: "file", lazy: true, lazySize: entry.size, modified: Date.now() }
      );
    }
    if (!complete) this._lazyListed.delete(norm);
  }
  // ---- Public synchronous API ----
  existsSync(p) {
    const norm = this.normalize(p);
    let node = this.locate(norm);
    if (!node && this._missHandler && this._hydrateMiss(norm)) {
      node = this.locate(norm);
    }
    return node !== void 0;
  }
  /**
   * For each name in a directory: what lstatSync(dir/name) would say it is,
   * from one lookup of the directory (readdir withFileTypes asks this for
   * every entry). null where the entry isn't a child of the directory
   * right now; lstat decides those.
   */
  childKindsSync(dirPath, names) {
    const norm = this.normalize(dirPath);
    let dir = this.locate(norm);
    if (!dir && this._missHandler && this._hydrateMiss(norm)) dir = this.locate(norm);
    const children = dir?.kind === "directory" ? dir.children : void 0;
    const kinds = new Array(names.length);
    for (let i = 0; i < names.length; i++) {
      const child = children?.get(names[i]);
      kinds[i] = child ? child.kind : null;
    }
    return kinds;
  }
  /**
   * Whether statSync(p).isFile() would be true ('file'), false ('directory'),
   * or statSync would throw ENOENT (null): existsSync plus the kind, without
   * building a stat.
   */
  kindSync(p) {
    const norm = this.normalize(p);
    let node = this.locate(norm);
    if (!node && this._missHandler && this._hydrateMiss(norm)) {
      node = this.locate(norm);
    }
    if (!node) return null;
    return node.kind === "file" ? "file" : "directory";
  }
  statSync(p) {
    const norm = this.normalize(p);
    if (this._handler) {
      const cached = this._handler.statCache.get(norm);
      if (cached !== void 0) return cached;
    }
    let node = this.locate(norm);
    if (!node && this._missHandler && this._hydrateMiss(norm)) {
      node = this.locate(norm);
    }
    if (!node) throw makeSystemError("ENOENT", "stat", p);
    if (node.lazy) this._hydrateStubStat(norm, node);
    const inode = node.kind === "file" ? this._fileInodeAt(norm, node) : null;
    const fileSize = node.kind === "file" ? inode?.content?.length ?? inode?.packed?.length ?? node.lazySize ?? inode?.src?.length ?? 0 : 0;
    const ts = inode?.mtime ?? node.modified;
    const uid = inode?.uid ?? node.uid ?? MOCK_IDS.UID;
    const gid = inode?.gid ?? node.gid ?? MOCK_IDS.GID;
    const atimeMs = inode?.atime ?? node.atime ?? ts;
    const ctimeMs = inode?.ctime ?? ts;
    const mtimeNs = BigInt(ts) * 1000000n;
    const result = {
      isFile: node.kind === "file" ? STAT_TRUE : STAT_FALSE,
      isDirectory: node.kind === "directory" ? STAT_TRUE : STAT_FALSE,
      isSymbolicLink: STAT_FALSE,
      isBlockDevice: STAT_FALSE,
      isCharacterDevice: STAT_FALSE,
      isFIFO: STAT_FALSE,
      isSocket: STAT_FALSE,
      size: fileSize,
      mode: node.kind === "directory" ? node.mode ?? 493 : inode?.mode ?? 420,
      mtime: new Date(ts),
      atime: new Date(atimeMs),
      ctime: new Date(ctimeMs),
      birthtime: new Date(ts),
      mtimeMs: ts,
      atimeMs,
      ctimeMs,
      birthtimeMs: ts,
      nlink: inode?.nlink ?? 1,
      uid,
      gid,
      dev: 0,
      ino: inode?.ino ?? this._inoFor(norm),
      rdev: 0,
      blksize: MOCK_FS.BLOCK_SIZE,
      blocks: Math.ceil(fileSize / MOCK_FS.BLOCK_CALC_SIZE),
      atimeNs: atimeMs === ts ? mtimeNs : BigInt(atimeMs) * 1000000n,
      mtimeNs,
      ctimeNs: ctimeMs === ts ? mtimeNs : BigInt(ctimeMs) * 1000000n,
      birthtimeNs: mtimeNs
    };
    if (this._handler) this._handler.statCache.set(norm, result);
    return result;
  }
  lstatSync(p) {
    const norm = this.normalize(p);
    let node = this.locateRaw(norm);
    if (!node && this._missHandler && this._hydrateMiss(norm)) {
      node = this.locateRaw(norm);
    }
    if (!node) throw makeSystemError("ENOENT", "lstat", p);
    if (node.kind === "symlink") {
      const mtimeMs = node.modified;
      const atimeMs = node.atime ?? mtimeMs;
      const mode = 40960 | (node.mode ?? 511) & 511;
      return {
        isFile: STAT_FALSE,
        isDirectory: STAT_FALSE,
        isSymbolicLink: STAT_TRUE,
        isBlockDevice: STAT_FALSE,
        isCharacterDevice: STAT_FALSE,
        isFIFO: STAT_FALSE,
        isSocket: STAT_FALSE,
        size: (node.target || "").length,
        mode,
        mtime: new Date(mtimeMs),
        atime: new Date(atimeMs),
        ctime: new Date(mtimeMs),
        birthtime: new Date(mtimeMs),
        mtimeMs,
        atimeMs,
        ctimeMs: mtimeMs,
        birthtimeMs: mtimeMs,
        nlink: 1,
        uid: node.uid ?? MOCK_IDS.UID,
        gid: node.gid ?? MOCK_IDS.GID,
        dev: 0,
        ino: this._inoFor(norm),
        rdev: 0,
        blksize: MOCK_FS.BLOCK_SIZE,
        blocks: 0,
        atimeNs: BigInt(atimeMs) * 1000000n,
        mtimeNs: BigInt(mtimeMs) * 1000000n,
        ctimeNs: BigInt(mtimeMs) * 1000000n,
        birthtimeNs: BigInt(mtimeMs) * 1000000n
      };
    }
    return this.statSync(norm);
  }
  readFileSync(p, encoding) {
    const norm = this.normalize(p);
    let node = this.locate(norm);
    if (!node && this._missHandler && this._hydrateMiss(norm)) {
      node = this.locate(norm);
    }
    if (!node) throw makeSystemError("ENOENT", "open", p);
    if (node.kind !== "file") throw makeSystemError("EISDIR", "read", p);
    const inode = this._fileInodeAt(norm, node);
    if (this._packState && !this._peeking) this._noteRead(inode);
    if (node.lazy || inode.content == null && (this._missHandler || inode.src)) {
      this._hydrateStub(norm, node);
    }
    if (inode.content == null && node.lazy) {
      throw makeSystemError("ENOENT", "open", p);
    }
    const bytes2 = inode.content || new Uint8Array(0);
    inode.atime = Date.now();
    this._touchLazyResident(norm);
    if (inode.src) this._touchSource(inode);
    if (encoding === "utf8" || encoding === "utf-8") {
      return this.decodeText(bytes2);
    }
    return bytes2;
  }
  openFileHandleSync(p) {
    const norm = this.normalize(p);
    const node = this.locate(norm);
    if (!node) throw makeSystemError("ENOENT", "open", p);
    if (node.kind !== "file") throw makeSystemError("EISDIR", "open", p);
    const inode = this._fileInodeAt(norm, node);
    if (this._packState) this._noteRead(inode);
    if (node.lazy || inode.content == null && (this._missHandler || inode.src)) {
      this._hydrateStub(norm, node);
    }
    if (inode.content == null && node.lazy) {
      throw makeSystemError("ENOENT", "open", p);
    }
    return {
      read: () => {
        if (inode.packed) this._unpack(inode);
        return inode.content ?? new Uint8Array(0);
      },
      write: (data) => {
        if (inode.src) this._forgetSource(inode);
        inode.packed = void 0;
        inode.content = data;
        inode.mtime = Date.now();
        inode.ctime = inode.mtime;
        for (const path of this._pathsForInode(inode)) {
          if (this._handler) this._handler.invalidateStat(path);
          this.triggerWatchers(path, "change");
          this.notifyGlobalListeners(path, "change");
        }
        if (this._journaling) {
          for (const { path } of this._nodesForInode(inode)) this._journal({ op: "write", path });
        }
      },
      stat: () => ({
        size: inode.content?.length ?? inode.packed?.length ?? 0,
        mode: inode.mode,
        atimeMs: inode.atime,
        mtimeMs: inode.mtime,
        ctimeMs: inode.ctime,
        ino: inode.ino,
        nlink: inode.nlink
      })
    };
  }
  writeFileSync(p, data) {
    const norm = this.normalize(p);
    this.writeInternal(norm, data, true);
  }
  // runtime cache write — skips watcher and onGlobalChange notifications
  writeCacheSync(p, data) {
    const norm = this.normalize(p);
    this.writeInternal(norm, data, false);
  }
  mkdirSync(p, options) {
    const norm = this.normalize(p);
    const mode = options?.mode !== void 0 ? options.mode & 4095 : 511;
    if (options?.recursive) {
      const { created } = this.ensureDirTracked(norm);
      for (const path of created) {
        const node = this.locateRaw(path);
        if (node?.kind === "directory") node.mode = mode;
      }
      this._announceCreatedDirs(created, true);
      return created.length > 0 ? created[0] : void 0;
    }
    const parentPath = this.parentOf(norm);
    const name = this.nameOf(norm);
    if (!name) return void 0;
    const parent = this.locate(parentPath);
    if (!parent) throw makeSystemError("ENOENT", "mkdir", parentPath);
    if (parent.kind !== "directory") throw makeSystemError("ENOTDIR", "mkdir", parentPath);
    if (parent.children.has(name)) throw makeSystemError("EEXIST", "mkdir", p);
    parent.children.set(name, {
      kind: "directory",
      children: /* @__PURE__ */ new Map(),
      modified: Date.now(),
      mode
    });
    this._invalidateLazyListedFor(norm);
    if (this._handler) this._handler.invalidateStat(norm);
    if (this._journaling) this._journal({ op: "mkdir", path: this._canonicalPath(norm) });
    this.triggerWatchers(norm, "rename");
    this.notifyGlobalListeners(norm, "addDir");
    return void 0;
  }
  readdirSync(p) {
    const norm = this.normalize(p);
    let node = this.locate(norm);
    if (!node && this._missHandler && this._hydrateMiss(norm)) {
      node = this.locate(norm);
    }
    if (!node) throw makeSystemError("ENOENT", "scandir", p);
    if (node.kind !== "directory") throw makeSystemError("ENOTDIR", "scandir", p);
    if (this._missHandler) this._lazyList(norm, node);
    return Array.from(node.children.keys());
  }
  unlinkSync(p) {
    const norm = this.normalize(p);
    const parentPath = this.parentOf(norm);
    const name = this.nameOf(norm);
    const parent = this.locate(parentPath);
    if (!parent || parent.kind !== "directory") throw makeSystemError("ENOENT", "unlink", p);
    const target = parent.children.get(name);
    if (!target) throw makeSystemError("ENOENT", "unlink", p);
    if (target.kind === "directory") throw makeSystemError("EISDIR", "unlink", p);
    this._untrackLazyResident(norm);
    this._invalidateLazyListedFor(norm);
    this._releaseNodeLinks(target, norm);
    parent.children.delete(name);
    if (this._handler) this._handler.invalidateStat(norm);
    if (this._journaling) this._journal({ op: "remove", path: this._canonicalPath(norm) });
    this.triggerWatchers(norm, "rename");
    this.broadcast("delete", norm);
    this.notifyGlobalListeners(norm, "unlink");
  }
  rmdirSync(p) {
    const norm = this.normalize(p);
    const parentPath = this.parentOf(norm);
    const name = this.nameOf(norm);
    if (!name) throw new Error(`EPERM: operation not permitted, '${p}'`);
    const parent = this.locate(parentPath);
    if (!parent || parent.kind !== "directory") throw makeSystemError("ENOENT", "rmdir", p);
    const target = parent.children.get(name);
    if (!target) throw makeSystemError("ENOENT", "rmdir", p);
    if (target.kind !== "directory") throw makeSystemError("ENOTDIR", "rmdir", p);
    if (target.children.size > 0) throw makeSystemError("ENOTEMPTY", "rmdir", p);
    parent.children.delete(name);
    if (this._handler) this._handler.invalidateStat(norm);
    if (this._journaling) this._journal({ op: "remove", path: this._canonicalPath(norm) });
    this.triggerWatchers(norm, "rename");
    this.broadcast("delete", norm);
    this.notifyGlobalListeners(norm, "unlink");
  }
  removeTreeSync(p) {
    const norm = this.normalize(p);
    const parentPath = this.parentOf(norm);
    const name = this.nameOf(norm);
    if (!name) throw new Error(`EPERM: operation not permitted, '${p}'`);
    const parent = this.locate(parentPath);
    if (!parent || parent.kind !== "directory") throw makeSystemError("ENOENT", "rm", p);
    let target = parent.children.get(name);
    if (!target && this._missHandler && this._hydrateMiss(norm)) {
      target = parent.children.get(name);
    }
    if (!target) throw makeSystemError("ENOENT", "rm", p);
    if (target.kind !== "directory") {
      this.unlinkSync(norm);
      return;
    }
    if (this._missHandler) this._hydrateTree(norm, target);
    const removed = [];
    const collect = (node, base) => {
      if (node.kind === "directory" && node.children) {
        for (const [childName, child] of node.children) {
          collect(child, `${base}/${childName}`);
        }
      }
      removed.push(base);
    };
    collect(target, norm);
    this._releaseNodeLinks(target, norm);
    parent.children.delete(name);
    this._untrackLazyTree(norm);
    this._invalidateLazyListedFor(norm);
    if (this._journaling) this._journal({ op: "remove", path: this._canonicalPath(norm) });
    this._beginBurst(removed.length > 1);
    try {
      for (const removedPath of removed) {
        this._lazyListed.delete(removedPath);
        if (this._missHandler) this._lazyNegative.add(removedPath);
        if (this._handler) this._handler.invalidateStat(removedPath);
        this.triggerWatchers(removedPath, "rename");
        this.broadcast("delete", removedPath);
        this.notifyGlobalListeners(removedPath, "unlink");
      }
    } finally {
      this._endBurst(removed.length > 1);
    }
  }
  renameSync(from3, to) {
    const normFrom = this.normalize(from3);
    const normTo = this.normalize(to);
    const fromParent = this.locate(this.parentOf(normFrom));
    if (!fromParent || fromParent.kind !== "directory") throw makeSystemError("ENOENT", "rename", from3);
    const fromName = this.nameOf(normFrom);
    let node = fromParent.children.get(fromName);
    if (!node && this._missHandler && this._hydrateMiss(normFrom)) {
      node = fromParent.children.get(fromName);
    }
    if (!node) throw makeSystemError("ENOENT", "rename", from3);
    if (node.kind === "directory" && normTo.startsWith(normFrom === "/" ? "/" : normFrom + "/")) {
      const err = new Error(`EINVAL: invalid argument, rename '${from3}' -> '${to}'`);
      err.code = "EINVAL";
      err.errno = -22;
      err.syscall = "rename";
      err.path = from3;
      throw err;
    }
    const hydrated = this._missHandler ? this._hydrateTree(normFrom, node) : true;
    const toParent = this.ensureDir(this.parentOf(normTo));
    const toName = this.nameOf(normTo);
    const descendantPairs = [];
    if (node.kind === "directory") {
      const walk = (n, oldBase, newBase) => {
        if (n.kind !== "directory" || !n.children) return;
        for (const [childName, childNode] of n.children) {
          const childOld = oldBase === "/" ? "/" + childName : oldBase + "/" + childName;
          const childNew = newBase === "/" ? "/" + childName : newBase + "/" + childName;
          descendantPairs.push({
            oldPath: childOld,
            newPath: childNew,
            isDir: childNode.kind === "directory"
          });
          if (childNode.kind === "directory") walk(childNode, childOld, childNew);
        }
      };
      walk(node, normFrom, normTo);
    }
    const replaced = toParent.children.get(toName);
    if (node.kind === "file" && replaced?.kind === "file" && this._fileInodeAt(normFrom, node) === this._fileInodeAt(normTo, replaced)) {
      return;
    }
    if (replaced) {
      this._untrackLazyTree(normTo);
      this._releaseNodeLinks(replaced, normTo);
      toParent.children.delete(toName);
    }
    const canonicalFrom = this._journaling ? this._canonicalPath(normFrom) : void 0;
    fromParent.children.delete(fromName);
    toParent.children.set(toName, node);
    this._remapNodeInodePaths(node, normFrom, normTo);
    this._remapLazyTree(normFrom, normTo);
    this._invalidateLazyListedFor(normFrom);
    this._invalidateLazyListedFor(normTo);
    if (this._missHandler && hydrated) this._markLazyTreeListed(normTo, node);
    if (this._packState?.deflate && isInstalledPackagePath(normTo) && !isInstalledPackagePath(normFrom)) {
      this._notePackageWrite(residentBytes(node));
    }
    if (this._handler) {
      this._handler.invalidateStat(normFrom);
      this._handler.invalidateStat(normTo);
      for (const pair of descendantPairs) {
        this._handler.invalidateStat(pair.oldPath);
        this._handler.invalidateStat(pair.newPath);
      }
    }
    if (this._journaling) {
      this._journal({ op: "rename", from: canonicalFrom ?? normFrom, to: this._canonicalPath(normTo) });
    }
    this._beginBurst(descendantPairs.length > 0);
    try {
      this.triggerWatchers(normFrom, "rename");
      this.triggerWatchers(normTo, "rename");
      this.notifyGlobalListeners(normFrom, "unlink");
      this.notifyGlobalListeners(normTo, node.kind === "directory" ? "addDir" : "add");
      for (const pair of descendantPairs) {
        this.triggerWatchers(pair.oldPath, "rename");
        this.triggerWatchers(pair.newPath, "rename");
        this.notifyGlobalListeners(pair.oldPath, "unlink");
        this.notifyGlobalListeners(pair.newPath, pair.isDir ? "addDir" : "add");
      }
    } finally {
      this._endBurst(descendantPairs.length > 0);
    }
  }
  // ---- Notification bursts ----
  // One operation that notifies for many paths (a directory moved or removed)
  // tells burst listeners where it starts and ends, so a listener forwarding
  // every event elsewhere can send them together. The end is announced
  // before the operation returns.
  _burstListeners = [];
  onNotificationBurst(cb) {
    this._burstListeners.push(cb);
    return () => {
      const i = this._burstListeners.indexOf(cb);
      if (i >= 0) this._burstListeners.splice(i, 1);
    };
  }
  _beginBurst(many) {
    if (!many) return;
    for (const cb of this._burstListeners) {
      try {
        cb(true);
      } catch (e) {
        console.error("VFS burst listener error:", e);
      }
    }
  }
  _endBurst(many) {
    if (!many) return;
    for (const cb of this._burstListeners) {
      try {
        cb(false);
      } catch (e) {
        console.error("VFS burst listener error:", e);
      }
    }
  }
  accessSync(p, mode = 0) {
    if (!this.existsSync(p)) throw makeSystemError("ENOENT", "access", p);
    if (!mode) return;
    const st = this.statSync(p);
    const m = st.mode & 511;
    if ((mode & 4) !== 0 && (m & 256) === 0) throw makeSystemError("EACCES", "access", p);
    if ((mode & 2) !== 0 && (m & 128) === 0) throw makeSystemError("EACCES", "access", p);
    if ((mode & 1) !== 0 && (m & 64) === 0) throw makeSystemError("EACCES", "access", p);
  }
  copyFileSync(src, dest, mode = 0) {
    if ((mode & 1) !== 0 && this.existsSync(dest)) {
      throw makeSystemError("EEXIST", "copyfile", dest);
    }
    const data = this.readFileSync(src);
    this.writeFileSync(dest, data);
  }
  realpathSync(p) {
    const norm = this.normalize(p);
    const resolve = (path, seen) => {
      const segments = this.segments(path);
      let current = this.tree;
      let currentPath = "";
      for (let index = 0; index < segments.length; index++) {
        if (current.kind !== "directory" || !current.children) throw makeSystemError("ENOTDIR", "realpath", p);
        const segment = segments[index];
        const child = current.children.get(segment);
        if (!child) throw makeSystemError("ENOENT", "realpath", p);
        currentPath += "/" + segment;
        if (child.kind !== "symlink") {
          current = child;
          continue;
        }
        if (seen.has(currentPath) || seen.size >= 40) throw makeSystemError("ELOOP", "realpath", p);
        seen.add(currentPath);
        const target = child.target;
        const targetPath = target.startsWith("/") ? this.normalize(target) : this.normalize(this.parentOf(currentPath) + "/" + target);
        const remainder = segments.slice(index + 1).join("/");
        return resolve(remainder ? this.normalize(targetPath + "/" + remainder) : targetPath, seen);
      }
      return currentPath || "/";
    };
    return resolve(norm, /* @__PURE__ */ new Set());
  }
  symlinkSync(target, linkPath, type) {
    const normLink = this.normalize(linkPath);
    const parentPath = this.parentOf(normLink);
    const name = this.nameOf(normLink);
    if (!name) throw new Error(`EISDIR: invalid symlink path, '${linkPath}'`);
    const parent = this.ensureDir(parentPath);
    if (parent.children.has(name)) throw makeSystemError("EEXIST", "symlink", linkPath);
    const now = Date.now();
    parent.children.set(name, {
      kind: "symlink",
      target,
      modified: now,
      atime: now,
      mode: 511,
      uid: MOCK_IDS.UID,
      gid: MOCK_IDS.GID,
      symlinkType: type
    });
    if (this._handler) this._handler.invalidateStat(normLink);
    if (this._journaling) this._journal({ op: "symlink", path: normLink });
    this.triggerWatchers(normLink, "rename");
    this.notifyGlobalListeners(normLink, "add");
  }
  readlinkSync(p) {
    const norm = this.normalize(p);
    const node = this.locateRaw(norm);
    if (!node) throw makeSystemError("ENOENT", "readlink", p);
    if (node.kind !== "symlink") {
      const err = new Error(`EINVAL: invalid argument, readlink '${p}'`);
      err.code = "EINVAL";
      err.errno = -22;
      err.syscall = "readlink";
      err.path = p;
      throw err;
    }
    return node.target;
  }
  linkSync(existingPath, newPath) {
    const normExisting = this.normalize(existingPath);
    const existing = this.locate(normExisting);
    if (!existing) throw makeSystemError("ENOENT", "link", existingPath);
    if (existing.kind !== "file") throw makeSystemError("EISDIR", "link", existingPath);
    const pagedOut = !!existing.inode?.src && existing.inode.content === void 0;
    if (existing.lazy && !pagedOut) this._hydrateStub(normExisting, existing);
    const normNew = this.normalize(newPath);
    const parentPath = this.parentOf(normNew);
    const name = this.nameOf(normNew);
    const parent = this.ensureDir(parentPath);
    if (parent.children.has(name)) throw makeSystemError("EEXIST", "link", newPath);
    const inode = this._fileInodeAt(normExisting, existing);
    inode.nlink++;
    inode.ctime = Date.now();
    parent.children.set(
      name,
      pagedOut ? { kind: "file", modified: inode.mtime, inode, lazy: true, lazySize: inode.src.length } : { kind: "file", modified: inode.mtime, inode }
    );
    this._linkInodePath(normNew, inode);
    if (this._handler) this._handler.invalidateStat(normNew);
    if (this._journaling) this._journal({ op: "link", path: normNew, existing: normExisting });
    this.triggerWatchers(normNew, "rename");
    this.notifyGlobalListeners(normNew, "add");
  }
  // mkdir/unlink/rmdir/rm/rename resolve the parent directory through
  // symlinks; journal paths must name where the change actually happened
  _canonicalPath(norm) {
    const parent = this.parentOf(norm);
    if (parent === "/") return norm;
    try {
      const real = this.realpathSync(parent);
      if (real === parent) return norm;
      return (real === "/" ? "" : real) + "/" + this.nameOf(norm);
    } catch {
      return norm;
    }
  }
  // chmod/chown/utimes follow symlinks: report the node they actually changed
  _journalMetaFollowed(norm, changed) {
    if (!this._journaling && this._metaListeners.size === 0) return;
    let path = norm;
    try {
      path = this.realpathSync(norm);
    } catch {
    }
    this._reportMeta(path, changed);
  }
  // lchmod/lchown/lutimes change the node itself
  _journalMetaAt(norm, changed) {
    if (!this._journaling && this._metaListeners.size === 0) return;
    this._reportMeta(this._canonicalPath(norm), changed);
  }
  _reportMeta(path, changed) {
    if (this._journaling) this._journal({ op: "meta", path, ...changed });
    for (const cb of this._metaListeners) {
      try {
        cb(path, changed);
      } catch (e) {
        console.error("Volume meta listener error:", e);
      }
    }
  }
  chmodSync(_p, _mode) {
    const norm = this.normalize(_p);
    const node = this.locate(norm);
    if (!node) throw makeSystemError("ENOENT", "chmod", _p);
    const mode = _mode & 4095;
    if (node.kind === "file") {
      const inode = this._fileInodeAt(norm, node);
      inode.mode = mode;
      inode.ctime = Date.now();
    } else if (node.kind === "directory") {
      node.mode = mode;
      node.modified = Date.now();
    }
    if (this._handler) this._handler.invalidateStat(norm);
    this._journalMetaFollowed(norm, { mode });
  }
  lchmodSync(p, mode) {
    const norm = this.normalize(p);
    const node = this.locateRaw(norm);
    if (!node) throw makeSystemError("ENOENT", "lchmod", p);
    const bits = mode & 4095;
    if (node.kind === "file") {
      const inode = this._fileInodeAt(norm, node);
      inode.mode = bits;
      inode.ctime = Date.now();
    } else {
      node.mode = bits;
      node.modified = Date.now();
    }
    if (this._handler) this._handler.invalidateStat(norm);
    this._journalMetaAt(norm, { mode: bits });
  }
  chownSync(p, uid, gid) {
    const norm = this.normalize(p);
    const node = this.locate(norm);
    if (!node) throw makeSystemError("ENOENT", "chown", p);
    if (node.kind === "file") {
      const inode = this._fileInodeAt(norm, node);
      inode.uid = uid;
      inode.gid = gid;
      inode.ctime = Date.now();
    } else {
      node.uid = uid;
      node.gid = gid;
      node.modified = Date.now();
    }
    if (this._handler) this._handler.invalidateStat(norm);
    this._journalMetaFollowed(norm, { uid, gid });
  }
  lchownSync(p, uid, gid) {
    const norm = this.normalize(p);
    const node = this.locateRaw(norm);
    if (!node) throw makeSystemError("ENOENT", "lchown", p);
    if (node.kind === "file") {
      const inode = this._fileInodeAt(norm, node);
      inode.uid = uid;
      inode.gid = gid;
      inode.ctime = Date.now();
    } else {
      node.uid = uid;
      node.gid = gid;
      node.modified = Date.now();
    }
    if (this._handler) this._handler.invalidateStat(norm);
    this._journalMetaAt(norm, { uid, gid });
  }
  _parseTimes(p, syscall2, atime, mtime) {
    const atimeMs = atime instanceof Date ? atime.getTime() : Number(atime) * 1e3;
    const mtimeMs = mtime instanceof Date ? mtime.getTime() : Number(mtime) * 1e3;
    if (!Number.isFinite(atimeMs) || !Number.isFinite(mtimeMs)) {
      const error = new Error(`EINVAL: invalid time, ${syscall2} '${p}'`);
      error.code = "EINVAL";
      error.errno = -22;
      error.syscall = syscall2;
      error.path = p;
      throw error;
    }
    return { atimeMs, mtimeMs };
  }
  utimesSync(p, atime, mtime) {
    const norm = this.normalize(p);
    const node = this.locate(norm);
    if (!node) throw makeSystemError("ENOENT", "utimes", p);
    const { atimeMs, mtimeMs } = this._parseTimes(p, "utimes", atime, mtime);
    if (node.kind === "file") {
      const inode = this._fileInodeAt(norm, node);
      inode.atime = atimeMs;
      inode.mtime = mtimeMs;
      inode.ctime = Date.now();
    } else {
      node.atime = atimeMs;
    }
    node.modified = mtimeMs;
    if (this._handler) this._handler.invalidateStat(norm);
    this._journalMetaFollowed(norm, { atimeMs, mtimeMs });
  }
  lutimesSync(p, atime, mtime) {
    const norm = this.normalize(p);
    const node = this.locateRaw(norm);
    if (!node) throw makeSystemError("ENOENT", "lutimes", p);
    const { atimeMs, mtimeMs } = this._parseTimes(p, "lutimes", atime, mtime);
    if (node.kind === "file") {
      const inode = this._fileInodeAt(norm, node);
      inode.atime = atimeMs;
      inode.mtime = mtimeMs;
      inode.ctime = Date.now();
    } else {
      node.atime = atimeMs;
    }
    node.modified = mtimeMs;
    if (this._handler) this._handler.invalidateStat(norm);
    this._journalMetaAt(norm, { atimeMs, mtimeMs });
  }
  appendFileSync(p, data) {
    const norm = this.normalize(p);
    let existing = new Uint8Array(0);
    const node = this.locate(norm);
    if (node && node.kind === "file") {
      if (node.lazy) this._hydrateStub(norm, node);
      const inode = this._fileInodeAt(norm, node);
      if (inode.packed) this._unpack(inode);
      existing = inode.content || new Uint8Array(0);
    }
    const bytes2 = this.toBytes(data);
    const combined = new Uint8Array(existing.length + bytes2.length);
    combined.set(existing);
    combined.set(bytes2, existing.length);
    this.writeInternal(norm, combined, true);
  }
  truncateSync(p, len = 0) {
    const norm = this.normalize(p);
    const node = this.locate(norm);
    if (!node) throw makeSystemError("ENOENT", "truncate", p);
    if (node.kind !== "file") throw makeSystemError("EISDIR", "truncate", p);
    if (node.lazy) this._hydrateStub(norm, node);
    const inode = this._fileInodeAt(norm, node);
    if (inode.src) this._forgetSource(inode);
    if (inode.packed) this._unpack(inode);
    const content = inode.content || new Uint8Array(0);
    if (len < content.length) {
      inode.content = content.slice(0, len);
    } else if (len > content.length) {
      const bigger = new Uint8Array(len);
      bigger.set(content);
      inode.content = bigger;
    }
    node.modified = Date.now();
    inode.mtime = node.modified;
    inode.ctime = node.modified;
    if (this._handler) this._handler.invalidateStat(norm);
    if (this._journaling) {
      for (const { path } of this._nodesForInode(inode)) this._journal({ op: "write", path });
    }
    this.triggerWatchers(norm, "change");
    this.notifyGlobalListeners(norm, "change");
  }
  // ---- Async wrappers ----
  readFile(p, optionsOrCb, cb) {
    const actualCb = typeof optionsOrCb === "function" ? optionsOrCb : cb;
    const opts = typeof optionsOrCb === "object" ? optionsOrCb : void 0;
    try {
      const data = opts?.encoding ? this.readFileSync(p, opts.encoding) : this.readFileSync(p);
      if (actualCb) setTimeout(() => actualCb(null, data), 0);
    } catch (err) {
      if (actualCb) setTimeout(() => actualCb(err), 0);
    }
  }
  stat(p, cb) {
    try {
      const stats = this.statSync(p);
      if (cb) setTimeout(() => cb(null, stats), 0);
    } catch (err) {
      if (cb) setTimeout(() => cb(err), 0);
    }
  }
  lstat(p, cb) {
    try {
      const stats = this.lstatSync(p);
      if (cb) setTimeout(() => cb(null, stats), 0);
    } catch (err) {
      if (cb) setTimeout(() => cb(err), 0);
    }
  }
  readdir(p, optionsOrCb, cb) {
    const actualCb = typeof optionsOrCb === "function" ? optionsOrCb : cb;
    try {
      const files = this.readdirSync(p);
      if (actualCb) setTimeout(() => actualCb(null, files), 0);
    } catch (err) {
      if (actualCb) setTimeout(() => actualCb(err), 0);
    }
  }
  realpath(p, cb) {
    try {
      const resolved = this.realpathSync(p);
      if (cb) setTimeout(() => cb(null, resolved), 0);
    } catch (err) {
      if (cb) setTimeout(() => cb(err), 0);
    }
  }
  access(p, modeOrCb, cb) {
    const actualCb = typeof modeOrCb === "function" ? modeOrCb : cb;
    const mode = typeof modeOrCb === "number" ? modeOrCb : 0;
    try {
      this.accessSync(p, mode);
      if (actualCb) setTimeout(() => actualCb(null), 0);
    } catch (err) {
      if (actualCb) setTimeout(() => actualCb(err), 0);
    }
  }
  // ---- File watchers ----
  watch(target, optionsOrCb, cb) {
    const norm = this.normalize(target);
    let opts = {};
    let actualCb;
    if (typeof optionsOrCb === "function") {
      actualCb = optionsOrCb;
    } else if (optionsOrCb) {
      opts = optionsOrCb;
      actualCb = cb;
    } else {
      actualCb = cb;
    }
    const handle = new FSWatcher(() => {
      watcher.active = false;
      const set = this.activeWatchers.get(norm);
      if (set) {
        set.delete(watcher);
        if (set.size === 0) this.activeWatchers.delete(norm);
      }
    });
    const watcher = {
      callback: (event, filename) => {
        if (actualCb) actualCb(event, filename);
        handle.emit("change", event, filename);
      },
      recursive: opts.recursive || false,
      active: true
    };
    if (!this.activeWatchers.has(norm)) {
      this.activeWatchers.set(norm, /* @__PURE__ */ new Set());
    }
    this.activeWatchers.get(norm).add(watcher);
    return handle;
  }
  triggerWatchers(changedPath, event) {
    const norm = changedPath;
    const watchers = this.activeWatchers;
    if (watchers.size === 0) return;
    const lastSlash = norm.lastIndexOf("/");
    const fileName = norm.slice(lastSlash + 1);
    const directParent = lastSlash <= 0 ? "/" : norm.slice(0, lastSlash);
    const direct = watchers.get(norm);
    if (direct) {
      for (const w of direct) {
        if (w.active) {
          try {
            w.callback(event, fileName);
          } catch (e) {
            console.error("Watcher error:", e);
          }
        }
      }
    }
    const fire = (current2, list) => {
      const relative = current2 === "/" ? norm.slice(1) : norm.slice(current2.length + 1);
      for (const w of list) {
        if (w.active) {
          if (w.recursive || current2 === directParent) {
            try {
              w.callback(event, relative);
            } catch (e) {
              console.error("Watcher error:", e);
            }
          }
        }
      }
    };
    if (watchers.size <= 8) {
      let ancestors = null;
      for (const key of watchers.keys()) {
        if (key === "/" || norm.startsWith(key) && norm.charCodeAt(key.length) === 47) {
          (ancestors ??= []).push(key);
        }
      }
      if (ancestors) {
        if (ancestors.length > 1) ancestors.sort((a, b) => b.length - a.length);
        for (const key of ancestors) {
          const list = watchers.get(key);
          if (list) fire(key, list);
        }
      }
      return;
    }
    let current = directParent;
    while (current) {
      const parentWatchers = watchers.get(current);
      if (parentWatchers) fire(current, parentWatchers);
      if (current === "/") break;
      const idx = current.lastIndexOf("/");
      current = idx <= 0 ? "/" : current.slice(0, idx);
    }
  }
  // ---- Global change listeners (for chokidar/HMR bridging) ----
  globalChangeListeners = /* @__PURE__ */ new Set();
  onGlobalChange(cb) {
    this.globalChangeListeners.add(cb);
    return () => {
      this.globalChangeListeners.delete(cb);
    };
  }
  notifyGlobalListeners(path, event) {
    for (const cb of this.globalChangeListeners) {
      try {
        cb(path, event);
      } catch (e) {
        console.error("Global VFS listener error:", e);
      }
    }
  }
  // ---- Stream-like APIs ----
  createReadStream(p) {
    const self2 = this;
    const handlers = {};
    const readable = {
      on(event, cb) {
        if (!handlers[event]) handlers[event] = [];
        handlers[event].push(cb);
        return readable;
      },
      pipe(dest) {
        return dest;
      }
    };
    setTimeout(() => {
      try {
        const data = self2.readFileSync(p);
        handlers["data"]?.forEach((cb) => cb(data));
        handlers["end"]?.forEach((cb) => cb());
      } catch (err) {
        handlers["error"]?.forEach((cb) => cb(err));
      }
    }, 0);
    return readable;
  }
  createWriteStream(p) {
    const self2 = this;
    const pending = [];
    const handlers = {};
    const enc2 = this.textEncoder;
    return {
      write(data) {
        pending.push(typeof data === "string" ? enc2.encode(data) : data);
        return true;
      },
      end(data) {
        if (data) pending.push(typeof data === "string" ? enc2.encode(data) : data);
        const totalLen = pending.reduce((sum, chunk) => sum + chunk.length, 0);
        const merged = new Uint8Array(totalLen);
        let pos = 0;
        for (const chunk of pending) {
          merged.set(chunk, pos);
          pos += chunk.length;
        }
        self2.writeFileSync(p, merged);
        handlers["finish"]?.forEach((cb) => cb());
        handlers["close"]?.forEach((cb) => cb());
      },
      on(event, cb) {
        if (!handlers[event]) handlers[event] = [];
        handlers[event].push(cb);
        return this;
      }
    };
  }
};

// ../node/threading/process-context.ts
var _activeContext = null;
function getActiveContext() {
  return _activeContext;
}

// ../node/helpers/event-loop.ts
var EXIT_SENTINEL_BRAND = Symbol.for("nodepod.ProcessExitSentinel");
var ProcessExitSentinel = class extends Error {
  exitCode;
  // structural brand, survives cross-realm throws where instanceof fails
  [EXIT_SENTINEL_BRAND] = true;
  constructor(code) {
    super(`Process exited with code ${code}`);
    this.name = "ProcessExitSentinel";
    this.exitCode = code;
  }
};
function isExitSentinel(e) {
  if (!e || typeof e !== "object") return false;
  try {
    return Object.getOwnPropertyDescriptor(e, EXIT_SENTINEL_BRAND)?.value === true;
  } catch {
    return false;
  }
}
var HandleImpl = class {
  type;
  registry;
  refed;
  closed = false;
  constructor(registry2, type, refed) {
    this.registry = registry2;
    this.type = type;
    this.refed = refed;
  }
  ref() {
    if (this.closed || this.refed) return this;
    this.refed = true;
    this.registry._incRefed();
    return this;
  }
  unref() {
    if (this.closed || !this.refed) return this;
    this.refed = false;
    this.registry._decRefed();
    return this;
  }
  close() {
    if (this.closed) return;
    this.closed = true;
    if (this.refed) {
      this.refed = false;
      this.registry._decRefed();
    }
    this.registry._remove(this);
  }
};
var RegistryImpl = class {
  _handles = /* @__PURE__ */ new Set();
  _refedCount = 0;
  _drainCbs = /* @__PURE__ */ new Set();
  _beforeExitCbs = [];
  _drainPromise = null;
  _drainResolve = null;
  register(type, opts) {
    const refed = opts?.refed !== false;
    const h = new HandleImpl(this, type, refed);
    this._handles.add(h);
    if (refed) this._refedCount++;
    return h;
  }
  activeRefedCount() {
    return this._refedCount;
  }
  list() {
    return Array.from(this._handles);
  }
  groupedByType() {
    const out = {};
    for (const h of this._handles) {
      if (!h.refed) continue;
      out[h.type] = (out[h.type] ?? 0) + 1;
    }
    return out;
  }
  drainPromise() {
    if (this._refedCount === 0) return Promise.resolve();
    if (this._drainPromise) return this._drainPromise;
    this._drainPromise = new Promise((resolve) => {
      this._drainResolve = resolve;
    });
    return this._drainPromise;
  }
  onDrain(cb) {
    this._drainCbs.add(cb);
    return () => this._drainCbs.delete(cb);
  }
  async emitBeforeExit(code) {
    const snapshot = this._beforeExitCbs.slice();
    for (const cb of snapshot) {
      try {
        await cb(code);
      } catch (e) {
        if (isExitSentinel(e)) throw e;
      }
    }
  }
  onBeforeExit(cb) {
    this._beforeExitCbs.push(cb);
    return () => {
      const i = this._beforeExitCbs.indexOf(cb);
      if (i >= 0) this._beforeExitCbs.splice(i, 1);
    };
  }
  closeAll() {
    for (const h of Array.from(this._handles)) h.close();
  }
  _incRefed() {
    this._refedCount++;
  }
  _decRefed() {
    if (this._refedCount > 0) this._refedCount--;
    if (this._refedCount === 0) {
      const resolve = this._drainResolve;
      this._drainPromise = null;
      this._drainResolve = null;
      if (resolve) resolve();
      for (const cb of this._drainCbs) {
        try {
          cb();
        } catch {
        }
      }
    }
  }
  _remove(h) {
    this._handles.delete(h);
  }
};
var _globalRegistry = new RegistryImpl();
function getRegistry() {
  const ctx = getActiveContext();
  return ctx?.handles ?? _globalRegistry;
}
var WASM_WORK_PATCH = Symbol.for("nodepod.wasmWorkLifetime");
var _untrackedWasm = 0;
function untrackedWasm(start) {
  _untrackedWasm++;
  try {
    return start();
  } finally {
    _untrackedWasm--;
  }
}

// ../node/helpers/wasm-memory-clamp.ts
var MAX_PAGES = 65536;
var moduleMemoryImports = /* @__PURE__ */ new WeakMap();
function rememberWasmMemoryRequirements(module, imports) {
  moduleMemoryImports.set(module, imports);
}
function readLeb(bytes2, state) {
  let result = 0;
  let scale = 1;
  for (let i = 0; i < 10; i++) {
    if (state.p >= bytes2.length) throw new Error("truncated");
    const b = bytes2[state.p++];
    result += (b & 127) * scale;
    if ((b & 128) === 0) return result;
    scale *= 128;
  }
  throw new Error("LEB128 too long");
}
function skipValType(bytes2, state) {
  const t = bytes2[state.p++];
  if (t === 99 || t === 100) readLeb(bytes2, state);
}
function readWasmMemoryImports(source) {
  let bytes2;
  if (source instanceof Uint8Array) bytes2 = source;
  else if (ArrayBuffer.isView(source)) bytes2 = new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
  else bytes2 = new Uint8Array(source);
  if (bytes2.length < 8 || bytes2[0] !== 0 || bytes2[1] !== 97 || bytes2[2] !== 115 || bytes2[3] !== 109) return null;
  const st = { p: 8 };
  const memories = [];
  const decoder5 = new TextDecoder();
  try {
    while (st.p < bytes2.length) {
      const id = bytes2[st.p++];
      const size2 = readLeb(bytes2, st);
      const end4 = st.p + size2;
      if (end4 > bytes2.length) return null;
      if (id === 2) {
        const count = readLeb(bytes2, st);
        for (let i = 0; i < count; i++) {
          const moduleNameLength = readLeb(bytes2, st);
          const moduleName = decoder5.decode(bytes2.subarray(st.p, st.p + moduleNameLength));
          st.p += moduleNameLength;
          const fieldNameLength = readLeb(bytes2, st);
          const fieldName = decoder5.decode(bytes2.subarray(st.p, st.p + fieldNameLength));
          st.p += fieldNameLength;
          const kind = bytes2[st.p++];
          if (kind === 0) {
            readLeb(bytes2, st);
          } else if (kind === 1) {
            skipValType(bytes2, st);
            const flags = bytes2[st.p++];
            readLeb(bytes2, st);
            if (flags & 1) readLeb(bytes2, st);
          } else if (kind === 2) {
            const flags = readLeb(bytes2, st);
            if (flags & ~3) return null;
            const min = readLeb(bytes2, st);
            if (min > MAX_PAGES) return null;
            if (flags & 1) readLeb(bytes2, st);
            memories.push({ module: moduleName, name: fieldName, minPages: min });
          } else if (kind === 3) {
            skipValType(bytes2, st);
            st.p++;
          } else if (kind === 4) {
            st.p++;
            readLeb(bytes2, st);
          } else {
            return null;
          }
          if (st.p > end4) return null;
        }
        return memories;
      }
      if (id > 2 && id !== 0) return memories;
      st.p = end4;
    }
  } catch {
  }
  return memories;
}

// ../../node_modules/@noble/hashes/esm/utils.js
function isBytes2(a) {
  return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array";
}
function abytes(b, ...lengths) {
  if (!isBytes2(b))
    throw new Error("Uint8Array expected");
  if (lengths.length > 0 && !lengths.includes(b.length))
    throw new Error("Uint8Array expected of length " + lengths + ", got length=" + b.length);
}
function aexists(instance, checkFinished = true) {
  if (instance.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (checkFinished && instance.finished)
    throw new Error("Hash#digest() has already been called");
}
function aoutput(out, instance) {
  abytes(out);
  const min = instance.outputLen;
  if (out.length < min) {
    throw new Error("digestInto() expects output buffer of length at least " + min);
  }
}
function clean(...arrays) {
  for (let i = 0; i < arrays.length; i++) {
    arrays[i].fill(0);
  }
}
function createView(arr) {
  return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
}
var hasHexBuiltin = /* @__PURE__ */ (() => (
  // @ts-ignore
  typeof Uint8Array.from([]).toHex === "function" && typeof Uint8Array.fromHex === "function"
))();
var hexes = /* @__PURE__ */ Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, "0"));
function bytesToHex2(bytes2) {
  abytes(bytes2);
  if (hasHexBuiltin)
    return bytes2.toHex();
  let hex = "";
  for (let i = 0; i < bytes2.length; i++) {
    hex += hexes[bytes2[i]];
  }
  return hex;
}
function utf8ToBytes(str) {
  if (typeof str !== "string")
    throw new Error("string expected");
  return new Uint8Array(new TextEncoder().encode(str));
}
function toBytes(data) {
  if (typeof data === "string")
    data = utf8ToBytes(data);
  abytes(data);
  return data;
}
var Hash = class {
};

// ../../node_modules/@noble/hashes/esm/_fast.js
var KERNELS = /* @__PURE__ */ new Map();
var O = 128;
var B = 384;
var IO = 640;
var CAP = 64256;
var KB = 64896;
var enc;
var FAMILIES = [];
function bytes(s) {
  if (typeof WebAssembly != "object") throw new Error("fast-noble-hashes needs WebAssembly");
  const o = [];
  const ix = (i) => {
    const c = s.charCodeAt(i);
    return c - (c > 92 ? 34 : c > 34 ? 33 : 32);
  };
  for (let i = 0, k; i < s.length; ) o.push(((k = ix(i++)) < 2 ? k * 93 + ix(i++) + 85 : k - 8) & 255);
  return new Uint8Array(o);
}
function expand(f) {
  const o = new Uint8Array(1 << 15);
  const T = bytes(COMMON);
  const F = bytes(f.t);
  const r = f.r;
  let n = 0;
  const leb = (v) => {
    for (; ; ) {
      const b = v & 127;
      v >>= 7;
      if (v == (b & 64 ? -1 : 0)) return o[n++] = b;
      o[n++] = b | 128;
    }
  };
  const ex = (t, a, z, j) => {
    while (a < z) {
      let v = t[a++];
      if (v < 255 || (v = t[a++]) == 255) o[n++] = v;
      else if (v < 16) o[n++] = 3 + (v - j % r + r) % r;
      else if (v < 32) o[n++] = 3 + r + (v - 16 + j & 15);
      else if (v == 33) leb(t[a + 1] + t[a + 2] * 256 + t[a] * j), a += 3;
      else if (v == 35) leb(f.c[t[a++]]);
      else if (v == 42) ex(F, 0, F.length, 0);
      else if (v < 48) {
        const k = t[a++];
        const s = v > 40 ? t[a++] : 0;
        const L = t[a++] | t[a++] << 8;
        if (v < 43) for (let i = 0; i < k; i++) ex(t, a, a + L, i);
        else if (j >= s && j < k) ex(t, a, a + L, j);
        a += L;
      } else leb(f.x(v, j));
    }
  };
  ex(T, 0, T.length, 0);
  return o.subarray(0, n);
}
function wasmFamily(t, bl, po, r, k, x) {
  const f = { t, b: bl, c: [bl, po + 1, B + bl - 8, 512 + bl - 8], r, k, x };
  FAMILIES.push(f);
  return f;
}
function inst(f) {
  if (!f.e) {
    const b = expand(f);
    const e = new WebAssembly.Instance(new WebAssembly.Module(b)).exports;
    const m = new Uint8Array(e.m.buffer);
    f.m = m;
    f.i = new Int32Array(e.m.buffer);
    f.v = m.subarray(B, B + f.b);
    f.o = m.subarray(IO);
    if (f.k) new BigUint64Array(e.m.buffer, KB).set(f.k());
    f.e = e;
  }
  return f;
}
var K = (n) => () => {
  const k = [];
  for (let p = 2; k.length < n; p++) {
    let d = 2;
    while (d * d <= p && p % d) d++;
    if (d * d > p) {
      const N = BigInt(p) << 192n;
      let x = BigInt(Math.floor(Math.cbrt(p) * 2 ** 40) + 2) << 24n;
      for (let y; (y = (2n * x + N / (x * x)) / 3n) < x; ) x = y;
      k.push(x);
    }
  }
  return k;
};
function put(h, f) {
  const i = f.i;
  if (f.b > 64) i.set(h.get());
  else i[0] = h.A, i[1] = h.B, i[2] = h.C, i[3] = h.D, i[4] = h.E, i[5] = h.F, i[6] = h.G, i[7] = h.H;
}
function take(h, i) {
  h.set(i[0], i[1], i[2], i[3], i[4], i[5], i[6], i[7], i[8], i[9], i[10], i[11], i[12], i[13], i[14], i[15]);
}
function kernel(h) {
  const k = KERNELS.get(h.constructor);
  return k && h.blockLen === k.blockLen && h.outputLen === k.outputLen && h.padOffset === k.padOffset && h.isLE === k.isLE ? k : void 0;
}
function message(f, data) {
  if (typeof data == "string") {
    if (data.length * 3 <= CAP) {
      f.q = null;
      return (enc ||= new TextEncoder()).encodeInto(data, f.o).written;
    }
    data = utf8ToBytes(data);
  }
  f.q = data;
  return data.length;
}
function feed(f, pos, n) {
  const data = f.q;
  if (!data) return f.e.u(pos, n);
  for (let i = 0, c; i < n; i += c) {
    c = Math.min(CAP - pos, n - i);
    f.m.set(c < n ? data.subarray(i, i + c) : data, IO);
    pos = f.e.u(pos, c);
  }
  return pos;
}
function fastMD(h, x, digest) {
  const { buffer, pos } = h;
  let n = 0;
  if (!digest && typeof x != "string") {
    abytes(x);
    if (pos + x.length < h.blockLen) {
      buffer.set(x, pos);
      h.pos += x.length;
      h.length += x.length;
      h.roundClean();
      return true;
    }
  }
  const k = kernel(h);
  if (!k || digest && h.length !== h.length >>> 0) return false;
  const f = inst(k.f);
  const m = f.m;
  if (!digest) {
    n = message(f, x);
    if (pos + n < f.b) {
      for (let i = 0; i < n; i++) buffer[pos + i] = m[IO + i], m[IO + i] = 0;
      h.pos += n;
      h.length += n;
      return true;
    }
  }
  put(h, f);
  const keep = !digest && !pos && !(n % f.b);
  keep || m.set(buffer, B);
  if (digest) f.e.d(pos, h.length);
  else {
    h.pos = feed(f, pos, n);
    h.length += n;
  }
  keep || buffer.set(f.v);
  if (digest) x.set(k.o ||= m.subarray(O, O + k.outputLen));
  take(h, f.i);
  f.e.z();
  return true;
}
function fastProcess(h, view, offset, f) {
  inst(f);
  const d = f.d ||= new DataView(f.m.buffer);
  try {
    for (let j = 0; j < f.b; j += 4, offset += 4) d.setUint32(IO + j, view.getUint32(offset));
    f.i.set((f.g || h.get).call(h));
    f.e.u(0, f.b);
    take(h, f.i);
  } finally {
    f.e.z();
  }
}
var nodeCreateHash;
var typedLength = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Uint8Array.prototype), "length").get;
var typedSubarray = Uint8Array.prototype.subarray;
function nativeSize(msg2) {
  if (typeof msg2 === "string") return msg2.length;
  try {
    const n = typedLength.call(msg2);
    if (n < 65536) return 0;
    const proto = Object.getPrototypeOf(msg2);
    if (proto !== Uint8Array.prototype && !(typeof Buffer === "function" && proto === Buffer.prototype)) return 0;
    for (const key of ["length", "buffer", "byteOffset", "byteLength", "subarray"]) {
      if (Object.getOwnPropertyDescriptor(msg2, key)) return 0;
    }
    if (proto === Uint8Array.prototype && msg2.subarray !== typedSubarray) return 0;
    return n;
  } catch {
    return 0;
  }
}
function nativeDigest(algorithm, msg2) {
  if (nodeCreateHash === void 0) {
    nodeCreateHash = null;
    try {
      if (typeof process === "object" && typeof process.versions?.node === "string" && typeof process.getBuiltinModule === "function") {
        nodeCreateHash = process.getBuiltinModule("node:crypto").createHash;
      }
    } catch {
    }
  }
  if (!nodeCreateHash) return;
  try {
    return new Uint8Array(nodeCreateHash(algorithm).update(typeof msg2 === "string" ? utf8ToBytes(msg2) : msg2).digest());
  } catch {
  }
}
function fastHasher(hashCons, f, nativeAlgorithm) {
  const t = hashCons();
  const iv = new Int32Array(t.get());
  const outputLen = t.outputLen;
  const hashC = (msg2) => {
    if (typeof msg2 != "string") abytes(msg2);
    const F = inst(f);
    if (nativeAlgorithm && nativeSize(msg2) >= 65536) {
      const native = nativeDigest(nativeAlgorithm, msg2);
      if (native) return native;
    }
    F.i.set(iv);
    const n = message(F, msg2);
    F.e.d(feed(F, 0, n), n);
    const res2 = F.m.slice(O, O + outputLen);
    F.e.z();
    return res2;
  };
  hashC.outputLen = outputLen;
  hashC.blockLen = t.blockLen;
  hashC.create = hashCons;
  t.f = f;
  f.g = t.get;
  KERNELS.set(t.constructor, t);
  return hashC;
}
var WASM_SHA256 = "3 {n0 ci+A K* G,j(Q-S)k)I*&)-(J9))KDID&6,+*)0/.-43218765&4-(J9j*(Q95)k)Q+(J-j*J(9(Q18)I)Q+(J-))J(J*,)(Qj v)(T(9^)I(9I(:k0 DI(:k; D ?I(:k, B ? 6I(B 6I(Gk: DI(Gk< D ?I(Gk3 B ? 6J(9I(0k)Q+(J1 P& 6I(9 6I(-k/ DI(-k4 D ?I(-kB D ? 6I(/I(-I(.I(/ ? = ? 6K(0I(, 6J(,I(0I()k+ DI()k6 D ?I()k? D ? 6I()I(* =I(+I()I(* > = > 6J(0(Q1B)I)I(J*,)I)Q+(J-)) 6`+(J-))I*k!/) 6J*I+k* 7K+6)44g+* K* G,jI*I, 6I)I, 6&)-)K-I-&6,+*)0/.-43218765&4-)I,k9 6K,I+s6)44O** GI)I*&;K+I+&60/.-,+*)87654321&F)a,)4";
var COMMON = ") - ? 9*)))*H/ ,, K K K) ,+ K K* K ,+ K H) ,+ K K) ,)) ,+ K J),10)).*+,-.,*)*0>.* 9+)* A),* 0)-* <).* F)/(S Y**+ K+jI)-jk(L)I) 7K,I*I,I*sDJ+k L,I) 6k L.I+%3))I)I+ 6K)k(L)q6*k)k L,k*9)4I*I+ 7k(L) :K,-jk)k L.I+ 6I,9)4I+I,k(L) 8 6J+I*I+ 7K)-jk L,k L.I+ 6I)%3))44k L.k)I*%4)I)4 *)I)k L*d) L,k M,I) 6k)k(L)k* 7I) 7%4)I)k(L* 6k(L)u-jk)k L,k*9)k L,k)k(L)%4)4k(L+I*%0l, R9+k)k L,k*9)k)k L*k!/)9*4!!+** JI)k L*d) L,k(L+I)k(L) 6 zl, RK+9+k(L,I+9+,j(Q-=)k)k)&)-(J9))&4-(J9)*k L+k L,k*9)k L+k L-I)9*I)k L*`+ L-(Q-=)k)k)&)-(J9j)&4-(J9)*k L+k L-k*9)k L+k L,I)9*I)k L*`+ L,(Q-I)k)k)&)-(J9!/)k)&)-(J9 L*&{&4-(J9!/)I*k* 7K*6)445)k)k)k L/%4)4";

// ../../node_modules/@noble/hashes/esm/_md.js
function setBigUint64(view, byteOffset, value, isLE) {
  if (typeof view.setBigUint64 === "function")
    return view.setBigUint64(byteOffset, value, isLE);
  const _32n = BigInt(32);
  const _u32_max = BigInt(4294967295);
  const wh = Number(value >> _32n & _u32_max);
  const wl = Number(value & _u32_max);
  const h = isLE ? 4 : 0;
  const l = isLE ? 0 : 4;
  view.setUint32(byteOffset + h, wh, isLE);
  view.setUint32(byteOffset + l, wl, isLE);
}
var HashMD = class extends Hash {
  constructor(blockLen, outputLen, padOffset, isLE) {
    super();
    this.finished = false;
    this.length = 0;
    this.pos = 0;
    this.destroyed = false;
    this.blockLen = blockLen;
    this.outputLen = outputLen;
    this.padOffset = padOffset;
    this.isLE = isLE;
    this.buffer = new Uint8Array(blockLen);
    this.view = createView(this.buffer);
  }
  update(data) {
    aexists(this);
    if (fastMD(this, data))
      return this;
    data = toBytes(data);
    abytes(data);
    const { view, buffer, blockLen } = this;
    const len = data.length;
    for (let pos = 0; pos < len; ) {
      const take2 = Math.min(blockLen - this.pos, len - pos);
      if (take2 === blockLen) {
        const dataView = createView(data);
        for (; blockLen <= len - pos; pos += blockLen)
          this.process(dataView, pos);
        continue;
      }
      buffer.set(data.subarray(pos, pos + take2), this.pos);
      this.pos += take2;
      pos += take2;
      if (this.pos === blockLen) {
        this.process(view, 0);
        this.pos = 0;
      }
    }
    this.length += data.length;
    this.roundClean();
    return this;
  }
  digestInto(out) {
    aexists(this);
    aoutput(out, this);
    this.finished = true;
    if (fastMD(this, out, 1))
      return;
    const { buffer, view, blockLen, isLE } = this;
    let { pos } = this;
    buffer[pos++] = 128;
    clean(this.buffer.subarray(pos));
    if (this.padOffset > blockLen - pos) {
      this.process(view, 0);
      pos = 0;
    }
    for (let i = pos; i < blockLen; i++)
      buffer[i] = 0;
    setBigUint64(view, blockLen - 8, BigInt(this.length * 8), isLE);
    this.process(view, 0);
    const oview = createView(out);
    const len = this.outputLen;
    if (len % 4)
      throw new Error("_sha2: outputLen should be aligned to 32bit");
    const outLen = len / 4;
    const state = this.get();
    if (outLen > state.length)
      throw new Error("_sha2: outputLen bigger than state");
    for (let i = 0; i < outLen; i++)
      oview.setUint32(4 * i, state[i], isLE);
  }
  digest() {
    const { buffer, outputLen } = this;
    this.digestInto(buffer);
    const res2 = buffer.slice(0, outputLen);
    this.destroy();
    return res2;
  }
  _cloneInto(to) {
    to || (to = new this.constructor());
    to.set(...this.get());
    const { blockLen, buffer, length, finished: finished2, destroyed, pos } = this;
    to.destroyed = destroyed;
    to.finished = finished2;
    to.length = length;
    to.pos = pos;
    if (length % blockLen)
      to.buffer.set(buffer);
    return to;
  }
  clone() {
    return this._cloneInto();
  }
};
var SHA256_IV = /* @__PURE__ */ Uint32Array.from([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]);

// ../../node_modules/@noble/hashes/esm/sha2.js
var FAST_SHA256 = /* @__PURE__ */ wasmFamily(WASM_SHA256, 64, 8, 8, /* @__PURE__ */ K(64));
var SHA256 = class extends HashMD {
  constructor(outputLen = 32) {
    super(64, outputLen, 8, false);
    this.A = SHA256_IV[0] | 0;
    this.B = SHA256_IV[1] | 0;
    this.C = SHA256_IV[2] | 0;
    this.D = SHA256_IV[3] | 0;
    this.E = SHA256_IV[4] | 0;
    this.F = SHA256_IV[5] | 0;
    this.G = SHA256_IV[6] | 0;
    this.H = SHA256_IV[7] | 0;
  }
  get() {
    const { A, B: B2, C, D, E, F, G, H } = this;
    return [A, B2, C, D, E, F, G, H];
  }
  // prettier-ignore
  set(A, B2, C, D, E, F, G, H) {
    this.A = A | 0;
    this.B = B2 | 0;
    this.C = C | 0;
    this.D = D | 0;
    this.E = E | 0;
    this.F = F | 0;
    this.G = G | 0;
    this.H = H | 0;
  }
  process(view, offset) {
    fastProcess(this, view, offset, FAST_SHA256);
  }
  roundClean() {
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0);
    clean(this.buffer);
  }
};
var sha256 = /* @__PURE__ */ fastHasher(() => new SHA256(), FAST_SHA256, "sha256");

// ../../node_modules/@noble/hashes/esm/sha256.js
var sha2562 = sha256;

// ../node/persistence/wasm-module-cache.ts
var DB_NAME = "nodepod-wasm-modules";
var STORE_NAME = "wasmModules";
var DB_VERSION = 1;
var MAX_ENTRIES = 32;
var MAX_AGE_MS = 30 * 24 * 60 * 60 * 1e3;
var activeContentHashes = 0;
function isHashingWasmContent() {
  return activeContentHashes > 0;
}
function quickWasmHash(bytes2) {
  activeContentHashes++;
  try {
    return bytesToHex2(sha2562(bytes2));
  } finally {
    activeContentHashes--;
  }
}
async function wasmContentHash(bytes2) {
  try {
    const subtle = globalThis.crypto?.subtle;
    if (subtle) {
      const buf = typeof SharedArrayBuffer !== "undefined" && bytes2.buffer instanceof SharedArrayBuffer ? new Uint8Array(bytes2) : bytes2;
      const digest = await subtle.digest("SHA-256", buf);
      return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
    }
  } catch {
  }
  return quickWasmHash(bytes2);
}
function openDB() {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}
function idbGet(db, key) {
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    } catch (e) {
      reject(e);
    }
  });
}
function idbPut(db, key, value) {
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    } catch (e) {
      reject(e);
    }
  });
}
function idbPrune(db) {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.openCursor();
      const now = Date.now();
      const kept = [];
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          const entry = cursor.value;
          if (!entry?.storedAt || now - entry.storedAt > MAX_AGE_MS) {
            cursor.delete();
          } else {
            kept.push({ key: cursor.key, storedAt: entry.storedAt });
          }
          cursor.continue();
          return;
        }
        if (kept.length > MAX_ENTRIES) {
          kept.sort((a, b) => a.storedAt - b.storedAt);
          const evictTx = db.transaction(STORE_NAME, "readwrite");
          const evictStore = evictTx.objectStore(STORE_NAME);
          for (const e of kept.slice(0, kept.length - MAX_ENTRIES)) {
            evictStore.delete(e.key);
          }
        }
        resolve();
      };
      req.onerror = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}
async function createCache() {
  const db = await openDB();
  if (!db) return null;
  let cloneSupported = true;
  return {
    async get(hash) {
      try {
        const entry = await idbGet(db, hash);
        if (!entry?.module) return null;
        if (Date.now() - entry.storedAt > MAX_AGE_MS) return null;
        if (typeof WebAssembly !== "undefined" && !(entry.module instanceof WebAssembly.Module)) {
          return null;
        }
        return entry.module;
      } catch {
        return null;
      }
    },
    async put(hash, module) {
      if (!cloneSupported) return;
      try {
        await idbPut(db, hash, { module, storedAt: Date.now() });
        idbPrune(db).catch(() => {
        });
      } catch (e) {
        if (e?.name === "DataCloneError") cloneSupported = false;
      }
    },
    close() {
      try {
        db.close();
      } catch {
      }
    }
  };
}
var _singleton = null;
function getWasmModuleCache() {
  if (!_singleton) _singleton = createCache();
  return _singleton;
}

// ../node/helpers/wasm-cache.ts
var PRECOMPILE_THRESHOLD = 4 * 1024 * 1024;
var moduleCache = /* @__PURE__ */ new Map();
var MODULE_CACHE_MAX_BYTES = 64 * 1024 * 1024;
var MODULE_CACHE_MAX_ENTRIES = 64;
function trimModuleCache() {
  let bytes2 = 0;
  for (const entry of moduleCache.values()) bytes2 += entry.sourceBytes;
  for (const [key, entry] of moduleCache) {
    if (bytes2 <= MODULE_CACHE_MAX_BYTES && moduleCache.size <= MODULE_CACHE_MAX_ENTRIES || moduleCache.size <= 1) break;
    if (!entry.module) continue;
    moduleCache.delete(key);
    bytes2 -= entry.sourceBytes;
  }
}
function actualByteLength(bytes2) {
  return bytes2.byteLength;
}
function toUint8(bytes2) {
  if (bytes2 instanceof ArrayBuffer) return new Uint8Array(bytes2);
  return new Uint8Array(bytes2.buffer, bytes2.byteOffset, bytes2.byteLength);
}
function persistModule(bytes2, module) {
  wasmContentHash(bytes2).then(async (hash) => {
    const cache = await getWasmModuleCache();
    if (cache) await cache.put(hash, module);
  }).catch(() => {
  });
}
async function loadPersistedModule(hash) {
  try {
    const cache = await getWasmModuleCache();
    if (!cache) return null;
    return await cache.get(hash);
  } catch {
    return null;
  }
}
function registerCompiledModule(bytes2, module) {
  rememberWasmMemoryRequirements(module, readWasmMemoryImports(bytes2));
  if (isHashingWasmContent()) return;
  const key = quickWasmHash(bytes2);
  moduleCache.set(key, {
    promise: Promise.resolve(module),
    module,
    sourceBytes: bytes2.byteLength
  });
  trimModuleCache();
  persistModule(bytes2, module);
}
function precompileWasm(bytes2) {
  if (isHashingWasmContent()) return;
  if (typeof WebAssembly === "undefined") return;
  if (actualByteLength(bytes2) < PRECOMPILE_THRESHOLD) return;
  const view = toUint8(bytes2);
  const key = quickWasmHash(view);
  if (moduleCache.has(key)) return;
  const stable = view.slice();
  const entry = {
    promise: (async () => {
      const hash = await wasmContentHash(stable);
      const completed = moduleCache.get(key)?.module;
      if (completed) return completed;
      const persisted = await loadPersistedModule(hash);
      const compiledMeanwhile = moduleCache.get(key)?.module;
      if (compiledMeanwhile) return compiledMeanwhile;
      if (persisted) {
        rememberWasmMemoryRequirements(persisted, readWasmMemoryImports(stable));
        return persisted;
      }
      const mod = await untrackedWasm(() => WebAssembly.compile(stable));
      rememberWasmMemoryRequirements(mod, readWasmMemoryImports(stable));
      void getWasmModuleCache().then((cache) => cache?.put(hash, mod)).catch(() => {
      });
      return mod;
    })(),
    module: null,
    sourceBytes: stable.byteLength
  };
  entry.promise.then(
    (m) => {
      entry.module = m;
      trimModuleCache();
    },
    () => {
      if (moduleCache.get(key) === entry) moduleCache.delete(key);
    }
  );
  moduleCache.set(key, entry);
  trimModuleCache();
}

// ../node/helpers/wasm-cdn.ts
var WASM_DEBUG_SUFFIX = ".debug.wasm";
function resolveWasmAssetPath(volume, vfsPath) {
  if (!vfsPath.endsWith(WASM_DEBUG_SUFFIX) || volume.existsSync(vfsPath)) {
    return vfsPath;
  }
  return vfsPath.slice(0, -WASM_DEBUG_SUFFIX.length) + ".wasm";
}
function buildCdnWasmUrl(volume, vfsPath) {
  if (!vfsPath.endsWith(".wasm")) return null;
  const nmIdx = vfsPath.lastIndexOf("/node_modules/");
  if (nmIdx === -1) return null;
  const assetPath = resolveWasmAssetPath(volume, vfsPath);
  const afterNm = assetPath.substring(nmIdx + "/node_modules/".length);
  const parts = afterNm.split("/");
  let pkgName;
  let filePath;
  if (parts[0].startsWith("@")) {
    if (parts.length < 3) return null;
    pkgName = parts[0] + "/" + parts[1];
    filePath = parts.slice(2).join("/");
  } else {
    if (parts.length < 2) return null;
    pkgName = parts[0];
    filePath = parts.slice(1).join("/");
  }
  let version = "latest";
  try {
    const pkgJsonPath = vfsPath.substring(0, nmIdx + "/node_modules/".length) + pkgName + "/package.json";
    const pkgJson = JSON.parse(volume.readFileSync(pkgJsonPath, "utf8"));
    if (pkgJson.version) version = pkgJson.version;
  } catch {
  }
  return `https://cdn.jsdelivr.net/npm/${pkgName}@${version}/${filePath}`;
}
var _inflight = /* @__PURE__ */ new Map();
var _refusedPackages = /* @__PURE__ */ new Set();
function cdnPackageKey(cdnUrl) {
  const rest = cdnUrl.slice(cdnUrl.indexOf("/npm/") + "/npm/".length);
  const at = rest.indexOf("@", rest.startsWith("@") ? 1 : 0);
  const slash = rest.indexOf("/", at);
  return slash < 0 ? rest : rest.slice(0, slash);
}
function prefetchWasmFromCdn(volume, vfsPath) {
  const assetPath = resolveWasmAssetPath(volume, vfsPath);
  const existing = _inflight.get(assetPath);
  if (existing) return existing;
  const promise = (async () => {
    const cdnUrl = buildCdnWasmUrl(volume, assetPath);
    if (!cdnUrl || typeof fetch === "undefined") return false;
    const packageKey = cdnPackageKey(cdnUrl);
    if (_refusedPackages.has(packageKey)) return false;
    try {
      const resp = await fetch(cdnUrl);
      if (!resp.ok) {
        if (resp.status === 403) _refusedPackages.add(packageKey);
        return false;
      }
      let streamingCompile = null;
      if (typeof WebAssembly !== "undefined" && typeof WebAssembly.compileStreaming === "function") {
        try {
          streamingCompile = WebAssembly.compileStreaming(resp.clone());
          streamingCompile.catch(() => {
          });
        } catch {
          streamingCompile = null;
        }
      }
      const bytes2 = new Uint8Array(await resp.arrayBuffer());
      if (bytes2.byteLength === 0) return false;
      try {
        const dir = assetPath.substring(0, assetPath.lastIndexOf("/")) || "/";
        volume.mkdirSync(dir, { recursive: true });
        volume.writeFileSync(assetPath, bytes2);
      } catch {
      }
      if (streamingCompile && bytes2.byteLength >= PRECOMPILE_THRESHOLD) {
        try {
          registerCompiledModule(bytes2, await streamingCompile);
        } catch {
          precompileWasm(bytes2);
        }
      } else {
        precompileWasm(bytes2);
      }
      return true;
    } catch {
      return false;
    } finally {
      _inflight.delete(assetPath);
    }
  })();
  _inflight.set(assetPath, promise);
  return promise;
}

// ../node/constants/internal-vfs-paths.ts
var INTERNAL_PREFIXES = ["/.nodepod"];
var PREFIX_FORMS = INTERNAL_PREFIXES.map((prefix) => [prefix, prefix.slice(1)]);
function isInternalVfsPath(path) {
  const relative = path.charCodeAt(0) === 47 ? 0 : 1;
  for (const forms of PREFIX_FORMS) {
    const prefix = forms[relative];
    if (!path.startsWith(prefix)) continue;
    if (path.length === prefix.length || path.charCodeAt(prefix.length) === 47) return true;
  }
  return false;
}

// ../node/polyfills/timers.ts
var _rawSetTimeout = globalThis.setTimeout.bind(globalThis);
var _rawSetInterval = globalThis.setInterval.bind(globalThis);
var _rawClearTimeout = globalThis.clearTimeout.bind(globalThis);
var _rawClearInterval = globalThis.clearInterval.bind(globalThis);
var _activeTimers = /* @__PURE__ */ new Set();
function trackTimer(timer) {
  _activeTimers.add(timer);
}
function untrackTimer(timer) {
  _activeTimers.delete(timer);
}
var _immediateQueue = [];
var _immediateScheduled = false;
var _scheduleCheck;
if (typeof MessageChannel !== "undefined") {
  const _mc = new MessageChannel();
  _mc.port1.onmessage = () => _flushImmediates();
  _scheduleCheck = () => _mc.port2.postMessage(0);
} else {
  _scheduleCheck = () => queueMicrotask(_flushImmediates);
}
function _flushImmediates() {
  _immediateScheduled = false;
  const batch = _immediateQueue.splice(0);
  for (const entry of batch) {
    if (entry.cleared) continue;
    entry.timer._fired = true;
    untrackTimer(entry.timer);
    entry.handle.close();
    try {
      const r = entry.cb(...entry.args);
      if (r && typeof r.then === "function") {
        r.then(void 0, (e) => {
          if (isExitSentinel(e)) return;
          queueMicrotask(() => {
            throw e;
          });
        });
      }
    } catch (e) {
      if (isExitSentinel(e)) continue;
      queueMicrotask(() => {
        throw e;
      });
    }
  }
  if (_immediateQueue.length > 0 && !_immediateScheduled) {
    _immediateScheduled = true;
    _scheduleCheck();
  }
}
function makeImmediate(cb, args) {
  const handle = getRegistry().register("Immediate");
  const self2 = {};
  const entry = { handle, timer: self2, cb, args, cleared: false };
  self2._isInterval = false;
  self2._fired = false;
  self2._handle = handle;
  self2._id = entry;
  trackTimer(self2);
  self2.ref = () => {
    if (!entry.cleared) handle.ref();
    return self2;
  };
  self2.unref = () => {
    handle.unref();
    return self2;
  };
  self2.hasRef = () => handle.refed;
  self2.refresh = () => self2;
  self2[Symbol.toPrimitive] = () => 0;
  _immediateQueue.push(entry);
  if (!_immediateScheduled) {
    _immediateScheduled = true;
    _scheduleCheck();
  }
  return self2;
}
function setImmediate(callback, ...args) {
  return makeImmediate(callback, args);
}
function clearTimeout2(t) {
  if (t && typeof t === "object" && "_id" in t && "_handle" in t) {
    const timer = t;
    untrackTimer(timer);
    const id = timer._id;
    if (id && typeof id === "object" && "cleared" in id) {
      id.cleared = true;
    } else {
      _rawClearTimeout(timer._id);
    }
    timer._handle.close();
    return;
  }
  _rawClearTimeout(t);
}
function clearImmediate(t) {
  clearTimeout2(t);
}

// ../node/polyfills/events.ts
var DEFAULT_CEILING = 10;
var _vfsBridged = /* @__PURE__ */ new WeakSet();
var _vfsBridgeCleanups = /* @__PURE__ */ new Set();
function _bridgeVfsToWatcher(watcher) {
  const vol = globalThis.__nodepodVolume;
  if (!vol || typeof vol.onGlobalChange !== "function") {
    return;
  }
  const pending = /* @__PURE__ */ new Map();
  let scheduled;
  const flush = () => {
    scheduled = void 0;
    const batch = Array.from(pending);
    pending.clear();
    for (const [path, event] of batch) {
      if (event === "change" || event === "add" || event === "addDir" || event === "unlink") {
        watcher.emit(event, path);
      }
    }
  };
  const cleanup = vol.onGlobalChange((path, event) => {
    if (path.includes("/node_modules/") || path.includes("/.cache/") || isInternalVfsPath(path)) {
      return;
    }
    pending.set(path, event);
    if (!scheduled) scheduled = setImmediate(flush);
  });
  const selfCleanup = () => {
    cleanup();
    if (scheduled) clearImmediate(scheduled);
    scheduled = void 0;
    pending.clear();
    _vfsBridgeCleanups.delete(selfCleanup);
  };
  _vfsBridgeCleanups.add(selfCleanup);
  watcher.once("close", selfCleanup);
}
function _reg(self2) {
  if (!self2._registry) self2._registry = /* @__PURE__ */ new Map();
  return self2._registry;
}
function _ensureSlot(self2, name) {
  const reg = _reg(self2);
  let slot = reg.get(name);
  if (!slot) {
    slot = [];
    reg.set(name, slot);
  }
  return slot;
}
var EventEmitter = function EventEmitter2() {
  if (this && !this._registry) {
    this._registry = /* @__PURE__ */ new Map();
  }
  if (this && this._ceiling === void 0) {
    this._ceiling = DEFAULT_CEILING;
  }
};
function _announceAdd(target, name, handler) {
  if (_reg(target).has("newListener")) {
    target.emit("newListener", name, handler.listener ?? handler);
  }
}
function _announceRemove(target, name, handler) {
  if (_reg(target).has("removeListener")) {
    target.emit("removeListener", name, handler.listener ?? handler);
  }
}
EventEmitter.prototype.addListener = function addListener(name, handler) {
  _announceAdd(this, name, handler);
  const slot = _ensureSlot(this, name);
  slot.push(handler);
  if (name === "change" && !_vfsBridged.has(this) && this._watched instanceof Map) {
    _vfsBridged.add(this);
    _bridgeVfsToWatcher(this);
  }
  return this;
};
EventEmitter.prototype.on = EventEmitter.prototype.addListener;
EventEmitter.prototype.once = function once(name, handler) {
  const self2 = this;
  const wrapper = function(...payload) {
    self2.removeListener(name, wrapper);
    handler.apply(self2, payload);
  };
  wrapper.listener = handler;
  _announceAdd(this, name, wrapper);
  const slot = _ensureSlot(this, name);
  slot.push(wrapper);
  return this;
};
EventEmitter.prototype.removeListener = function removeListener(name, handler) {
  const slot = _reg(this).get(name);
  if (slot) {
    let pos = slot.indexOf(handler);
    if (pos === -1) {
      pos = slot.findIndex(
        (fn) => fn.listener === handler
      );
    }
    if (pos !== -1) {
      const [removed] = slot.splice(pos, 1);
      _announceRemove(this, name, removed);
    }
  }
  return this;
};
EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
EventEmitter.prototype.removeAllListeners = function removeAllListeners(name) {
  const reg = _reg(this);
  if (!reg.has("removeListener")) {
    if (name !== void 0) reg.delete(name);
    else reg.clear();
    return this;
  }
  const names = name !== void 0 ? [name] : [...reg.keys()].filter((n) => n !== "removeListener").concat("removeListener");
  for (const n of names) {
    const slot = reg.get(n);
    if (!slot) continue;
    for (let i = slot.length - 1; i >= 0; i--) this.removeListener(n, slot[i]);
    reg.delete(n);
  }
  return this;
};
EventEmitter.prototype.emit = function emit(name, ...payload) {
  const slot = _reg(this).get(name);
  if (!slot || slot.length === 0) {
    if (name === "error") {
      const problem = payload[0];
      if (problem instanceof Error) throw problem;
      throw new Error("Unhandled error event");
    }
    return false;
  }
  if (slot.length === 1) {
    try {
      slot[0].apply(this, payload);
    } catch (e) {
      if (isExitSentinel(e)) throw e;
    }
    return true;
  }
  const snapshot = slot.slice();
  for (const handler of snapshot) {
    try {
      handler.apply(this, payload);
    } catch (e) {
      if (isExitSentinel(e)) throw e;
    }
  }
  return true;
};
EventEmitter.prototype.listeners = function listeners(name) {
  const slot = _reg(this).get(name);
  return slot ? slot.slice() : [];
};
EventEmitter.prototype.rawListeners = function rawListeners(name) {
  return this.listeners(name);
};
EventEmitter.prototype.listenerCount = function listenerCount(name) {
  const slot = _reg(this).get(name);
  return slot ? slot.length : 0;
};
EventEmitter.prototype.eventNames = function eventNames() {
  return Array.from(_reg(this).keys());
};
EventEmitter.prototype.setMaxListeners = function setMaxListeners(limit) {
  this._ceiling = limit;
  return this;
};
EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
  return this._ceiling ?? DEFAULT_CEILING;
};
EventEmitter.prototype.prependListener = function prependListener(name, handler) {
  _announceAdd(this, name, handler);
  const slot = _ensureSlot(this, name);
  slot.unshift(handler);
  return this;
};
EventEmitter.prototype.prependOnceListener = function prependOnceListener(name, handler) {
  const self2 = this;
  const wrapper = function(...payload) {
    self2.removeListener(name, wrapper);
    handler.apply(self2, payload);
  };
  wrapper.listener = handler;
  return this.prependListener(name, wrapper);
};
EventEmitter.listenerCount = function(target, name) {
  return target.listenerCount(name);
};
Object.defineProperty(EventEmitter, "defaultMaxListeners", {
  get() {
    return DEFAULT_CEILING;
  },
  set(v) {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) {
      throw new RangeError(
        `defaultMaxListeners must be a non-negative number; got ${v}`
      );
    }
    DEFAULT_CEILING = n;
  },
  enumerable: true,
  configurable: true
});
var moduleFacade = EventEmitter;
moduleFacade.EventEmitter = EventEmitter;
moduleFacade.once = async (target, name) => {
  return new Promise((fulfill, reject) => {
    const onSuccess = (...args) => {
      target.removeListener("error", onFailure);
      fulfill(args);
    };
    const onFailure = (...args) => {
      target.removeListener(name, onSuccess);
      reject(args[0]);
    };
    target.once(name, onSuccess);
    target.once("error", onFailure);
  });
};
moduleFacade.on = (target, name) => {
  const unread = [];
  const waiting = [];
  const rejecters = [];
  let finished2 = false;
  let errored = null;
  const onEvent = (...args) => {
    if (finished2) return;
    const w = waiting.shift();
    rejecters.shift();
    if (w) w({ value: args, done: false });
    else unread.push(args);
  };
  const onError = (err) => {
    if (finished2) return;
    errored = err;
    cleanup();
    const r = rejecters.shift();
    waiting.shift();
    if (r) r(err);
  };
  const cleanup = () => {
    if (finished2) return;
    finished2 = true;
    target.removeListener(name, onEvent);
    target.removeListener("error", onError);
  };
  target.on(name, onEvent);
  target.on("error", onError);
  const iter = {
    async next() {
      if (errored) {
        const e = errored;
        errored = null;
        throw e;
      }
      if (unread.length > 0) {
        return { value: unread.shift(), done: false };
      }
      if (finished2) {
        return { value: void 0, done: true };
      }
      return new Promise(
        (fulfill, reject) => {
          waiting.push(fulfill);
          rejecters.push(reject);
        }
      );
    },
    async return(value) {
      cleanup();
      while (waiting.length > 0) {
        const w = waiting.shift();
        rejecters.shift();
        w?.({ value: void 0, done: true });
      }
      return { value, done: true };
    },
    async throw(err) {
      cleanup();
      while (rejecters.length > 0) {
        const r = rejecters.shift();
        waiting.shift();
        r?.(err);
      }
      throw err;
    },
    [Symbol.asyncIterator]() {
      return this;
    }
  };
  return iter;
};
moduleFacade.getEventListeners = (target, name) => target.listeners(name);
moduleFacade.listenerCount = (target, name) => target.listenerCount(name);

// ../node/polyfills/buffer.ts
var textEnc = new TextEncoder();
var textDec = new TextDecoder("utf-8");
var LENGTH_SCRATCH_MAX = 1024 * 1024;
var lengthScratch = null;
function utf8ByteLength(text) {
  const worst = text.length * 3;
  if (worst > LENGTH_SCRATCH_MAX) return textEnc.encode(text).length;
  if (!lengthScratch || lengthScratch.length < worst) {
    lengthScratch = new Uint8Array(Math.max(worst, 16 * 1024));
  }
  return textEnc.encodeInto(text, lengthScratch).written;
}
function encodeUtf16Le(value) {
  const bytes2 = new Uint8Array(value.length * 2);
  for (let i = 0; i < value.length; i++) {
    const codeUnit = value.charCodeAt(i);
    bytes2[i * 2] = codeUnit & 255;
    bytes2[i * 2 + 1] = codeUnit >>> 8;
  }
  return bytes2;
}
function decodeUtf16Le(bytes2) {
  let result = "";
  const chunkSize = 32768;
  for (let offset = 0; offset + 1 < bytes2.length; offset += chunkSize * 2) {
    const count = Math.min(chunkSize, bytes2.length - offset >>> 1);
    const codeUnits = new Array(count);
    for (let i = 0; i < count; i++) {
      codeUnits[i] = bytes2[offset + i * 2] | bytes2[offset + i * 2 + 1] << 8;
    }
    result += String.fromCharCode(...codeUnits);
  }
  return result;
}
var HEX_DECODE = new Uint8Array(128);
for (let i = 0; i < 10; i++) HEX_DECODE[48 + i] = i;
for (let i = 0; i < 6; i++) {
  HEX_DECODE[65 + i] = 10 + i;
  HEX_DECODE[97 + i] = 10 + i;
}
function lenientBase64(input) {
  let b64 = input.split("=")[0].replace(/-/g, "+").replace(/_/g, "/").replace(/[^A-Za-z0-9+/]/g, "");
  const rem = b64.length % 4;
  if (rem === 1) b64 = b64.slice(0, -1);
  else if (rem === 2) b64 += "==";
  else if (rem === 3) b64 += "=";
  return b64;
}
function viewOf(bytes2) {
  return new BufferPolyfill(bytes2.buffer, bytes2.byteOffset, bytes2.byteLength);
}
var nativeIndexOf = Uint8Array.prototype.indexOf;
var KNOWN_ENCODINGS = /* @__PURE__ */ new Set([
  "utf8",
  "utf-8",
  "ascii",
  "latin1",
  "binary",
  "base64",
  "base64url",
  "hex",
  "utf16le",
  "utf-16le",
  "ucs2",
  "ucs-2"
]);
var BufferPolyfill = class _BufferPolyfill extends Uint8Array {
  static BYTES_PER_ELEMENT = 1;
  // Overloads matching Node.js Buffer.from
  static from(source, encOrMapper, ctx) {
    if (typeof encOrMapper === "function") {
      const items = Array.from(source, encOrMapper, ctx);
      return new _BufferPolyfill(items);
    }
    const encoding = encOrMapper;
    if (Array.isArray(source)) {
      return new _BufferPolyfill(source);
    }
    if (typeof source === "string") {
      if (encoding === void 0 || encoding === "utf8" || encoding === "utf-8") {
        return viewOf(textEnc.encode(source));
      }
      const enc2 = (encoding || "utf8").toLowerCase();
      if (enc2 === "base64" || enc2 === "base64url") {
        let b64 = source;
        if (enc2 === "base64url") {
          b64 = b64.replace(/-/g, "+").replace(/_/g, "/");
          while (b64.length % 4 !== 0) b64 += "=";
        }
        let decoded;
        try {
          decoded = base64ToBytes(b64);
        } catch {
          decoded = base64ToBytes(lenientBase64(b64));
        }
        return viewOf(decoded);
      }
      if (enc2 === "hex") {
        const octets = new Uint8Array(source.length >>> 1);
        for (let i = 0; i < source.length; i += 2) {
          octets[i >>> 1] = HEX_DECODE[source.charCodeAt(i)] << 4 | HEX_DECODE[source.charCodeAt(i + 1)];
        }
        return viewOf(octets);
      }
      if (enc2 === "latin1" || enc2 === "binary" || enc2 === "ascii") {
        const octets = new Uint8Array(source.length);
        for (let i = 0; i < source.length; i++) {
          octets[i] = source.charCodeAt(i) & 255;
        }
        return viewOf(octets);
      }
      if (enc2 === "utf16le" || enc2 === "utf-16le" || enc2 === "ucs2" || enc2 === "ucs-2") {
        return viewOf(encodeUtf16Le(source));
      }
      return viewOf(textEnc.encode(source));
    }
    if (source instanceof ArrayBuffer || typeof SharedArrayBuffer !== "undefined" && source instanceof SharedArrayBuffer) {
      if (typeof encOrMapper === "number") {
        const offset = encOrMapper;
        const length = ctx;
        return new _BufferPolyfill(source, offset, length);
      }
      return new _BufferPolyfill(source);
    }
    return new _BufferPolyfill(source);
  }
  static alloc(len, fillValue, encoding) {
    const buf = new _BufferPolyfill(len);
    if (fillValue === void 0) return buf;
    if (typeof fillValue === "number") {
      buf.fill(fillValue & 255);
      return buf;
    }
    const fillBytes = typeof fillValue === "string" ? _BufferPolyfill.from(fillValue, encoding || "utf8") : fillValue instanceof Uint8Array ? fillValue : _BufferPolyfill.from(fillValue);
    if (fillBytes.length === 0) return buf;
    for (let i = 0; i < len; i++) {
      buf[i] = fillBytes[i % fillBytes.length];
    }
    return buf;
  }
  static allocUnsafe(len) {
    return new _BufferPolyfill(len);
  }
  static allocUnsafeSlow(len) {
    return new _BufferPolyfill(len);
  }
  static concat(list, totalLength) {
    let sumLen = 0;
    for (const chunk of list) sumLen += chunk.length;
    const targetLen = totalLength !== void 0 ? totalLength : sumLen;
    const merged = new _BufferPolyfill(targetLen);
    let pos = 0;
    for (const chunk of list) {
      if (pos >= targetLen) break;
      const copyLen = Math.min(chunk.length, targetLen - pos);
      if (copyLen === chunk.length) {
        merged.set(chunk, pos);
      } else {
        merged.set(chunk.subarray(0, copyLen), pos);
      }
      pos += copyLen;
    }
    return merged;
  }
  static compare(a, b) {
    const bound = Math.min(a.length, b.length);
    for (let i = 0; i < bound; i++) {
      if (a[i] < b[i]) return -1;
      if (a[i] > b[i]) return 1;
    }
    if (a.length < b.length) return -1;
    if (a.length > b.length) return 1;
    return 0;
  }
  // Real Node returns false for plain Uint8Arrays. Code branches on this to
  // decide whether Buffer methods exist on the value (e.g. Next's
  // indexOfUint8Array calls haystack.indexOf(needleBytes), which only does a
  // subsequence search on a real Buffer — native Uint8Array#indexOf compares
  // elements against the needle object and always misses).
  static isBuffer(candidate) {
    return candidate instanceof _BufferPolyfill;
  }
  static isEncoding(enc2) {
    return KNOWN_ENCODINGS.has(enc2.toLowerCase());
  }
  static byteLength(text, enc2) {
    if (typeof text !== "string") {
      if (ArrayBuffer.isView(text) || text instanceof ArrayBuffer || typeof SharedArrayBuffer !== "undefined" && text instanceof SharedArrayBuffer) {
        return text.byteLength;
      }
      text = String(text);
    }
    const lower = (enc2 || "utf8").toLowerCase();
    if (lower === "base64" || lower === "base64url") {
      const stripped = text.replace(/[=]/g, "");
      return Math.floor(stripped.length * 3 / 4);
    }
    if (lower === "hex") {
      return text.length >>> 1;
    }
    if (lower === "utf16le" || lower === "utf-16le" || lower === "ucs2" || lower === "ucs-2") {
      return text.length * 2;
    }
    if (lower === "latin1" || lower === "binary" || lower === "ascii") {
      return text.length;
    }
    return utf8ByteLength(text);
  }
  // ---- Instance methods ----
  toString(enc2 = "utf8", start, end4) {
    const lower = enc2 === "utf8" ? "utf8" : (enc2 || "utf8").toLowerCase();
    let view = this;
    if (start !== void 0 || end4 !== void 0) {
      const from3 = Math.max(0, Math.min(this.length, start ?? 0));
      const to = Math.max(from3, Math.min(this.length, end4 ?? this.length));
      view = this.subarray(from3, to);
    }
    if (lower === "base64") return bytesToBase64(view);
    if (lower === "base64url") {
      return bytesToBase64(view).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    }
    if (lower === "hex") return bytesToHex(view);
    if (lower === "latin1" || lower === "binary" || lower === "ascii") {
      return bytesToLatin1(view);
    }
    if (lower === "utf16le" || lower === "utf-16le" || lower === "ucs2" || lower === "ucs-2") {
      return decodeUtf16Le(view);
    }
    const short = decodeShortAscii(view);
    if (short !== null) return short;
    if (typeof SharedArrayBuffer !== "undefined" && view.buffer instanceof SharedArrayBuffer) {
      const copy = new Uint8Array(view.byteLength);
      copy.set(view);
      return textDec.decode(copy);
    }
    return textDec.decode(view);
  }
  slice(begin, end4) {
    return this.subarray(begin, end4);
  }
  subarray(begin, end4) {
    const len = this.length;
    let from3 = begin === void 0 ? 0 : Math.trunc(Number(begin)) || 0;
    from3 = from3 < 0 ? Math.max(len + from3, 0) : Math.min(from3, len);
    let to = end4 === void 0 ? len : Math.trunc(Number(end4)) || 0;
    to = to < 0 ? Math.max(len + to, 0) : Math.min(to, len);
    return new _BufferPolyfill(this.buffer, this.byteOffset + from3, Math.max(to - from3, 0));
  }
  write(string, offsetOrEncoding, lengthOrEncoding, encoding) {
    const offset = typeof offsetOrEncoding === "number" ? offsetOrEncoding : 0;
    let enc2;
    if (typeof offsetOrEncoding === "string") enc2 = offsetOrEncoding;
    else if (typeof lengthOrEncoding === "string") enc2 = lengthOrEncoding;
    else enc2 = encoding;
    const encoded = _BufferPolyfill.from(string, enc2 || "utf8");
    let len = typeof lengthOrEncoding === "number" ? Math.min(lengthOrEncoding, encoded.length) : encoded.length;
    len = Math.min(len, this.length - offset);
    this.set(encoded.subarray(0, len), offset);
    return len;
  }
  copy(dest, destStart, srcStart, srcEnd) {
    const segment = this.subarray(srcStart || 0, srcEnd);
    dest.set(segment, destStart || 0);
    return segment.length;
  }
  compare(other) {
    const bound = Math.min(this.length, other.length);
    for (let i = 0; i < bound; i++) {
      if (this[i] < other[i]) return -1;
      if (this[i] > other[i]) return 1;
    }
    if (this.length < other.length) return -1;
    if (this.length > other.length) return 1;
    return 0;
  }
  equals(other) {
    if (this.length !== other.length) return false;
    return this.compare(other) === 0;
  }
  toJSON() {
    return { type: "Buffer", data: Array.from(this) };
  }
  hasOwnProperty(key) {
    return Object.prototype.hasOwnProperty.call(this, key);
  }
  indexOf(needle, fromIndex) {
    const start = fromIndex || 0;
    if (typeof needle === "number") {
      if (typeof start !== "number" || start !== Math.floor(start)) return -1;
      return nativeIndexOf.call(this, needle, start < 0 ? 0 : start);
    }
    const search = typeof needle === "string" ? _BufferPolyfill.from(needle) : needle;
    const n = search.length;
    const last = this.length - n;
    if (n === 0) return start <= last ? start : -1;
    if (typeof start !== "number") return -1;
    const first = search[0];
    let i = start < 0 ? 0 : start;
    if (i !== Math.floor(i)) {
      return -1;
    }
    while (i <= last) {
      i = nativeIndexOf.call(this, first, i);
      if (i === -1 || i > last) return -1;
      let j = 1;
      while (j < n && this[i + j] === search[j]) j++;
      if (j === n) return i;
      i++;
    }
    return -1;
  }
  lastIndexOf(needle, fromIndex) {
    const end4 = fromIndex === void 0 ? this.length : Math.min(Math.max(fromIndex, 0), this.length);
    if (typeof needle === "number") {
      const byte = needle & 255;
      for (let i = end4 - 1; i >= 0; i--) {
        if (this[i] === byte) return i;
      }
      return -1;
    }
    const search = typeof needle === "string" ? _BufferPolyfill.from(needle) : needle;
    if (search.length === 0) return end4;
    if (search.length > this.length) return -1;
    const maxStart = Math.min(end4, this.length - search.length);
    for (let i = maxStart; i >= 0; i--) {
      let match = true;
      for (let j = 0; j < search.length; j++) {
        if (this[i + j] !== search[j]) {
          match = false;
          break;
        }
      }
      if (match) return i;
    }
    return -1;
  }
  includes(needle, fromIndex) {
    return this.indexOf(needle, fromIndex) !== -1;
  }
  // ---- Unsigned integer reads ----
  readUInt8(pos) {
    return this[pos];
  }
  readUInt16BE(pos) {
    return this[pos] << 8 | this[pos + 1];
  }
  readUInt16LE(pos) {
    return this[pos] | this[pos + 1] << 8;
  }
  readUInt32BE(pos) {
    return (this[pos] << 24 | this[pos + 1] << 16 | this[pos + 2] << 8 | this[pos + 3]) >>> 0;
  }
  readUInt32LE(pos) {
    return (this[pos] | this[pos + 1] << 8 | this[pos + 2] << 16 | this[pos + 3] << 24) >>> 0;
  }
  // ---- Unsigned integer writes ----
  writeUInt8(val, pos) {
    this[pos] = val & 255;
    return pos + 1;
  }
  writeUInt16BE(val, pos) {
    this[pos] = val >>> 8 & 255;
    this[pos + 1] = val & 255;
    return pos + 2;
  }
  writeUInt16LE(val, pos) {
    this[pos] = val & 255;
    this[pos + 1] = val >>> 8 & 255;
    return pos + 2;
  }
  writeUInt32BE(val, pos) {
    this[pos] = val >>> 24 & 255;
    this[pos + 1] = val >>> 16 & 255;
    this[pos + 2] = val >>> 8 & 255;
    this[pos + 3] = val & 255;
    return pos + 4;
  }
  writeUInt32LE(val, pos) {
    this[pos] = val & 255;
    this[pos + 1] = val >>> 8 & 255;
    this[pos + 2] = val >>> 16 & 255;
    this[pos + 3] = val >>> 24 & 255;
    return pos + 4;
  }
  // ---- Lowercase aliases ----
  readUint8(pos) {
    return this.readUInt8(pos);
  }
  readUint16BE(pos) {
    return this.readUInt16BE(pos);
  }
  readUint16LE(pos) {
    return this.readUInt16LE(pos);
  }
  readUint32BE(pos) {
    return this.readUInt32BE(pos);
  }
  readUint32LE(pos) {
    return this.readUInt32LE(pos);
  }
  writeUint8(val, pos) {
    return this.writeUInt8(val, pos);
  }
  writeUint16BE(val, pos) {
    return this.writeUInt16BE(val, pos);
  }
  writeUint16LE(val, pos) {
    return this.writeUInt16LE(val, pos);
  }
  writeUint32BE(val, pos) {
    return this.writeUInt32BE(val, pos);
  }
  writeUint32LE(val, pos) {
    return this.writeUInt32LE(val, pos);
  }
  // ---- Signed integer reads ----
  readInt8(pos) {
    const raw = this[pos];
    return raw & 128 ? raw - 256 : raw;
  }
  readInt16BE(pos) {
    const raw = this.readUInt16BE(pos);
    return raw & 32768 ? raw - 65536 : raw;
  }
  readInt16LE(pos) {
    const raw = this.readUInt16LE(pos);
    return raw & 32768 ? raw - 65536 : raw;
  }
  readInt32BE(pos) {
    return this.readUInt32BE(pos) | 0;
  }
  readInt32LE(pos) {
    return this.readUInt32LE(pos) | 0;
  }
  // ---- Signed integer writes ----
  writeInt8(val, pos) {
    this[pos] = val & 255;
    return pos + 1;
  }
  writeInt16BE(val, pos) {
    return this.writeUInt16BE(val & 65535, pos);
  }
  writeInt16LE(val, pos) {
    return this.writeUInt16LE(val & 65535, pos);
  }
  writeInt32BE(val, pos) {
    return this.writeUInt32BE(val >>> 0, pos);
  }
  writeInt32LE(val, pos) {
    return this.writeUInt32LE(val >>> 0, pos);
  }
  // ---- BigInt 64-bit reads ----
  readBigUInt64LE(pos) {
    const lo = BigInt(this[pos] | this[pos + 1] << 8 | this[pos + 2] << 16 | this[pos + 3] << 24) & 0xffffffffn;
    const hi = BigInt(this[pos + 4] | this[pos + 5] << 8 | this[pos + 6] << 16 | this[pos + 7] << 24) & 0xffffffffn;
    return lo | hi << 32n;
  }
  readBigUInt64BE(pos) {
    const hi = BigInt(this[pos] << 24 | this[pos + 1] << 16 | this[pos + 2] << 8 | this[pos + 3]) & 0xffffffffn;
    const lo = BigInt(this[pos + 4] << 24 | this[pos + 5] << 16 | this[pos + 6] << 8 | this[pos + 7]) & 0xffffffffn;
    return lo | hi << 32n;
  }
  readBigInt64LE(pos) {
    const unsigned = this.readBigUInt64LE(pos);
    return unsigned >= 0x8000000000000000n ? unsigned - 0x10000000000000000n : unsigned;
  }
  readBigInt64BE(pos) {
    const unsigned = this.readBigUInt64BE(pos);
    return unsigned >= 0x8000000000000000n ? unsigned - 0x10000000000000000n : unsigned;
  }
  // ---- BigInt 64-bit writes ----
  writeBigUInt64LE(val, pos) {
    const lo = val & 0xffffffffn;
    const hi = val >> 32n & 0xffffffffn;
    this[pos] = Number(lo & 0xffn);
    this[pos + 1] = Number(lo >> 8n & 0xffn);
    this[pos + 2] = Number(lo >> 16n & 0xffn);
    this[pos + 3] = Number(lo >> 24n & 0xffn);
    this[pos + 4] = Number(hi & 0xffn);
    this[pos + 5] = Number(hi >> 8n & 0xffn);
    this[pos + 6] = Number(hi >> 16n & 0xffn);
    this[pos + 7] = Number(hi >> 24n & 0xffn);
    return pos + 8;
  }
  writeBigUInt64BE(val, pos) {
    const lo = val & 0xffffffffn;
    const hi = val >> 32n & 0xffffffffn;
    this[pos] = Number(hi >> 24n & 0xffn);
    this[pos + 1] = Number(hi >> 16n & 0xffn);
    this[pos + 2] = Number(hi >> 8n & 0xffn);
    this[pos + 3] = Number(hi & 0xffn);
    this[pos + 4] = Number(lo >> 24n & 0xffn);
    this[pos + 5] = Number(lo >> 16n & 0xffn);
    this[pos + 6] = Number(lo >> 8n & 0xffn);
    this[pos + 7] = Number(lo & 0xffn);
    return pos + 8;
  }
  writeBigInt64LE(val, pos) {
    const unsigned = val < 0n ? val + 0x10000000000000000n : val;
    return this.writeBigUInt64LE(unsigned, pos);
  }
  writeBigInt64BE(val, pos) {
    const unsigned = val < 0n ? val + 0x10000000000000000n : val;
    return this.writeBigUInt64BE(unsigned, pos);
  }
  // Lowercase BigInt aliases
  readBigUint64LE(pos) {
    return this.readBigUInt64LE(pos);
  }
  readBigUint64BE(pos) {
    return this.readBigUInt64BE(pos);
  }
  writeBigUint64LE(val, pos) {
    return this.writeBigUInt64LE(val, pos);
  }
  writeBigUint64BE(val, pos) {
    return this.writeBigUInt64BE(val, pos);
  }
  // ---- Float / Double reads ----
  readFloatLE(pos) {
    const dv = new DataView(this.buffer, this.byteOffset + pos, 4);
    return dv.getFloat32(0, true);
  }
  readFloatBE(pos) {
    const dv = new DataView(this.buffer, this.byteOffset + pos, 4);
    return dv.getFloat32(0, false);
  }
  readDoubleLE(pos) {
    const dv = new DataView(this.buffer, this.byteOffset + pos, 8);
    return dv.getFloat64(0, true);
  }
  readDoubleBE(pos) {
    const dv = new DataView(this.buffer, this.byteOffset + pos, 8);
    return dv.getFloat64(0, false);
  }
  // ---- Float / Double writes ----
  writeFloatLE(val, pos) {
    const dv = new DataView(this.buffer, this.byteOffset + pos, 4);
    dv.setFloat32(0, val, true);
    return pos + 4;
  }
  writeFloatBE(val, pos) {
    const dv = new DataView(this.buffer, this.byteOffset + pos, 4);
    dv.setFloat32(0, val, false);
    return pos + 4;
  }
  writeDoubleLE(val, pos) {
    const dv = new DataView(this.buffer, this.byteOffset + pos, 8);
    dv.setFloat64(0, val, true);
    return pos + 8;
  }
  writeDoubleBE(val, pos) {
    const dv = new DataView(this.buffer, this.byteOffset + pos, 8);
    dv.setFloat64(0, val, false);
    return pos + 8;
  }
  // ---- Variable-length integer reads ----
  readUIntLE(pos, width) {
    let result = 0;
    let factor = 1;
    for (let i = 0; i < width; i++) {
      result += this[pos + i] * factor;
      factor *= 256;
    }
    return result;
  }
  readUintLE(pos, width) {
    return this.readUIntLE(pos, width);
  }
  readUIntBE(pos, width) {
    let result = 0;
    let factor = 1;
    for (let i = width - 1; i >= 0; i--) {
      result += this[pos + i] * factor;
      factor *= 256;
    }
    return result;
  }
  readUintBE(pos, width) {
    return this.readUIntBE(pos, width);
  }
  readIntLE(pos, width) {
    let raw = this.readUIntLE(pos, width);
    const threshold = Math.pow(2, width * 8 - 1);
    if (raw >= threshold) raw -= Math.pow(2, width * 8);
    return raw;
  }
  readIntBE(pos, width) {
    let raw = this.readUIntBE(pos, width);
    const threshold = Math.pow(2, width * 8 - 1);
    if (raw >= threshold) raw -= Math.pow(2, width * 8);
    return raw;
  }
  // ---- Variable-length integer writes ----
  writeUIntLE(val, pos, width) {
    let remaining = val;
    for (let i = 0; i < width; i++) {
      this[pos + i] = remaining & 255;
      remaining = Math.floor(remaining / 256);
    }
    return pos + width;
  }
  writeUintLE(val, pos, width) {
    return this.writeUIntLE(val, pos, width);
  }
  writeUIntBE(val, pos, width) {
    let remaining = val;
    for (let i = width - 1; i >= 0; i--) {
      this[pos + i] = remaining & 255;
      remaining = Math.floor(remaining / 256);
    }
    return pos + width;
  }
  writeUintBE(val, pos, width) {
    return this.writeUIntBE(val, pos, width);
  }
  writeIntLE(val, pos, width) {
    let adjusted = val;
    if (adjusted < 0) adjusted += Math.pow(2, width * 8);
    return this.writeUIntLE(adjusted, pos, width);
  }
  writeIntBE(val, pos, width) {
    let adjusted = val;
    if (adjusted < 0) adjusted += Math.pow(2, width * 8);
    return this.writeUIntBE(adjusted, pos, width);
  }
  // ---- Byte swap methods ----
  swap16() {
    if (this.length % 2 !== 0) throw new RangeError("Buffer size must be a multiple of 16-bits");
    for (let i = 0; i < this.length; i += 2) {
      const tmp = this[i];
      this[i] = this[i + 1];
      this[i + 1] = tmp;
    }
    return this;
  }
  swap32() {
    if (this.length % 4 !== 0) throw new RangeError("Buffer size must be a multiple of 32-bits");
    for (let i = 0; i < this.length; i += 4) {
      const a = this[i], b = this[i + 1];
      this[i] = this[i + 3];
      this[i + 1] = this[i + 2];
      this[i + 2] = b;
      this[i + 3] = a;
    }
    return this;
  }
  swap64() {
    if (this.length % 8 !== 0) throw new RangeError("Buffer size must be a multiple of 64-bits");
    for (let i = 0; i < this.length; i += 8) {
      const a = this[i], b = this[i + 1], c = this[i + 2], d = this[i + 3];
      this[i] = this[i + 7];
      this[i + 1] = this[i + 6];
      this[i + 2] = this[i + 5];
      this[i + 3] = this[i + 4];
      this[i + 4] = d;
      this[i + 5] = c;
      this[i + 6] = b;
      this[i + 7] = a;
    }
    return this;
  }
};
var Buffer2 = new Proxy(BufferPolyfill, {
  apply(_target, _thisArg, args) {
    return BufferPolyfill.from(...args);
  },
  construct(target, args, newTarget) {
    if (typeof args[0] === "string") return BufferPolyfill.from(...args);
    return Reflect.construct(target, args, newTarget);
  }
});
if (typeof globalThis.Buffer === "undefined") {
  globalThis.Buffer = Buffer2;
}
var SlowBuffer = Buffer2;
var kMaxLength = 2147483647;
var INSPECT_MAX_BYTES = 50;
var Blob2 = globalThis.Blob;
var File = globalThis.File;
var typedArrayPrototype = Object.getPrototypeOf(Uint8Array.prototype);
var typedArrayByteLength = Object.getOwnPropertyDescriptor(typedArrayPrototype, "byteLength").get;
var typedArrayByteOffset = Object.getOwnPropertyDescriptor(typedArrayPrototype, "byteOffset").get;
var typedArrayBuffer = Object.getOwnPropertyDescriptor(typedArrayPrototype, "buffer").get;
var arrayBufferByteLength = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, "byteLength").get;
var sharedArrayBufferByteLength = typeof SharedArrayBuffer === "undefined" ? null : Object.getOwnPropertyDescriptor(SharedArrayBuffer.prototype, "byteLength").get;
function validationBytes(input) {
  if (ArrayBuffer.isView(input)) {
    let length;
    try {
      length = typedArrayByteLength.call(input);
    } catch {
      throw invalidValidationInput();
    }
    if (length === 0) return new Uint8Array(0);
    return new Uint8Array(typedArrayBuffer.call(input), typedArrayByteOffset.call(input), length);
  }
  let validBuffer = false;
  try {
    arrayBufferByteLength.call(input);
    validBuffer = true;
  } catch {
  }
  if (!validBuffer && sharedArrayBufferByteLength) {
    try {
      sharedArrayBufferByteLength.call(input);
      validBuffer = true;
    } catch {
    }
  }
  if (!validBuffer) throw invalidValidationInput();
  try {
    return new Uint8Array(input);
  } catch {
    throw Object.assign(new Error("Cannot validate on a detached buffer"), { code: "ERR_INVALID_STATE" });
  }
}
function invalidValidationInput() {
  return Object.assign(
    new TypeError('The "input" argument must be an instance of ArrayBuffer, Buffer, or TypedArray'),
    { code: "ERR_INVALID_ARG_TYPE" }
  );
}
function isAscii(input) {
  const bytes2 = validationBytes(input);
  for (let i = 0; i < bytes2.length; i++) if (bytes2[i] > 127) return false;
  return true;
}
function isUtf8(input) {
  const bytes2 = validationBytes(input);
  for (let i = 0; i < bytes2.length; ) {
    const lead = bytes2[i++];
    if (lead <= 127) continue;
    let remaining;
    let min = 128;
    let max = 191;
    if (lead >= 194 && lead <= 223) remaining = 1;
    else if (lead >= 224 && lead <= 239) {
      remaining = 2;
      if (lead === 224) min = 160;
      if (lead === 237) max = 159;
    } else if (lead >= 240 && lead <= 244) {
      remaining = 3;
      if (lead === 240) min = 144;
      if (lead === 244) max = 143;
    } else return false;
    if (i + remaining > bytes2.length || bytes2[i] < min || bytes2[i] > max) return false;
    i++;
    while (--remaining > 0) {
      const byte = bytes2[i++];
      if (byte < 128 || byte > 191) return false;
    }
  }
  return true;
}
var constants2 = {
  MAX_LENGTH: kMaxLength,
  MAX_STRING_LENGTH: 536870888
};
function transcode(src, _fromEnc, _toEnc) {
  return BufferPolyfill.from(src);
}
function resolveObjectURL(_id) {
  return void 0;
}
function atob2(data) {
  return globalThis.atob(data);
}
function btoa2(data) {
  return globalThis.btoa(data);
}
var bufferModule = {
  Buffer: BufferPolyfill,
  SlowBuffer,
  kMaxLength,
  INSPECT_MAX_BYTES,
  Blob: Blob2,
  File,
  isAscii,
  isUtf8,
  constants: constants2,
  transcode,
  resolveObjectURL,
  atob: atob2,
  btoa: btoa2
};
Object.defineProperty(bufferModule, "hasOwnProperty", {
  value: Object.prototype.hasOwnProperty,
  enumerable: false,
  configurable: true,
  writable: true
});

// ../node/polyfills/stream.ts
function bufferByteLength(chunk) {
  if (chunk instanceof Uint8Array) return chunk.byteLength;
  if (typeof chunk === "string") return Buffer2.byteLength(chunk);
  return 0;
}
function decodeChunk(stream, item) {
  const enc2 = stream._encoding;
  if (enc2 !== "utf8" && enc2 !== "utf-8") return Buffer2.from(item).toString(enc2);
  const decoder5 = stream._utf8Decoder ??= new TextDecoder("utf-8");
  const bytes2 = typeof SharedArrayBuffer !== "undefined" && item.buffer instanceof SharedArrayBuffer ? new Uint8Array(item) : item;
  const text = decoder5.decode(bytes2, STREAM_DECODE);
  return text === "" && bytes2.length > 0 ? null : text;
}
var STREAM_DECODE = { stream: true };
function flushEncodedTail(stream) {
  const decoder5 = stream._utf8Decoder;
  if (!decoder5) return;
  stream._utf8Decoder = void 0;
  const rest = decoder5.decode();
  if (rest) stream.emit("data", rest);
}
function endReadable(stream) {
  if (!stream._terminated || stream._queue.length || stream._endFired) return;
  stream._endFired = true;
  queueMicrotask(() => {
    if (stream._queue.length) {
      stream._endFired = false;
      return;
    }
    if (stream.destroyed || stream._endEmitted) return;
    stream.readableEnded = true;
    stream.readable = false;
    stream._endEmitted = true;
    flushEncodedTail(stream);
    stream.emit("end");
    if (stream._autoDestroy && !(stream.writable && !stream.writableFinished)) stream.destroy();
  });
}
function notifyReadable(stream) {
  if (stream._readableNotificationScheduled || !stream.listenerCount("readable")) return;
  stream._readableNotificationScheduled = true;
  queueMicrotask(() => {
    stream._readableNotificationScheduled = false;
    if (!stream.destroyed && !stream._endEmitted && (stream._queue.length || stream._terminated)) {
      stream.emit("readable");
    }
  });
}
function listenReadable(stream) {
  stream.pause();
  notifyReadable(stream);
  queueMicrotask(() => {
    if (!stream.destroyed && !stream._terminated && !stream._reading) stream.read(0);
  });
}
var Readable = function Readable2(opts) {
  if (!this) return;
  EventEmitter.call(this);
  this._queue = [];
  this._terminated = false;
  this._active = false;
  this._endFired = false;
  this._endEmitted = false;
  this._objectMode = false;
  this._reading = false;
  this._highWaterMark = 16384;
  this._autoDestroy = true;
  this._encoding = null;
  this._readableByteLength = 0;
  this._draining = false;
  this.readable = true;
  this.readableEnded = false;
  this.readableFlowing = null;
  this.destroyed = false;
  this.closed = false;
  this.errored = null;
  this.readableObjectMode = false;
  this.readableHighWaterMark = 16384;
  this.readableDidRead = false;
  this.readableAborted = false;
  const self2 = this;
  this._readableState = {
    get objectMode() {
      return self2._objectMode;
    },
    get highWaterMark() {
      return self2._highWaterMark;
    },
    get ended() {
      return self2._terminated;
    },
    get endEmitted() {
      return self2._endEmitted;
    },
    set endEmitted(v) {
      self2._endEmitted = v;
    },
    get flowing() {
      return self2.readableFlowing;
    },
    set flowing(v) {
      self2.readableFlowing = v;
    },
    get reading() {
      return self2._reading;
    },
    get length() {
      return self2.readableLength;
    },
    get destroyed() {
      return self2.destroyed;
    },
    get errored() {
      return self2.errored;
    },
    get closed() {
      return self2.closed;
    },
    pipes: [],
    awaitDrainWriters: null,
    multiAwaitDrain: false,
    readableListening: false,
    resumeScheduled: false,
    paused: true,
    emitClose: true,
    get autoDestroy() {
      return self2._autoDestroy;
    },
    defaultEncoding: "utf8",
    needReadable: false,
    emittedReadable: false,
    readingMore: false,
    dataEmitted: false
  };
  if (opts) {
    if (opts.objectMode) {
      this._objectMode = true;
      this.readableObjectMode = true;
      if (opts.highWaterMark === void 0) {
        this._highWaterMark = 16;
        this.readableHighWaterMark = 16;
      }
    }
    if (opts.highWaterMark !== void 0) {
      this._highWaterMark = opts.highWaterMark;
      this.readableHighWaterMark = opts.highWaterMark;
    }
    if (opts.autoDestroy !== void 0) {
      this._autoDestroy = opts.autoDestroy;
    }
    if (opts.read) {
      this._read = opts.read.bind(this);
    }
    if (opts.destroy) {
      this._destroy = opts.destroy.bind(this);
    }
  }
};
Object.setPrototypeOf(Readable.prototype, EventEmitter.prototype);
Readable.prototype._read = function _read(_size) {
};
Readable.prototype._destroy = function _destroy(err, callback) {
  callback(err);
};
Readable.prototype._rawBind = function _rawBind(evt, fn) {
  EventEmitter.prototype.addListener.call(this, evt, fn);
  return this;
};
Readable.prototype.on = function on(evt, fn) {
  this._rawBind(evt, fn);
  if (evt === "data" && !this._active) {
    this.resume();
  }
  if (evt === "readable") {
    listenReadable(this);
  }
  if (evt === "end" && this._endEmitted) {
    queueMicrotask(() => fn());
  } else if (evt === "end" && this._terminated && this._queue.length === 0 && !this._endFired) {
    this._endFired = true;
    queueMicrotask(() => {
      this._endEmitted = true;
      flushEncodedTail(this);
      this.emit("end");
      if (this._autoDestroy) {
        this.destroy();
      }
    });
  }
  return this;
};
Readable.prototype.addListener = function addListener2(evt, fn) {
  return this.on(evt, fn);
};
Readable.prototype.once = function once2(evt, fn) {
  if (evt === "end" && this._endEmitted) {
    queueMicrotask(() => fn());
    return this;
  }
  if (evt === "end" && this._terminated && this._queue.length === 0 && !this._endFired) {
    this._endFired = true;
    EventEmitter.prototype.once.call(this, evt, fn);
    queueMicrotask(() => {
      this._endEmitted = true;
      flushEncodedTail(this);
      this.emit("end");
      if (this._autoDestroy) {
        this.destroy();
      }
    });
    return this;
  }
  if (evt === "data" && !this._active) {
    EventEmitter.prototype.once.call(this, evt, fn);
    this.resume();
    return this;
  }
  if (evt === "readable") {
    EventEmitter.prototype.once.call(this, evt, fn);
    listenReadable(this);
    return this;
  }
  return EventEmitter.prototype.once.call(this, evt, fn);
};
Readable.prototype.push = function push(chunk) {
  if (chunk === null) {
    this._terminated = true;
    notifyReadable(this);
    if (this._queue.length === 0) {
      this.readableEnded = true;
      this.readable = false;
      if (this._active && !this._endFired) {
        this._endFired = true;
        queueMicrotask(() => {
          this._endEmitted = true;
          flushEncodedTail(this);
          this.emit("end");
          if (this._autoDestroy && !(this.writable && !this.writableFinished)) {
            this.destroy();
          }
        });
      }
    }
    if (this._active) {
      this._drain();
    }
    return false;
  }
  if (this._objectMode) {
    this._queue.push(chunk);
  } else {
    const bytes2 = typeof chunk === "string" ? Buffer2.from(chunk) : chunk;
    this._readableByteLength += bufferByteLength(bytes2);
    this._queue.push(bytes2);
  }
  if (this._active) {
    this._drain();
  }
  notifyReadable(this);
  return this._queue.length < this._highWaterMark;
};
Readable.prototype.unshift = function unshift(chunk) {
  if (chunk === null) return;
  if (this._objectMode) {
    this._queue.unshift(chunk);
  } else {
    const bytes2 = typeof chunk === "string" ? Buffer2.from(chunk) : chunk;
    this._readableByteLength += bufferByteLength(bytes2);
    this._queue.unshift(bytes2);
  }
};
Readable.prototype._drain = function _drain() {
  if (this._draining) return;
  this._draining = true;
  while (this._queue.length > 0 && this._active) {
    const item = this._queue.shift();
    if (!this._objectMode) {
      this._readableByteLength -= bufferByteLength(item);
    }
    this.readableDidRead = true;
    if (this._encoding && item instanceof Uint8Array) {
      const text = decodeChunk(this, item);
      if (text !== null) this.emit("data", text);
    } else {
      this.emit("data", item);
    }
  }
  this._draining = false;
  if (this._terminated && this._queue.length === 0 && !this._endFired) {
    this.readableEnded = true;
    this.readable = false;
    this._endFired = true;
    queueMicrotask(() => {
      this._endEmitted = true;
      flushEncodedTail(this);
      this.emit("end");
      if (this._autoDestroy) {
        this.destroy();
      }
    });
  }
  if (!this._terminated && this._queue.length === 0 && this._active && !this._reading) {
    this._reading = true;
    queueMicrotask(() => {
      this._reading = false;
      if (!this._terminated && this._active) {
        this._read(this._highWaterMark);
      }
    });
  }
};
Readable.prototype.read = function read(amount) {
  this.readableDidRead = true;
  if (!this._reading && !this._terminated) {
    this._reading = true;
    this._read(amount ?? this._highWaterMark);
    this._reading = false;
  }
  if (this._queue.length === 0) {
    endReadable(this);
    return null;
  }
  if (this._objectMode) {
    const item = this._queue.shift();
    endReadable(this);
    return item;
  }
  if (amount === 0) return null;
  if (amount === void 0) {
    if (this._queue.length === 1 && Buffer2.isBuffer(this._queue[0])) {
      this._readableByteLength = 0;
      const item = this._queue.shift();
      endReadable(this);
      return item;
    }
    const combined = Buffer2.concat(this._queue);
    this._readableByteLength = 0;
    this._queue.length = 0;
    endReadable(this);
    return combined;
  }
  const pieces = [];
  let needed = amount;
  while (needed > 0 && this._queue.length > 0) {
    const front = this._queue[0];
    if (front.length <= needed) {
      pieces.push(this._queue.shift());
      this._readableByteLength -= front.length;
      needed -= front.length;
    } else {
      pieces.push(front.slice(0, needed));
      this._queue[0] = front.slice(needed);
      this._readableByteLength -= needed;
      needed = 0;
    }
  }
  endReadable(this);
  return pieces.length > 0 ? Buffer2.concat(pieces) : null;
};
Readable.prototype.resume = function resume() {
  this._active = true;
  this.readableFlowing = true;
  this._drain();
  if (!this._terminated && this._queue.length === 0 && !this._reading) {
    this._reading = true;
    queueMicrotask(() => {
      this._reading = false;
      if (!this._terminated && this._active) {
        this._read(this._highWaterMark);
      }
    });
  }
  return this;
};
Readable.prototype.pause = function pause() {
  this._active = false;
  this.readableFlowing = false;
  return this;
};
Readable.prototype.isPaused = function isPaused() {
  return !this._active;
};
Readable.prototype.pipe = function pipe(target, options) {
  const self2 = this;
  const onData = function onData2(chunk) {
    const needDrain = !target.write(chunk);
    if (needDrain) {
      self2.pause();
      target.once("drain", function onDrain() {
        self2.resume();
      });
    }
  };
  const onEnd = function onEnd2() {
    if (options?.end !== false) target.end();
  };
  self2.on("data", onData);
  self2.on("end", onEnd);
  if (!self2._pipeDests) self2._pipeDests = [];
  self2._pipeDests.push({ dest: target, onData, onEnd });
  self2.resume();
  return target;
};
Readable.prototype.unpipe = function unpipe(target) {
  const dests = this._pipeDests || [];
  if (target) {
    const idx = dests.findIndex((d) => d.dest === target);
    if (idx !== -1) {
      this.removeListener("data", dests[idx].onData);
      this.removeListener("end", dests[idx].onEnd);
      dests.splice(idx, 1);
    }
  } else {
    for (const d of dests) {
      this.removeListener("data", d.onData);
      this.removeListener("end", d.onEnd);
    }
    this._pipeDests = [];
  }
  return this;
};
Readable.prototype.setEncoding = function setEncoding(enc2) {
  this._encoding = enc2;
  return this;
};
Readable.prototype.close = function close(cb) {
  this.destroy();
  if (cb) cb(null);
};
Readable.prototype.destroy = function destroy(fault) {
  if (this.destroyed) return this;
  this.destroyed = true;
  if (fault) this.errored = fault;
  this._destroy(fault ?? null, (err) => {
    if (err && !fault) this.errored = err;
    this._queue.length = 0;
    this._readableByteLength = 0;
    this._terminated = true;
    this.readable = false;
    if (err || fault) this.emit("error", err || fault);
    this.closed = true;
    this.emit("close");
  });
  return this;
};
Readable.prototype.wrap = function wrap(oldStream) {
  const self2 = this;
  oldStream.on("data", function onData(chunk) {
    self2.push(chunk);
  });
  oldStream.on("end", function onEnd() {
    self2.push(null);
  });
  oldStream.on("error", function onError(err) {
    self2.destroy(err);
  });
  return this;
};
Readable.prototype[Symbol.asyncIterator] = function asyncIterator() {
  const stream = this;
  const buffer = [];
  let done = false;
  let error = null;
  let waiting = null;
  let waitingReject = null;
  const onData = (chunk) => {
    if (waiting) {
      const resolve = waiting;
      waiting = null;
      waitingReject = null;
      resolve({ value: chunk, done: false });
    } else {
      buffer.push(chunk);
    }
  };
  const onEnd = () => {
    done = true;
    if (waiting) {
      const resolve = waiting;
      waiting = null;
      waitingReject = null;
      resolve({ value: void 0, done: true });
    }
    cleanup();
  };
  const onError = (...args) => {
    error = args[0];
    if (waitingReject) {
      const reject = waitingReject;
      waiting = null;
      waitingReject = null;
      reject(error);
    }
    cleanup();
  };
  const cleanup = () => {
    stream.removeListener("data", onData);
    stream.removeListener("end", onEnd);
    stream.removeListener("error", onError);
  };
  stream._rawBind("data", onData);
  stream._rawBind("end", onEnd);
  stream._rawBind("error", onError);
  if (!stream._active) stream.resume();
  return {
    next() {
      if (buffer.length > 0) {
        return Promise.resolve({ value: buffer.shift(), done: false });
      }
      if (error) return Promise.reject(error);
      if (done) return Promise.resolve({ value: void 0, done: true });
      return new Promise((resolve, reject) => {
        waiting = resolve;
        waitingReject = reject;
      });
    },
    return() {
      cleanup();
      stream.destroy();
      return Promise.resolve({ value: void 0, done: true });
    },
    throw(err) {
      cleanup();
      stream.destroy(err);
      return Promise.reject(err);
    },
    [Symbol.asyncIterator]() {
      return this;
    }
  };
};
Object.defineProperty(Readable.prototype, "readableLength", {
  get: function() {
    if (this._objectMode) return this._queue.length;
    return this._readableByteLength;
  },
  configurable: true
});
Object.defineProperty(Readable.prototype, "readableEncoding", {
  get: function() {
    return this._encoding;
  },
  configurable: true
});
Readable.toWeb = function toWeb(readable) {
  return new ReadableStream({
    start(controller) {
      readable.on("data", (chunk) => {
        const buf = chunk instanceof Uint8Array ? chunk : Buffer2.from(String(chunk));
        controller.enqueue(buf);
      });
      readable.on("end", () => {
        controller.close();
      });
      readable.on("error", (err) => {
        controller.error(err);
      });
      readable.resume();
    },
    cancel() {
      readable.destroy();
    }
  });
};
Readable.fromWeb = function fromWeb(webStream, opts) {
  const reader = webStream.getReader();
  const stream = new Readable({
    ...opts,
    read() {
      reader.read().then(
        ({ value, done }) => {
          if (done) {
            stream.push(null);
          } else {
            stream.push(value);
          }
        },
        (err) => {
          stream.destroy(err);
        }
      );
    }
  });
  return stream;
};
Readable.from = function from(source, _opts) {
  const stream = new Readable(_opts);
  (async () => {
    try {
      for await (const item of source) {
        if (item !== null && item !== void 0) {
          const data = typeof item === "string" ? Buffer2.from(item) : item;
          stream.push(data);
        }
      }
      stream.push(null);
    } catch (err) {
      stream.destroy(err);
    }
  })();
  return stream;
};
var Writable = function Writable2(opts) {
  if (!this) return;
  EventEmitter.call(this);
  this._parts = [];
  this._closed = false;
  this._objectMode = false;
  this._highWaterMark = 16384;
  this._autoDestroy = true;
  this._corked = 0;
  this._corkedWrites = [];
  this._writableByteLength = 0;
  this.writable = true;
  this.writableEnded = false;
  this.writableFinished = false;
  this.writableNeedDrain = false;
  this.destroyed = false;
  this.closed = false;
  this.errored = null;
  this.writableObjectMode = false;
  this.writableHighWaterMark = 16384;
  this.writableCorked = 0;
  const self2 = this;
  this._writableState = {
    get objectMode() {
      return self2._objectMode;
    },
    get highWaterMark() {
      return self2._highWaterMark;
    },
    get finished() {
      return self2.writableFinished;
    },
    set finished(v) {
      self2.writableFinished = v;
    },
    get ended() {
      return self2.writableEnded;
    },
    set ended(v) {
      self2.writableEnded = v;
    },
    get destroyed() {
      return self2.destroyed;
    },
    get errored() {
      return self2.errored;
    },
    get closed() {
      return self2.closed;
    },
    get corked() {
      return self2._corked;
    },
    get length() {
      return self2.writableLength;
    },
    get needDrain() {
      return self2.writableNeedDrain;
    },
    writing: false,
    errorEmitted: false,
    emitClose: true,
    get autoDestroy() {
      return self2._autoDestroy;
    },
    defaultEncoding: "utf8",
    finalCalled: false,
    ending: false,
    bufferedIndex: 0
  };
  if (opts) {
    if (opts.objectMode) {
      this._objectMode = true;
      this.writableObjectMode = true;
      if (opts.highWaterMark === void 0) {
        this._highWaterMark = 16;
        this.writableHighWaterMark = 16;
      }
    }
    if (opts.highWaterMark !== void 0) {
      this._highWaterMark = opts.highWaterMark;
      this.writableHighWaterMark = opts.highWaterMark;
    }
    if (opts.autoDestroy !== void 0) {
      this._autoDestroy = opts.autoDestroy;
    }
    if (opts.write) {
      this._write = opts.write.bind(this);
    }
    if (opts.writev) {
      this._writev = opts.writev.bind(this);
    }
    if (opts.final) {
      this._final = opts.final.bind(this);
    }
    if (opts.destroy) {
      this._destroy = opts.destroy.bind(this);
    }
  }
};
Object.setPrototypeOf(Writable.prototype, EventEmitter.prototype);
Writable.prototype._write = function _write(_chunk, _encoding, callback) {
  callback(null);
};
Writable.prototype._final = function _final(callback) {
  callback(null);
};
Writable.prototype._destroy = function _destroy2(err, callback) {
  callback(err);
};
Writable.prototype.write = function write(chunk, encOrCb, cb) {
  if (this._closed) {
    const fault = new Error("write after end");
    if (typeof encOrCb === "function") {
      encOrCb(fault);
    } else if (cb) {
      cb(fault);
    }
    return false;
  }
  const encoding = typeof encOrCb === "string" ? encOrCb : "utf8";
  const callback = typeof encOrCb === "function" ? encOrCb : cb;
  const size2 = this._objectMode ? 1 : bufferByteLength(chunk);
  this._writableByteLength += size2;
  if (this._corked > 0) {
    this._corkedWrites.push({ chunk, encoding, callback, size: size2 });
    return this._writableByteLength < this._highWaterMark;
  }
  this._write(chunk, encoding, (err) => {
    this._writableByteLength -= size2;
    if (callback) callback(err);
    if (this.writableNeedDrain && this._writableByteLength < this._highWaterMark) {
      this.writableNeedDrain = false;
      this.emit("drain");
    }
  });
  const belowHWM = this._writableByteLength < this._highWaterMark;
  if (!belowHWM) {
    this.writableNeedDrain = true;
  }
  return belowHWM;
};
Writable.prototype.end = function end(chunkOrCb, encOrCb, cb) {
  if (typeof chunkOrCb === "function") {
    cb = chunkOrCb;
  } else if (chunkOrCb !== void 0) {
    this.write(chunkOrCb);
  }
  if (typeof encOrCb === "function") cb = encOrCb;
  this._closed = true;
  this.writable = false;
  this.writableEnded = true;
  const self2 = this;
  const doFinish = () => {
    self2.writableFinished = true;
    self2.emit("finish");
    if (self2._autoDestroy) {
      self2.closed = true;
      self2.emit("close");
    }
    if (cb) cb();
  };
  queueMicrotask(() => {
    self2._final((err) => {
      if (err) {
        self2.errored = err;
        self2.emit("error", err);
        return;
      }
      doFinish();
    });
  });
  return this;
};
Writable.prototype.getBuffer = function getBuffer() {
  return Buffer2.alloc(0);
};
Writable.prototype.getBufferAsString = function getBufferAsString(enc2) {
  return this.getBuffer().toString(enc2 || "utf8");
};
Writable.prototype.close = function close2(cb) {
  this.destroy();
  if (cb) cb(null);
};
Writable.prototype.destroy = function destroy2(fault) {
  if (this.destroyed) return this;
  this.destroyed = true;
  if (fault) this.errored = fault;
  this._destroy(fault ?? null, (err) => {
    if (err && !fault) this.errored = err;
    this._parts.length = 0;
    this._corkedWrites.length = 0;
    this._writableByteLength = 0;
    this._closed = true;
    this.writable = false;
    if (err || fault) this.emit("error", err || fault);
    this.closed = true;
    this.emit("close");
  });
  return this;
};
Writable.prototype.cork = function cork() {
  this._corked++;
  this.writableCorked = this._corked;
};
Writable.prototype.uncork = function uncork() {
  if (this._corked > 0) {
    this._corked--;
    this.writableCorked = this._corked;
  }
  if (this._corked === 0 && this._corkedWrites.length > 0) {
    const writes = this._corkedWrites.splice(0);
    const settled = (size2) => {
      this._writableByteLength -= size2;
      if (this.writableNeedDrain && this._writableByteLength < this._highWaterMark) {
        this.writableNeedDrain = false;
        this.emit("drain");
      }
    };
    if (this._writev) {
      this._writev(
        writes.map((w) => ({ chunk: w.chunk, encoding: w.encoding })),
        (err) => {
          for (const w of writes) {
            if (w.callback) w.callback(err);
          }
          settled(writes.reduce((n, w) => n + (w.size ?? 0), 0));
        }
      );
    } else {
      for (const w of writes) {
        this._write(w.chunk, w.encoding, (err) => {
          if (w.callback) w.callback(err);
          settled(w.size ?? 0);
        });
      }
    }
  }
};
Writable.prototype.setDefaultEncoding = function setDefaultEncoding(_enc) {
  return this;
};
Object.defineProperty(Writable.prototype, "writableLength", {
  get: function() {
    return this._writableByteLength;
  },
  configurable: true
});
Writable.toWeb = function toWeb2(writable) {
  return new WritableStream({
    write(chunk) {
      return new Promise((resolve, reject) => {
        const ok = writable.write(chunk, (err) => {
          if (err) reject(err);
          else resolve();
        });
        if (ok) resolve();
      });
    },
    close() {
      return new Promise((resolve) => {
        writable.end(() => resolve());
      });
    },
    abort(reason) {
      writable.destroy(
        reason instanceof Error ? reason : new Error(String(reason))
      );
    }
  });
};
Writable.fromWeb = function fromWeb2(webStream, opts) {
  const writer = webStream.getWriter();
  return new Writable({
    ...opts,
    write(chunk, _encoding, callback) {
      writer.write(chunk).then(
        () => callback(null),
        (err) => callback(err)
      );
    },
    final(callback) {
      writer.close().then(
        () => callback(null),
        (err) => callback(err)
      );
    }
  });
};
var Duplex = function Duplex2(opts) {
  if (!this) return;
  Readable.call(this, {
    objectMode: opts?.objectMode || opts?.readableObjectMode,
    highWaterMark: opts?.readableHighWaterMark ?? opts?.highWaterMark,
    autoDestroy: opts?.autoDestroy,
    read: opts?.read,
    destroy: opts?.destroy
  });
  this._writeParts = [];
  this._writeClosed = false;
  this._writeObjectMode = false;
  this._writeHighWaterMark = 16384;
  this._writeAutoDestroy = true;
  this._duplexCorked = 0;
  this._duplexCorkedWrites = [];
  this._writableByteLen = 0;
  this.writable = true;
  this.writableEnded = false;
  this.writableFinished = false;
  this.writableNeedDrain = false;
  this.writableObjectMode = false;
  this.writableHighWaterMark = 16384;
  this.writableCorked = 0;
  this.allowHalfOpen = true;
  const self2 = this;
  this._writableState = {
    get objectMode() {
      return self2._writeObjectMode;
    },
    get highWaterMark() {
      return self2._writeHighWaterMark;
    },
    get finished() {
      return self2.writableFinished;
    },
    set finished(v) {
      self2.writableFinished = v;
    },
    get ended() {
      return self2.writableEnded;
    },
    set ended(v) {
      self2.writableEnded = v;
    },
    get destroyed() {
      return self2.destroyed;
    },
    get errored() {
      return self2.errored;
    },
    get closed() {
      return self2.closed;
    },
    get corked() {
      return self2._duplexCorked;
    },
    get length() {
      return self2.writableLength;
    },
    get needDrain() {
      return self2.writableNeedDrain;
    },
    writing: false,
    errorEmitted: false,
    emitClose: true,
    get autoDestroy() {
      return self2._writeAutoDestroy;
    },
    defaultEncoding: "utf8",
    finalCalled: false,
    ending: false,
    bufferedIndex: 0
  };
  if (opts) {
    if (opts.objectMode || opts.writableObjectMode) {
      this._writeObjectMode = true;
      this.writableObjectMode = true;
      if ((opts.writableHighWaterMark ?? opts.highWaterMark) === void 0) {
        this._writeHighWaterMark = 16;
        this.writableHighWaterMark = 16;
      }
    }
    if (opts.writableHighWaterMark !== void 0) {
      this._writeHighWaterMark = opts.writableHighWaterMark;
      this.writableHighWaterMark = opts.writableHighWaterMark;
    } else if (opts.highWaterMark !== void 0) {
      this._writeHighWaterMark = opts.highWaterMark;
      this.writableHighWaterMark = opts.highWaterMark;
    }
    if (opts.autoDestroy !== void 0) {
      this._writeAutoDestroy = opts.autoDestroy;
    }
    if (opts.allowHalfOpen !== void 0) {
      this.allowHalfOpen = opts.allowHalfOpen;
    }
    if (opts.write) {
      this._write = opts.write.bind(this);
    }
    if (opts.writev) {
      this._writev = opts.writev.bind(this);
    }
    if (opts.final) {
      this._final = opts.final.bind(this);
    }
  }
};
Object.setPrototypeOf(Duplex.prototype, Readable.prototype);
Duplex.prototype._write = function _write2(_chunk, _encoding, callback) {
  callback(null);
};
Duplex.prototype._final = function _final2(callback) {
  callback(null);
};
Duplex.prototype.write = function write2(chunk, encOrCb, cb) {
  if (this._writeClosed) return false;
  const encoding = typeof encOrCb === "string" ? encOrCb : "utf8";
  const callback = typeof encOrCb === "function" ? encOrCb : cb;
  const size2 = this._writeObjectMode ? 1 : bufferByteLength(chunk);
  this._writableByteLen += size2;
  if (this._duplexCorked > 0) {
    this._duplexCorkedWrites.push({ chunk, encoding, callback, size: size2 });
    return this._writableByteLen < this._writeHighWaterMark;
  }
  this._write(chunk, encoding, (err) => {
    this._writableByteLen -= size2;
    if (callback) callback(err);
    if (this.writableNeedDrain && this._writableByteLen < this._writeHighWaterMark) {
      this.writableNeedDrain = false;
      this.emit("drain");
    }
  });
  const belowHWM = this._writableByteLen < this._writeHighWaterMark;
  if (!belowHWM) {
    this.writableNeedDrain = true;
  }
  return belowHWM;
};
Duplex.prototype.end = function end2(chunkOrCb, encOrCb, cb) {
  if (typeof chunkOrCb === "function") {
    cb = chunkOrCb;
  } else if (chunkOrCb !== void 0) {
    this.write(chunkOrCb);
  }
  if (typeof encOrCb === "function") cb = encOrCb;
  this._writeClosed = true;
  this.writable = false;
  this.writableEnded = true;
  const self2 = this;
  const doFinish = () => {
    self2.writableFinished = true;
    self2.emit("finish");
    if (cb) cb();
  };
  queueMicrotask(() => {
    self2._final((err) => {
      if (err) {
        self2.errored = err;
        self2.emit("error", err);
        return;
      }
      doFinish();
    });
  });
  return this;
};
Duplex.prototype.cork = function cork2() {
  this._duplexCorked++;
  this.writableCorked = this._duplexCorked;
};
Duplex.prototype.uncork = function uncork2() {
  if (this._duplexCorked > 0) {
    this._duplexCorked--;
    this.writableCorked = this._duplexCorked;
  }
  if (this._duplexCorked === 0 && this._duplexCorkedWrites.length > 0) {
    const writes = this._duplexCorkedWrites.splice(0);
    const settled = (size2) => {
      this._writableByteLen -= size2;
      if (this.writableNeedDrain && this._writableByteLen < this._writeHighWaterMark) {
        this.writableNeedDrain = false;
        this.emit("drain");
      }
    };
    if (this._writev) {
      this._writev(
        writes.map((w) => ({ chunk: w.chunk, encoding: w.encoding })),
        (err) => {
          for (const w of writes) {
            if (w.callback) w.callback(err);
          }
          settled(writes.reduce((n, w) => n + (w.size ?? 0), 0));
        }
      );
    } else {
      for (const w of writes) {
        this._write(w.chunk, w.encoding, (err) => {
          if (w.callback) w.callback(err);
          settled(w.size ?? 0);
        });
      }
    }
  }
};
Duplex.prototype.setDefaultEncoding = function setDefaultEncoding2(_enc) {
  return this;
};
Object.defineProperty(Duplex.prototype, "writableLength", {
  get: function() {
    return this._writableByteLen;
  },
  configurable: true
});
Duplex.from = function from2(source, _opts) {
  const duplex = new Duplex();
  if (source instanceof ReadableStream) {
    const reader = source.getReader();
    (async () => {
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) {
            duplex.push(null);
            break;
          }
          duplex.push(value);
        }
      } catch (err) {
        duplex.destroy(err);
      }
    })();
  } else {
    (async () => {
      try {
        for await (const item of source) {
          if (item !== null && item !== void 0) {
            const data = typeof item === "string" ? Buffer2.from(item) : item;
            duplex.push(data);
          }
        }
        duplex.push(null);
      } catch (err) {
        duplex.destroy(err);
      }
    })();
  }
  return duplex;
};
Duplex.toWeb = function toWeb3(duplex) {
  if (duplex instanceof Duplex) {
    const readable = Readable.toWeb(duplex);
    const writable = Writable.toWeb(duplex);
    return { readable, writable };
  }
  return Readable.toWeb(duplex);
};
Duplex.fromWeb = function fromWeb3(source, _opts) {
  if (source instanceof ReadableStream) {
    return Readable.fromWeb(source, _opts);
  }
  const pair = source;
  const duplex = new Duplex();
  const reader = pair.readable.getReader();
  (async () => {
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          duplex.push(null);
          break;
        }
        duplex.push(value);
      }
    } catch (err) {
      duplex.destroy(err);
    }
  })();
  return duplex;
};
var PassThrough = function PassThrough2(opts) {
  if (!this) return;
  Duplex.call(this, opts);
};
Object.setPrototypeOf(PassThrough.prototype, Duplex.prototype);
PassThrough.prototype._final = function _final3(callback) {
  callback(null);
  this.push(null);
};
PassThrough.prototype.write = function write3(chunk, encOrCb, cb) {
  if (this._write !== Duplex.prototype._write) {
    return Duplex.prototype.write.call(this, chunk, encOrCb, cb);
  }
  const stored = !this._writeObjectMode && !this._objectMode && typeof chunk === "string" ? Buffer2.from(chunk) : chunk;
  this.push(stored);
  const callback = typeof encOrCb === "function" ? encOrCb : cb;
  if (callback) queueMicrotask(() => callback(null));
  return true;
};
var Transform = function Transform2(opts) {
  if (!this) return;
  Duplex.call(this, opts);
  this._flushed = false;
  if (opts) {
    if (opts.transform) {
      this._transform = opts.transform.bind(this);
    }
    if (opts.flush) {
      this._flush = opts.flush.bind(this);
    }
  }
};
Object.setPrototypeOf(Transform.prototype, Duplex.prototype);
Transform.prototype.destroy = function destroy3(fault) {
  if (this.destroyed) return this;
  this._writeClosed = true;
  this.writable = false;
  this.writableNeedDrain = false;
  this._transformDestroyError = fault ?? Object.assign(
    new Error("Cannot call write after a stream was destroyed"),
    { code: "ERR_STREAM_DESTROYED" }
  );
  this._transformCancelledWrites = (this._transformWrites ?? []).map(
    (entry) => ({ callback: entry.callback, size: entry.size })
  );
  this._transformWrites = [];
  this._transformEnd = void 0;
  Readable.prototype.destroy.call(this, fault);
  if (!this._transformBusy) queueMicrotask(() => finishDestroyedTransform(this));
  return this;
};
function finishDestroyedTransform(stream) {
  const writes = stream._transformCancelledWrites ?? [];
  stream._transformCancelledWrites = void 0;
  for (const entry of writes) {
    stream._writableByteLen -= entry.size;
    entry.callback?.(stream._transformDestroyError);
  }
  const end4 = stream._transformEndCallback;
  stream._transformEndCallback = void 0;
  const endError = stream.errored ?? Object.assign(
    new Error("Cannot call end after a stream was destroyed"),
    { code: "ERR_STREAM_DESTROYED" }
  );
  end4?.(endError);
}
Transform.prototype._transform = function _transform(chunk, _encoding, done) {
  done(null, chunk);
};
Transform.prototype._flush = function _flush(done) {
  done(null);
};
Transform.prototype._final = function _final4(callback) {
  const self2 = this;
  const finish = () => {
    callback(null);
    self2.push(null);
  };
  if (self2._flushed) {
    finish();
    return;
  }
  self2._flushed = true;
  self2._flush((err, output) => {
    if (err) {
      callback(err);
      return;
    }
    if (output !== void 0 && output !== null) self2.push(output);
    finish();
  });
};
Transform.prototype.write = function write4(chunk, encOrCb, cb) {
  if (this._writeClosed || this.destroyed) return false;
  const stored = !this._writeObjectMode && !this._objectMode && typeof chunk === "string" ? Buffer2.from(chunk) : chunk;
  const encoding = typeof encOrCb === "string" ? encOrCb : "utf8";
  const callback = typeof encOrCb === "function" ? encOrCb : cb;
  const size2 = this._writeObjectMode ? 1 : bufferByteLength(stored);
  this._writableByteLen += size2;
  (this._transformWrites ??= []).push({ stored, encoding, callback, size: size2 });
  drainTransform(this);
  const belowHWM = this._writableByteLen < this._writeHighWaterMark;
  if (!belowHWM) this.writableNeedDrain = true;
  return belowHWM;
};
function drainTransform(stream) {
  if (stream._transformDraining || stream._transformBusy || stream.destroyed) return;
  stream._transformDraining = true;
  while (!stream._transformBusy && stream._transformWrites?.length && !stream.destroyed) {
    const entry = stream._transformWrites.shift();
    stream._transformBusy = true;
    let called = false;
    stream._transform(entry.stored, entry.encoding, (err, output) => {
      if (called) return;
      called = true;
      stream._transformBusy = false;
      stream._writableByteLen -= entry.size;
      if (stream.destroyed) {
        entry.callback?.(err ?? null);
        finishDestroyedTransform(stream);
        return;
      }
      if (err) {
        if (entry.callback) entry.callback(err);
        stream.destroy(err);
        return;
      }
      if (output !== void 0 && output !== null) stream.push(output);
      if (entry.callback) entry.callback(null);
      if (stream.writableNeedDrain && stream._writableByteLen < stream._writeHighWaterMark) {
        stream.writableNeedDrain = false;
        stream.emit("drain");
      }
      if (!stream._transformDraining) drainTransform(stream);
    });
  }
  stream._transformDraining = false;
  if (!stream._transformBusy && !stream._transformWrites?.length && stream._transformEnd) {
    const finish = stream._transformEnd;
    stream._transformEnd = void 0;
    finish();
  }
}
Transform.prototype.end = function end3(chunkOrCb, encOrCb, cb) {
  if (this._writeClosed) return this;
  let endCb = cb;
  if (chunkOrCb !== void 0 && typeof chunkOrCb !== "function") {
    const encoding = typeof encOrCb === "string" ? encOrCb : void 0;
    if (typeof encOrCb === "function") endCb = encOrCb;
    this.write(chunkOrCb, encoding);
    chunkOrCb = endCb;
    encOrCb = void 0;
    endCb = void 0;
  } else if (typeof chunkOrCb === "function") {
    endCb = chunkOrCb;
  } else if (typeof encOrCb === "function") {
    endCb = encOrCb;
  }
  this._writeClosed = true;
  this.writable = false;
  this.writableEnded = true;
  this._transformEndCallback = endCb || chunkOrCb;
  this._transformEnd = () => {
    const callback = this._transformEndCallback;
    this._transformEndCallback = void 0;
    Duplex.prototype.end.call(this, callback);
  };
  drainTransform(this);
  return this;
};
var Stream = function Stream2() {
  if (!this) return;
  EventEmitter.call(this);
};
Object.setPrototypeOf(Stream.prototype, EventEmitter.prototype);
Stream.prototype.pipe = function pipe2(dest) {
  const src = this;
  const onData = (chunk) => {
    if (dest.write) dest.write(chunk);
  };
  src.on("data", onData);
  const onEnd = () => {
    if (dest.end) dest.end();
  };
  src.on("end", onEnd);
  if (!src._pipeDests) src._pipeDests = [];
  src._pipeDests.push({ dest, onData, onEnd });
  return dest;
};
Stream.prototype.unpipe = function unpipe2(dest) {
  const dests = this._pipeDests || [];
  if (dest) {
    const idx = dests.findIndex((d) => d.dest === dest);
    if (idx !== -1) {
      this.removeListener("data", dests[idx].onData);
      this.removeListener("end", dests[idx].onEnd);
      dests.splice(idx, 1);
    }
  } else {
    for (const d of dests) {
      this.removeListener("data", d.onData);
      this.removeListener("end", d.onEnd);
    }
    this._pipeDests = [];
  }
  return this;
};
function addAbortSignal(signal, stream) {
  if (signal.aborted) {
    stream.destroy(new Error("The operation was aborted"));
  } else {
    const onAbort = () => {
      stream.destroy(new Error("The operation was aborted"));
    };
    signal.addEventListener("abort", onAbort, { once: true });
    const origDestroy = stream.destroy.bind(stream);
    stream.destroy = (err) => {
      signal.removeEventListener("abort", onAbort);
      return origDestroy(err);
    };
  }
  return stream;
}
var StreamAny = Stream;
StreamAny.Readable = Readable;
StreamAny.Writable = Writable;
StreamAny.Duplex = Duplex;
StreamAny.Transform = Transform;
StreamAny.PassThrough = PassThrough;
StreamAny.Stream = Stream;
StreamAny.from = Readable.from;
StreamAny.addAbortSignal = addAbortSignal;
function pipeline(...args) {
  const cb = typeof args[args.length - 1] === "function" ? args.pop() : null;
  const streams = args;
  if (streams.length < 2) {
    if (cb)
      setTimeout(
        () => cb(new Error("pipeline requires at least 2 streams")),
        0
      );
    return streams[0];
  }
  for (let i = 0; i < streams.length; i++) {
    const s = streams[i];
    if (s && typeof s.getReader === "function" && typeof s.pipe !== "function" && typeof s.on !== "function") {
      streams[i] = Readable.fromWeb(s);
    }
  }
  let errorOccurred = false;
  const onError = (...errArgs) => {
    const err = errArgs[0];
    if (errorOccurred) return;
    errorOccurred = true;
    for (const s of streams) {
      if (typeof s.destroy === "function") {
        s.destroy();
      }
    }
    if (cb) cb(err);
  };
  for (let i = 0; i < streams.length - 1; i++) {
    const src = streams[i];
    const dest = streams[i + 1];
    if (typeof src.pipe === "function") {
      src.pipe(dest);
    }
    src.on("error", onError);
  }
  const last = streams[streams.length - 1];
  last.on("error", onError);
  if (cb && !errorOccurred) {
    const onFinish = () => {
      if (!errorOccurred) cb(null);
    };
    if (last instanceof Readable) {
      last.on("end", onFinish);
    } else {
      last.on("finish", onFinish);
    }
  }
  return last;
}
function finished(stream, optsOrCb, cb) {
  const done = typeof optsOrCb === "function" ? optsOrCb : cb;
  const s = stream;
  let called = false;
  const onDone = (err) => {
    if (called) return;
    called = true;
    if (done) done(err);
  };
  const cleanup = () => {
    s.removeListener("end", onEnd);
    s.removeListener("finish", onFinish);
    s.removeListener("error", onErr);
    s.removeListener("close", onClose);
  };
  const onEnd = () => {
    cleanup();
    onDone();
  };
  const onFinish = () => {
    cleanup();
    onDone();
  };
  const onErr = (err) => {
    cleanup();
    onDone(err);
  };
  const onClose = () => {
    cleanup();
    onDone();
  };
  s.on("end", onEnd);
  s.on("finish", onFinish);
  s.on("error", onErr);
  s.on("close", onClose);
  if (s.readableEnded || s.writableFinished) {
    queueMicrotask(() => onDone());
  }
  return cleanup;
}
var _defaultHighWaterMark = 16384;
var _defaultObjectHighWaterMark = 16;
function getDefaultHighWaterMark(objectMode) {
  return objectMode ? _defaultObjectHighWaterMark : _defaultHighWaterMark;
}
function setDefaultHighWaterMark(objectMode, value) {
  if (objectMode) {
    _defaultObjectHighWaterMark = value;
  } else {
    _defaultHighWaterMark = value;
  }
}
var promises = {
  pipeline: async (...streams) => {
    return new Promise((resolve, reject) => {
      pipeline(...streams, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  },
  finished: async (stream, opts) => {
    return new Promise((resolve, reject) => {
      finished(stream, opts, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
};
StreamAny.pipeline = pipeline;
StreamAny.finished = finished;
StreamAny.promises = promises;
StreamAny.getDefaultHighWaterMark = getDefaultHighWaterMark;
StreamAny.setDefaultHighWaterMark = setDefaultHighWaterMark;
function compose(...streams) {
  if (streams.length === 0) {
    return new PassThrough();
  }
  for (const s of streams) {
    if (!s || typeof s.pipe !== "function") {
      throw new TypeError("stream.compose: all arguments must be duplex/transform streams");
    }
  }
  for (let i = 0; i < streams.length - 1; i++) {
    streams[i].pipe(streams[i + 1]);
  }
  const first = streams[0];
  const last = streams[streams.length - 1];
  const outer = new Duplex({
    write(chunk, enc2, cb) {
      try {
        const ok = first.write(chunk, enc2);
        if (ok === false) first.once("drain", () => cb());
        else queueMicrotask(() => cb());
      } catch (e) {
        cb(e);
      }
    },
    final(cb) {
      try {
        first.end();
        queueMicrotask(() => cb());
      } catch (e) {
        cb(e);
      }
    },
    read() {
    }
  });
  last.on("data", (chunk) => {
    outer.push(chunk);
  });
  last.on("end", () => {
    outer.push(null);
  });
  last.on("error", (err) => {
    outer.destroy?.(err);
  });
  first.on("error", (err) => {
    outer.destroy?.(err);
  });
  return outer;
}
function isReadable(stream) {
  if (!stream || typeof stream !== "object") return false;
  const s = stream;
  if (typeof s.read !== "function") return false;
  if (s.destroyed) return false;
  if (s.readableEnded || s._terminated) return false;
  return true;
}
function isWritable(stream) {
  if (!stream || typeof stream !== "object") return false;
  const s = stream;
  if (typeof s.write !== "function") return false;
  if (s.destroyed) return false;
  if (s.writableEnded || s.writableFinished) return false;
  return true;
}
function isDisturbed(stream) {
  if (!stream || typeof stream !== "object") return false;
  const s = stream;
  return !!s.readableDidRead || !!s._reading;
}
function isErrored(stream) {
  if (!stream || typeof stream !== "object") return false;
  const s = stream;
  return s.errored != null;
}
StreamAny.compose = compose;
StreamAny.isReadable = isReadable;
StreamAny.isWritable = isWritable;
StreamAny.isDisturbed = isDisturbed;
StreamAny.isErrored = isErrored;
Readable.isDisturbed = isDisturbed;
Readable.isReadable = isReadable;

// ../node/helpers/sync-scope.ts
var depth = 0;
var SyncPromiseCtor = null;
function settledPromise(executor) {
  if (depth > 0 && SyncPromiseCtor) return new SyncPromiseCtor(executor);
  return new Promise(executor);
}
function settledResolve(value) {
  return settledPromise((resolve) => resolve(value));
}
function settledReject(reason) {
  return settledPromise((_resolve, reject) => reject(reason));
}

// ../node/polyfills/fs.ts
var decoder3 = new TextDecoder();
var encoder3 = new TextEncoder();
var _fsCallbacks = [];
var _fsCallbackPort = null;
function runNextFsCallback() {
  const next = _fsCallbacks.shift();
  if (!next) return;
  next.handle.close();
  try {
    next.fn();
  } catch (e) {
    if (isExitSentinel(e)) return;
    queueMicrotask(() => {
      throw e;
    });
  }
}
function deferCallback(fn) {
  if (typeof MessageChannel === "undefined") {
    setImmediate(fn);
    return;
  }
  if (!_fsCallbackPort) {
    const channel = new MessageChannel();
    channel.port1.onmessage = runNextFsCallback;
    _fsCallbackPort = channel.port2;
  }
  _fsCallbacks.push({ handle: getRegistry().register("FSReqCallback"), fn });
  _fsCallbackPort.postMessage(0);
}
var Dirent = function Dirent2(entryName, isDir, isFile2, parentPath, isSymlink = false) {
  if (!this) return;
  this.name = entryName;
  this._dir = isDir;
  this._file = isFile2;
  this._symlink = isSymlink;
  this.parentPath = parentPath ?? "";
  this.path = this.parentPath;
};
Dirent.prototype.isDirectory = function isDirectory() {
  return this._dir;
};
Dirent.prototype.isFile = function isFile() {
  return this._file;
};
Dirent.prototype.isBlockDevice = function isBlockDevice() {
  return false;
};
Dirent.prototype.isCharacterDevice = function isCharacterDevice() {
  return false;
};
Dirent.prototype.isFIFO = function isFIFO() {
  return false;
};
Dirent.prototype.isSocket = function isSocket() {
  return false;
};
Dirent.prototype.isSymbolicLink = function isSymbolicLink() {
  return !!this._symlink;
};
var Dir = function Dir2(dirPath, entries) {
  if (!this) return;
  this.path = dirPath;
  this._entries = entries;
  this._pos = 0;
  this._closed = false;
};
Dir.prototype.readSync = function readSync() {
  if (this._closed) throw new Error("ERR_DIR_CLOSED: Directory handle was closed");
  if (this._pos >= this._entries.length) return null;
  return this._entries[this._pos++];
};
Dir.prototype.read = function read2(cb) {
  if (cb) {
    try {
      const entry = this.readSync();
      queueMicrotask(() => cb(null, entry));
    } catch (e) {
      queueMicrotask(() => cb(e, null));
    }
    return;
  }
  const self2 = this;
  return new Promise((resolve, reject) => {
    try {
      resolve(self2.readSync());
    } catch (e) {
      reject(e);
    }
  });
};
Dir.prototype.closeSync = function closeSync() {
  this._closed = true;
};
Dir.prototype.close = function close3(cb) {
  this._closed = true;
  if (cb) {
    queueMicrotask(() => cb(null));
    return;
  }
  return Promise.resolve();
};
Dir.prototype[Symbol.asyncIterator] = function() {
  const self2 = this;
  return {
    async next() {
      const entry = self2.readSync();
      if (entry === null) return { done: true, value: void 0 };
      return { done: false, value: entry };
    },
    [Symbol.asyncIterator]() {
      return this;
    }
  };
};
var StatFs = class {
  type;
  bsize;
  blocks;
  bfree;
  bavail;
  files;
  ffree;
  constructor() {
    this.type = 1635083891;
    this.bsize = 4096;
    this.blocks = 262144;
    this.bfree = 131072;
    this.bavail = 131072;
    this.files = 65536;
    this.ffree = 32768;
  }
};
var StatWatcher = class {
  _listeners = /* @__PURE__ */ new Map();
  _interval = null;
  _poll = null;
  start(_filename, _persistent, interval = 5007, poll) {
    this.stop();
    this._poll = poll ?? null;
    if (!this._poll) return;
    this._interval = setInterval(() => {
      try {
        this._poll?.();
      } catch {
      }
    }, interval);
  }
  stop() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
    this._poll = null;
    this._emit("stop");
  }
  ref() {
    return this;
  }
  unref() {
    return this;
  }
  on(event, listener) {
    if (!this._listeners.has(event)) this._listeners.set(event, []);
    this._listeners.get(event).push(listener);
    return this;
  }
  once(event, listener) {
    const wrapped = (...args) => {
      this.removeListener(event, wrapped);
      listener(...args);
    };
    return this.on(event, wrapped);
  }
  removeListener(event, listener) {
    const arr = this._listeners.get(event);
    if (arr) {
      const idx = arr.indexOf(listener);
      if (idx !== -1) arr.splice(idx, 1);
    }
    return this;
  }
  off(event, listener) {
    return this.removeListener(event, listener);
  }
  addListener(event, listener) {
    return this.on(event, listener);
  }
  removeAllListeners(event) {
    if (event) this._listeners.delete(event);
    else this._listeners.clear();
    return this;
  }
  emit(event, ...args) {
    return this._emit(event, ...args);
  }
  _emit(event, ...args) {
    const arr = this._listeners.get(event);
    if (!arr || arr.length === 0) return false;
    for (const fn of arr.slice()) fn(...args);
    return true;
  }
};
var URL_SCHEME_RE = /^[a-z][a-z0-9+\-.]*:/i;
function resolvePath(target, cwdFn) {
  let p;
  if (typeof target === "string") {
    p = target;
  } else if (target instanceof URL || // cross-realm URL objects fail instanceof, so duck-type check
  target && typeof target === "object" && typeof target.protocol === "string" && typeof target.pathname === "string") {
    const url = target;
    if (url.protocol !== "file:") {
      throw new Error(`Unsupported protocol: ${url.protocol}`);
    }
    p = decodeURIComponent(url.pathname);
  } else if (target && typeof target === "object" && "toString" in target) {
    p = String(target);
  } else {
    throw new TypeError(`Path must be a string or URL. Got: ${typeof target}`);
  }
  if (URL_SCHEME_RE.test(p)) {
    try {
      const u = new globalThis.URL(p);
      if (u.protocol === "file:" || u.protocol === "http:" || u.protocol === "https:") {
        p = decodeURIComponent(u.pathname) || p;
      }
    } catch {
    }
  }
  if (!p.startsWith("/") && cwdFn) {
    const cwd = cwdFn();
    p = cwd.endsWith("/") ? cwd + p : cwd + "/" + p;
  }
  return p;
}
function copyBytes(dst, dstOff, src, srcOff, count) {
  if (count > 16 && dst instanceof Uint8Array && src instanceof Uint8Array && Number.isInteger(dstOff) && Number.isInteger(srcOff) && dstOff >= 0 && srcOff >= 0 && dstOff + count <= dst.length && srcOff + count <= src.length) {
    dst.set(new Uint8Array(src.buffer, src.byteOffset + srcOff, count), dstOff);
    return;
  }
  for (let i = 0; i < count; i++) dst[dstOff + i] = src[srcOff + i];
}
function wrapAsBuffer(raw) {
  if (typeof raw.readUInt8 === "function") return raw;
  return Buffer2.from(raw);
}
function ownFdData(entry) {
  if (entry.borrowed === void 0) return;
  if (entry.data === entry.borrowed) entry.data = new Uint8Array(entry.data);
  entry.borrowed = void 0;
}
function extendFdData(entry, length) {
  ownFdData(entry);
  if (length <= entry.data.length) return;
  const previous = entry.data;
  const capacity = previous.buffer.byteLength - previous.byteOffset;
  if (length <= capacity) {
    entry.data = new Uint8Array(previous.buffer, previous.byteOffset, length);
    entry.data.fill(0, previous.length);
  } else {
    const storage = new Uint8Array(Math.max(length, capacity * 2));
    storage.set(previous);
    entry.data = storage.subarray(0, length);
  }
}
var FS_PROXY_INTERNALS = Symbol.for("nodepod.fsProxyInternals");
function buildFileSystemBridge(volume, getCwd) {
  const openFiles = /* @__PURE__ */ new Map();
  let fdCounter = 3;
  function numericFlagsToString(f) {
    const O_WRONLY = 1;
    const O_RDWR = 2;
    const O_TRUNC = 512;
    const O_APPEND = 1024;
    const readWrite = (f & O_RDWR) === O_RDWR;
    const writeOnly = (f & O_WRONLY) === O_WRONLY;
    const append = (f & O_APPEND) === O_APPEND;
    const trunc = (f & O_TRUNC) === O_TRUNC;
    if (append) return readWrite ? "a+" : "a";
    if (writeOnly) return trunc ? "w" : "r+";
    if (readWrite) return trunc ? "w+" : "r+";
    return "r";
  }
  const abs = (target) => resolvePath(target, getCwd);
  const symlinkTargetArg = (target) => {
    const t = String(target ?? "");
    if (t.startsWith("/")) return abs(t);
    return t;
  };
  function persistWritableFd(fd) {
    const entry = openFiles.get(fd);
    if (!entry || entry.isDirectory) return;
    if (entry.mode.includes("w") || entry.mode.includes("a") || entry.mode.includes("+")) {
      volume.writeFileSync(entry.filePath, entry.data);
      if (entry.createMode !== void 0) {
        volume.chmodSync(entry.filePath, entry.createMode & 511);
        entry.createMode = void 0;
      }
      if (entry.times) volume.utimesSync(entry.filePath, entry.times[0], entry.times[1]);
    }
  }
  function setFdTimes(fd, atime, mtime) {
    const entry = openFiles.get(fd);
    if (!entry) throw makeBadfError("futimes");
    entry.times = [atime, mtime];
    persistWritableFd(fd);
    volume.utimesSync(entry.filePath, entry.times[0], entry.times[1]);
  }
  const fsConst = {
    F_OK: 0,
    R_OK: 4,
    W_OK: 2,
    X_OK: 1,
    O_RDONLY: 0,
    O_WRONLY: 1,
    O_RDWR: 2,
    O_CREAT: 64,
    O_EXCL: 128,
    O_TRUNC: 512,
    O_APPEND: 1024,
    O_DIRECTORY: 65536,
    O_NOFOLLOW: 131072,
    O_SYNC: 1052672,
    O_DSYNC: 4096,
    O_NONBLOCK: 2048,
    O_NOCTTY: 256,
    S_IFMT: 61440,
    S_IFREG: 32768,
    S_IFDIR: 16384,
    S_IFLNK: 40960,
    S_IFCHR: 8192,
    S_IFBLK: 24576,
    S_IFIFO: 4096,
    S_IFSOCK: 49152,
    S_IRWXU: 448,
    // 0o700
    S_IRUSR: 256,
    // 0o400
    S_IWUSR: 128,
    // 0o200
    S_IXUSR: 64,
    // 0o100
    S_IRWXG: 56,
    // 0o070
    S_IRGRP: 32,
    // 0o040
    S_IWGRP: 16,
    // 0o020
    S_IXGRP: 8,
    // 0o010
    S_IRWXO: 7,
    // 0o007
    S_IROTH: 4,
    // 0o004
    S_IWOTH: 2,
    // 0o002
    S_IXOTH: 1,
    // 0o001
    COPYFILE_EXCL: 1,
    COPYFILE_FICLONE: 2,
    COPYFILE_FICLONE_FORCE: 4,
    UV_FS_SYMLINK_DIR: 1,
    UV_FS_SYMLINK_JUNCTION: 2
  };
  function toDirents(dirPath, names) {
    const kinds = typeof volume.childKindsSync === "function" ? volume.childKindsSync(dirPath, names) : null;
    return names.map((name, i) => {
      const kind = kinds ? kinds[i] : null;
      if (kind !== null) {
        return new Dirent(name, kind === "directory", kind === "file", dirPath, kind === "symlink");
      }
      const full = dirPath.endsWith("/") ? dirPath + name : dirPath + "/" + name;
      let isDir = false;
      let isFile2 = false;
      let isSymlink = false;
      try {
        const st = volume.lstatSync(full);
        isSymlink = st.isSymbolicLink();
        isDir = !isSymlink && st.isDirectory();
        isFile2 = !isSymlink && st.isFile();
      } catch {
        isFile2 = true;
      }
      return new Dirent(name, isDir, isFile2, dirPath, isSymlink);
    });
  }
  function isEnoent(err) {
    return !!(err && typeof err === "object" && err.code === "ENOENT");
  }
  function toBigIntStats(st) {
    const wrap2 = (n) => BigInt(n);
    return {
      ...st,
      size: wrap2(st.size),
      mode: wrap2(st.mode),
      nlink: wrap2(st.nlink),
      uid: wrap2(st.uid),
      gid: wrap2(st.gid),
      dev: wrap2(st.dev),
      ino: wrap2(st.ino),
      rdev: wrap2(st.rdev),
      blksize: wrap2(st.blksize),
      blocks: wrap2(st.blocks),
      atimeMs: wrap2(st.atimeMs),
      mtimeMs: wrap2(st.mtimeMs),
      ctimeMs: wrap2(st.ctimeMs),
      birthtimeMs: wrap2(st.birthtimeMs),
      atimeNs: BigInt(Math.trunc(st.atimeMs)) * 1000000n,
      mtimeNs: BigInt(Math.trunc(st.mtimeMs)) * 1000000n,
      ctimeNs: BigInt(Math.trunc(st.ctimeMs)) * 1000000n,
      birthtimeNs: BigInt(Math.trunc(st.birthtimeMs)) * 1000000n
    };
  }
  function applyStatOptions(st, opts) {
    if (st === void 0) return void 0;
    return opts?.bigint ? toBigIntStats(st) : st;
  }
  function runStat(fn, opts) {
    try {
      return applyStatOptions(fn(), opts);
    } catch (err) {
      if (opts?.throwIfNoEntry === false && isEnoent(err)) return void 0;
      throw err;
    }
  }
  function decodeBytes(raw, enc2) {
    if (!enc2 || enc2 === "buffer") return wrapAsBuffer(raw);
    return Buffer2.from(raw.buffer, raw.byteOffset, raw.byteLength).toString(enc2);
  }
  function normalizeWriteData(data, encoding) {
    if (typeof data === "string") {
      return Buffer2.from(data, encoding || "utf8");
    }
    if (data instanceof Uint8Array) return data;
    if (data instanceof ArrayBuffer) return new Uint8Array(data);
    if (data && ArrayBuffer.isView(data)) {
      const view = data;
      return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
    }
    if (Array.isArray(data) || data && typeof data.length === "number") {
      return Uint8Array.from(data);
    }
    return new Uint8Array(0);
  }
  function encodeReaddirNames(names, encoding) {
    if (encoding === "buffer") {
      return names.map((n) => Buffer2.from(n));
    }
    if (!encoding || encoding === "utf8" || encoding === "utf-8") return names;
    return names.map((n) => Buffer2.from(n).toString(encoding));
  }
  function expandBraces(pat) {
    const m = pat.match(/^([^{]*)\{([^}]+)\}(.*)$/);
    if (!m) return [pat];
    const prefix = m[1], alts = m[2].split(","), suffix = m[3];
    const result = [];
    for (const alt of alts) result.push(...expandBraces(prefix + alt + suffix));
    return result;
  }
  function globToRegex(pat) {
    let re = "";
    let i = 0;
    while (i < pat.length) {
      const ch = pat[i];
      if (ch === "*" && pat[i + 1] === "*") {
        if (pat[i + 2] === "/") {
          re += "(?:.+/)?";
          i += 3;
        } else {
          re += ".*";
          i += 2;
        }
      } else if (ch === "*") {
        re += "[^/]*";
        i++;
      } else if (ch === "?") {
        re += "[^/]";
        i++;
      } else if (ch === "[") {
        let j = i + 1;
        if (j < pat.length && (pat[j] === "!" || pat[j] === "^")) j++;
        if (j < pat.length && pat[j] === "]") j++;
        while (j < pat.length && pat[j] !== "]") j++;
        if (j >= pat.length) {
          re += "\\[";
          i++;
        } else {
          let cls = pat.slice(i + 1, j);
          if (cls.startsWith("!") || cls.startsWith("^")) cls = "^" + cls.slice(1);
          re += "[" + cls.replace(/\\/g, "\\\\") + "]";
          i = j + 1;
        }
      } else if (".()^$|+{}".includes(ch)) {
        re += "\\" + ch;
        i++;
      } else {
        re += ch;
        i++;
      }
    }
    return new RegExp("^" + re + "$");
  }
  function matchGlob(pattern, opts) {
    const patterns = Array.isArray(pattern) ? pattern : [pattern];
    const cwd = opts?.cwd ? abs(opts.cwd) : getCwd ? getCwd() : "/";
    const exclude = opts?.exclude;
    const regexes = [];
    for (const p of patterns) {
      for (const expanded of expandBraces(p)) regexes.push(globToRegex(expanded));
    }
    let excludeFn = null;
    if (typeof exclude === "function") excludeFn = exclude;
    else if (Array.isArray(exclude) && exclude.length > 0) {
      const exRegexes = [];
      for (const ep of exclude) {
        for (const expanded of expandBraces(ep)) exRegexes.push(globToRegex(expanded));
      }
      excludeFn = (p) => exRegexes.some((r) => r.test(p));
    }
    const results = [];
    function walk(dir, base) {
      let entries;
      try {
        entries = volume.readdirSync(dir);
      } catch {
        return;
      }
      for (const name of entries) {
        const full = dir.endsWith("/") ? dir + name : dir + "/" + name;
        const rel = base ? base + "/" + name : name;
        let isDir = false;
        try {
          isDir = volume.lstatSync(full).isDirectory();
        } catch {
        }
        if (isDir) {
          if (regexes.some((r) => r.test(rel))) results.push(rel);
          walk(full, rel);
        } else {
          results.push(rel);
        }
      }
    }
    walk(cwd, "");
    const matched = results.filter((f) => {
      if (excludeFn && excludeFn(f)) return false;
      return regexes.some((r) => r.test(f));
    });
    if (opts?.withFileTypes) {
      return matched.map((rel) => {
        const full = cwd.endsWith("/") ? cwd + rel : cwd + "/" + rel;
        const parent = full.substring(0, full.lastIndexOf("/")) || "/";
        const name = rel.includes("/") ? rel.slice(rel.lastIndexOf("/") + 1) : rel;
        return toDirents(parent, [name])[0];
      });
    }
    return matched;
  }
  function busyWait(ms) {
    if (ms <= 0) return;
    const end4 = Date.now() + ms;
    while (Date.now() < end4) {
    }
  }
  function rmWithRetry(fn, opts) {
    const maxRetries = opts?.maxRetries ?? 0;
    const retryDelay = opts?.retryDelay ?? 100;
    let lastErr;
    for (let i = 0; i <= maxRetries; i++) {
      try {
        fn();
        return;
      } catch (err) {
        lastErr = err;
        const code = err?.code;
        if (i >= maxRetries || code !== "EBUSY" && code !== "EPERM" && code !== "EACCES") throw err;
        busyWait(retryDelay);
      }
    }
    throw lastErr;
  }
  const watchFileMap = /* @__PURE__ */ new Map();
  function pollWatchFile(path, entry) {
    let curr;
    try {
      curr = volume.statSync(path);
    } catch {
      curr = void 0;
    }
    const prev = entry.prev;
    if (curr && prev) {
      if (curr.mtimeMs !== prev.mtimeMs || curr.size !== prev.size || curr.ino !== prev.ino) {
        for (const listener of entry.listeners) {
          try {
            listener(curr, prev);
          } catch {
          }
        }
        entry.watcher.emit("change", curr, prev);
      }
    }
    entry.prev = curr;
  }
  class FileHandle {
    fd;
    constructor(fd) {
      this.fd = fd;
    }
    appendFile(data) {
      const entry = openFiles.get(this.fd);
      if (!entry) return Promise.reject(makeBadfError("appendFile"));
      const bytes2 = typeof data === "string" ? encoder3.encode(data) : data;
      const newData = new Uint8Array(entry.data.length + bytes2.length);
      newData.set(entry.data);
      newData.set(bytes2, entry.data.length);
      entry.data = newData;
      entry.cursor = newData.length;
      return Promise.resolve();
    }
    chmod(mode) {
      const entry = openFiles.get(this.fd);
      if (!entry) return Promise.reject(makeBadfError("chmod"));
      try {
        volume.chmodSync(entry.filePath, mode);
        return Promise.resolve();
      } catch (e) {
        return Promise.reject(e);
      }
    }
    chown(uid, gid) {
      const entry = openFiles.get(this.fd);
      if (!entry) return Promise.reject(makeBadfError("chown"));
      try {
        volume.chownSync(entry.filePath, uid, gid);
        return Promise.resolve();
      } catch (e) {
        return Promise.reject(e);
      }
    }
    close() {
      try {
        if (openFiles.has(this.fd)) {
          persistWritableFd(this.fd);
          openFiles.delete(this.fd);
        }
        return Promise.resolve();
      } catch (e) {
        return Promise.reject(e);
      }
    }
    createReadStream(opts) {
      const entry = openFiles.get(this.fd);
      if (!entry) throw makeBadfError("createReadStream");
      if (entry.isDirectory) throw makeSystemError("EISDIR", "read", entry.filePath);
      const start = opts?.start ?? 0;
      const end4 = opts?.end ?? Infinity;
      let pos = start;
      const hwm = opts?.highWaterMark ?? 64 * 1024;
      const stream = new Readable({
        highWaterMark: hwm,
        read(size2) {
          try {
            if (pos > end4) {
              stream.push(null);
              return;
            }
            const toRead = Math.min(size2 || hwm, Math.max(0, (end4 === Infinity ? entry.data.length - 1 : end4) - pos + 1));
            if (toRead <= 0 || pos >= entry.data.length) {
              stream.push(null);
              return;
            }
            const chunk = entry.data.subarray(pos, pos + toRead);
            pos += chunk.length;
            stream.push(Buffer2.from(chunk));
            if (pos > end4 || pos >= entry.data.length) stream.push(null);
          } catch (err) {
            stream.destroy(err);
          }
        }
      });
      stream.path = entry.filePath;
      stream.fd = this.fd;
      return stream;
    }
    createWriteStream(_opts) {
      const entry = openFiles.get(this.fd);
      if (!entry) throw makeBadfError("createWriteStream");
      const chunks = [];
      const stream = new Writable();
      stream.path = entry.filePath;
      stream.fd = this.fd;
      stream._write = (chunk, _enc, cb) => {
        const bytes2 = typeof chunk === "string" ? encoder3.encode(chunk) : chunk;
        chunks.push(bytes2);
        cb(null);
      };
      stream.on("finish", () => {
        const totalLen = chunks.reduce((sum, c) => sum + c.length, 0);
        const merged = new Uint8Array(totalLen);
        let pos = 0;
        for (const c of chunks) {
          merged.set(c, pos);
          pos += c.length;
        }
        entry.data = merged;
        entry.cursor = merged.length;
      });
      return stream;
    }
    datasync() {
      try {
        persistWritableFd(this.fd);
        return Promise.resolve();
      } catch (e) {
        return Promise.reject(e);
      }
    }
    read(bufOrOpts, offset, length, position) {
      const entry = openFiles.get(this.fd);
      if (!entry) return Promise.reject(makeBadfError("read"));
      let buf;
      let off;
      let len;
      let pos;
      if (bufOrOpts && typeof bufOrOpts === "object" && "buffer" in bufOrOpts) {
        const opts = bufOrOpts;
        buf = opts.buffer;
        off = opts.offset ?? 0;
        len = opts.length ?? buf.length;
        pos = opts.position ?? null;
      } else {
        buf = bufOrOpts ? bufOrOpts : Buffer2.alloc(16384);
        off = offset ?? 0;
        len = length ?? buf.length;
        pos = position ?? null;
      }
      const readAt = pos !== null ? pos : entry.cursor;
      const count = Math.min(len, entry.data.length - readAt);
      if (count <= 0) return Promise.resolve({ bytesRead: 0, buffer: buf });
      copyBytes(buf, off, entry.data, readAt, count);
      if (pos === null) entry.cursor += count;
      return Promise.resolve({ bytesRead: count, buffer: buf });
    }
    readableWebStream() {
      const entry = openFiles.get(this.fd);
      const data = entry ? new Uint8Array(entry.data) : new Uint8Array(0);
      return new ReadableStream({
        start(controller) {
          controller.enqueue(data);
          controller.close();
        }
      });
    }
    readFile(opts) {
      const entry = openFiles.get(this.fd);
      if (!entry) return Promise.reject(makeBadfError("readFile"));
      const enc2 = typeof opts === "string" ? opts : opts?.encoding;
      if (enc2 === "utf8" || enc2 === "utf-8") {
        return Promise.resolve(decoder3.decode(entry.data));
      }
      return Promise.resolve(wrapAsBuffer(new Uint8Array(entry.data)));
    }
    readLines() {
      const entry = openFiles.get(this.fd);
      const content = entry ? decoder3.decode(entry.data) : "";
      const lines = content.split("\n");
      return {
        [Symbol.asyncIterator]() {
          let i = 0;
          return {
            next() {
              if (i < lines.length) return Promise.resolve({ value: lines[i++], done: false });
              return Promise.resolve({ value: void 0, done: true });
            }
          };
        }
      };
    }
    readv(buffers, position) {
      const entry = openFiles.get(this.fd);
      if (!entry) return Promise.reject(makeBadfError("readv"));
      let totalRead = 0;
      let readPos = position ?? entry.cursor;
      for (const buf of buffers) {
        const u8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
        const count = Math.min(u8.length, entry.data.length - readPos);
        if (count <= 0) break;
        copyBytes(u8, 0, entry.data, readPos, count);
        readPos += count;
        totalRead += count;
        if (count < u8.length) break;
      }
      if (position === void 0) entry.cursor = readPos;
      return Promise.resolve({ bytesRead: totalRead, buffers });
    }
    stat(opts) {
      const entry = openFiles.get(this.fd);
      if (!entry) return Promise.reject(makeBadfError("fstat"));
      try {
        return Promise.resolve(runStat(() => volume.statSync(entry.filePath), opts));
      } catch (e) {
        return Promise.reject(e);
      }
    }
    sync() {
      try {
        persistWritableFd(this.fd);
        return Promise.resolve();
      } catch (e) {
        return Promise.reject(e);
      }
    }
    truncate(len = 0) {
      const entry = openFiles.get(this.fd);
      if (!entry) return Promise.reject(makeBadfError("ftruncate"));
      if (len < entry.data.length) {
        entry.data = entry.data.slice(0, len);
      } else if (len > entry.data.length) {
        const bigger = new Uint8Array(len);
        bigger.set(entry.data);
        entry.data = bigger;
      }
      return Promise.resolve();
    }
    utimes(atime, mtime) {
      try {
        setFdTimes(this.fd, atime, mtime);
        return Promise.resolve();
      } catch (error) {
        return Promise.reject(error);
      }
    }
    write(buf, offsetOrOpts, length, position) {
      const entry = openFiles.get(this.fd);
      if (!entry) return Promise.reject(makeBadfError("write"));
      let bytes2;
      let off;
      let len;
      let pos;
      if (typeof buf === "string") {
        bytes2 = encoder3.encode(buf);
        off = 0;
        len = bytes2.length;
        pos = typeof offsetOrOpts === "number" ? offsetOrOpts : null;
      } else if (typeof offsetOrOpts === "object" && offsetOrOpts !== null) {
        bytes2 = buf;
        off = offsetOrOpts.offset ?? 0;
        len = offsetOrOpts.length ?? bytes2.length - off;
        pos = offsetOrOpts.position;
      } else {
        bytes2 = buf;
        off = offsetOrOpts ?? 0;
        len = length ?? bytes2.length - off;
        pos = position;
      }
      const append = entry.mode.includes("a");
      const writeAt = append ? entry.data.length : pos !== null && pos !== void 0 ? pos : entry.cursor;
      const endAt = writeAt + len;
      extendFdData(entry, endAt);
      copyBytes(entry.data, writeAt, bytes2, off, len);
      if (append || pos === null || pos === void 0) entry.cursor = endAt;
      return Promise.resolve({ bytesWritten: len, buffer: buf });
    }
    writeFile(data) {
      const entry = openFiles.get(this.fd);
      if (!entry) return Promise.reject(makeBadfError("writeFile"));
      const bytes2 = typeof data === "string" ? encoder3.encode(data) : data;
      entry.data = new Uint8Array(bytes2);
      entry.cursor = bytes2.length;
      return Promise.resolve();
    }
    writev(buffers, position) {
      const entry = openFiles.get(this.fd);
      if (!entry) return Promise.reject(makeBadfError("writev"));
      let totalWritten = 0;
      let writePos = position ?? entry.cursor;
      for (const buf of buffers) {
        const u8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
        const endAt = writePos + u8.length;
        extendFdData(entry, endAt);
        copyBytes(entry.data, writePos, u8, 0, u8.length);
        writePos += u8.length;
        totalWritten += u8.length;
      }
      if (position === void 0) entry.cursor = writePos;
      return Promise.resolve({ bytesWritten: totalWritten, buffers });
    }
    [Symbol.asyncDispose]() {
      return this.close();
    }
  }
  function makeBadfError(syscall2) {
    const err = new Error(`EBADF: bad file descriptor, ${syscall2}`);
    err.code = "EBADF";
    err.errno = -9;
    return err;
  }
  const promisesApi = {
    readFile(target, encOrOpts) {
      return settledPromise((ok, fail) => {
        try {
          const p = abs(target);
          let enc2;
          if (typeof encOrOpts === "string") enc2 = encOrOpts;
          else if (encOrOpts?.encoding) enc2 = encOrOpts.encoding ?? void 0;
          const raw = volume.readFileSync(p);
          if (p.endsWith(".wasm")) precompileWasm(raw);
          ok(decodeBytes(raw, enc2));
        } catch (e) {
          fail(e);
        }
      });
    },
    writeFile(target, data, opts) {
      return settledPromise((ok, fail) => {
        try {
          bridge.writeFileSync(target, data, opts);
          ok();
        } catch (e) {
          fail(e);
        }
      });
    },
    stat(target, opts) {
      return settledPromise((ok, fail) => {
        try {
          ok(runStat(() => volume.statSync(abs(target)), opts));
        } catch (e) {
          fail(e);
        }
      });
    },
    mkdir(target, opts) {
      return settledPromise((ok, fail) => {
        try {
          ok(volume.mkdirSync(abs(target), opts));
        } catch (e) {
          fail(e);
        }
      });
    },
    unlink(target) {
      return settledPromise((ok, fail) => {
        try {
          volume.unlinkSync(abs(target));
          ok();
        } catch (e) {
          fail(e);
        }
      });
    },
    rmdir(target) {
      return settledPromise((ok, fail) => {
        try {
          volume.rmdirSync(abs(target));
          ok();
        } catch (e) {
          fail(e);
        }
      });
    },
    rename(src, dest) {
      return settledPromise((ok, fail) => {
        try {
          volume.renameSync(abs(src), abs(dest));
          ok();
        } catch (e) {
          fail(e);
        }
      });
    },
    access(target, mode) {
      return settledPromise((ok, fail) => {
        try {
          volume.accessSync(abs(target), mode);
          ok();
        } catch (e) {
          fail(e);
        }
      });
    },
    realpath(target) {
      return settledPromise((ok, fail) => {
        try {
          ok(volume.realpathSync(abs(target)));
        } catch (e) {
          fail(e);
        }
      });
    },
    copyFile(src, dest, mode = 0) {
      return settledPromise((ok, fail) => {
        try {
          volume.copyFileSync(abs(src), abs(dest), mode);
          ok();
        } catch (e) {
          fail(e);
        }
      });
    },
    appendFile(target, data) {
      return settledPromise((ok, fail) => {
        try {
          volume.appendFileSync(abs(target), data);
          ok();
        } catch (e) {
          fail(e);
        }
      });
    },
    symlink(target, path, type) {
      return settledPromise((ok, fail) => {
        try {
          volume.symlinkSync(symlinkTargetArg(target), abs(path), type);
          ok();
        } catch (e) {
          fail(e);
        }
      });
    },
    readlink(target) {
      return settledPromise((ok, fail) => {
        try {
          ok(volume.readlinkSync(abs(target)));
        } catch (e) {
          fail(e);
        }
      });
    },
    link(existingPath, newPath) {
      return settledPromise((ok, fail) => {
        try {
          volume.linkSync(abs(existingPath), abs(newPath));
          ok();
        } catch (e) {
          fail(e);
        }
      });
    },
    chmod(target, mode) {
      return settledPromise((ok, fail) => {
        try {
          volume.chmodSync(abs(target), mode);
          ok();
        } catch (e) {
          fail(e);
        }
      });
    },
    chown(target, uid, gid) {
      return settledPromise((ok, fail) => {
        try {
          volume.chownSync(abs(target), uid, gid);
          ok();
        } catch (e) {
          fail(e);
        }
      });
    },
    truncate(target, len) {
      return settledPromise((ok, fail) => {
        try {
          volume.truncateSync(abs(target), len);
          ok();
        } catch (e) {
          fail(e);
        }
      });
    },
    rm(target, opts) {
      return new Promise(async (ok, fail) => {
        try {
          const maxRetries = opts?.maxRetries ?? 0;
          const retryDelay = opts?.retryDelay ?? 100;
          let lastErr;
          for (let i = 0; i <= maxRetries; i++) {
            try {
              bridge.rmSync(abs(target), opts);
              ok();
              return;
            } catch (err) {
              lastErr = err;
              const code = err?.code;
              if (i >= maxRetries || code !== "EBUSY" && code !== "EPERM" && code !== "EACCES") {
                fail(err);
                return;
              }
              await new Promise((r) => setTimeout(r, retryDelay));
            }
          }
          fail(lastErr);
        } catch (e) {
          fail(e);
        }
      });
    },
    lstat(target, opts) {
      return settledPromise((ok, fail) => {
        try {
          ok(runStat(() => volume.lstatSync(abs(target)), opts));
        } catch (e) {
          fail(e);
        }
      });
    },
    utimes(target, atime, mtime) {
      try {
        volume.utimesSync(abs(target), atime, mtime);
        return settledResolve();
      } catch (error) {
        return settledReject(error);
      }
    },
    lchown(target, uid, gid) {
      try {
        volume.lchownSync(abs(target), uid, gid);
        return settledResolve();
      } catch (error) {
        return settledReject(error);
      }
    },
    lutimes(target, atime, mtime) {
      try {
        volume.lutimesSync(abs(target), atime, mtime);
        return settledResolve();
      } catch (error) {
        return settledReject(error);
      }
    },
    opendir(target, _opts) {
      try {
        const p = abs(target);
        const names = volume.readdirSync(p);
        const entries = toDirents(p, names);
        return settledResolve(new Dir(p, entries));
      } catch (e) {
        return settledReject(e);
      }
    },
    readdir(target, opts) {
      try {
        const p = abs(target);
        const names = volume.readdirSync(p);
        const o = typeof opts === "string" ? { encoding: opts } : opts;
        if (o?.withFileTypes) {
          return settledResolve(toDirents(p, names));
        }
        return settledResolve(encodeReaddirNames(names, o?.encoding));
      } catch (e) {
        return settledReject(e);
      }
    },
    glob(pattern, opts) {
      const matched = matchGlob(pattern, opts);
      return {
        [Symbol.asyncIterator]() {
          let i = 0;
          return {
            next() {
              if (i < matched.length) {
                return settledResolve({ value: matched[i++], done: false });
              }
              return settledResolve({ value: void 0, done: true });
            }
          };
        }
      };
    },
    open(target, flags, _mode) {
      try {
        const f = flags ?? "r";
        const fd = bridge.openSync(abs(target), f, _mode);
        return settledResolve(new FileHandle(fd));
      } catch (e) {
        return settledReject(e);
      }
    },
    mkdtemp(prefix) {
      try {
        return settledResolve(bridge.mkdtempSync(prefix));
      } catch (e) {
        return settledReject(e);
      }
    },
    watch(filename, opts) {
      const p = abs(filename);
      const events = [];
      let resolve = null;
      let closed = false;
      const handle = volume.watch(p, {
        ...opts?.persistent !== void 0 ? { persistent: opts.persistent } : {},
        ...opts?.recursive !== void 0 ? { recursive: opts.recursive } : {}
      }, (event, name) => {
        events.push({ eventType: event, filename: name });
        if (resolve) {
          resolve();
          resolve = null;
        }
      });
      const elHandle = getRegistry().register("FSWatcher");
      const releaseAll = () => {
        if (closed) return;
        closed = true;
        handle.close();
        elHandle.close();
      };
      if (opts?.signal) {
        opts.signal.addEventListener("abort", () => {
          releaseAll();
          if (resolve) {
            resolve();
            resolve = null;
          }
        }, { once: true });
      }
      return {
        [Symbol.asyncIterator]() {
          return {
            next() {
              if (events.length > 0) {
                return settledResolve({ value: events.shift(), done: false });
              }
              if (closed) return settledResolve({ value: void 0, done: true });
              return new Promise((res2) => {
                resolve = () => {
                  if (events.length > 0) res2({ value: events.shift(), done: false });
                  else res2({ value: void 0, done: true });
                };
              });
            },
            return() {
              releaseAll();
              return settledResolve({ value: void 0, done: true });
            }
          };
        }
      };
    },
    statfs(_target) {
      return settledResolve(new StatFs());
    },
    cp(src, dest, opts) {
      try {
        bridge.cpSync(src, dest, opts);
        return settledResolve();
      } catch (e) {
        return settledReject(e);
      }
    },
    FileHandle,
    constants: fsConst
  };
  const realpathSyncFn = function realpathSync(target) {
    return volume.realpathSync(abs(target));
  };
  realpathSyncFn.native = function native(target) {
    return volume.realpathSync(abs(target));
  };
  function readStoredBytes(target) {
    const p = abs(target);
    const wasmPath = p.endsWith(".wasm") && p.includes("/node_modules/") ? resolveWasmAssetPath(volume, p) : p;
    try {
      const raw = volume.readFileSync(wasmPath);
      return raw;
    } catch (err) {
      if (err?.code === "ENOENT" && p.endsWith(".wasm") && p.includes("/node_modules/")) {
        console.warn(
          `[nodepod] ${p} not in VFS \u2014 fetching from CDN in the background; the next read will succeed once it lands`
        );
        prefetchWasmFromCdn(volume, wasmPath).catch(() => {
        });
      }
      throw err;
    }
  }
  const bridge = {
    __openFileHandleSync(target) {
      return volume.openFileHandleSync(abs(target));
    },
    readFileSync(target, encOrOpts) {
      let enc2;
      if (typeof encOrOpts === "string") enc2 = encOrOpts;
      else if (encOrOpts?.encoding) enc2 = encOrOpts.encoding ?? void 0;
      return decodeBytes(readStoredBytes(target), enc2);
    },
    writeFileSync(target, data, opts) {
      const options = typeof opts === "string" ? { encoding: opts } : opts ?? {};
      const bytes2 = normalizeWriteData(data, options.encoding);
      if (typeof target === "number") {
        const entry = openFiles.get(target);
        if (!entry) {
          const err = new Error(
            "EBADF: bad file descriptor, write"
          );
          err.code = "EBADF";
          err.errno = -9;
          throw err;
        }
        entry.data = new Uint8Array(bytes2);
        entry.cursor = bytes2.length;
        return;
      }
      const wp = abs(target);
      const flag = options.flag ?? "w";
      const mode = options.mode ?? 438;
      const fd = bridge.openSync(wp, flag, mode);
      try {
        if (flag.includes("a")) {
          bridge.writeSync(fd, bytes2, 0, bytes2.length, null);
        } else {
          bridge.ftruncateSync(fd, 0);
          bridge.writeSync(fd, bytes2, 0, bytes2.length, 0);
        }
      } finally {
        bridge.closeSync(fd);
      }
    },
    existsSync(target) {
      return volume.existsSync(abs(target));
    },
    mkdirSync(target, opts) {
      return volume.mkdirSync(abs(target), opts);
    },
    readdirSync(target, opts) {
      const p = abs(target);
      const names = volume.readdirSync(p);
      const o = typeof opts === "string" ? { encoding: opts } : opts;
      if (o?.withFileTypes) {
        return toDirents(p, names);
      }
      return encodeReaddirNames(names, o?.encoding);
    },
    statSync(target, opts) {
      const p = abs(target);
      if (opts?.throwIfNoEntry === false && !volume.existsSync(p)) return void 0;
      return runStat(() => volume.statSync(p), opts);
    },
    lstatSync(target, opts) {
      return runStat(() => volume.lstatSync(abs(target)), opts);
    },
    fstatSync(fd, opts) {
      const entry = openFiles.get(fd);
      if (!entry) {
        const err = new Error("EBADF: bad file descriptor, fstat");
        err.code = "EBADF";
        err.errno = -9;
        throw err;
      }
      return runStat(() => volume.statSync(entry.filePath), opts);
    },
    unlinkSync(target) {
      volume.unlinkSync(abs(target));
    },
    rmdirSync(target) {
      volume.rmdirSync(abs(target));
    },
    renameSync(src, dest) {
      volume.renameSync(abs(src), abs(dest));
    },
    realpathSync: realpathSyncFn,
    accessSync(target, mode) {
      volume.accessSync(abs(target), mode);
    },
    copyFileSync(src, dest, mode = 0) {
      volume.copyFileSync(abs(src), abs(dest), mode);
    },
    symlinkSync(target, path, _type) {
      volume.symlinkSync(symlinkTargetArg(target), abs(path), _type);
    },
    readlinkSync(target) {
      return volume.readlinkSync(abs(target));
    },
    linkSync(existingPath, newPath) {
      volume.linkSync(abs(existingPath), abs(newPath));
    },
    chmodSync(target, mode) {
      volume.chmodSync(abs(target), mode);
    },
    chownSync(target, uid, gid) {
      volume.chownSync(abs(target), uid, gid);
    },
    lchownSync(target, uid, gid) {
      volume.lchownSync(abs(target), uid, gid);
    },
    utimesSync(target, atime, mtime) {
      volume.utimesSync(abs(target), atime, mtime);
    },
    lutimesSync(target, atime, mtime) {
      volume.lutimesSync(abs(target), atime, mtime);
    },
    futimesSync(fd, atime, mtime) {
      setFdTimes(fd, atime, mtime);
    },
    fchownSync(fd, uid, gid) {
      const entry = openFiles.get(fd);
      if (!entry) throw makeBadfError("fchown");
      volume.chownSync(entry.filePath, uid, gid);
    },
    fchmodSync(fd, mode) {
      const entry = openFiles.get(fd);
      if (!entry) throw makeBadfError("fchmod");
      volume.chmodSync(entry.filePath, mode);
    },
    appendFileSync(target, data) {
      volume.appendFileSync(abs(target), data);
    },
    truncateSync(target, len) {
      volume.truncateSync(abs(target), len);
    },
    openSync(target, flags, mode) {
      const p = abs(target);
      const numeric = typeof flags === "number" ? flags : null;
      const flagStr = numeric !== null ? numericFlagsToString(numeric) : String(flags);
      const O_CREAT = 64;
      const O_EXCL = 128;
      const O_DIRECTORY = 65536;
      const O_NOFOLLOW = 131072;
      const createMode = mode ?? 438;
      const wantsExcl = numeric !== null && (numeric & O_EXCL) !== 0 || flagStr.includes("x");
      const wantsCreat = numeric !== null && (numeric & O_CREAT) !== 0 || /[wax]/i.test(flagStr);
      const wantsDirectory = numeric !== null && (numeric & O_DIRECTORY) !== 0;
      const wantsNoFollow = numeric !== null && (numeric & O_NOFOLLOW) !== 0;
      const isWrite = flagStr.includes("w") || flagStr.includes("a");
      const isReadOnly = flagStr.includes("r") && !flagStr.includes("+");
      if (wantsNoFollow) {
        try {
          const raw = volume.lstatSync(p);
          if (raw.isSymbolicLink()) {
            throw makeSystemError("ELOOP", "open", p);
          }
        } catch (err) {
          if (err.code === "ELOOP") throw err;
        }
      }
      const exists = volume.existsSync(p);
      if (wantsExcl && exists) {
        const err = new Error(
          `EEXIST: file already exists, open '${p}'`
        );
        err.code = "EEXIST";
        err.errno = -17;
        err.path = p;
        throw err;
      }
      if (!exists && (isReadOnly || flagStr === "r+" && !wantsCreat)) {
        const err = new Error(
          `ENOENT: no such file or directory, open '${p}'`
        );
        err.code = "ENOENT";
        err.errno = -2;
        err.path = p;
        throw err;
      }
      if (exists && wantsDirectory) {
        const st = volume.statSync(p);
        if (!st.isDirectory()) throw makeSystemError("ENOTDIR", "open", p);
        const fd2 = fdCounter++;
        openFiles.set(fd2, {
          filePath: p,
          cursor: 0,
          mode: flagStr,
          data: new Uint8Array(0),
          isDirectory: true
        });
        return fd2;
      }
      if (exists) {
        try {
          if (volume.statSync(p).isDirectory()) {
            if (wantsDirectory || isReadOnly) {
              const fd2 = fdCounter++;
              openFiles.set(fd2, {
                filePath: p,
                cursor: 0,
                mode: flagStr,
                data: new Uint8Array(0),
                isDirectory: true
              });
              return fd2;
            }
            throw makeSystemError("EISDIR", "open", p);
          }
        } catch (err) {
          if (err.code === "EISDIR") throw err;
        }
      }
      let content;
      let created = false;
      if (exists && !flagStr.includes("w")) {
        content = volume.readFileSync(p);
      } else {
        content = new Uint8Array(0);
        if (isWrite || wantsCreat) {
          const parent = p.substring(0, p.lastIndexOf("/")) || "/";
          if (!volume.existsSync(parent)) {
            volume.mkdirSync(parent, { recursive: true });
          }
          if (!exists) created = true;
        }
      }
      const fd = fdCounter++;
      const borrow = isReadOnly && !isWrite && exists;
      openFiles.set(fd, {
        filePath: p,
        cursor: flagStr.includes("a") ? content.length : 0,
        mode: flagStr,
        data: borrow ? content : new Uint8Array(content),
        createMode: created ? createMode : void 0,
        borrowed: borrow ? content : void 0
      });
      if (exists && flagStr.includes("w") && !flagStr.includes("a")) {
        if (mode !== void 0) {
          openFiles.get(fd).createMode = createMode;
        }
      }
      return fd;
    },
    closeSync(fd) {
      const entry = openFiles.get(fd);
      if (!entry) return;
      persistWritableFd(fd);
      openFiles.delete(fd);
    },
    readSync(fd, buf, off, len, pos) {
      const entry = openFiles.get(fd);
      if (!entry) {
        const err = new Error("EBADF: bad file descriptor, read");
        err.code = "EBADF";
        err.errno = -9;
        throw err;
      }
      const readAt = pos !== null ? pos : entry.cursor;
      const count = Math.min(len, entry.data.length - readAt);
      if (count <= 0) return 0;
      copyBytes(buf, off, entry.data, readAt, count);
      if (pos === null) entry.cursor += count;
      return count;
    },
    writeSync(fd, buf, off, len, pos) {
      const entry = openFiles.get(fd);
      if (!entry) {
        const err = new Error("EBADF: bad file descriptor, write");
        err.code = "EBADF";
        err.errno = -9;
        throw err;
      }
      let bytes2;
      if (typeof buf === "string") {
        bytes2 = encoder3.encode(buf);
        off = 0;
        len = bytes2.length;
      } else {
        bytes2 = buf;
        off = off ?? 0;
        len = len ?? bytes2.length - off;
      }
      const append = entry.mode.includes("a");
      const writeAt = append ? entry.data.length : pos !== null && pos !== void 0 ? pos : entry.cursor;
      const endAt = writeAt + len;
      extendFdData(entry, endAt);
      copyBytes(entry.data, writeAt, bytes2, off, len);
      if (append || pos === null || pos === void 0) entry.cursor = endAt;
      return len;
    },
    writevSync(fd, buffers, pos) {
      let totalWritten = 0;
      for (const buf of buffers) {
        const u8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
        const n = bridge.writeSync(fd, u8, 0, u8.length, pos != null ? pos + totalWritten : void 0);
        totalWritten += n;
      }
      return totalWritten;
    },
    ftruncateSync(fd, len = 0) {
      const entry = openFiles.get(fd);
      if (!entry) {
        const err = new Error(
          "EBADF: bad file descriptor, ftruncate"
        );
        err.code = "EBADF";
        err.errno = -9;
        throw err;
      }
      if (len < entry.data.length) {
        entry.data = entry.data.slice(0, len);
      } else if (len > entry.data.length) {
        const bigger = new Uint8Array(len);
        bigger.set(entry.data);
        entry.data = bigger;
      }
    },
    fsyncSync(fd) {
      const entry = openFiles.get(fd);
      if (!entry) {
        const err = new Error("EBADF: bad file descriptor, fsync");
        err.code = "EBADF";
        err.errno = -9;
        throw err;
      }
      persistWritableFd(fd);
    },
    fdatasyncSync(fd) {
      const entry = openFiles.get(fd);
      if (!entry) {
        const err = new Error("EBADF: bad file descriptor, fdatasync");
        err.code = "EBADF";
        err.errno = -9;
        throw err;
      }
      persistWritableFd(fd);
    },
    mkdtempSync(prefix) {
      const rand = Math.random().toString(36).substring(2, 8);
      const dirPath = abs(`${prefix}${rand}`);
      volume.mkdirSync(dirPath, { recursive: true });
      return dirPath;
    },
    rmSync(target, opts) {
      rmWithRetry(() => {
        const p = abs(target);
        if (!volume.existsSync(p)) {
          if (opts?.force) return;
          throw makeSystemError("ENOENT", "rm", p);
        }
        const st = volume.statSync(p);
        if (st.isDirectory()) {
          if (opts?.recursive) {
            volume.removeTreeSync(p);
          } else {
            throw makeSystemError("EISDIR", "rm", p);
          }
        } else {
          volume.unlinkSync(p);
        }
      }, opts);
    },
    watch(filename, optsOrCb, cb) {
      const p = abs(filename);
      const inner = volume.watch(
        p,
        optsOrCb,
        cb
      );
      const elHandle = getRegistry().register("FSWatcher");
      const origClose = inner.close?.bind(inner);
      if (origClose) {
        inner.close = () => {
          origClose();
          elHandle.close();
        };
      }
      inner.ref = () => {
        elHandle.ref();
        return inner;
      };
      inner.unref = () => {
        elHandle.unref();
        return inner;
      };
      return inner;
    },
    watchFile(filename, optsOrListener, listener) {
      const p = abs(filename);
      const opts = typeof optsOrListener === "function" ? void 0 : optsOrListener;
      const cb = typeof optsOrListener === "function" ? optsOrListener : listener;
      const interval = opts?.interval ?? 5007;
      let entry = watchFileMap.get(p);
      if (!entry) {
        const watcher = new StatWatcher();
        entry = {
          watcher,
          listeners: /* @__PURE__ */ new Set(),
          interval,
          prev: (() => {
            try {
              return volume.statSync(p);
            } catch {
              return void 0;
            }
          })()
        };
        watchFileMap.set(p, entry);
        watcher.start(p, opts?.persistent !== false, interval, () => {
          const e = watchFileMap.get(p);
          if (e) pollWatchFile(p, e);
        });
      }
      if (cb) {
        entry.listeners.add(cb);
        entry.watcher.on("change", cb);
      }
      return entry.watcher;
    },
    unwatchFile(filename, listener) {
      const p = abs(filename);
      const entry = watchFileMap.get(p);
      if (!entry) return;
      if (listener) {
        entry.listeners.delete(listener);
        entry.watcher.removeListener("change", listener);
      } else {
        entry.listeners.clear();
        entry.watcher.removeAllListeners("change");
      }
      if (entry.listeners.size === 0) {
        entry.watcher.stop();
        watchFileMap.delete(p);
      }
    },
    readFile(target, optsOrCb, cb) {
      const p = abs(target);
      let actualCb;
      let enc2;
      if (typeof optsOrCb === "function") {
        actualCb = optsOrCb;
      } else {
        actualCb = cb;
        if (typeof optsOrCb === "string") {
          enc2 = optsOrCb;
        } else if (optsOrCb && typeof optsOrCb === "object") {
          enc2 = optsOrCb.encoding ?? void 0;
        }
      }
      try {
        const raw = volume.readFileSync(p);
        const data = decodeBytes(raw, enc2);
        if (actualCb) deferCallback(() => actualCb(null, data));
      } catch (e) {
        if (actualCb) deferCallback(() => actualCb(e));
      }
    },
    writeFile(target, data, optsOrCb, maybeCb) {
      const cb = typeof optsOrCb === "function" ? optsOrCb : maybeCb;
      const opts = typeof optsOrCb === "object" && optsOrCb !== null ? optsOrCb : typeof optsOrCb === "string" ? { encoding: optsOrCb } : void 0;
      try {
        bridge.writeFileSync(target, data, opts);
        if (cb) deferCallback(() => cb(null));
      } catch (e) {
        if (cb) deferCallback(() => cb(e));
      }
    },
    stat(target, optsOrCb, maybeCb) {
      const cb = typeof optsOrCb === "function" ? optsOrCb : maybeCb;
      const opts = typeof optsOrCb === "object" && optsOrCb !== null ? optsOrCb : void 0;
      try {
        const st = runStat(() => volume.statSync(abs(target)), opts);
        if (cb) deferCallback(() => cb(null, st));
      } catch (e) {
        if (cb) deferCallback(() => cb(e));
      }
    },
    lstat(target, optsOrCb, maybeCb) {
      const cb = typeof optsOrCb === "function" ? optsOrCb : maybeCb;
      const opts = typeof optsOrCb === "object" && optsOrCb !== null ? optsOrCb : void 0;
      try {
        const st = runStat(() => volume.lstatSync(abs(target)), opts);
        if (cb) deferCallback(() => cb(null, st));
      } catch (e) {
        if (cb) deferCallback(() => cb(e));
      }
    },
    readdir(target, optsOrCb, cb) {
      const actualCb = typeof optsOrCb === "function" ? optsOrCb : cb;
      const opts = typeof optsOrCb === "function" ? void 0 : typeof optsOrCb === "string" ? { encoding: optsOrCb } : optsOrCb;
      const p = abs(target);
      try {
        const names = volume.readdirSync(p);
        const files = opts?.withFileTypes ? toDirents(p, names) : encodeReaddirNames(names, opts?.encoding);
        if (actualCb) deferCallback(() => actualCb(null, files));
      } catch (e) {
        if (actualCb) deferCallback(() => actualCb(e));
      }
    },
    mkdir(target, optsOrCb, cb) {
      const actualCb = typeof optsOrCb === "function" ? optsOrCb : cb;
      const opts = typeof optsOrCb === "object" ? optsOrCb : void 0;
      try {
        const created = volume.mkdirSync(abs(target), opts);
        if (actualCb) deferCallback(() => actualCb(null, created));
      } catch (e) {
        if (actualCb) deferCallback(() => actualCb(e));
      }
    },
    unlink(target, cb) {
      try {
        volume.unlinkSync(abs(target));
        if (cb) deferCallback(() => cb(null));
      } catch (e) {
        if (cb) deferCallback(() => cb(e));
      }
    },
    rmdir(target, optsOrCb, maybeCb) {
      const cb = typeof optsOrCb === "function" ? optsOrCb : maybeCb;
      try {
        volume.rmdirSync(abs(target));
        if (cb) deferCallback(() => cb(null));
      } catch (e) {
        if (cb) deferCallback(() => cb(e));
      }
    },
    rename(oldPath, newPath, cb) {
      try {
        volume.renameSync(abs(oldPath), abs(newPath));
        if (cb) deferCallback(() => cb(null));
      } catch (e) {
        if (cb) deferCallback(() => cb(e));
      }
    },
    realpath(target, optsOrCb, maybeCb) {
      const cb = typeof optsOrCb === "function" ? optsOrCb : maybeCb;
      volume.realpath(abs(target), cb);
    },
    access(target, modeOrCb, cb) {
      volume.access(abs(target), modeOrCb, cb);
    },
    appendFile(target, data, optsOrCb, maybeCb) {
      const cb = typeof optsOrCb === "function" ? optsOrCb : maybeCb;
      try {
        volume.appendFileSync(abs(target), data);
        if (cb) deferCallback(() => cb(null));
      } catch (e) {
        if (cb) deferCallback(() => cb(e));
      }
    },
    symlink(target, path, typeOrCb, cb) {
      const actualCb = typeof typeOrCb === "function" ? typeOrCb : cb;
      const type = typeof typeOrCb === "string" ? typeOrCb : void 0;
      try {
        volume.symlinkSync(symlinkTargetArg(target), abs(path), type);
        if (actualCb) deferCallback(() => actualCb(null));
      } catch (e) {
        if (actualCb) deferCallback(() => actualCb(e));
      }
    },
    readlink(target, optsOrCb, maybeCb) {
      const cb = typeof optsOrCb === "function" ? optsOrCb : maybeCb;
      try {
        const result = volume.readlinkSync(abs(target));
        if (cb) deferCallback(() => cb(null, result));
      } catch (e) {
        if (cb) deferCallback(() => cb(e));
      }
    },
    link(existingPath, newPath, cb) {
      try {
        volume.linkSync(abs(existingPath), abs(newPath));
        if (cb) deferCallback(() => cb(null));
      } catch (e) {
        if (cb) deferCallback(() => cb(e));
      }
    },
    chmod(target, mode, cb) {
      try {
        volume.chmodSync(abs(target), mode);
        if (cb) deferCallback(() => cb(null));
      } catch (e) {
        if (cb) deferCallback(() => cb(e));
      }
    },
    chown(target, uid, gid, cb) {
      try {
        volume.chownSync(abs(target), uid, gid);
        if (cb) deferCallback(() => cb(null));
      } catch (e) {
        if (cb) deferCallback(() => cb(e));
      }
    },
    lchown(target, uid, gid, cb) {
      try {
        volume.lchownSync(abs(target), uid, gid);
        if (cb) deferCallback(() => cb(null));
      } catch (error) {
        if (cb) deferCallback(() => cb(error));
      }
    },
    utimes(target, atime, mtime, cb) {
      try {
        volume.utimesSync(abs(target), atime, mtime);
        if (cb) deferCallback(() => cb(null));
      } catch (error) {
        if (cb) deferCallback(() => cb(error));
      }
    },
    lutimes(target, atime, mtime, cb) {
      try {
        volume.lutimesSync(abs(target), atime, mtime);
        if (cb) deferCallback(() => cb(null));
      } catch (error) {
        if (cb) deferCallback(() => cb(error));
      }
    },
    open(target, flagsOrCb, modeOrCb, cb) {
      let flags = "r";
      let mode;
      let callback;
      if (typeof flagsOrCb === "function") {
        callback = flagsOrCb;
      } else {
        flags = flagsOrCb;
        if (typeof modeOrCb === "function") {
          callback = modeOrCb;
        } else {
          mode = modeOrCb;
          callback = cb;
        }
      }
      try {
        const fd = bridge.openSync(abs(target), flags, mode);
        if (callback) deferCallback(() => callback(null, fd));
      } catch (e) {
        if (callback) deferCallback(() => callback(e));
      }
    },
    close(fd, cb) {
      try {
        bridge.closeSync(fd);
        if (cb) deferCallback(() => cb(null));
      } catch (e) {
        if (cb) deferCallback(() => cb(e));
      }
    },
    read(fd, bufOrOpts, offsetOrCb, length, position, cb) {
      let buf;
      let off;
      let len;
      let pos;
      let callback;
      if (typeof offsetOrCb === "function") {
        const opts = bufOrOpts;
        buf = opts.buffer;
        off = opts.offset ?? 0;
        len = opts.length ?? buf.length;
        pos = opts.position ?? null;
        callback = offsetOrCb;
      } else {
        buf = bufOrOpts;
        off = offsetOrCb ?? 0;
        len = length ?? buf.length;
        pos = position ?? null;
        callback = cb;
      }
      try {
        const n = bridge.readSync(fd, buf, off, len, pos);
        if (callback) deferCallback(() => callback(null, n, buf));
      } catch (e) {
        if (callback) deferCallback(() => callback(e, 0, buf));
      }
    },
    write(fd, buf, offsetOrCb, lengthOrEnc, positionOrCb, cb) {
      let callback;
      if (typeof offsetOrCb === "function") {
        callback = offsetOrCb;
        try {
          const n = bridge.writeSync(fd, buf);
          deferCallback(() => callback(null, n, buf));
        } catch (e) {
          deferCallback(() => callback(e, 0, buf));
        }
        return;
      }
      if (typeof positionOrCb === "function") {
        callback = positionOrCb;
      } else {
        callback = cb;
      }
      try {
        const off = typeof offsetOrCb === "number" ? offsetOrCb : void 0;
        const len = typeof lengthOrEnc === "number" ? lengthOrEnc : void 0;
        const pos = typeof positionOrCb === "number" ? positionOrCb : void 0;
        const n = bridge.writeSync(fd, buf, off, len, pos);
        if (callback) deferCallback(() => callback(null, n, buf));
      } catch (e) {
        if (callback) deferCallback(() => callback(e, 0, buf));
      }
    },
    writev(fd, buffers, positionOrCb, cb) {
      const callback = typeof positionOrCb === "function" ? positionOrCb : cb;
      const pos = typeof positionOrCb === "number" ? positionOrCb : null;
      try {
        let totalWritten = 0;
        for (const buf of buffers) {
          const u8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
          const n = bridge.writeSync(fd, u8, 0, u8.length, pos !== null ? pos + totalWritten : void 0);
          totalWritten += n;
        }
        if (callback) deferCallback(() => callback(null, totalWritten, buffers));
      } catch (e) {
        if (callback) deferCallback(() => callback(e, 0, buffers));
      }
    },
    fstat(fd, optsOrCb, maybeCb) {
      const cb = typeof optsOrCb === "function" ? optsOrCb : maybeCb;
      const opts = typeof optsOrCb === "object" && optsOrCb !== null ? optsOrCb : void 0;
      try {
        const st = bridge.fstatSync(fd, opts);
        if (cb) deferCallback(() => cb(null, st));
      } catch (e) {
        if (cb) deferCallback(() => cb(e));
      }
    },
    futimes(fd, atime, mtime, cb) {
      try {
        setFdTimes(fd, atime, mtime);
        if (cb) deferCallback(() => cb(null));
      } catch (error) {
        if (cb) deferCallback(() => cb(error));
      }
    },
    fchown(fd, uid, gid, cb) {
      try {
        bridge.fchownSync(fd, uid, gid);
        if (cb) deferCallback(() => cb(null));
      } catch (e) {
        if (cb) deferCallback(() => cb(e));
      }
    },
    fchmod(fd, mode, cb) {
      try {
        bridge.fchmodSync(fd, mode);
        if (cb) deferCallback(() => cb(null));
      } catch (e) {
        if (cb) deferCallback(() => cb(e));
      }
    },
    // function constructor, not class -- graceful-fs calls fs$ReadStream.apply(this, args)
    ReadStream: (() => {
      function FsReadStream(pathArg, opts) {
        if (!(this instanceof FsReadStream)) return new FsReadStream(pathArg, opts);
        const self2 = this;
        self2._queue = [];
        self2._active = false;
        self2._terminated = false;
        self2._endFired = false;
        self2._endEmitted = false;
        self2._objectMode = false;
        self2._reading = false;
        self2._highWaterMark = 16384;
        self2._autoDestroy = true;
        self2._encoding = null;
        self2._readableByteLength = 0;
        self2._draining = false;
        self2.readable = true;
        self2.readableEnded = false;
        self2.readableFlowing = null;
        self2.destroyed = false;
        self2.closed = false;
        self2.errored = null;
        self2.readableObjectMode = false;
        self2.readableHighWaterMark = 16384;
        self2.readableDidRead = false;
        self2.readableAborted = false;
        self2._readableState = {
          get objectMode() {
            return self2._objectMode;
          },
          get highWaterMark() {
            return self2._highWaterMark;
          },
          get ended() {
            return self2._terminated;
          },
          get endEmitted() {
            return self2._endEmitted;
          },
          set endEmitted(v) {
            self2._endEmitted = v;
          },
          get flowing() {
            return self2.readableFlowing;
          },
          set flowing(v) {
            self2.readableFlowing = v;
          },
          get reading() {
            return self2._reading;
          },
          get length() {
            return self2._queue ? self2._queue.length : 0;
          },
          get destroyed() {
            return self2.destroyed;
          },
          get errored() {
            return self2.errored;
          },
          get closed() {
            return self2.closed;
          },
          pipes: [],
          awaitDrainWriters: null,
          multiAwaitDrain: false,
          readableListening: false,
          resumeScheduled: false,
          paused: true,
          emitClose: true,
          get autoDestroy() {
            return self2._autoDestroy;
          },
          defaultEncoding: "utf8",
          needReadable: false,
          emittedReadable: false,
          readingMore: false,
          dataEmitted: false
        };
        self2.path = abs(pathArg);
        self2.fd = opts?.fd ?? null;
        self2.flags = opts?.flags ?? "r";
        self2.mode = opts?.mode ?? 438;
        self2.autoClose = opts?.autoClose !== false;
        self2._start = typeof opts?.start === "number" ? opts.start : 0;
        self2._end = typeof opts?.end === "number" ? opts.end : Infinity;
        self2._pos = self2._start;
        if (typeof opts?.highWaterMark === "number") {
          self2._highWaterMark = opts.highWaterMark;
          self2.readableHighWaterMark = opts.highWaterMark;
        }
        queueMicrotask(() => self2.open());
      }
      FsReadStream.prototype = Object.create(Readable.prototype);
      FsReadStream.prototype.constructor = FsReadStream;
      FsReadStream.prototype.open = function() {
        try {
          if (this.fd === null) {
            this.fd = bridge.openSync(this.path, this.flags, this.mode);
          }
          this.emit("open", this.fd);
          this.emit("ready");
        } catch (err) {
          this.destroy(err);
        }
      };
      FsReadStream.prototype._read = function(size2) {
        if (this.fd === null) return;
        try {
          const end4 = this._end;
          let pos = this._pos;
          if (pos > end4) {
            this.push(null);
            return;
          }
          const hwm = size2 || this._highWaterMark || 64 * 1024;
          const maxLen = end4 === Infinity ? hwm : Math.min(hwm, end4 - pos + 1);
          if (maxLen <= 0) {
            this.push(null);
            return;
          }
          const buf = Buffer2.alloc(maxLen);
          const n = bridge.readSync(this.fd, buf, 0, maxLen, pos);
          if (n <= 0) {
            this.push(null);
            return;
          }
          this._pos = pos + n;
          this.push(buf.subarray(0, n));
          if (this._pos > end4) this.push(null);
        } catch (err) {
          this.destroy(err);
        }
      };
      FsReadStream.prototype.close = function(cb) {
        if (this.fd !== null) {
          try {
            bridge.closeSync(this.fd);
          } catch {
          }
          this.fd = null;
        }
        this.destroy();
        if (cb) cb(null);
      };
      return FsReadStream;
    })(),
    // Function constructor: graceful-fs calls WriteStream.apply(this, args).
    WriteStream: (() => {
      function FsWriteStream(pathArg, opts) {
        if (!(this instanceof FsWriteStream)) return new FsWriteStream(pathArg, opts);
        const self2 = this;
        Writable.call(self2, { ...opts, autoDestroy: opts?.autoClose !== false });
        self2.path = abs(pathArg);
        self2.fd = opts?.fd ?? null;
        self2.flags = opts?.flags ?? "w";
        self2.mode = opts?.mode ?? 438;
        self2.autoClose = opts?.autoClose !== false;
        self2.bytesWritten = 0;
        if (opts?.start !== void 0) self2.pos = opts.start;
        queueMicrotask(() => {
          if (self2.destroyed) return;
          if (self2.fd === null) self2.open();
          else self2.emit("ready");
        });
      }
      FsWriteStream.prototype = Object.create(Writable.prototype);
      FsWriteStream.prototype.constructor = FsWriteStream;
      FsWriteStream.prototype.open = function() {
        try {
          this.fd = bridge.openSync(this.path, this.flags, this.mode);
          this.emit("open", this.fd);
          this.emit("ready");
        } catch (err) {
          this.destroy(err);
        }
      };
      FsWriteStream.prototype._write = function(chunk, encoding, cb) {
        if (this.fd === null) {
          this.once("open", () => this._write(chunk, encoding, cb));
          return;
        }
        let error = null;
        try {
          const bytes2 = typeof chunk === "string" ? normalizeWriteData(chunk, encoding) : chunk;
          const count = bridge.writeSync(this.fd, bytes2, 0, bytes2.length, this.pos ?? null);
          this.bytesWritten += count;
          if (this.pos !== void 0) this.pos += count;
        } catch (err) {
          error = err;
        }
        deferCallback(() => cb(error));
      };
      FsWriteStream.prototype._final = function(cb) {
        if (this.fd === null) {
          this.once("open", () => this._final(cb));
          return;
        }
        let error = null;
        try {
          if (this.autoClose) {
            bridge.closeSync(this.fd);
            this.fd = null;
          } else bridge.fsyncSync(this.fd);
        } catch (err) {
          error = err;
        }
        deferCallback(() => cb(error));
      };
      FsWriteStream.prototype._destroy = function(err, cb) {
        let error = err;
        try {
          if (this.fd !== null && this.autoClose) {
            bridge.closeSync(this.fd);
            this.fd = null;
          }
        } catch (closeError) {
          error ??= closeError;
        }
        cb(error);
      };
      FsWriteStream.prototype.end = function(chunkOrCb, encOrCb, cb) {
        if (typeof chunkOrCb === "function") cb = chunkOrCb;
        else {
          if (typeof encOrCb === "function") cb = encOrCb;
          if (chunkOrCb !== void 0) this.write(chunkOrCb, typeof encOrCb === "string" ? encOrCb : void 0);
        }
        while (this._corked > 0) this.uncork();
        return Writable.prototype.end.call(this, cb);
      };
      FsWriteStream.prototype.close = function(cb) {
        if (cb) {
          if (this.closed) queueMicrotask(cb);
          else this.once("close", cb);
        }
        this.autoClose = true;
        this._autoDestroy = true;
        if (!this.writableEnded) this.end();
        else if (this.writableFinished && !this.closed) this.destroy();
      };
      return FsWriteStream;
    })(),
    createReadStream(target, opts) {
      return new bridge.ReadStream(target, opts);
    },
    createWriteStream(target, opts) {
      return new bridge.WriteStream(target, opts);
    },
    opendirSync(target, _opts) {
      const p = abs(target);
      const names = volume.readdirSync(p);
      const entries = toDirents(p, names);
      return new Dir(p, entries);
    },
    opendir(target, optsOrCb, cb) {
      const callback = typeof optsOrCb === "function" ? optsOrCb : cb;
      try {
        const dir = bridge.opendirSync(target);
        if (callback) {
          queueMicrotask(() => callback(null, dir));
          return;
        }
        return Promise.resolve(dir);
      } catch (e) {
        if (callback) {
          queueMicrotask(() => callback(e));
          return;
        }
        return Promise.reject(e);
      }
    },
    exists(target, cb) {
      const result = volume.existsSync(abs(target));
      deferCallback(() => cb(result));
    },
    lchmodSync(target, mode) {
      volume.lchmodSync(abs(target), mode);
    },
    lchmod(target, mode, cb) {
      try {
        volume.lchmodSync(abs(target), mode);
        if (cb) deferCallback(() => cb(null));
      } catch (e) {
        if (cb) deferCallback(() => cb(e));
      }
    },
    fdatasync(fd, cb) {
      try {
        bridge.fdatasyncSync(fd);
        if (cb) deferCallback(() => cb(null));
      } catch (e) {
        if (cb) deferCallback(() => cb(e));
      }
    },
    fsync(fd, cb) {
      try {
        bridge.fsyncSync(fd);
        if (cb) deferCallback(() => cb(null));
      } catch (e) {
        if (cb) deferCallback(() => cb(e));
      }
    },
    ftruncate(fd, lenOrCb, cb) {
      const callback = typeof lenOrCb === "function" ? lenOrCb : cb;
      const len = typeof lenOrCb === "number" ? lenOrCb : 0;
      try {
        bridge.ftruncateSync(fd, len);
        if (callback) deferCallback(() => callback(null));
      } catch (e) {
        if (callback) deferCallback(() => callback(e));
      }
    },
    truncate(target, lenOrCb, cb) {
      const callback = typeof lenOrCb === "function" ? lenOrCb : cb;
      const len = typeof lenOrCb === "number" ? lenOrCb : 0;
      try {
        volume.truncateSync(abs(target), len);
        if (callback) deferCallback(() => callback(null));
      } catch (e) {
        if (callback) deferCallback(() => callback(e));
      }
    },
    mkdtemp(prefix, optsOrCb, cb) {
      const callback = typeof optsOrCb === "function" ? optsOrCb : cb;
      try {
        const result = bridge.mkdtempSync(prefix);
        if (callback) deferCallback(() => callback(null, result));
      } catch (e) {
        if (callback) deferCallback(() => callback(e));
      }
    },
    readvSync(fd, buffers, pos) {
      let totalRead = 0;
      for (const buf of buffers) {
        const u8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
        const n = bridge.readSync(
          fd,
          u8,
          0,
          u8.length,
          pos != null ? pos + totalRead : null
        );
        totalRead += n;
        if (n < u8.length) break;
      }
      return totalRead;
    },
    readv(fd, buffers, positionOrCb, cb) {
      const callback = typeof positionOrCb === "function" ? positionOrCb : cb;
      const pos = typeof positionOrCb === "number" ? positionOrCb : null;
      try {
        const n = bridge.readvSync(fd, buffers, pos);
        if (callback) deferCallback(() => callback(null, n, buffers));
      } catch (e) {
        if (callback) deferCallback(() => callback(e, 0, buffers));
      }
    },
    cpSync(src, dest, opts) {
      const srcPath = abs(src);
      const destPath = abs(dest);
      if (opts?.filter && !opts.filter(srcPath, destPath)) return;
      const dereference = opts?.dereference === true;
      const lst = dereference ? volume.statSync(srcPath) : volume.lstatSync(srcPath);
      if (lst.isSymbolicLink() && !dereference) {
        let target = volume.readlinkSync(srcPath);
        if (!opts?.verbatimSymlinks && !target.startsWith("/")) {
        }
        const parent = destPath.substring(0, destPath.lastIndexOf("/")) || "/";
        if (!volume.existsSync(parent)) volume.mkdirSync(parent, { recursive: true });
        if (volume.existsSync(destPath)) {
          if (opts?.errorOnExist) {
            const err = new Error(
              `EEXIST: file already exists, cp '${srcPath}' -> '${destPath}'`
            );
            err.code = "EEXIST";
            throw err;
          }
          if (opts?.force === false) return;
          try {
            volume.unlinkSync(destPath);
          } catch {
          }
        }
        volume.symlinkSync(target, destPath);
        if (opts?.preserveTimestamps) {
          volume.lutimesSync(destPath, lst.atime, lst.mtime);
        }
        return;
      }
      const st = dereference ? lst : volume.statSync(srcPath);
      if (st.isDirectory()) {
        if (!opts?.recursive) {
          const err = new Error(
            `EISDIR: illegal operation on a directory, cp '${srcPath}' -> '${destPath}'`
          );
          err.code = "EISDIR";
          throw err;
        }
        if (!volume.existsSync(destPath)) {
          volume.mkdirSync(destPath, { recursive: true });
        }
        const children = volume.readdirSync(srcPath);
        for (const child of children) {
          const childSrc = srcPath.endsWith("/") ? srcPath + child : srcPath + "/" + child;
          const childDest = destPath.endsWith("/") ? destPath + child : destPath + "/" + child;
          bridge.cpSync(childSrc, childDest, opts);
        }
        if (opts?.preserveTimestamps) {
          volume.utimesSync(destPath, st.atime, st.mtime);
        }
      } else {
        if (opts?.errorOnExist && volume.existsSync(destPath)) {
          const err = new Error(
            `EEXIST: file already exists, cp '${srcPath}' -> '${destPath}'`
          );
          err.code = "EEXIST";
          throw err;
        }
        if (opts?.force === false && volume.existsSync(destPath)) return;
        const parent = destPath.substring(0, destPath.lastIndexOf("/")) || "/";
        if (!volume.existsSync(parent)) {
          volume.mkdirSync(parent, { recursive: true });
        }
        volume.copyFileSync(srcPath, destPath, opts?.mode ?? 0);
        if (opts?.preserveTimestamps) {
          volume.utimesSync(destPath, st.atime, st.mtime);
        }
      }
    },
    cp(src, dest, optsOrCb, cb) {
      const callback = typeof optsOrCb === "function" ? optsOrCb : cb;
      const opts = typeof optsOrCb === "object" ? optsOrCb : void 0;
      try {
        bridge.cpSync(src, dest, opts);
        if (callback) deferCallback(() => callback(null));
      } catch (e) {
        if (callback) deferCallback(() => callback(e));
      }
    },
    statfsSync(_target, _opts) {
      return new StatFs();
    },
    statfs(target, optsOrCb, cb) {
      const callback = typeof optsOrCb === "function" ? optsOrCb : cb;
      const result = new StatFs();
      if (callback) deferCallback(() => callback(null, result));
    },
    globSync(pattern, opts) {
      return matchGlob(pattern, opts);
    },
    glob(pattern, optsOrCb, cb) {
      const callback = typeof optsOrCb === "function" ? optsOrCb : cb;
      const opts = typeof optsOrCb === "object" ? optsOrCb : void 0;
      try {
        const result = bridge.globSync(pattern, opts);
        if (callback) deferCallback(() => callback(null, result));
      } catch (e) {
        if (callback) deferCallback(() => callback(e));
      }
    },
    openAsBlob(target, _opts) {
      try {
        const p = abs(target);
        const data = volume.readFileSync(p);
        const type = _opts?.type || "";
        const copy = new Uint8Array(data).buffer;
        return Promise.resolve(new Blob([copy], { type }));
      } catch (e) {
        return Promise.reject(e);
      }
    },
    StatFs,
    StatWatcher,
    promises: promisesApi,
    constants: fsConst
  };
  Object.defineProperty(bridge, FS_PROXY_INTERNALS, {
    value: { readStoredBytes },
    enumerable: false
  });
  return bridge;
}

// runtime/worker.ts
var encoder4 = new TextEncoder();
var decoder4 = new TextDecoder();
function post(message2) {
  self.postMessage(message2);
}
post({ type: "loaded" });
var outCodes = [];
var ttscHost = {
  strLength: (s) => s.length,
  charCodeAt: (s, i) => s.charCodeAt(i),
  startOut: () => {
    outCodes = [];
  },
  pushCodeUnit: (code) => {
    outCodes.push(code);
  },
  finishOut: () => {
    let result = "";
    for (let i = 0; i < outCodes.length; i += 4096) {
      result += String.fromCharCode.apply(null, outCodes.slice(i, i + 4096));
    }
    outCodes = [];
    return result;
  }
};
var ttsc = null;
async function loadTtsc(bytes2) {
  const { instance } = await WebAssembly.instantiate(bytes2, {
    "./ttsc-host.js": ttscHost
  });
  ttsc = instance.exports.default;
}
async function boot2(message2) {
  if (message2.canvas) {
    globalThis.__tsCanvas = message2.canvas;
  }
  post({ type: "progress", step: "boot" });
  if (message2.ttsc) {
    await loadTtsc(message2.ttsc);
    post({ type: "progress", step: "ttsc-loaded" });
  }
  const volume = new MemoryVolume();
  post({ type: "progress", step: "volume" });
  const fs = buildFileSystemBridge(volume, () => "/");
  post({ type: "progress", step: "fs-built" });
  for (const file of message2.files ?? []) {
    const data = typeof file.data === "string" ? file.data : new Uint8Array(file.data);
    const slash = file.path.lastIndexOf("/");
    if (slash > 0) {
      try {
        fs.mkdirSync(file.path.slice(0, slash), { recursive: true });
      } catch {
      }
    }
    fs.writeFileSync(file.path, data);
  }
  post({
    type: "progress",
    step: "fs-ready",
    exists: fs.existsSync("/main.ts"),
    size: fs.existsSync("/main.ts") ? fs.readFileSync("/main.ts").length : -1
  });
  const traced = new Proxy(fs, {
    get(target, prop) {
      const value = target[prop];
      if (typeof value === "function") {
        return (...args) => {
          post({
            type: "fs",
            method: String(prop),
            args: args.slice(0, 2).map((a) => typeof a === "string" ? a : typeof a)
          });
          return value.apply(target, args);
        };
      }
      return value;
    }
  });
  const wasi = new WASI({
    version: "preview1",
    args: ["ts", ...message2.args],
    env: message2.env ?? {},
    preopens: { "/": "/" },
    returnOnExit: true,
    fs: traced
  });
  let instance = null;
  const exports = () => instance.exports;
  const memory = () => exports().memory;
  const bytes2 = (ptr, len) => new Uint8Array(memory().buffer, ptr, len);
  const readText = (ptr, len) => decoder4.decode(bytes2(ptr, len));
  const opfsHandles = /* @__PURE__ */ new Set();
  const externrefSlots = [];
  const host = {
    spawn: () => 1,
    log: (ptr, len) => {
      post({ type: "stderr", text: readText(ptr, len) });
    },
    transpile: (srcPtr, srcLen, langPtr, langLen, _modePtr, _modeLen, outPtr, outCap) => {
      if (!ttsc) return -2;
      const source = readText(srcPtr, srcLen);
      const lang = readText(langPtr, langLen);
      try {
        const encoded = encoder4.encode(ttsc(source, `module.${lang}`));
        if (encoded.length > outCap) return -2;
        bytes2(outPtr, encoded.length).set(encoded);
        return encoded.length;
      } catch (error) {
        const message3 = error instanceof Error ? error.message : String(error);
        const encoded = encoder4.encode(message3);
        if (encoded.length + 1 <= outCap) {
          bytes2(outPtr, encoded.length).set(encoded);
          bytes2(outPtr + encoded.length, 1)[0] = 0;
        }
        return -1;
      }
    },
    timer_wait: (ms) => new Promise((resolve) => setTimeout(resolve, Number(ms))),
    externref_set: (index, ref) => {
      externrefSlots[index] = ref;
    },
    externref_get: (index) => externrefSlots[index],
    externref_clear: (index) => {
      externrefSlots[index] = void 0;
    },
    opfs_open: (pathPtr, pathLen, wantsWrite, create, statusPtr) => {
      const path = readText(pathPtr, pathLen);
      const status = new Int32Array(memory().buffer, statusPtr, 1);
      try {
        if (create !== 0 && !fs.existsSync(path)) fs.writeFileSync(path, "");
        const handle = { path, read: 0, write: wantsWrite !== 0 };
        opfsHandles.add(handle);
        status[0] = 0;
        return handle;
      } catch {
        status[0] = 1;
        return null;
      }
    },
    opfs_close: (handle) => {
      opfsHandles.delete(handle);
    },
    opfs_read: (handle, ptr, amount, offset) => {
      try {
        const data = fs.readFileSync(handle.path);
        const start = Number(offset);
        const slice = data.subarray(start, start + Number(amount));
        bytes2(ptr, slice.length).set(slice);
        return slice.length;
      } catch {
        return -1;
      }
    },
    opfs_write: (handle, ptr, amount, offset) => {
      try {
        const data = new Uint8Array(
          fs.existsSync(handle.path) ? fs.readFileSync(handle.path) : []
        );
        const start = Number(offset);
        const chunk = bytes2(ptr, Number(amount));
        const end4 = start + chunk.length;
        if (end4 > data.length) {
          const grown = new Uint8Array(end4);
          grown.set(data);
          grown.set(chunk, start);
          fs.writeFileSync(handle.path, grown);
        } else {
          data.set(chunk, start);
          fs.writeFileSync(handle.path, data);
        }
        return chunk.length;
      } catch {
        return -1;
      }
    },
    opfs_truncate: (handle, size2) => {
      try {
        const data = new Uint8Array(
          fs.existsSync(handle.path) ? fs.readFileSync(handle.path) : []
        );
        const next = new Uint8Array(Number(size2));
        next.set(data.subarray(0, next.length));
        fs.writeFileSync(handle.path, next);
        return 0;
      } catch {
        return -1;
      }
    },
    opfs_size: (handle) => {
      try {
        return BigInt(fs.readFileSync(handle.path).length);
      } catch {
        return -1n;
      }
    },
    opfs_sync: () => 0,
    opfs_delete: (pathPtr, pathLen) => {
      try {
        fs.unlinkSync(readText(pathPtr, pathLen));
        return 0;
      } catch {
        return -1;
      }
    },
    opfs_access: (pathPtr, pathLen) => {
      try {
        fs.accessSync(readText(pathPtr, pathLen));
        return 0;
      } catch {
        return -1;
      }
    }
  };
  if (typeof WebAssembly.Suspending === "function") {
    host.timer_wait = new WebAssembly.Suspending(host.timer_wait);
  }
  const imports = {
    wasi_snapshot_preview1: wasi.wasiImport,
    qjs_host: host
  };
  post({ type: "progress", step: "instantiate" });
  const wasmInstance = await WebAssembly.instantiate(message2.wasm, imports);
  instance = wasmInstance.instance;
  post({ type: "progress", step: "instantiated" });
  wasi.finalizeBindings(instance);
  const forward = (kind) => (...args) => post({ type: kind, text: args.map(String).join(" ") + "\n" });
  const realConsole = globalThis.console;
  globalThis.console = {
    log: forward("stdout"),
    info: forward("stdout"),
    debug: forward("stdout"),
    error: forward("stderr"),
    warn: forward("stderr"),
    trace: forward("stderr")
  };
  void realConsole;
  post({ type: "progress", step: "starting" });
  try {
    let start = instance.exports._start;
    if (typeof WebAssembly.promising === "function") {
      start = WebAssembly.promising(start);
    }
    const code = await start();
    post({ type: "exit", code: typeof code === "number" ? code : 0 });
  } catch (error) {
    if (error instanceof ExitStatus) {
      post({ type: "exit", code: error.code });
      return;
    }
    post({
      type: "error",
      message: error instanceof Error ? error.stack ?? error.message : String(error)
    });
  }
}
self.onmessage = (event) => {
  const message2 = event.data;
  if (message2.type === "init") {
    boot2(message2).catch((error) => {
      post({
        type: "error",
        message: error instanceof Error ? error.stack ?? error.message : String(error)
      });
    });
  }
};
/*! Bundled license information:

@noble/hashes/esm/utils.js:
  (*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) *)
*/
