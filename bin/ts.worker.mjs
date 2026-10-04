// ../../wasi/wasi_defs.ts
var CLOCKID_REALTIME = 0;
var CLOCKID_MONOTONIC = 1;
var ERRNO_SUCCESS = 0;
var ERRNO_BADF = 8;
var ERRNO_EXIST = 20;
var ERRNO_INVAL = 28;
var ERRNO_ISDIR = 31;
var ERRNO_NAMETOOLONG = 37;
var ERRNO_NOENT = 44;
var ERRNO_NOSYS = 52;
var ERRNO_NOTDIR = 54;
var ERRNO_NOTEMPTY = 55;
var ERRNO_NOTSUP = 58;
var ERRNO_PERM = 63;
var ERRNO_NOTCAPABLE = 76;
var RIGHTS_FD_DATASYNC = 1 << 0;
var RIGHTS_FD_READ = 1 << 1;
var RIGHTS_FD_SEEK = 1 << 2;
var RIGHTS_FD_FDSTAT_SET_FLAGS = 1 << 3;
var RIGHTS_FD_SYNC = 1 << 4;
var RIGHTS_FD_TELL = 1 << 5;
var RIGHTS_FD_WRITE = 1 << 6;
var RIGHTS_FD_ADVISE = 1 << 7;
var RIGHTS_FD_ALLOCATE = 1 << 8;
var RIGHTS_PATH_CREATE_DIRECTORY = 1 << 9;
var RIGHTS_PATH_CREATE_FILE = 1 << 10;
var RIGHTS_PATH_LINK_SOURCE = 1 << 11;
var RIGHTS_PATH_LINK_TARGET = 1 << 12;
var RIGHTS_PATH_OPEN = 1 << 13;
var RIGHTS_FD_READDIR = 1 << 14;
var RIGHTS_PATH_READLINK = 1 << 15;
var RIGHTS_PATH_RENAME_SOURCE = 1 << 16;
var RIGHTS_PATH_RENAME_TARGET = 1 << 17;
var RIGHTS_PATH_FILESTAT_GET = 1 << 18;
var RIGHTS_PATH_FILESTAT_SET_SIZE = 1 << 19;
var RIGHTS_PATH_FILESTAT_SET_TIMES = 1 << 20;
var RIGHTS_FD_FILESTAT_GET = 1 << 21;
var RIGHTS_FD_FILESTAT_SET_SIZE = 1 << 22;
var RIGHTS_FD_FILESTAT_SET_TIMES = 1 << 23;
var RIGHTS_PATH_SYMLINK = 1 << 24;
var RIGHTS_PATH_REMOVE_DIRECTORY = 1 << 25;
var RIGHTS_PATH_UNLINK_FILE = 1 << 26;
var RIGHTS_POLL_FD_READWRITE = 1 << 27;
var RIGHTS_SOCK_SHUTDOWN = 1 << 28;
var Iovec = class _Iovec {
  //@ts-ignore strictPropertyInitialization
  buf;
  //@ts-ignore strictPropertyInitialization
  buf_len;
  static read_bytes(view, ptr) {
    const iovec = new _Iovec();
    iovec.buf = view.getUint32(ptr, true);
    iovec.buf_len = view.getUint32(ptr + 4, true);
    return iovec;
  }
  static read_bytes_array(view, ptr, len) {
    const iovecs = [];
    for (let i = 0; i < len; i++) {
      iovecs.push(_Iovec.read_bytes(view, ptr + 8 * i));
    }
    return iovecs;
  }
};
var Ciovec = class _Ciovec {
  //@ts-ignore strictPropertyInitialization
  buf;
  //@ts-ignore strictPropertyInitialization
  buf_len;
  static read_bytes(view, ptr) {
    const iovec = new _Ciovec();
    iovec.buf = view.getUint32(ptr, true);
    iovec.buf_len = view.getUint32(ptr + 4, true);
    return iovec;
  }
  static read_bytes_array(view, ptr, len) {
    const iovecs = [];
    for (let i = 0; i < len; i++) {
      iovecs.push(_Ciovec.read_bytes(view, ptr + 8 * i));
    }
    return iovecs;
  }
};
var WHENCE_SET = 0;
var WHENCE_CUR = 1;
var WHENCE_END = 2;
var FILETYPE_CHARACTER_DEVICE = 2;
var FILETYPE_DIRECTORY = 3;
var FILETYPE_REGULAR_FILE = 4;
var Dirent = class {
  d_next;
  d_ino;
  d_namlen;
  d_type;
  dir_name;
  constructor(next_cookie, d_ino, name, type) {
    const encoded_name = new TextEncoder().encode(name);
    this.d_next = next_cookie;
    this.d_ino = d_ino;
    this.d_namlen = encoded_name.byteLength;
    this.d_type = type;
    this.dir_name = encoded_name;
  }
  head_length() {
    return 24;
  }
  name_length() {
    return this.dir_name.byteLength;
  }
  write_head_bytes(view, ptr) {
    view.setBigUint64(ptr, this.d_next, true);
    view.setBigUint64(ptr + 8, this.d_ino, true);
    view.setUint32(ptr + 16, this.dir_name.length, true);
    view.setUint8(ptr + 20, this.d_type);
  }
  write_name_bytes(view8, ptr, buf_len) {
    view8.set(
      this.dir_name.slice(0, Math.min(this.dir_name.byteLength, buf_len)),
      ptr
    );
  }
};
var FDFLAGS_APPEND = 1 << 0;
var FDFLAGS_DSYNC = 1 << 1;
var FDFLAGS_NONBLOCK = 1 << 2;
var FDFLAGS_RSYNC = 1 << 3;
var FDFLAGS_SYNC = 1 << 4;
var Fdstat = class {
  fs_filetype;
  fs_flags;
  fs_rights_base = 0n;
  fs_rights_inherited = 0n;
  constructor(filetype, flags) {
    this.fs_filetype = filetype;
    this.fs_flags = flags;
  }
  write_bytes(view, ptr) {
    view.setUint8(ptr, this.fs_filetype);
    view.setUint16(ptr + 2, this.fs_flags, true);
    view.setBigUint64(ptr + 8, this.fs_rights_base, true);
    view.setBigUint64(ptr + 16, this.fs_rights_inherited, true);
  }
};
var FSTFLAGS_ATIM = 1 << 0;
var FSTFLAGS_ATIM_NOW = 1 << 1;
var FSTFLAGS_MTIM = 1 << 2;
var FSTFLAGS_MTIM_NOW = 1 << 3;
var OFLAGS_CREAT = 1 << 0;
var OFLAGS_DIRECTORY = 1 << 1;
var OFLAGS_EXCL = 1 << 2;
var OFLAGS_TRUNC = 1 << 3;
var Filestat = class {
  dev = 0n;
  ino;
  filetype;
  nlink = 0n;
  size;
  atim = 0n;
  mtim = 0n;
  ctim = 0n;
  constructor(ino, filetype, size) {
    this.ino = ino;
    this.filetype = filetype;
    this.size = size;
  }
  write_bytes(view, ptr) {
    view.setBigUint64(ptr, this.dev, true);
    view.setBigUint64(ptr + 8, this.ino, true);
    view.setUint8(ptr + 16, this.filetype);
    view.setBigUint64(ptr + 24, this.nlink, true);
    view.setBigUint64(ptr + 32, this.size, true);
    view.setBigUint64(ptr + 40, this.atim, true);
    view.setBigUint64(ptr + 48, this.mtim, true);
    view.setBigUint64(ptr + 56, this.ctim, true);
  }
};
var EVENTTYPE_CLOCK = 0;
var EVENTRWFLAGS_FD_READWRITE_HANGUP = 1 << 0;
var SUBCLOCKFLAGS_SUBSCRIPTION_CLOCK_ABSTIME = 1 << 0;
var Subscription = class _Subscription {
  userdata;
  eventtype;
  clockid;
  timeout;
  flags;
  constructor(userdata, eventtype, clockid, timeout, flags) {
    this.userdata = userdata;
    this.eventtype = eventtype;
    this.clockid = clockid;
    this.timeout = timeout;
    this.flags = flags;
  }
  static read_bytes(view, ptr) {
    return new _Subscription(
      view.getBigUint64(ptr, true),
      view.getUint8(ptr + 8),
      view.getUint32(ptr + 16, true),
      view.getBigUint64(ptr + 24, true),
      view.getUint16(ptr + 36, true)
    );
  }
};
var Event = class {
  userdata;
  error;
  eventtype;
  constructor(userdata, error, eventtype) {
    this.userdata = userdata;
    this.error = error;
    this.eventtype = eventtype;
  }
  write_bytes(view, ptr) {
    view.setBigUint64(ptr, this.userdata, true);
    view.setUint16(ptr + 8, this.error, true);
    view.setUint8(ptr + 10, this.eventtype);
  }
};
var RIFLAGS_RECV_PEEK = 1 << 0;
var RIFLAGS_RECV_WAITALL = 1 << 1;
var ROFLAGS_RECV_DATA_TRUNCATED = 1 << 0;
var SDFLAGS_RD = 1 << 0;
var SDFLAGS_WR = 1 << 1;
var PREOPENTYPE_DIR = 0;
var PrestatDir = class {
  pr_name;
  constructor(name) {
    this.pr_name = new TextEncoder().encode(name);
  }
  write_bytes(view, ptr) {
    view.setUint32(ptr, this.pr_name.byteLength, true);
  }
};
var Prestat = class _Prestat {
  //@ts-ignore strictPropertyInitialization
  tag;
  //@ts-ignore strictPropertyInitialization
  inner;
  static dir(name) {
    const prestat = new _Prestat();
    prestat.tag = PREOPENTYPE_DIR;
    prestat.inner = new PrestatDir(name);
    return prestat;
  }
  write_bytes(view, ptr) {
    view.setUint32(ptr, this.tag, true);
    this.inner.write_bytes(view, ptr + 4);
  }
};

