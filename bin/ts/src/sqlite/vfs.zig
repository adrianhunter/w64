//! SQLite virtual filesystems for the qjs wasm runtime.
//!
//! Two VFSes are registered:
//!
//!   "mem"   pure in-guest memory files (used for `:memory:`, temp files,
//!           journals and unit tests)
//!   "opfs"  the main database and its `-wal` file are stored through a host
//!           provided origin-private filesystem (OPFS). The host can serve
//!           those operations synchronously (a real
//!           `FileSystemSyncAccessHandle` opened with `readwrite-unsafe`) or
//!           asynchronously via JSPI when only async APIs exist (Node).
//!
//! WAL shared memory (`xShmMap`/`xShmLock`/…) is always heap-backed inside
//! the guest. Combined with `SQLITE_THREADSAFE=0` and
//! `PRAGMA locking_mode=EXCLUSIVE`, that gives single-process WAL without
//! any `-shm` file round-trips.

const std = @import("std");
const builtin = @import("builtin");
const c = @import("c.zig").c;

pub const SQLITE_OK = c.SQLITE_OK;
pub const SQLITE_ERROR = c.SQLITE_ERROR;
pub const SQLITE_IOERR = c.SQLITE_IOERR;
pub const SQLITE_CANTOPEN = c.SQLITE_CANTOPEN;
pub const SQLITE_NOTFOUND = c.SQLITE_NOTFOUND;
pub const SQLITE_IOERR_SHORT_READ = c.SQLITE_IOERR_SHORT_READ;
pub const SQLITE_IOERR_READ = c.SQLITE_IOERR_READ;
pub const SQLITE_IOERR_WRITE = c.SQLITE_IOERR_WRITE;

const allocator: std.mem.Allocator = if (builtin.os.tag == .wasi)
    std.heap.wasm_allocator
else
    std.heap.page_allocator;

/// A host value kept alive in the externref table (an OPFS file handle).
pub const ExternRef = *addrspace(.externref) anyopaque;



/// Host operations for files that live outside the guest (OPFS).
///
/// Handles are externrefs so the host owns the underlying object and the
/// guest only keeps a table slot. All calls may suspend the wasm stack via
/// JSPI when the host only has asynchronous filesystem APIs.
pub const HostOps = extern struct {
    open: *const fn (
        path: [*]const u8,
        path_len: usize,
        wants_write: c_int,
        create: c_int,
        status: *c_int,
    ) callconv(.c) ExternRef,
    close: *const fn (ref: ExternRef) callconv(.c) void,
    read: *const fn (
        ref: ExternRef,
        buf: [*]u8,
        amount: c_int,
        offset: i64,
    ) callconv(.c) c_int,
    write: *const fn (
        ref: ExternRef,
        buf: [*]const u8,
        amount: c_int,
        offset: i64,
    ) callconv(.c) c_int,
    truncate: *const fn (ref: ExternRef, size: i64) callconv(.c) c_int,
    size: *const fn (ref: ExternRef) callconv(.c) i64,
    sync: *const fn (ref: ExternRef, flags: c_int) callconv(.c) c_int,
    /// Store/load table slots. The actual table lives on the host so the
    /// guest contains no `table.set`/`table.get` instructions.
    ref_set: *const fn (index: c_int, ref: ExternRef) callconv(.c) void,
    ref_get: *const fn (index: c_int) callconv(.c) ExternRef,
    ref_clear: *const fn (index: c_int) callconv(.c) void,
    delete: *const fn (
        path: [*]const u8,
        path_len: usize,
    ) callconv(.c) c_int,
    access: *const fn (
        path: [*]const u8,
        path_len: usize,
        flags: c_int,
    ) callconv(.c) c_int,
};

var host_ops: ?*const HostOps = null;

pub fn setHostOps(ops: ?*const HostOps) void {
    host_ops = ops;
}

pub fn hostAvailable() bool {
    return host_ops != null;
}

const Kind = enum(c_int) { mem, opfs };

const max_slots = 64;
var slot_used: [max_slots]bool = @splat(false);

fn allocSlot() ?c_int {
    for (&slot_used, 0..) |*used, i| {
        if (!used.*) {
            used.* = true;
            return @intCast(i);
        }
    }
    return null;
}

fn freeSlot(slot: c_int) void {
    if (slot >= 0 and slot < max_slots) slot_used[@intCast(slot)] = false;
}

const File = extern struct {
    base: c.sqlite3_file,
    kind: Kind = .mem,
    slot: c_int = -1,
    data: ?[*]u8 = null,
    len: usize = 0,
    cap: usize = 0,
    readonly: bool = false,
    shm: ?[*]u8 = null,
    shm_bytes: usize = 0,
    shm_pgsz: c_int = 0,
};

fn fromFile(file: [*c]c.sqlite3_file) ?*File {
    if (file == null) return null;
    return @ptrCast(@alignCast(file));
}

// ---------------------------------------------------------------------------
// Memory file helpers
// ---------------------------------------------------------------------------

fn memResize(file: *File, size: usize) c_int {
    if (size <= file.cap) {
        file.len = size;
        return SQLITE_OK;
    }
    var new_cap = if (file.cap == 0) 4096 else file.cap;
    while (new_cap < size) new_cap *= 2;
    if (file.data) |d| {
        const fresh = allocator.realloc(d[0..file.cap], new_cap) catch
            return SQLITE_IOERR;
        @memset(fresh[file.cap..new_cap], 0);
        file.data = fresh.ptr;
    } else {
        const fresh = allocator.alloc(u8, new_cap) catch return SQLITE_IOERR;
        @memset(fresh, 0);
        file.data = fresh.ptr;
    }
    file.cap = new_cap;
    file.len = size;
    return SQLITE_OK;
}

fn memFree(file: *File) void {
    if (file.data) |d| {
        allocator.free(d[0..file.cap]);
        file.data = null;
    }
    if (file.shm) |s| {
        allocator.free(s[0..file.shm_bytes]);
        file.shm = null;
    }
    file.cap = 0;
    file.len = 0;
}

// ---------------------------------------------------------------------------
// io methods
// ---------------------------------------------------------------------------

fn close(file: [*c]c.sqlite3_file) callconv(.c) c_int {
    const f = fromFile(file) orelse return SQLITE_OK;
    switch (f.kind) {
        .mem => memFree(f),
        .opfs => {
            if (host_ops) |ops| {
                if (f.slot >= 0) {
                    ops.close(ops.ref_get(f.slot));
                    ops.ref_clear(f.slot);
                    freeSlot(f.slot);
                    f.slot = -1;
                }
            }
            if (f.shm) |s| {
                allocator.free(s[0..f.shm_bytes]);
                f.shm = null;
            }
        },
    }
    return SQLITE_OK;
}

fn read(
    file: [*c]c.sqlite3_file,
    buf: ?*anyopaque,
    amount: c_int,
    offset: c.sqlite3_int64,
) callconv(.c) c_int {
    const f = fromFile(file) orelse return SQLITE_IOERR_READ;
    const dst: [*]u8 = @ptrCast(buf orelse return SQLITE_IOERR_READ);
    const want: usize = @intCast(@max(amount, 0));
    var got: usize = 0;

    switch (f.kind) {
        .mem => {
            const off: usize = @intCast(@max(offset, 0));
            if (off < f.len and f.data != null) {
                const available = @min(want, f.len - off);
                @memcpy(dst[0..available], f.data.?[off..][0..available]);
                got = available;
            }
        },
        .opfs => {
            const ops = host_ops orelse return SQLITE_IOERR_READ;
            if (f.slot < 0) return SQLITE_IOERR_READ;
            const n = ops.read(
                ops.ref_get(f.slot),
                dst,
                @intCast(want),
                offset,
            );
            if (n < 0) return SQLITE_IOERR_READ;
            got = @intCast(n);
        },
    }

    if (got < want) {
        @memset(dst[got..want], 0);
        return SQLITE_IOERR_SHORT_READ;
    }
    return SQLITE_OK;
}

fn write(
    file: [*c]c.sqlite3_file,
    buf: ?*const anyopaque,
    amount: c_int,
    offset: c.sqlite3_int64,
) callconv(.c) c_int {
    const f = fromFile(file) orelse return SQLITE_IOERR_WRITE;
    const src: [*]const u8 = @ptrCast(buf orelse return SQLITE_IOERR_WRITE);
    const want: usize = @intCast(@max(amount, 0));

    switch (f.kind) {
        .mem => {
            const off: usize = @intCast(@max(offset, 0));
            if (memResize(f, off + want) != SQLITE_OK) return SQLITE_IOERR_WRITE;
            @memcpy(f.data.?[off..][0..want], src[0..want]);
        },
        .opfs => {
            const ops = host_ops orelse return SQLITE_IOERR_WRITE;
            if (f.slot < 0) return SQLITE_IOERR_WRITE;
            const n = ops.write(
                ops.ref_get(f.slot),
                src,
                @intCast(want),
                offset,
            );
            if (n < 0 or @as(usize, @intCast(n)) != want) return SQLITE_IOERR_WRITE;
        },
    }
    return SQLITE_OK;
}