// ../../wasi/fd.ts
var Fd = class {
  fd_allocate(offset, len) {
    return ERRNO_NOTSUP;
  }
  fd_close() {
    return 0;
  }
  fd_fdstat_get() {
    return { ret: ERRNO_NOTSUP, fdstat: null };
  }
  fd_fdstat_set_flags(flags) {
    return ERRNO_NOTSUP;
  }
  fd_fdstat_set_rights(fs_rights_base, fs_rights_inheriting) {
    return ERRNO_NOTSUP;
  }
  fd_filestat_get() {
    return { ret: ERRNO_NOTSUP, filestat: null };
  }
  fd_filestat_set_size(size) {
    return ERRNO_NOTSUP;
  }
  fd_filestat_set_times(atim, mtim, fst_flags) {
    return ERRNO_NOTSUP;
  }
  fd_pread(size, offset) {
    return { ret: ERRNO_NOTSUP, data: new Uint8Array() };
  }
  fd_prestat_get() {
    return { ret: ERRNO_NOTSUP, prestat: null };
  }
  fd_pwrite(data, offset) {
    return { ret: ERRNO_NOTSUP, nwritten: 0 };
  }
  fd_read(size) {
    return { ret: ERRNO_NOTSUP, data: new Uint8Array() };
  }
  fd_readdir_single(cookie) {
    return { ret: ERRNO_NOTSUP, dirent: null };
  }
  fd_seek(offset, whence) {
    return { ret: ERRNO_NOTSUP, offset: 0n };
  }
  fd_sync() {
    return 0;
  }
  fd_tell() {
    return { ret: ERRNO_NOTSUP, offset: 0n };
  }
  fd_write(data) {
    return { ret: ERRNO_NOTSUP, nwritten: 0 };
  }
  path_create_directory(path) {
    return ERRNO_NOTSUP;
  }
  path_filestat_get(flags, path) {
    return { ret: ERRNO_NOTSUP, filestat: null };
  }
  path_filestat_set_times(flags, path, atim, mtim, fst_flags) {
    return ERRNO_NOTSUP;
  }
  path_link(path, inode, allow_dir) {
    return ERRNO_NOTSUP;
  }
  path_unlink(path) {
    return { ret: ERRNO_NOTSUP, inode_obj: null };
  }
  path_lookup(path, dirflags) {
    return { ret: ERRNO_NOTSUP, inode_obj: null };
  }
  path_open(dirflags, path, oflags, fs_rights_base, fs_rights_inheriting, fd_flags) {
    return { ret: ERRNO_NOTDIR, fd_obj: null };
  }
  path_readlink(path) {
    return { ret: ERRNO_NOTSUP, data: null };
  }
  path_remove_directory(path) {
    return ERRNO_NOTSUP;
  }
  path_rename(old_path, new_fd, new_path) {
    return ERRNO_NOTSUP;
  }
  path_unlink_file(path) {
    return ERRNO_NOTSUP;
  }
};
var Inode = class _Inode {
  ino;
  constructor() {
    this.ino = _Inode.issue_ino();
  }
  // NOTE: ino 0 is reserved for the root directory
  static next_ino = 1n;
  static issue_ino() {
    return _Inode.next_ino++;
  }
  static root_ino() {
    return 0n;
  }
};

// ../../wasi/debug.ts
var Debug = class {
  prefix = "wasi:";
  log;
  isEnabled;
  constructor(isEnabled) {
    this.isEnabled = isEnabled;
    this.enable(isEnabled);
  }
  // Recreate the logger function with the new enabled state.
  enable(enabled) {
    this.log = createLogger(
      enabled === void 0 ? true : enabled,
      this.prefix
    );
  }
  // Getter for the private isEnabled property.
  get enabled() {
    return this.isEnabled;
  }
};
function createLogger(enabled, prefix) {
  if (enabled) {
    const a = console.log.bind(console, "%c%s", "color: #265BA0", prefix);
    return a;
  } else {
    return () => {
    };
  }
}
var debug = new Debug(false);