fn truncate(file: [*c]c.sqlite3_file, size: c.sqlite3_int64) callconv(.c) c_int {
    const f = fromFile(file) orelse return SQLITE_IOERR;
    const new_size: usize = @intCast(@max(size, 0));
    switch (f.kind) {
        .mem => {
            if (new_size > f.len) {
                if (memResize(f, new_size) != SQLITE_OK) return SQLITE_IOERR;
            } else {
                f.len = new_size;
            }
        },
        .opfs => {
            const ops = host_ops orelse return SQLITE_IOERR;
            if (ops.truncate(ops.ref_get(f.slot), size) != 0) {
                return SQLITE_IOERR;
            }
        },
    }
    return SQLITE_OK;
}

fn sync(file: [*c]c.sqlite3_file, flags: c_int) callconv(.c) c_int {
    const f = fromFile(file) orelse return SQLITE_OK;
    if (f.kind == .opfs) {
        if (host_ops) |ops| {
            if (f.slot >= 0) {
                _ = ops.sync(ops.ref_get(f.slot), flags);
            }
        }
    }
    return SQLITE_OK;
}

fn fileSize(
    file: [*c]c.sqlite3_file,
    p_size: [*c]c.sqlite3_int64,
) callconv(.c) c_int {
    const f = fromFile(file) orelse return SQLITE_IOERR;
    if (p_size == null) return SQLITE_IOERR;
    p_size.* = switch (f.kind) {
        .mem => @intCast(f.len),
        .opfs => blk: {
            const ops = host_ops orelse return SQLITE_IOERR;
            const s = ops.size(ops.ref_get(f.slot));
            if (s < 0) return SQLITE_IOERR;
            break :blk s;
        },
    };
    return SQLITE_OK;
}

fn lock(_: [*c]c.sqlite3_file, _: c_int) callconv(.c) c_int {
    return SQLITE_OK;
}

fn unlock(_: [*c]c.sqlite3_file, _: c_int) callconv(.c) c_int {
    return SQLITE_OK;
}

fn checkReservedLock(
    _: [*c]c.sqlite3_file,
    p_res: [*c]c_int,
) callconv(.c) c_int {
    if (p_res != null) p_res.* = 0;
    return SQLITE_OK;
}

fn fileControl(
    _: [*c]c.sqlite3_file,
    _: c_int,
    _: ?*anyopaque,
) callconv(.c) c_int {
    return SQLITE_NOTFOUND;
}

fn sectorSize(_: [*c]c.sqlite3_file) callconv(.c) c_int {
    return 4096;
}

fn deviceCharacteristics(_: [*c]c.sqlite3_file) callconv(.c) c_int {
    return 0;
}

fn shmMap(
    file: [*c]c.sqlite3_file,
    page: c_int,
    page_size: c_int,
    _: c_int,
    out: [*c]?*volatile anyopaque,
) callconv(.c) c_int {
    const f = fromFile(file) orelse return SQLITE_IOERR;
    if (out == null) return SQLITE_IOERR;
    const needed: usize = @intCast((page + 1) * page_size);
    if (needed > f.shm_bytes) {
        if (f.shm) |s| {
            const fresh = allocator.realloc(s[0..f.shm_bytes], needed) catch
                return SQLITE_IOERR;
            @memset(fresh[f.shm_bytes..needed], 0);
            f.shm = fresh.ptr;
        } else {
            const fresh = allocator.alloc(u8, needed) catch return SQLITE_IOERR;
            @memset(fresh, 0);
            f.shm = fresh.ptr;
        }
        f.shm_bytes = needed;
    }
    f.shm_pgsz = page_size;
    out.* = @ptrCast(f.shm);
    return SQLITE_OK;
}

fn shmLock(
    _: [*c]c.sqlite3_file,
    _: c_int,
    _: c_int,
    _: c_int,
) callconv(.c) c_int {
    return SQLITE_OK;
}

fn shmBarrier(_: [*c]c.sqlite3_file) callconv(.c) void {}

fn shmUnmap(file: [*c]c.sqlite3_file, _: c_int) callconv(.c) c_int {
    const f = fromFile(file) orelse return SQLITE_OK;
    if (f.shm) |s| {
        allocator.free(s[0..f.shm_bytes]);
        f.shm = null;
        f.shm_bytes = 0;
    }
    return SQLITE_OK;
}

const io_methods: c.sqlite3_io_methods = .{
    .iVersion = 2,
    .xClose = close,
    .xRead = read,
    .xWrite = write,
    .xTruncate = truncate,
    .xSync = sync,
    .xFileSize = fileSize,
    .xLock = lock,
    .xUnlock = unlock,
    .xCheckReservedLock = checkReservedLock,
    .xFileControl = fileControl,
    .xSectorSize = sectorSize,
    .xDeviceCharacteristics = deviceCharacteristics,
    .xShmMap = shmMap,
    .xShmLock = shmLock,
    .xShmBarrier = shmBarrier,
    .xShmUnmap = shmUnmap,
    .xFetch = null,
    .xUnfetch = null,
};

// ---------------------------------------------------------------------------
// vfs
// ---------------------------------------------------------------------------

fn isMemoryName(name: [*c]const u8) bool {
    if (name == null) return true;
    const slice = std.mem.span(@as([*:0]const u8, @ptrCast(name)));
    return std.mem.eql(u8, slice, ":memory:");
}

fn vfsOpen(
    _: [*c]c.sqlite3_vfs,
    name: [*c]const u8,
    file: [*c]c.sqlite3_file,
    flags: c_int,
    out_flags: [*c]c_int,
) callconv(.c) c_int {
    const f = fromFile(file) orelse return SQLITE_CANTOPEN;
    const is_main = (flags & c.SQLITE_OPEN_MAIN_DB) != 0;
    const is_wal = (flags & c.SQLITE_OPEN_WAL) != 0;
    const is_temp = (flags & (c.SQLITE_OPEN_TEMP_DB |
        c.SQLITE_OPEN_TEMP_JOURNAL |
        c.SQLITE_OPEN_TRANSIENT_DB |
        c.SQLITE_OPEN_SUBJOURNAL |
        c.SQLITE_OPEN_SUPER_JOURNAL)) != 0;
    const memory = (flags & c.SQLITE_OPEN_MEMORY) != 0 or isMemoryName(name);

    const wants_write = (flags & (c.SQLITE_OPEN_READWRITE |
        c.SQLITE_OPEN_CREATE)) != 0;
    const create = (flags & c.SQLITE_OPEN_CREATE) != 0;

    var use_opfs = false;
    if (host_ops != null and !is_temp and !memory and (is_main or is_wal)) {
        use_opfs = true;
    }

    f.* = .{
        .base = .{ .pMethods = &io_methods },
        .kind = if (use_opfs) .opfs else .mem,
        .readonly = !wants_write,
    };

    if (use_opfs) {
        const ops = host_ops.?;
        const path = std.mem.span(@as([*:0]const u8, @ptrCast(name)));
        var status: c_int = 1;
        const ref = ops.open(
            path.ptr,
            path.len,
            @intFromBool(wants_write),
            @intFromBool(create),
            &status,
        );
        if (status != 0) {
            f.base.pMethods = null;
            return SQLITE_CANTOPEN;
        }
        const slot = allocSlot() orelse {
            ops.close(ref);
            f.base.pMethods = null;
            return SQLITE_CANTOPEN;
        };
        ops.ref_set(slot, ref);
        f.slot = slot;
    } else {
        f.data = null;
        f.len = 0;
        f.cap = 0;
    }

    if (out_flags != null) out_flags.* = flags;
    return SQLITE_OK;
}

fn vfsDelete(
    _: [*c]c.sqlite3_vfs,
    name: [*c]const u8,
    _: c_int,
) callconv(.c) c_int {
    if (host_ops) |ops| {
        if (name != null) {
            const path = std.mem.span(@as([*:0]const u8, @ptrCast(name)));
            _ = ops.delete(path.ptr, path.len);
        }
    }
    return SQLITE_OK;
}

fn vfsAccess(
    _: [*c]c.sqlite3_vfs,
    name: [*c]const u8,
    flags: c_int,
    out: [*c]c_int,
) callconv(.c) c_int {
    if (out == null) return SQLITE_ERROR;
    if (name == null or isMemoryName(name)) {
        out.* = 0;
        return SQLITE_OK;
    }
    if (host_ops) |ops| {
        const path = std.mem.span(@as([*:0]const u8, @ptrCast(name)));
        out.* = ops.access(path.ptr, path.len, flags);
    } else {
        out.* = 0;
    }
    return SQLITE_OK;
}