// ../../wasi/wasi_fns.ts
var WASIProcExit = class extends Error {
  code;
  constructor(code) {
    super("exit with exit code " + code);
    this.code = code;
  }
};
var WASI = class {
  #freeFds = [];
  args = [];
  env = [];
  fds = [];
  inst;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  wasiImport;
  /// Start a WASI command
  start(instance) {
    this.inst = instance;
    try {
      instance.exports._start();
      return 0;
    } catch (e) {
      if (e instanceof WASIProcExit) {
        return e.code;
      } else {
        throw e;
      }
    }
  }
  /// Initialize a WASI reactor
  initialize(instance) {
    this.inst = instance;
    if (instance.exports._initialize) {
      instance.exports._initialize();
    }
  }
  constructor(args, env, fds, options = {}) {
    debug.enable(options.debug);
    this.args = args;
    this.env = env;
    this.fds = fds;
    const self2 = this;
    this.wasiImport = {
      args_sizes_get(argc, argv_buf_size) {
        const buffer = new DataView(self2.inst.exports.memory.buffer);
        buffer.setUint32(argc, self2.args.length, true);
        let buf_size = 0;
        for (const arg of self2.args) {
          buf_size += arg.length + 1;
        }
        buffer.setUint32(argv_buf_size, buf_size, true);
        debug.log(
          buffer.getUint32(argc, true),
          buffer.getUint32(argv_buf_size, true)
        );
        return 0;
      },
      args_get(argv, argv_buf) {
        const buffer = new DataView(self2.inst.exports.memory.buffer);
        const buffer8 = new Uint8Array(self2.inst.exports.memory.buffer);
        const orig_argv_buf = argv_buf;
        for (let i = 0; i < self2.args.length; i++) {
          buffer.setUint32(argv, argv_buf, true);
          argv += 4;
          const arg = new TextEncoder().encode(self2.args[i]);
          buffer8.set(arg, argv_buf);
          buffer.setUint8(argv_buf + arg.length, 0);
          argv_buf += arg.length + 1;
        }
        if (debug.enabled) {
          debug.log(
            new TextDecoder("utf-8").decode(
              buffer8.slice(orig_argv_buf, argv_buf)
            )
          );
        }
        return 0;
      },
      environ_sizes_get(environ_count, environ_size) {
        const buffer = new DataView(self2.inst.exports.memory.buffer);
        buffer.setUint32(environ_count, self2.env.length, true);
        let buf_size = 0;
        for (const environ of self2.env) {
          buf_size += new TextEncoder().encode(environ).length + 1;
        }
        buffer.setUint32(environ_size, buf_size, true);
        debug.log(
          buffer.getUint32(environ_count, true),
          buffer.getUint32(environ_size, true)
        );
        return 0;
      },
      environ_get(environ, environ_buf) {
        const buffer = new DataView(self2.inst.exports.memory.buffer);
        const buffer8 = new Uint8Array(self2.inst.exports.memory.buffer);
        const orig_environ_buf = environ_buf;
        for (let i = 0; i < self2.env.length; i++) {
          buffer.setUint32(environ, environ_buf, true);
          environ += 4;
          const e = new TextEncoder().encode(self2.env[i]);
          buffer8.set(e, environ_buf);
          buffer.setUint8(environ_buf + e.length, 0);
          environ_buf += e.length + 1;
        }
        if (debug.enabled) {
          debug.log(
            new TextDecoder("utf-8").decode(
              buffer8.slice(orig_environ_buf, environ_buf)
            )
          );
        }
        return 0;
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      clock_res_get(id, res_ptr) {
        let resolutionValue;
        switch (id) {
          case CLOCKID_MONOTONIC: {
            resolutionValue = 5000n;
            break;
          }
          case CLOCKID_REALTIME: {
            resolutionValue = 1000000n;
            break;
          }
          default:
            return ERRNO_NOSYS;
        }
        const view = new DataView(self2.inst.exports.memory.buffer);
        view.setBigUint64(res_ptr, resolutionValue, true);
        return ERRNO_SUCCESS;
      },
      clock_time_get(id, precision, time) {
        const buffer = new DataView(self2.inst.exports.memory.buffer);
        if (id === CLOCKID_REALTIME) {
          buffer.setBigUint64(
            time,
            BigInt((/* @__PURE__ */ new Date()).getTime()) * 1000000n,
            true
          );
        } else if (id == CLOCKID_MONOTONIC) {
          let monotonic_time;
          try {
            monotonic_time = BigInt(Math.round(performance.now() * 1e6));
          } catch {
            monotonic_time = 0n;
          }
          buffer.setBigUint64(time, monotonic_time, true);
        } else {
          buffer.setBigUint64(time, 0n, true);
        }
        return 0;
      },
      fd_advise(fd, offset, len, advice) {
        if (self2.fds[fd] != void 0) {
          return ERRNO_SUCCESS;
        } else {
          return ERRNO_BADF;
        }
      },
      fd_allocate(fd, offset, len) {
        if (self2.fds[fd] != void 0) {
          return self2.fds[fd].fd_allocate(offset, len);
        } else {
          return ERRNO_BADF;
        }
      },
      fd_close(fd) {
        if (self2.fds[fd] != void 0) {
          const ret = self2.fds[fd].fd_close();
          self2.fds[fd] = void 0;
          self2.#freeFds.push(fd);
          return ret;
        } else {
          return ERRNO_BADF;
        }
      },
      fd_datasync(fd) {
        if (self2.fds[fd] != void 0) {
          return self2.fds[fd].fd_sync();
        } else {
          return ERRNO_BADF;
        }
      },
      fd_fdstat_get(fd, fdstat_ptr) {
        if (self2.fds[fd] != void 0) {
          const { ret, fdstat } = self2.fds[fd].fd_fdstat_get();
          if (fdstat != null) {
            fdstat.write_bytes(
              new DataView(self2.inst.exports.memory.buffer),
              fdstat_ptr
            );
          }
          return ret;
        } else {
          return ERRNO_BADF;
        }
      },
      fd_fdstat_set_flags(fd, flags) {
        if (self2.fds[fd] != void 0) {
          return self2.fds[fd].fd_fdstat_set_flags(flags);
        } else {
          return ERRNO_BADF;
        }
      },
      fd_fdstat_set_rights(fd, fs_rights_base, fs_rights_inheriting) {
        if (self2.fds[fd] != void 0) {
          return self2.fds[fd].fd_fdstat_set_rights(
            fs_rights_base,
            fs_rights_inheriting
          );
        } else {
          return ERRNO_BADF;
        }
      },
      fd_filestat_get(fd, filestat_ptr) {
        if (self2.fds[fd] != void 0) {
          const { ret, filestat } = self2.fds[fd].fd_filestat_get();
          if (filestat != null) {
            filestat.write_bytes(
              new DataView(self2.inst.exports.memory.buffer),
              filestat_ptr
            );
          }
          return ret;
        } else {
          return ERRNO_BADF;
        }
      },
      fd_filestat_set_size(fd, size) {
        if (self2.fds[fd] != void 0) {
          return self2.fds[fd].fd_filestat_set_size(size);
        } else {
          return ERRNO_BADF;
        }
      },
      fd_filestat_set_times(fd, atim, mtim, fst_flags) {
        if (self2.fds[fd] != void 0) {
          return self2.fds[fd].fd_filestat_set_times(atim, mtim, fst_flags);
        } else {
          return ERRNO_BADF;
        }
      },
      fd_pread(fd, iovs_ptr, iovs_len, offset, nread_ptr) {
        const buffer = new DataView(self2.inst.exports.memory.buffer);
        const buffer8 = new Uint8Array(self2.inst.exports.memory.buffer);
        if (self2.fds[fd] != void 0) {
          const iovecs = Iovec.read_bytes_array(
            buffer,
            iovs_ptr,
            iovs_len
          );
          let nread = 0;
          for (const iovec of iovecs) {
            const { ret, data } = self2.fds[fd].fd_pread(iovec.buf_len, offset);
            if (ret != ERRNO_SUCCESS) {
              buffer.setUint32(nread_ptr, nread, true);
              return ret;
            }
            buffer8.set(data, iovec.buf);
            nread += data.length;
            offset += BigInt(data.length);
            if (data.length != iovec.buf_len) {
              break;
            }
          }
          buffer.setUint32(nread_ptr, nread, true);
          return ERRNO_SUCCESS;
        } else {
          return ERRNO_BADF;
        }
      },
      fd_prestat_get(fd, buf_ptr) {
        const buffer = new DataView(self2.inst.exports.memory.buffer);
        if (self2.fds[fd] != void 0) {
          const { ret, prestat } = self2.fds[fd].fd_prestat_get();
          if (prestat != null) {
            prestat.write_bytes(buffer, buf_ptr);
          }
          return ret;
        } else {
          return ERRNO_BADF;
        }
      },
      fd_prestat_dir_name(fd, path_ptr, path_len) {
        if (self2.fds[fd] != void 0) {
          const { ret, prestat } = self2.fds[fd].fd_prestat_get();
          if (prestat == null) {
            return ret;
          }
          const prestat_dir_name = prestat.inner.pr_name;
          const buffer8 = new Uint8Array(self2.inst.exports.memory.buffer);
          buffer8.set(prestat_dir_name.slice(0, path_len), path_ptr);
          return prestat_dir_name.byteLength > path_len ? ERRNO_NAMETOOLONG : ERRNO_SUCCESS;
        } else {
          return ERRNO_BADF;
        }
      },
      fd_pwrite(fd, iovs_ptr, iovs_len, offset, nwritten_ptr) {
        const buffer = new DataView(self2.inst.exports.memory.buffer);
        const buffer8 = new Uint8Array(self2.inst.exports.memory.buffer);
        if (self2.fds[fd] != void 0) {
          const iovecs = Ciovec.read_bytes_array(
            buffer,
            iovs_ptr,
            iovs_len
          );
          let nwritten = 0;
          for (const iovec of iovecs) {
            const data = buffer8.slice(iovec.buf, iovec.buf + iovec.buf_len);
            const { ret, nwritten: nwritten_part } = self2.fds[fd].fd_pwrite(
              data,
              offset
            );
            if (ret != ERRNO_SUCCESS) {
              buffer.setUint32(nwritten_ptr, nwritten, true);
              return ret;
            }
            nwritten += nwritten_part;
            offset += BigInt(nwritten_part);
            if (nwritten_part != data.byteLength) {
              break;
            }
          }
          buffer.setUint32(nwritten_ptr, nwritten, true);
          return ERRNO_SUCCESS;
        } else {
          return ERRNO_BADF;
        }
      },
      fd_read(fd, iovs_ptr, iovs_len, nread_ptr) {
        const buffer = new DataView(self2.inst.exports.memory.buffer);
        const buffer8 = new Uint8Array(self2.inst.exports.memory.buffer);
        if (self2.fds[fd] != void 0) {
          const iovecs = Iovec.read_bytes_array(
            buffer,
            iovs_ptr,
            iovs_len
          );
          let nread = 0;
          for (const iovec of iovecs) {
            const { ret, data } = self2.fds[fd].fd_read(iovec.buf_len);
            if (ret != ERRNO_SUCCESS) {
              buffer.setUint32(nread_ptr, nread, true);
              return ret;
            }
            buffer8.set(data, iovec.buf);
            nread += data.length;
            if (data.length != iovec.buf_len) {
              break;
            }
          }
          buffer.setUint32(nread_ptr, nread, true);
          return ERRNO_SUCCESS;
        } else {
          return ERRNO_BADF;
        }
      },
      fd_readdir(fd, buf, buf_len, cookie, bufused_ptr) {
        const buffer = new DataView(self2.inst.exports.memory.buffer);
        const buffer8 = new Uint8Array(self2.inst.exports.memory.buffer);
        if (self2.fds[fd] != void 0) {
          let bufused = 0;
          while (true) {
            const { ret, dirent } = self2.fds[fd].fd_readdir_single(cookie);
            if (ret != 0) {
              buffer.setUint32(bufused_ptr, bufused, true);
              return ret;
            }
            if (dirent == null) {
              break;
            }
            if (buf_len - bufused < dirent.head_length()) {
              bufused = buf_len;
              break;
            }
            const head_bytes = new ArrayBuffer(dirent.head_length());
            dirent.write_head_bytes(new DataView(head_bytes), 0);
            buffer8.set(
              new Uint8Array(head_bytes).slice(
                0,
                Math.min(head_bytes.byteLength, buf_len - bufused)
              ),
              buf
            );
            buf += dirent.head_length();
            bufused += dirent.head_length();
            if (buf_len - bufused < dirent.name_length()) {
              bufused = buf_len;
              break;
            }
            dirent.write_name_bytes(buffer8, buf, buf_len - bufused);
            buf += dirent.name_length();
            bufused += dirent.name_length();
            cookie = dirent.d_next;
          }
          buffer.setUint32(bufused_ptr, bufused, true);
          return 0;
        } else {
          return ERRNO_BADF;
        }
      },
      fd_renumber(fd, to) {
        if (self2.fds[fd] != void 0 && self2.fds[to] != void 0) {
          const ret = self2.fds[to].fd_close();
          if (ret != 0) {
            return ret;
          }
          self2.fds[to] = self2.fds[fd];
          self2.fds[fd] = void 0;
          self2.#freeFds.push(fd);
          return 0;
        } else {
          return ERRNO_BADF;
        }
      },
      fd_seek(fd, offset, whence, offset_out_ptr) {
        const buffer = new DataView(self2.inst.exports.memory.buffer);
        if (self2.fds[fd] != void 0) {
          const { ret, offset: offset_out } = self2.fds[fd].fd_seek(
            offset,
            whence
          );
          buffer.setBigInt64(offset_out_ptr, offset_out, true);
          return ret;
        } else {
          return ERRNO_BADF;
        }
      },
      fd_sync(fd) {
        if (self2.fds[fd] != void 0) {
          return self2.fds[fd].fd_sync();
        } else {
          return ERRNO_BADF;
        }
      },
      fd_tell(fd, offset_ptr) {
        const buffer = new DataView(self2.inst.exports.memory.buffer);
        if (self2.fds[fd] != void 0) {
          const { ret, offset } = self2.fds[fd].fd_tell();
          buffer.setBigUint64(offset_ptr, offset, true);
          return ret;
        } else {
          return ERRNO_BADF;
        }
      },
      fd_write(fd, iovs_ptr, iovs_len, nwritten_ptr) {
        const buffer = new DataView(self2.inst.exports.memory.buffer);
        const buffer8 = new Uint8Array(self2.inst.exports.memory.buffer);
        if (self2.fds[fd] != void 0) {
          const iovecs = Ciovec.read_bytes_array(
            buffer,
            iovs_ptr,
            iovs_len
          );
          let nwritten = 0;
          for (const iovec of iovecs) {
            const data = buffer8.slice(iovec.buf, iovec.buf + iovec.buf_len);
            const { ret, nwritten: nwritten_part } = self2.fds[fd].fd_write(data);
            if (ret != ERRNO_SUCCESS) {
              buffer.setUint32(nwritten_ptr, nwritten, true);
              return ret;
            }
            nwritten += nwritten_part;
            if (nwritten_part != data.byteLength) {
              break;
            }
          }
          buffer.setUint32(nwritten_ptr, nwritten, true);
          return ERRNO_SUCCESS;
        } else {
          return ERRNO_BADF;
        }
      },
      path_create_directory(fd, path_ptr, path_len) {
        const buffer8 = new Uint8Array(self2.inst.exports.memory.buffer);
        if (self2.fds[fd] != void 0) {
          const path = new TextDecoder("utf-8").decode(
            buffer8.slice(path_ptr, path_ptr + path_len)
          );
          return self2.fds[fd].path_create_directory(path);
        } else {
          return ERRNO_BADF;
        }
      },
      path_filestat_get(fd, flags, path_ptr, path_len, filestat_ptr) {
        const buffer = new DataView(self2.inst.exports.memory.buffer);
        const buffer8 = new Uint8Array(self2.inst.exports.memory.buffer);
        if (self2.fds[fd] != void 0) {
          const path = new TextDecoder("utf-8").decode(
            buffer8.slice(path_ptr, path_ptr + path_len)
          );
          const { ret, filestat } = self2.fds[fd].path_filestat_get(flags, path);
          if (filestat != null) {
            filestat.write_bytes(buffer, filestat_ptr);
          }
          return ret;
        } else {
          return ERRNO_BADF;
        }
      },
      path_filestat_set_times(fd, flags, path_ptr, path_len, atim, mtim, fst_flags) {
        const buffer8 = new Uint8Array(self2.inst.exports.memory.buffer);
        if (self2.fds[fd] != void 0) {
          const path = new TextDecoder("utf-8").decode(
            buffer8.slice(path_ptr, path_ptr + path_len)
          );
          return self2.fds[fd].path_filestat_set_times(
            flags,
            path,
            atim,
            mtim,
            fst_flags
          );
        } else {
          return ERRNO_BADF;
        }
      },
      path_link(old_fd, old_flags, old_path_ptr, old_path_len, new_fd, new_path_ptr, new_path_len) {
        const buffer8 = new Uint8Array(self2.inst.exports.memory.buffer);
        if (self2.fds[old_fd] != void 0 && self2.fds[new_fd] != void 0) {
          const old_path = new TextDecoder("utf-8").decode(
            buffer8.slice(old_path_ptr, old_path_ptr + old_path_len)
          );
          const new_path = new TextDecoder("utf-8").decode(
            buffer8.slice(new_path_ptr, new_path_ptr + new_path_len)
          );
          const { ret, inode_obj } = self2.fds[old_fd].path_lookup(
            old_path,
            old_flags
          );
          if (inode_obj == null) {
            return ret;
          }
          return self2.fds[new_fd].path_link(new_path, inode_obj, false);
        } else {
          return ERRNO_BADF;
        }
      },
      path_open(fd, dirflags, path_ptr, path_len, oflags, fs_rights_base, fs_rights_inheriting, fd_flags, opened_fd_ptr) {
        const buffer = new DataView(self2.inst.exports.memory.buffer);
        const buffer8 = new Uint8Array(self2.inst.exports.memory.buffer);
        if (self2.fds[fd] != void 0) {
          const path = new TextDecoder("utf-8").decode(
            buffer8.slice(path_ptr, path_ptr + path_len)
          );
          debug.log(path);
          const { ret, fd_obj } = self2.fds[fd].path_open(
            dirflags,
            path,
            oflags,
            fs_rights_base,
            fs_rights_inheriting,
            fd_flags
          );
          if (ret != 0) {
            return ret;
          }
          const opened_fd = (() => {
            if (self2.#freeFds.length > 0) {
              const fd2 = self2.#freeFds.pop();
              self2.fds[fd2] = fd_obj;
              return fd2;
            }
            self2.fds.push(fd_obj);
            return self2.fds.length - 1;
          })();
          buffer.setUint32(opened_fd_ptr, opened_fd, true);
          return 0;
        } else {
          return ERRNO_BADF;
        }
      },
      path_readlink(fd, path_ptr, path_len, buf_ptr, buf_len, nread_ptr) {
        const buffer = new DataView(self2.inst.exports.memory.buffer);
        const buffer8 = new Uint8Array(self2.inst.exports.memory.buffer);
        if (self2.fds[fd] != void 0) {
          const path = new TextDecoder("utf-8").decode(
            buffer8.slice(path_ptr, path_ptr + path_len)
          );
          debug.log(path);
          const { ret, data } = self2.fds[fd].path_readlink(path);
          if (data != null) {
            const data_buf = new TextEncoder().encode(data);
            if (data_buf.length > buf_len) {
              buffer.setUint32(nread_ptr, 0, true);
              return ERRNO_BADF;
            }
            buffer8.set(data_buf, buf_ptr);
            buffer.setUint32(nread_ptr, data_buf.length, true);
          }
          return ret;
        } else {
          return ERRNO_BADF;
        }
      },
      path_remove_directory(fd, path_ptr, path_len) {
        const buffer8 = new Uint8Array(self2.inst.exports.memory.buffer);
        if (self2.fds[fd] != void 0) {
          const path = new TextDecoder("utf-8").decode(
            buffer8.slice(path_ptr, path_ptr + path_len)
          );
          return self2.fds[fd].path_remove_directory(path);
        } else {
          return ERRNO_BADF;
        }
      },
      path_rename(fd, old_path_ptr, old_path_len, new_fd, new_path_ptr, new_path_len) {
        const buffer8 = new Uint8Array(self2.inst.exports.memory.buffer);
        if (self2.fds[fd] != void 0 && self2.fds[new_fd] != void 0) {
          const old_path = new TextDecoder("utf-8").decode(
            buffer8.slice(old_path_ptr, old_path_ptr + old_path_len)
          );
          const new_path = new TextDecoder("utf-8").decode(
            buffer8.slice(new_path_ptr, new_path_ptr + new_path_len)
          );
          let { ret, inode_obj } = self2.fds[fd].path_unlink(old_path);
          if (inode_obj == null) {
            return ret;
          }
          ret = self2.fds[new_fd].path_link(new_path, inode_obj, true);
          if (ret != ERRNO_SUCCESS) {
            if (self2.fds[fd].path_link(old_path, inode_obj, true) != ERRNO_SUCCESS) {
              throw "path_link should always return success when relinking an inode back to the original place";
            }
          }
          return ret;
        } else {
          return ERRNO_BADF;
        }
      },
      path_symlink(old_path_ptr, old_path_len, fd, new_path_ptr, new_path_len) {
        const buffer8 = new Uint8Array(self2.inst.exports.memory.buffer);
        if (self2.fds[fd] != void 0) {
          const old_path = new TextDecoder("utf-8").decode(
            buffer8.slice(old_path_ptr, old_path_ptr + old_path_len)
          );
          const new_path = new TextDecoder("utf-8").decode(
            buffer8.slice(new_path_ptr, new_path_ptr + new_path_len)
          );
          return ERRNO_NOTSUP;
        } else {
          return ERRNO_BADF;
        }
      },
      path_unlink_file(fd, path_ptr, path_len) {
        const buffer8 = new Uint8Array(self2.inst.exports.memory.buffer);
        if (self2.fds[fd] != void 0) {
          const path = new TextDecoder("utf-8").decode(
            buffer8.slice(path_ptr, path_ptr + path_len)
          );
          return self2.fds[fd].path_unlink_file(path);
        } else {
          return ERRNO_BADF;
        }
      },
      poll_oneoff(in_ptr, out_ptr, nsubscriptions) {
        if (nsubscriptions === 0) {
          return ERRNO_INVAL;
        }
        if (nsubscriptions > 1) {
          debug.log("poll_oneoff: only a single subscription is supported");
          return ERRNO_NOTSUP;
        }
        const buffer = new DataView(self2.inst.exports.memory.buffer);
        const s = Subscription.read_bytes(buffer, in_ptr);
        const eventtype = s.eventtype;
        const clockid = s.clockid;
        const timeout = s.timeout;
        if (eventtype !== EVENTTYPE_CLOCK) {
          debug.log("poll_oneoff: only clock subscriptions are supported");
          return ERRNO_NOTSUP;
        }
        let getNow = void 0;
        if (clockid === CLOCKID_MONOTONIC) {
          getNow = () => BigInt(Math.round(performance.now() * 1e6));
        } else if (clockid === CLOCKID_REALTIME) {
          getNow = () => BigInt((/* @__PURE__ */ new Date()).getTime()) * 1000000n;
        } else {
          return ERRNO_INVAL;
        }
        const endTime = (s.flags & SUBCLOCKFLAGS_SUBSCRIPTION_CLOCK_ABSTIME) !== 0 ? timeout : getNow() + timeout;
        while (endTime > getNow()) {
        }
        const event = new Event(s.userdata, ERRNO_SUCCESS, eventtype);
        event.write_bytes(buffer, out_ptr);
        return ERRNO_SUCCESS;
      },
      proc_exit(exit_code) {
        throw new WASIProcExit(exit_code);
      },
      proc_raise(sig) {
        throw "raised signal " + sig;
      },
      sched_yield() {
      },
      random_get(buf, buf_len) {
        const buffer8 = new Uint8Array(
          self2.inst.exports.memory.buffer
        ).subarray(buf, buf + buf_len);
        const tmp = new Uint8Array(buf_len);
        for (let i = 0; i < buf_len + 65536; i += 65536) {
          crypto.getRandomValues(tmp.subarray(i, i + 65536));
        }
        buffer8.set(tmp, 0);
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      sock_recv(fd, ri_data, ri_flags) {
        throw "sockets not supported";
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      sock_send(fd, si_data, si_flags) {
        throw "sockets not supported";
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      sock_shutdown(fd, how) {
        throw "sockets not supported";
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      sock_accept(fd, flags) {
        throw "sockets not supported";
      }
    };
  }
};

// ../../wasi/fs_mem.ts
function dataResize(data, newDataSize) {
  if (data.byteLength === newDataSize) {
    return data;
  }
  if (data.buffer instanceof ArrayBuffer && data.buffer.resizable && newDataSize <= data.buffer.maxByteLength) {
    data.buffer.resize(newDataSize);
    return data;
  }
  if (data.byteLength > newDataSize) {
    const newBuffer2 = new ArrayBuffer(newDataSize, {
      maxByteLength: newDataSize
    });
    const newData2 = new Uint8Array(newBuffer2);
    newData2.set(new Uint8Array(data.buffer, 0, newDataSize));
    return newData2;
  }
  const newBuffer = new ArrayBuffer(newDataSize, {
    maxByteLength: Math.max(newDataSize, data.buffer.maxByteLength * 2)
  });
  const newData = new Uint8Array(newBuffer);
  newData.set(data);
  return newData;
}
var OpenFile = class extends Fd {
  file;
  file_pos = 0n;
  constructor(file) {
    super();
    this.file = file;
  }
  fd_allocate(offset, len) {
    if (this.file.size >= offset + len) {
    } else {
      this.file.data = dataResize(this.file.data, Number(offset + len));
    }
    return ERRNO_SUCCESS;
  }
  fd_close() {
    if (this.file.data.buffer instanceof ArrayBuffer && this.file.data.buffer.resizable) {
      this.file.data = new Uint8Array(this.file.data);
    }
    return ERRNO_SUCCESS;
  }
  fd_fdstat_get() {
    return { ret: 0, fdstat: new Fdstat(FILETYPE_REGULAR_FILE, 0) };
  }
  fd_filestat_set_size(size) {
    this.file.data = dataResize(this.file.data, Number(size));
    return ERRNO_SUCCESS;
  }
  fd_read(size) {
    const slice = this.file.data.slice(
      Number(this.file_pos),
      Number(this.file_pos + BigInt(size))
    );
    this.file_pos += BigInt(slice.length);
    return { ret: 0, data: slice };
  }
  fd_pread(size, offset) {
    const slice = this.file.data.slice(
      Number(offset),
      Number(offset + BigInt(size))
    );
    return { ret: 0, data: slice };
  }
  fd_seek(offset, whence) {
    let calculated_offset;
    switch (whence) {
      case WHENCE_SET:
        calculated_offset = offset;
        break;
      case WHENCE_CUR:
        calculated_offset = this.file_pos + offset;
        break;
      case WHENCE_END:
        calculated_offset = BigInt(this.file.data.byteLength) + offset;
        break;
      default:
        return { ret: ERRNO_INVAL, offset: 0n };
    }
    if (calculated_offset < 0) {
      return { ret: ERRNO_INVAL, offset: 0n };
    }
    this.file_pos = calculated_offset;
    return { ret: 0, offset: this.file_pos };
  }
  fd_tell() {
    return { ret: 0, offset: this.file_pos };
  }
  fd_write(data) {
    if (this.file.readonly) return { ret: ERRNO_BADF, nwritten: 0 };
    if (this.file_pos + BigInt(data.byteLength) > this.file.size) {
      this.file.data = dataResize(
        this.file.data,
        Number(this.file_pos + BigInt(data.byteLength))
      );
    }
    this.file.data.set(data, Number(this.file_pos));
    this.file_pos += BigInt(data.byteLength);
    return { ret: 0, nwritten: data.byteLength };
  }
  fd_pwrite(data, offset) {
    if (this.file.readonly) return { ret: ERRNO_BADF, nwritten: 0 };
    if (offset + BigInt(data.byteLength) > this.file.size) {
      this.file.data = dataResize(
        this.file.data,
        Number(offset + BigInt(data.byteLength))
      );
    }
    this.file.data.set(data, Number(offset));
    return { ret: 0, nwritten: data.byteLength };
  }
  fd_filestat_get() {
    return { ret: 0, filestat: this.file.stat() };
  }
};
var OpenDirectory = class extends Fd {
  dir;
  constructor(dir) {
    super();
    this.dir = dir;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  fd_seek(offset, whence) {
    return { ret: ERRNO_BADF, offset: 0n };
  }
  fd_tell() {
    return { ret: ERRNO_BADF, offset: 0n };
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  fd_allocate(offset, len) {
    return ERRNO_BADF;
  }
  fd_fdstat_get() {
    return { ret: 0, fdstat: new Fdstat(FILETYPE_DIRECTORY, 0) };
  }
  fd_readdir_single(cookie) {
    if (debug.enabled) {
      debug.log("readdir_single", cookie);
      debug.log(cookie, this.dir.contents.keys());
    }
    if (cookie == 0n) {
      return {
        ret: ERRNO_SUCCESS,
        dirent: new Dirent(1n, this.dir.ino, ".", FILETYPE_DIRECTORY)
      };
    } else if (cookie == 1n) {
      return {
        ret: ERRNO_SUCCESS,
        dirent: new Dirent(
          2n,
          this.dir.parent_ino(),
          "..",
          FILETYPE_DIRECTORY
        )
      };
    }
    if (cookie >= BigInt(this.dir.contents.size) + 2n) {
      return { ret: 0, dirent: null };
    }
    const [name, entry] = Array.from(this.dir.contents.entries())[Number(cookie - 2n)];
    return {
      ret: 0,
      dirent: new Dirent(
        cookie + 1n,
        entry.ino,
        name,
        entry.stat().filetype
      )
    };
  }
  path_filestat_get(flags, path_str) {
    const { ret: path_err, path } = Path.from(path_str);
    if (path == null) {
      return { ret: path_err, filestat: null };
    }
    const { ret, entry } = this.dir.get_entry_for_path(path);
    if (entry == null) {
      return { ret, filestat: null };
    }
    return { ret: 0, filestat: entry.stat() };
  }
  path_lookup(path_str, dirflags) {
    const { ret: path_ret, path } = Path.from(path_str);
    if (path == null) {
      return { ret: path_ret, inode_obj: null };
    }
    const { ret, entry } = this.dir.get_entry_for_path(path);
    if (entry == null) {
      return { ret, inode_obj: null };
    }
    return { ret: ERRNO_SUCCESS, inode_obj: entry };
  }
  path_open(dirflags, path_str, oflags, fs_rights_base, fs_rights_inheriting, fd_flags) {
    const { ret: path_ret, path } = Path.from(path_str);
    if (path == null) {
      return { ret: path_ret, fd_obj: null };
    }
    let { ret, entry } = this.dir.get_entry_for_path(path);
    if (entry == null) {
      if (ret != ERRNO_NOENT) {
        return { ret, fd_obj: null };
      }
      if ((oflags & OFLAGS_CREAT) == OFLAGS_CREAT) {
        const { ret: ret2, entry: new_entry } = this.dir.create_entry_for_path(
          path_str,
          (oflags & OFLAGS_DIRECTORY) == OFLAGS_DIRECTORY
        );
        if (new_entry == null) {
          return { ret: ret2, fd_obj: null };
        }
        entry = new_entry;
      } else {
        return { ret: ERRNO_NOENT, fd_obj: null };
      }
    } else if ((oflags & OFLAGS_EXCL) == OFLAGS_EXCL) {
      return { ret: ERRNO_EXIST, fd_obj: null };
    }
    if ((oflags & OFLAGS_DIRECTORY) == OFLAGS_DIRECTORY && entry.stat().filetype !== FILETYPE_DIRECTORY) {
      return { ret: ERRNO_NOTDIR, fd_obj: null };
    }
    return entry.path_open(oflags, fs_rights_base, fd_flags);
  }
  path_create_directory(path) {
    return this.path_open(
      0,
      path,
      OFLAGS_CREAT | OFLAGS_DIRECTORY,
      0n,
      0n,
      0
    ).ret;
  }
  path_link(path_str, inode, allow_dir) {
    const { ret: path_ret, path } = Path.from(path_str);
    if (path == null) {
      return path_ret;
    }
    if (path.is_dir) {
      return ERRNO_NOENT;
    }
    const {
      ret: parent_ret,
      parent_entry,
      filename,
      entry
    } = this.dir.get_parent_dir_and_entry_for_path(path, true);
    if (parent_entry == null || filename == null) {
      return parent_ret;
    }
    if (entry != null) {
      const source_is_dir = inode.stat().filetype == FILETYPE_DIRECTORY;
      const target_is_dir = entry.stat().filetype == FILETYPE_DIRECTORY;
      if (source_is_dir && target_is_dir) {
        if (allow_dir && entry instanceof Directory) {
          if (entry.contents.size == 0) {
          } else {
            return ERRNO_NOTEMPTY;
          }
        } else {
          return ERRNO_EXIST;
        }
      } else if (source_is_dir && !target_is_dir) {
        return ERRNO_NOTDIR;
      } else if (!source_is_dir && target_is_dir) {
        return ERRNO_ISDIR;
      } else if (inode.stat().filetype == FILETYPE_REGULAR_FILE && entry.stat().filetype == FILETYPE_REGULAR_FILE) {
      } else {
        return ERRNO_EXIST;
      }
    }
    if (!allow_dir && inode.stat().filetype == FILETYPE_DIRECTORY) {
      return ERRNO_PERM;
    }
    if (inode instanceof Directory) {
      inode.parent = parent_entry;
    }
    parent_entry.contents.set(filename, inode);
    return ERRNO_SUCCESS;
  }
  path_unlink(path_str) {
    const { ret: path_ret, path } = Path.from(path_str);
    if (path == null) {
      return { ret: path_ret, inode_obj: null };
    }
    const {
      ret: parent_ret,
      parent_entry,
      filename,
      entry
    } = this.dir.get_parent_dir_and_entry_for_path(path, true);
    if (parent_entry == null || filename == null) {
      return { ret: parent_ret, inode_obj: null };
    }
    if (entry == null) {
      return { ret: ERRNO_NOENT, inode_obj: null };
    }
    parent_entry.contents.delete(filename);
    return { ret: ERRNO_SUCCESS, inode_obj: entry };
  }
  path_unlink_file(path_str) {
    const { ret: path_ret, path } = Path.from(path_str);
    if (path == null) {
      return path_ret;
    }
    const {
      ret: parent_ret,
      parent_entry,
      filename,
      entry
    } = this.dir.get_parent_dir_and_entry_for_path(path, false);
    if (parent_entry == null || filename == null || entry == null) {
      return parent_ret;
    }
    if (entry.stat().filetype === FILETYPE_DIRECTORY) {
      return ERRNO_ISDIR;
    }
    parent_entry.contents.delete(filename);
    return ERRNO_SUCCESS;
  }
  path_remove_directory(path_str) {
    const { ret: path_ret, path } = Path.from(path_str);
    if (path == null) {
      return path_ret;
    }
    const {
      ret: parent_ret,
      parent_entry,
      filename,
      entry
    } = this.dir.get_parent_dir_and_entry_for_path(path, false);
    if (parent_entry == null || filename == null || entry == null) {
      return parent_ret;
    }
    if (!(entry instanceof Directory) || entry.stat().filetype !== FILETYPE_DIRECTORY) {
      return ERRNO_NOTDIR;
    }
    if (entry.contents.size !== 0) {
      return ERRNO_NOTEMPTY;
    }
    if (!parent_entry.contents.delete(filename)) {
      return ERRNO_NOENT;
    }
    return ERRNO_SUCCESS;
  }
  fd_filestat_get() {
    return { ret: 0, filestat: this.dir.stat() };
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  fd_filestat_set_size(size) {
    return ERRNO_BADF;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  fd_read(size) {
    return { ret: ERRNO_BADF, data: new Uint8Array() };
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  fd_pread(size, offset) {
    return { ret: ERRNO_BADF, data: new Uint8Array() };
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  fd_write(data) {
    return { ret: ERRNO_BADF, nwritten: 0 };
  }
  fd_pwrite(data, offset) {
    return { ret: ERRNO_BADF, nwritten: 0 };
  }
};
var PreopenDirectory = class extends OpenDirectory {
  prestat_name;
  constructor(name, contents) {
    super(new Directory(contents));
    this.prestat_name = name;
  }
  fd_prestat_get() {
    return {
      ret: 0,
      prestat: Prestat.dir(this.prestat_name)
    };
  }
};
var File = class extends Inode {
  data;
  readonly;
  constructor(data, options) {
    super();
    this.data = new Uint8Array(data);
    this.readonly = !!options?.readonly;
  }
  path_open(oflags, fs_rights_base, fd_flags) {
    if (this.readonly && (fs_rights_base & BigInt(RIGHTS_FD_WRITE)) == BigInt(RIGHTS_FD_WRITE)) {
      return { ret: ERRNO_PERM, fd_obj: null };
    }
    if ((oflags & OFLAGS_TRUNC) == OFLAGS_TRUNC) {
      if (this.readonly) return { ret: ERRNO_PERM, fd_obj: null };
      this.data = new Uint8Array([]);
    }
    const file = new OpenFile(this);
    if (fd_flags & FDFLAGS_APPEND) file.fd_seek(0n, WHENCE_END);
    return { ret: ERRNO_SUCCESS, fd_obj: file };
  }
  get size() {
    return BigInt(this.data.byteLength);
  }
  stat() {
    return new Filestat(this.ino, FILETYPE_REGULAR_FILE, this.size);
  }
};
var Path = class _Path {
  parts = [];
  is_dir = false;
  static from(path) {
    const self2 = new _Path();
    self2.is_dir = path.endsWith("/");
    if (path.startsWith("/")) {
      return { ret: ERRNO_NOTCAPABLE, path: null };
    }
    if (path.includes("\0")) {
      return { ret: ERRNO_INVAL, path: null };
    }
    for (const component of path.split("/")) {
      if (component === "" || component === ".") {
        continue;
      }
      if (component === "..") {
        if (self2.parts.pop() == void 0) {
          return { ret: ERRNO_NOTCAPABLE, path: null };
        }
        continue;
      }
      self2.parts.push(component);
    }
    return { ret: ERRNO_SUCCESS, path: self2 };
  }
  to_path_string() {
    let s = this.parts.join("/");
    if (this.is_dir) {
      s += "/";
    }
    return s;
  }
};
var Directory = class _Directory extends Inode {
  contents;
  parent = null;
  constructor(contents) {
    super();
    if (contents instanceof Array) {
      this.contents = new Map(contents);
    } else {
      this.contents = contents;
    }
    for (const entry of this.contents.values()) {
      if (entry instanceof _Directory) {
        entry.parent = this;
      }
    }
  }
  parent_ino() {
    if (this.parent == null) {
      return Inode.root_ino();
    }
    return this.parent.ino;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  path_open(oflags, fs_rights_base, fd_flags) {
    return { ret: ERRNO_SUCCESS, fd_obj: new OpenDirectory(this) };
  }
  stat() {
    return new Filestat(this.ino, FILETYPE_DIRECTORY, 0n);
  }
  get_entry_for_path(path) {
    let entry = this;
    for (const component of path.parts) {
      if (!(entry instanceof _Directory)) {
        return { ret: ERRNO_NOTDIR, entry: null };
      }
      const child = entry.contents.get(component);
      if (child !== void 0) {
        entry = child;
      } else {
        debug.log(component);
        return { ret: ERRNO_NOENT, entry: null };
      }
    }
    if (path.is_dir) {
      if (entry.stat().filetype != FILETYPE_DIRECTORY) {
        return { ret: ERRNO_NOTDIR, entry: null };
      }
    }
    return { ret: ERRNO_SUCCESS, entry };
  }
  get_parent_dir_and_entry_for_path(path, allow_undefined) {
    const filename = path.parts.pop();
    if (filename === void 0) {
      return {
        ret: ERRNO_INVAL,
        parent_entry: null,
        filename: null,
        entry: null
      };
    }
    const { ret: entry_ret, entry: parent_entry } = this.get_entry_for_path(path);
    if (parent_entry == null) {
      return {
        ret: entry_ret,
        parent_entry: null,
        filename: null,
        entry: null
      };
    }
    if (!(parent_entry instanceof _Directory)) {
      return {
        ret: ERRNO_NOTDIR,
        parent_entry: null,
        filename: null,
        entry: null
      };
    }
    const entry = parent_entry.contents.get(filename);
    if (entry === void 0) {
      if (!allow_undefined) {
        return {
          ret: ERRNO_NOENT,
          parent_entry: null,
          filename: null,
          entry: null
        };
      } else {
        return { ret: ERRNO_SUCCESS, parent_entry, filename, entry: null };
      }
    }
    if (path.is_dir) {
      if (entry.stat().filetype != FILETYPE_DIRECTORY) {
        return {
          ret: ERRNO_NOTDIR,
          parent_entry: null,
          filename: null,
          entry: null
        };
      }
    }
    return { ret: ERRNO_SUCCESS, parent_entry, filename, entry };
  }
  create_entry_for_path(path_str, is_dir) {
    const { ret: path_ret, path } = Path.from(path_str);
    if (path == null) {
      return { ret: path_ret, entry: null };
    }
    let {
      // eslint-disable-next-line prefer-const
      ret: parent_ret,
      // eslint-disable-next-line prefer-const
      parent_entry,
      // eslint-disable-next-line prefer-const
      filename,
      entry
    } = this.get_parent_dir_and_entry_for_path(path, true);
    if (parent_entry == null || filename == null) {
      return { ret: parent_ret, entry: null };
    }
    if (entry != null) {
      return { ret: ERRNO_EXIST, entry: null };
    }
    debug.log("create", path);
    let new_child;
    if (!is_dir) {
      new_child = new File(new ArrayBuffer(0));
    } else {
      new_child = new _Directory(/* @__PURE__ */ new Map());
      new_child.parent = parent_entry;
    }
    parent_entry.contents.set(filename, new_child);
    entry = new_child;
    return { ret: ERRNO_SUCCESS, entry };
  }
};
var ConsoleStdout = class _ConsoleStdout extends Fd {
  ino;
  write;
  constructor(write) {
    super();
    this.ino = Inode.issue_ino();
    this.write = write;
  }
  fd_filestat_get() {
    const filestat = new Filestat(
      this.ino,
      FILETYPE_CHARACTER_DEVICE,
      BigInt(0)
    );
    return { ret: 0, filestat };
  }
  fd_fdstat_get() {
    const fdstat = new Fdstat(FILETYPE_CHARACTER_DEVICE, 0);
    fdstat.fs_rights_base = BigInt(RIGHTS_FD_WRITE);
    return { ret: 0, fdstat };
  }
  fd_write(data) {
    this.write(data);
    return { ret: 0, nwritten: data.byteLength };
  }
  static lineBuffered(write) {
    const dec = new TextDecoder("utf-8", { fatal: false });
    let line_buf = "";
    return new _ConsoleStdout((buffer) => {
      line_buf += dec.decode(buffer, { stream: true });
      const lines = line_buf.split("\n");
      for (const [i, line] of lines.entries()) {
        if (i < lines.length - 1) {
          write(line);
        } else {
          line_buf = line;
        }
      }
    });
  }
};

// runtime/opfs.ts
var OpfsStore = class _OpfsStore {
  root;
  fileName;
  handles = /* @__PURE__ */ new Map();
  constructor(root, fileName) {
    this.root = root;
    this.fileName = fileName;
  }
  /** Opens (creating when needed) the single OPFS file the VFS is based on. */
  static async open(fileName) {
    if (typeof navigator === "undefined" || !navigator.storage?.getDirectory) {
      throw new Error("OPFS is not available in this context");
    }
    const store = new _OpfsStore(await navigator.storage.getDirectory(), fileName);
    await store.get(fileName);
    return store;
  }
  /** Returns a synchronous access handle for `path`, creating it on demand. */
  async get(path) {
    const existing = this.handles.get(path);
    if (existing) return existing;
    try {
      const name = path.replace(/^\/+/, "") || this.fileName;
      const fileHandle = await this.root.getFileHandle(name, { create: true });
      const handle = await fileHandle.createSyncAccessHandle();
      this.handles.set(path, handle);
      return handle;
    } catch (error) {
      console.error("[ts] OPFS open failed", path, error);
      return null;
    }
  }
  size(path) {
    return this.handles.get(path)?.getSize() ?? -1;
  }
  sync(path) {
    const handle = this.handles.get(path);
    if (!handle) return -1;
    handle.flush();
    return 0;
  }
  close() {
    for (const handle of this.handles.values()) {
      try {
        handle.close();
      } catch {
      }
    }
    this.handles.clear();
  }
};

// runtime/worker.ts
var encoder = new TextEncoder();
var decoder = new TextDecoder();
function post(message) {
  self.postMessage(message);
}
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
async function loadTtsc(bytes) {
  const { instance } = await WebAssembly.instantiate(bytes, {
    "./ttsc-host.js": ttscHost
  });
  ttsc = instance.exports.default;
}
function seedFiles(files) {
  const root = /* @__PURE__ */ new Map();
  for (const file of files ?? []) {
    const data = typeof file.data === "string" ? encoder.encode(file.data) : new Uint8Array(file.data);
    const parts = file.path.split("/").filter(Boolean);
    let dir = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const name = parts[i];
      const existing = dir.get(name);
      if (existing instanceof Directory) {
        dir = existing.contents;
      } else {
        const next = /* @__PURE__ */ new Map();
        dir.set(name, new Directory(next));
        dir = next;
      }
    }
    if (parts.length > 0) {
      dir.set(parts[parts.length - 1], new File(data));
    }
  }
  return root;
}
async function boot(message) {
  if (message.canvas) {
    globalThis.__tsCanvas = message.canvas;
    post({ type: "canvas", width: message.canvas.width, height: message.canvas.height });
  }
  let opfs = null;
  let singleHandle = null;
  if (message.opfs) {
    try {
      opfs = await OpfsStore.open(message.opfs.file);
      singleHandle = await opfs.get(opfs.fileName);
      post({
        type: "vfs",
        backend: "opfs-sync-access-handle",
        file: message.opfs.file,
        size: singleHandle?.getSize() ?? 0
      });
    } catch (error) {
      post({
        type: "vfs",
        backend: "memory",
        file: message.opfs.file,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  if (message.ttsc) {
    await loadTtsc(message.ttsc);
  }
  const stdout = ConsoleStdout.lineBuffered(
    (line) => post({ type: "stdout", text: line + "\n" })
  );
  const stderr = ConsoleStdout.lineBuffered(
    (line) => post({ type: "stderr", text: line + "\n" })
  );
  const bundle = (path) => path.startsWith("/bundle/") || path === "/bundle" ? path : "/bundle/" + path.replace(/^\/+/, "");
  const files = (message.files ?? []).map((file) => ({
    path: bundle(file.path),
    data: file.data
  }));
  const wasi = new WASI(
    ["ts", ...message.args.map(bundle)],
    Object.entries(message.env ?? {}).map(([key, value]) => `${key}=${value}`),
    [
      new OpenFile(new File([])),
      stdout,
      stderr,
      new PreopenDirectory(
        "/bundle",
        seedFiles(
          files.map((file) => ({
            ...file,
            path: file.path.replace(/^\/bundle\//, "")
          }))
        )
      )
    ]
  );
  let instance = null;
  const exports = () => instance.exports;
  const memory = () => exports().memory;
  const bytes = (ptr, len) => new Uint8Array(memory().buffer, ptr, len);
  const readText = (ptr, len) => decoder.decode(bytes(ptr, len));
  const opfsHandles = /* @__PURE__ */ new Map();
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
        const encoded = encoder.encode(ttsc(source, `module.${lang}`));
        if (encoded.length > outCap) return -2;
        bytes(outPtr, encoded.length).set(encoded);
        return encoded.length;
      } catch (error) {
        const message2 = error instanceof Error ? error.message : String(error);
        const encoded = encoder.encode(message2);
        if (encoded.length + 1 <= outCap) {
          bytes(outPtr, encoded.length).set(encoded);
          bytes(outPtr + encoded.length, 1)[0] = 0;
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
    // The guest sees a single database file. In OPFS mode every requested
    // path is the one SyncAccessHandle opened during boot; without OPFS the
    // calls fall back to an in-memory buffer.
    opfs_open: (pathPtr, pathLen, _wantsWrite, create, statusPtr) => {
      const path = readText(pathPtr, pathLen);
      const status = new Int32Array(memory().buffer, statusPtr, 1);
      if (singleHandle) {
        status[0] = 0;
        return { path, handle: singleHandle };
      }
      if (!opfsHandles.has(path) && create !== 0) {
        opfsHandles.set(path, new Uint8Array(0));
      }
      if (!opfsHandles.has(path)) {
        status[0] = 1;
        return null;
      }
      status[0] = 0;
      return { path, memory: true };
    },
    opfs_close: () => {
    },
    opfs_read: (handle, ptr, amount, offset) => {
      if (handle.handle) {
        return handle.handle.read(bytes(ptr, Number(amount)), Number(offset));
      }
      const data = opfsHandles.get(handle.path);
      if (!data) return -1;
      const slice = data.subarray(Number(offset), Number(offset) + Number(amount));
      bytes(ptr, slice.length).set(slice);
      return slice.length;
    },
    opfs_write: (handle, ptr, amount, offset) => {
      if (handle.handle) {
        return handle.handle.write(bytes(ptr, Number(amount)), Number(offset));
      }
      const data = opfsHandles.get(handle.path) ?? new Uint8Array(0);
      const chunk = bytes(ptr, Number(amount));
      const end = Number(offset) + chunk.length;
      const next = new Uint8Array(Math.max(end, data.length));
      next.set(data);
      next.set(chunk, Number(offset));
      opfsHandles.set(handle.path, next);
      return chunk.length;
    },
    opfs_truncate: (handle, size) => {
      if (handle.handle) {
        handle.handle.truncate(Number(size));
        return 0;
      }
      const data = opfsHandles.get(handle.path) ?? new Uint8Array(0);
      const next = new Uint8Array(Number(size));
      next.set(data.subarray(0, next.length));
      opfsHandles.set(handle.path, next);
      return 0;
    },
    opfs_size: (handle) => {
      if (handle.handle) return BigInt(handle.handle.getSize());
      return BigInt((opfsHandles.get(handle.path) ?? new Uint8Array(0)).length);
    },
    opfs_sync: (handle) => {
      if (handle?.handle) {
        handle.handle.flush();
        return 0;
      }
      return 0;
    },
    opfs_delete: () => 0,
    opfs_access: (pathPtr, pathLen) => {
      if (singleHandle) return 0;
      return opfsHandles.has(readText(pathPtr, pathLen)) ? 0 : -1;
    }
  };
  if (typeof WebAssembly.Suspending === "function") {
    host.timer_wait = new WebAssembly.Suspending(host.timer_wait);
  }
  const wasmInstance = await WebAssembly.instantiate(message.wasm, {
    wasi_snapshot_preview1: wasi.wasiImport,
    qjs_host: host
  });
  instance = wasmInstance.instance;
  wasi.initialize(instance);
  try {
    let start = instance.exports._start;
    if (typeof WebAssembly.promising === "function") {
      start = WebAssembly.promising(start);
    }
    const code = await start();
    post({ type: "exit", code: typeof code === "number" ? code : 0 });
  } catch (error) {
    if (error instanceof WASIProcExit) {
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
  const message = event.data;
  if (message.type === "init") {
    boot(message).catch((error) => {
      post({
        type: "error",
        message: error instanceof Error ? error.stack ?? error.message : String(error)
      });
    });
  }
};