fn vfsFullPathname(
    _: [*c]c.sqlite3_vfs,
    name: [*c]const u8,
    n_out: c_int,
    out: [*c]u8,
) callconv(.c) c_int {
    if (name == null or out == null) return SQLITE_CANTOPEN;
    const src = std.mem.span(@as([*:0]const u8, @ptrCast(name)));
    const cap: usize = @intCast(@max(n_out, 1));
    if (src.len + 1 > cap) return SQLITE_CANTOPEN;
    @memcpy(out[0..src.len], src);
    out[src.len] = 0;
    return SQLITE_OK;
}

var rng_state: u64 = 0x9e3779b97f4a7c15;

fn nextRandom() u64 {
    var x = rng_state;
    x ^= x << 13;
    x ^= x >> 7;
    x ^= x << 17;
    rng_state = x;
    return x;
}

fn vfsRandomness(
    _: [*c]c.sqlite3_vfs,
    n_byte: c_int,
    out: [*c]u8,
) callconv(.c) c_int {
    if (out == null) return SQLITE_OK;
    const count: usize = @intCast(@max(n_byte, 0));
    var i: usize = 0;
    while (i < count) : (i += 1) {
        out[i] = @truncate(nextRandom());
    }
    return n_byte;
}

fn vfsSleep(_: [*c]c.sqlite3_vfs, _: c_int) callconv(.c) c_int {
    return 0;
}

fn currentMillis() i64 {
    var ts: std.c.timespec = undefined;
    if (std.c.clock_gettime(std.c.CLOCK.REALTIME, &ts) != 0) return 0;
    return @as(i64, @intCast(ts.sec)) * 1000 +
        @divTrunc(@as(i64, @intCast(ts.nsec)), 1_000_000);
}

fn vfsCurrentTime(_: [*c]c.sqlite3_vfs, out: [*c]f64) callconv(.c) c_int {
    if (out == null) return SQLITE_ERROR;
    out.* = @as(f64, @floatFromInt(currentMillis())) / 1000.0;
    return SQLITE_OK;
}

fn vfsCurrentTimeInt64(
    _: [*c]c.sqlite3_vfs,
    out: [*c]c.sqlite3_int64,
) callconv(.c) c_int {
    if (out == null) return SQLITE_ERROR;
    out.* = currentMillis();
    return SQLITE_OK;
}

fn vfsGetLastError(
    _: [*c]c.sqlite3_vfs,
    _: c_int,
    _: [*c]u8,
) callconv(.c) c_int {
    return SQLITE_OK;
}

pub var mem_vfs: c.sqlite3_vfs = .{
    .iVersion = 2,
    .szOsFile = @sizeOf(File),
    .mxPathname = 1024,
    .pNext = null,
    .zName = "mem",
    .pAppData = null,
    .xOpen = vfsOpen,
    .xDelete = vfsDelete,
    .xAccess = vfsAccess,
    .xFullPathname = vfsFullPathname,
    .xDlOpen = null,
    .xDlError = null,
    .xDlSym = null,
    .xDlClose = null,
    .xRandomness = vfsRandomness,
    .xSleep = vfsSleep,
    .xCurrentTime = vfsCurrentTime,
    .xGetLastError = vfsGetLastError,
    .xCurrentTimeInt64 = vfsCurrentTimeInt64,
    .xSetSystemCall = null,
    .xGetSystemCall = null,
    .xNextSystemCall = null,
};

pub var opfs_vfs: c.sqlite3_vfs = .{
    .iVersion = 2,
    .szOsFile = @sizeOf(File),
    .mxPathname = 1024,
    .pNext = null,
    .zName = "opfs",
    .pAppData = null,
    .xOpen = vfsOpen,
    .xDelete = vfsDelete,
    .xAccess = vfsAccess,
    .xFullPathname = vfsFullPathname,
    .xDlOpen = null,
    .xDlError = null,
    .xDlSym = null,
    .xDlClose = null,
    .xRandomness = vfsRandomness,
    .xSleep = vfsSleep,
    .xCurrentTime = vfsCurrentTime,
    .xGetLastError = vfsGetLastError,
    .xCurrentTimeInt64 = vfsCurrentTimeInt64,
    .xSetSystemCall = null,
    .xGetSystemCall = null,
    .xNextSystemCall = null,
};

/// SQLite calls these when the library is initialized/shut down because of
/// `SQLITE_OS_OTHER=1`.
export fn sqlite3_os_init() c_int {
    _ = c.sqlite3_vfs_register(&mem_vfs, 1);
    _ = c.sqlite3_vfs_register(&opfs_vfs, 0);
    return SQLITE_OK;
}

export fn sqlite3_os_end() c_int {
    return SQLITE_OK;
}
