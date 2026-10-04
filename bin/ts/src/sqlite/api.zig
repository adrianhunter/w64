//! Native half of the `node:sqlite` module.
//!
//! The JavaScript half (DatabaseSync/StatementSync, transparent zstd helpers)
//! lives in `sqlite.js` and is evaluated once per context. This file exposes
//! the low-level operations on `globalThis.__qjs_sqlite` and registers the
//! zstd SQL functions on every opened database.

const std = @import("std");
const builtin = @import("builtin");
const quickjs = @import("quickjs");
const c = @import("c.zig").c;
const Value = quickjs.Value;
const Context = quickjs.Context;
const cfunc = quickjs.cfunc;

const allocator: std.mem.Allocator = if (builtin.os.tag == .wasi)
    std.heap.wasm_allocator
else
    std.heap.page_allocator;

pub const sqlite_js = @embedFile("sqlite.js");

const SQLITE_TRANSIENT: c.sqlite3_destructor_type =
    @ptrFromInt(@as(usize, @bitCast(@as(isize, -1))));

const SQLITE_UTF8_DETERMINISTIC: c_int = c.SQLITE_UTF8 | c.SQLITE_DETERMINISTIC;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn jsString(ctx: *Context, value: quickjs.c.JSValue) ?[:0]u8 {
    const v = Value.fromCVal(value);
    const cstr = v.toCString(ctx) orelse return null;
    defer ctx.freeCString(cstr);
    const len = std.mem.len(cstr);
    const out = allocator.allocSentinel(u8, len, 0) catch return null;
    @memcpy(out, cstr[0..len]);
    return out;
}

fn ptrFromNumber(value: quickjs.c.JSValue) ?*anyopaque {
    const v = Value.fromCVal(value);
    const n = v.toFloat64(undefined) catch return null;
    if (n <= 0) return null;
    return @ptrFromInt(@as(usize, @intFromFloat(n)));
}

fn numberFromPtr(ptr: ?*anyopaque) f64 {
    const p = ptr orelse return 0;
    return @floatFromInt(@intFromPtr(p));
}

fn dbFromValue(value: quickjs.c.JSValue) ?*c.sqlite3 {
    return @ptrCast(@alignCast(ptrFromNumber(value) orelse return null));
}

fn stmtFromValue(value: quickjs.c.JSValue) ?*c.sqlite3_stmt {
    return @ptrCast(@alignCast(ptrFromNumber(value) orelse return null));
}

fn throwDbError(ctx: *Context, db: ?*c.sqlite3, fallback: [:0]const u8) Value {
    if (db) |d| {
        const msg = c.sqlite3_errmsg(d);
        if (msg != null) {
            const z: [*:0]const u8 = @ptrCast(msg);
            return ctx.throwInternalError(std.mem.span(z));
        }
    }
    return ctx.throwInternalError(fallback);
}

fn throwStmtError(ctx: *Context, stmt: ?*c.sqlite3_stmt, fallback: [:0]const u8) Value {
    const db = if (stmt) |s| c.sqlite3_db_handle(s) else null;
    return throwDbError(ctx, db, fallback);
}

// ---------------------------------------------------------------------------
// Value conversion
// ---------------------------------------------------------------------------

fn bindJsValue(
    ctx: *Context,
    stmt: *c.sqlite3_stmt,
    index: c_int,
    value: Value,
) c_int {
    if (value.isNull() or value.isUndefined()) {
        return c.sqlite3_bind_null(stmt, index);
    }
    if (value.isBool()) {
        const b = value.toBool(ctx) catch false;
        return c.sqlite3_bind_int(stmt, index, @intFromBool(b));
    }
    if (value.isBigInt()) {
        const n = value.toBigInt64(ctx) catch 0;
        return c.sqlite3_bind_int64(stmt, index, n);
    }
    if (value.isNumber()) {
        const f = value.toFloat64(ctx) catch 0;
        if (@floor(f) == f and f >= -9007199254740992.0 and
            f <= 9007199254740992.0)
        {
            return c.sqlite3_bind_int64(stmt, index, @intFromFloat(f));
        }
        return c.sqlite3_bind_double(stmt, index, f);
    }
    if (value.isString()) {
        const s = jsString(ctx, value.cval()) orelse return c.SQLITE_NOMEM;
        defer allocator.free(s);
        return c.sqlite3_bind_text(
            stmt,
            index,
            s.ptr,
            @intCast(s.len),
            SQLITE_TRANSIENT,
        );
    }
    // Uint8Array / ArrayBuffer
    if (typedArrayBytes(ctx, value)) |bytes| {
        return c.sqlite3_bind_blob(
            stmt,
            index,
            bytes.ptr,
            @intCast(bytes.len),
            SQLITE_TRANSIENT,
        );
    }
    return c.SQLITE_MISMATCH;
}

fn columnValue(ctx: *Context, stmt: *c.sqlite3_stmt, index: c_int) Value {
    const col_type = c.sqlite3_column_type(stmt, index);
    switch (col_type) {
        c.SQLITE_INTEGER => {
            const n = c.sqlite3_column_int64(stmt, index);
            if (n >= std.math.minInt(i32) and n <= std.math.maxInt(i32)) {
                return Value.initInt32(@intCast(n));
            }
            const f: f64 = @floatFromInt(n);
            if (@as(i64, @intFromFloat(f)) == n) return Value.initFloat64(f);
            return Value.fromCVal(quickjs.c.JS_NewBigInt64(ctx.cval(), n));
        },
        c.SQLITE_FLOAT => {
            return Value.initFloat64(c.sqlite3_column_double(stmt, index));
        },
        c.SQLITE_TEXT => {
            const ptr = c.sqlite3_column_text(stmt, index);
            const len = c.sqlite3_column_bytes(stmt, index);
            if (ptr == null or len <= 0) return Value.initStringLen(ctx, "");
            return Value.initStringLen(ctx, @as([*]const u8, @ptrCast(ptr))[0..@intCast(len)]);
        },
        c.SQLITE_BLOB => {
            const ptr = c.sqlite3_column_blob(stmt, index);
            const len = c.sqlite3_column_bytes(stmt, index);
            if (ptr == null or len <= 0) {
                return Value.initUint8ArrayCopy(ctx, "");
            }
            const bytes = @as([*]const u8, @ptrCast(ptr))[0..@intCast(len)];
            return Value.initUint8ArrayCopy(ctx, bytes);
        },
        else => return Value.@"null",
    }
}

// ---------------------------------------------------------------------------
// zstd helpers
// ---------------------------------------------------------------------------

fn zstdCompressBytes(
    src: []const u8,
    level: c_int,
) ![]u8 {
    const bound = c.ZSTD_compressBound(src.len);
    const dst = try allocator.alloc(u8, bound);
    errdefer allocator.free(dst);
    const written = c.ZSTD_compress(dst.ptr, dst.len, src.ptr, src.len, level);
    if (c.ZSTD_isError(written) != 0) return error.ZstdError;
    return dst[0..written];
}

const zstd_contentsize_unknown: c_ulonglong = std.math.maxInt(c_ulonglong);
const zstd_contentsize_error: c_ulonglong = std.math.maxInt(c_ulonglong) - 1;

fn zstdDecompressBytes(src: []const u8) ![]u8 {
    const size = c.ZSTD_getFrameContentSize(src.ptr, src.len);
    if (size == zstd_contentsize_error or
        size == zstd_contentsize_unknown) return error.ZstdError;
    const dst = try allocator.alloc(u8, @intCast(size));
    errdefer allocator.free(dst);
    const written = c.ZSTD_decompress(dst.ptr, dst.len, src.ptr, src.len);
    if (c.ZSTD_isError(written) != 0) return error.ZstdError;
    return dst[0..written];
}

fn zstdCompressDictBytes(
    src: []const u8,
    dict: []const u8,
    level: c_int,
) ![]u8 {
    const bound = c.ZSTD_compressBound(src.len);
    const dst = try allocator.alloc(u8, bound);
    errdefer allocator.free(dst);
    const cctx = c.ZSTD_createCCtx();
    if (cctx == null) return error.ZstdError;
    defer _ = c.ZSTD_freeCCtx(cctx);
    const written = c.ZSTD_compress_usingDict(
        cctx,
        dst.ptr,
        dst.len,
        src.ptr,
        src.len,
        dict.ptr,
        dict.len,
        level,
    );
    if (c.ZSTD_isError(written) != 0) return error.ZstdError;
    return dst[0..written];
}

fn zstdDecompressDictBytes(src: []const u8, dict: []const u8) ![]u8 {
    const size = c.ZSTD_getFrameContentSize(src.ptr, src.len);
    if (size == zstd_contentsize_error or
        size == zstd_contentsize_unknown) return error.ZstdError;
    const dst = try allocator.alloc(u8, @intCast(size));
    errdefer allocator.free(dst);
    const dctx = c.ZSTD_createDCtx();
    if (dctx == null) return error.ZstdError;
    defer _ = c.ZSTD_freeDCtx(dctx);
    const written = c.ZSTD_decompress_usingDict(
        dctx,
        dst.ptr,
        dst.len,
        src.ptr,
        src.len,
        dict.ptr,
        dict.len,
    );
    if (c.ZSTD_isError(written) != 0) return error.ZstdError;
    return dst[0..written];
}

fn resultBlob(
    ctx: ?*c.sqlite3_context,
    bytes: []const u8,
) void {
    c.sqlite3_result_blob(
        ctx,
        bytes.ptr,
        @intCast(bytes.len),
        SQLITE_TRANSIENT,
    );
}

fn resultZstdError(ctx: ?*c.sqlite3_context) void {
    c.sqlite3_result_error(ctx, "zstd compression failed", -1);
}

fn sqliteValueBytes(value: ?*c.sqlite3_value) []const u8 {
    const ptr = c.sqlite3_value_blob(value);
    const len = c.sqlite3_value_bytes(value);
    if (ptr == null or len <= 0) return &.{};
    return @as([*]const u8, @ptrCast(ptr))[0..@intCast(len)];
}

fn zstdCompressFunc(
    ctx: ?*c.sqlite3_context,
    argc: c_int,
    argv: [*c]?*c.sqlite3_value,
) callconv(.c) void {
    if (argc < 1) {
        c.sqlite3_result_null(ctx);
        return;
    }
    var level: c_int = 3;
    if (argc > 1) level = c.sqlite3_value_int(argv[1]);
    const src = sqliteValueBytes(argv[0]);
    const out = zstdCompressBytes(src, level) catch {
        resultZstdError(ctx);
        return;
    };
    defer allocator.free(out);
    resultBlob(ctx, out);
}

fn zstdDecompressFunc(
    ctx: ?*c.sqlite3_context,
    argc: c_int,
    argv: [*c]?*c.sqlite3_value,
) callconv(.c) void {
    if (argc < 1) {
        c.sqlite3_result_null(ctx);
        return;
    }
    const src = sqliteValueBytes(argv[0]);
    const out = zstdDecompressBytes(src) catch {
        resultZstdError(ctx);
        return;
    };
    defer allocator.free(out);
    resultBlob(ctx, out);
}

fn zstdCompressDictFunc(
    ctx: ?*c.sqlite3_context,
    argc: c_int,
    argv: [*c]?*c.sqlite3_value,
) callconv(.c) void {
    if (argc < 2) {
        c.sqlite3_result_null(ctx);
        return;
    }
    var level: c_int = 3;
    if (argc > 2) level = c.sqlite3_value_int(argv[2]);
    const src = sqliteValueBytes(argv[0]);
    const dict = sqliteValueBytes(argv[1]);
    const out = zstdCompressDictBytes(src, dict, level) catch {
        resultZstdError(ctx);
        return;
    };
    defer allocator.free(out);
    resultBlob(ctx, out);
}

fn zstdDecompressDictFunc(
    ctx: ?*c.sqlite3_context,
    argc: c_int,
    argv: [*c]?*c.sqlite3_value,
) callconv(.c) void {
    if (argc < 2) {
        c.sqlite3_result_null(ctx);
        return;
    }
    const src = sqliteValueBytes(argv[0]);
    const dict = sqliteValueBytes(argv[1]);
    const out = zstdDecompressDictBytes(src, dict) catch {
        resultZstdError(ctx);
        return;
    };
    defer allocator.free(out);
    resultBlob(ctx, out);
}

var last_dict_db: ?*c.sqlite3 = null;
var last_dict_id: i64 = -1;
var last_dict_bytes: []u8 = &.{};

fn loadDictionary(db: *c.sqlite3, id: i64) ?[]const u8 {
    if (last_dict_db == db and last_dict_id == id) return last_dict_bytes;
    if (last_dict_bytes.len > 0) {
        allocator.free(last_dict_bytes);
        last_dict_bytes = &.{};
    }
    last_dict_db = null;
    last_dict_id = -1;

    var stmt: ?*c.sqlite3_stmt = null;
    const sql = "SELECT dict FROM _qjs_zstd_dicts WHERE id = ?1";
    if (c.sqlite3_prepare_v2(db, sql, -1, &stmt, null) != c.SQLITE_OK) {
        return null;
    }
    defer _ = c.sqlite3_finalize(stmt);
    _ = c.sqlite3_bind_int64(stmt, 1, id);
    if (c.sqlite3_step(stmt) != c.SQLITE_ROW) return null;
    const ptr = c.sqlite3_column_blob(stmt, 0);
    const len: usize = @intCast(c.sqlite3_column_bytes(stmt, 0));
    if (ptr == null or len == 0) return null;
    const copy = allocator.alloc(u8, len) catch return null;
    @memcpy(copy, @as([*]const u8, @ptrCast(ptr))[0..len]);
    last_dict_db = db;
    last_dict_id = id;
    last_dict_bytes = copy;
    return copy;
}

fn zstdDecompressDictIdFunc(
    ctx: ?*c.sqlite3_context,
    argc: c_int,
    argv: [*c]?*c.sqlite3_value,
) callconv(.c) void {
    if (argc < 2) {
        c.sqlite3_result_null(ctx);
        return;
    }
    const src = sqliteValueBytes(argv[0]);
    const id = c.sqlite3_value_int64(argv[1]);
    if (id <= 0) {
        const out = zstdDecompressBytes(src) catch {
            resultZstdError(ctx);
            return;
        };
        defer allocator.free(out);
        resultBlob(ctx, out);
        return;
    }
    const db = c.sqlite3_context_db_handle(ctx) orelse {
        resultZstdError(ctx);
        return;
    };
    const dict = loadDictionary(db, id) orelse {
        c.sqlite3_result_error(ctx, "zstd dictionary not found", -1);
        return;
    };
    const out = zstdDecompressDictBytes(src, dict) catch {
        resultZstdError(ctx);
        return;
    };
    defer allocator.free(out);
    resultBlob(ctx, out);
}

fn registerZstdFunctions(db: *c.sqlite3) void {
    _ = c.sqlite3_create_function_v2(
        db,
        "qjs_zstd_compress",
        2,
        SQLITE_UTF8_DETERMINISTIC,
        null,
        zstdCompressFunc,
        null,
        null,
        null,
    );
    _ = c.sqlite3_create_function_v2(
        db,
        "qjs_zstd_decompress",
        1,
        SQLITE_UTF8_DETERMINISTIC,
        null,
        zstdDecompressFunc,
        null,
        null,
        null,
    );
    _ = c.sqlite3_create_function_v2(
        db,
        "qjs_zstd_compress_dict",
        3,
        SQLITE_UTF8_DETERMINISTIC,
        null,
        zstdCompressDictFunc,
        null,
        null,
        null,
    );
    _ = c.sqlite3_create_function_v2(
        db,
        "qjs_zstd_decompress_dict",
        2,
        SQLITE_UTF8_DETERMINISTIC,
        null,
        zstdDecompressDictFunc,
        null,
        null,
        null,
    );
    _ = c.sqlite3_create_function_v2(
        db,
        "qjs_zstd_decompress_dict_id",
        2,
        SQLITE_UTF8_DETERMINISTIC,
        null,
        zstdDecompressDictIdFunc,
        null,
        null,
        null,
    );
}

// ---------------------------------------------------------------------------
// Native JS API
// ---------------------------------------------------------------------------

fn sqliteOpenNative(
    ctx_opt: ?*Context,
    _: Value,
    args: []const quickjs.c.JSValue,
) Value {
    const ctx = ctx_opt orelse return Value.@"undefined";
    if (args.len < 1) return ctx.throwTypeError("open(path, vfs)");
    const path = jsString(ctx, args[0]) orelse return Value.exception;
    defer allocator.free(path);

    var vfs: []const u8 = "opfs";
    var vfs_storage: [16]u8 = undefined;
    if (args.len > 1) {
        const z = jsString(ctx, args[1]) orelse return Value.exception;
        defer allocator.free(z);
        const n = @min(z.len, vfs_storage.len);
        @memcpy(vfs_storage[0..n], z[0..n]);
        vfs = vfs_storage[0..n];
    }
    const vfs_z = allocator.allocSentinel(u8, vfs.len, 0) catch
        return ctx.throwOutOfMemory();
    defer allocator.free(vfs_z);
    @memcpy(vfs_z, vfs);

    var db: ?*c.sqlite3 = null;
    const flags: c_int = c.SQLITE_OPEN_READWRITE |
        c.SQLITE_OPEN_CREATE |
        c.SQLITE_OPEN_URI;
    const rc = c.sqlite3_open_v2(path.ptr, &db, flags, vfs_z.ptr);
    if (rc != c.SQLITE_OK or db == null) {
        const result = throwDbError(ctx, db, "cannot open database");
        if (db) |d| _ = c.sqlite3_close_v2(d);
        return result;
    }

    // Max-performance, single-process WAL settings.
    const opened = db.?;
    execIgnore(opened, "PRAGMA journal_mode=WAL");
    execIgnore(opened, "PRAGMA synchronous=NORMAL");
    execIgnore(opened, "PRAGMA locking_mode=EXCLUSIVE");
    execIgnore(opened, "PRAGMA temp_store=MEMORY");
    execIgnore(opened, "PRAGMA cache_size=-32768");
    execIgnore(opened, "PRAGMA busy_timeout=0");
    execIgnore(opened, "PRAGMA foreign_keys=OFF");

    registerZstdFunctions(opened);
    return Value.initFloat64(numberFromPtr(@ptrCast(opened)));
}

fn execIgnore(db: *c.sqlite3, sql: [*:0]const u8) void {
    var err: [*c]u8 = null;
    _ = c.sqlite3_exec(db, sql, null, null, &err);
    if (err != null) c.sqlite3_free(err);
}

fn sqliteCloseNative(
    _: ?*Context,
    _: Value,
    args: []const quickjs.c.JSValue,
) Value {
    if (args.len < 1) return Value.@"undefined";
    const db = dbFromValue(args[0]) orelse return Value.@"undefined";
    _ = c.sqlite3_close_v2(db);
    return Value.@"undefined";
}

fn sqliteExecNative(
    ctx_opt: ?*Context,
    _: Value,
    args: []const quickjs.c.JSValue,
) Value {
    const ctx = ctx_opt orelse return Value.@"undefined";
    if (args.len < 2) return ctx.throwTypeError("exec(db, sql)");
    const db = dbFromValue(args[0]) orelse
        return ctx.throwInternalError("invalid database handle");
    const sql = jsString(ctx, args[1]) orelse return Value.exception;
    defer allocator.free(sql);
    var err: [*c]u8 = null;
    const rc = c.sqlite3_exec(db, sql.ptr, null, null, &err);
    if (rc != c.SQLITE_OK) {
        defer if (err != null) c.sqlite3_free(err);
        const msg: [*:0]const u8 = if (err != null) @ptrCast(err) else "exec failed";
        return ctx.throwInternalError(std.mem.span(msg));
    }
    return Value.@"undefined";
}

fn sqlitePrepareNative(
    ctx_opt: ?*Context,
    _: Value,
    args: []const quickjs.c.JSValue,
) Value {
    const ctx = ctx_opt orelse return Value.@"undefined";
    if (args.len < 2) return ctx.throwTypeError("prepare(db, sql)");
    const db = dbFromValue(args[0]) orelse
        return ctx.throwInternalError("invalid database handle");
    const sql = jsString(ctx, args[1]) orelse return Value.exception;
    defer allocator.free(sql);
    var stmt: ?*c.sqlite3_stmt = null;
    const rc = c.sqlite3_prepare_v2(db, sql.ptr, @intCast(sql.len), &stmt, null);
    if (rc != c.SQLITE_OK or stmt == null) {
        return throwDbError(ctx, db, "prepare failed");
    }
    return Value.initFloat64(numberFromPtr(@ptrCast(stmt)));
}

fn sqliteFinalizeNative(
    _: ?*Context,
    _: Value,
    args: []const quickjs.c.JSValue,
) Value {
    if (args.len < 1) return Value.@"undefined";
    const stmt = stmtFromValue(args[0]) orelse return Value.@"undefined";
    _ = c.sqlite3_finalize(stmt);
    return Value.@"undefined";
}

fn sqliteResetNative(
    _: ?*Context,
    _: Value,
    args: []const quickjs.c.JSValue,
) Value {
    if (args.len < 1) return Value.@"undefined";
    const stmt = stmtFromValue(args[0]) orelse return Value.@"undefined";
    _ = c.sqlite3_reset(stmt);
    _ = c.sqlite3_clear_bindings(stmt);
    return Value.@"undefined";
}

fn sqliteStepNative(
    ctx_opt: ?*Context,
    _: Value,
    args: []const quickjs.c.JSValue,
) Value {
    const ctx = ctx_opt orelse return Value.@"undefined";
    if (args.len < 1) return ctx.throwTypeError("step(stmt)");
    const stmt = stmtFromValue(args[0]) orelse
        return ctx.throwInternalError("invalid statement handle");
    const rc = c.sqlite3_step(stmt);
    if (rc != c.SQLITE_ROW and rc != c.SQLITE_DONE and rc != c.SQLITE_OK) {
        return throwStmtError(ctx, stmt, "step failed");
    }
    return Value.initInt32(rc);
}

fn sqliteBindNative(
    ctx_opt: ?*Context,
    _: Value,
    args: []const quickjs.c.JSValue,
) Value {
    const ctx = ctx_opt orelse return Value.@"undefined";
    if (args.len < 3) return ctx.throwTypeError("bind(stmt, index, value)");
    const stmt = stmtFromValue(args[0]) orelse
        return ctx.throwInternalError("invalid statement handle");
    const index = Value.fromCVal(args[1]);
    const idx: c_int = @intCast(index.toInt32(ctx) catch 0);
    const rc = bindJsValue(ctx, stmt, idx, Value.fromCVal(args[2]));
    if (rc != c.SQLITE_OK) return throwStmtError(ctx, stmt, "bind failed");
    return Value.@"undefined";
}

fn sqliteBindNameNative(
    ctx_opt: ?*Context,
    _: Value,
    args: []const quickjs.c.JSValue,
) Value {
    const ctx = ctx_opt orelse return Value.@"undefined";
    if (args.len < 3) return ctx.throwTypeError("bindName(stmt, name, value)");
    const stmt = stmtFromValue(args[0]) orelse
        return ctx.throwInternalError("invalid statement handle");
    const name = jsString(ctx, args[1]) orelse return Value.exception;
    defer allocator.free(name);
    const idx = c.sqlite3_bind_parameter_index(stmt, name.ptr);
    if (idx == 0) {
        return ctx.throwInternalError("unknown named parameter");
    }
    const rc = bindJsValue(ctx, stmt, idx, Value.fromCVal(args[2]));
    if (rc != c.SQLITE_OK) return throwStmtError(ctx, stmt, "bind failed");
    return Value.@"undefined";
}

fn sqliteColumnCountNative(
    _: ?*Context,
    _: Value,
    args: []const quickjs.c.JSValue,
) Value {
    if (args.len < 1) return Value.initInt32(0);
    const stmt = stmtFromValue(args[0]) orelse return Value.initInt32(0);
    return Value.initInt32(c.sqlite3_column_count(stmt));
}

fn sqliteColumnNameNative(
    ctx_opt: ?*Context,
    _: Value,
    args: []const quickjs.c.JSValue,
) Value {
    const ctx = ctx_opt orelse return Value.@"undefined";
    if (args.len < 2) return Value.initStringLen(ctx, "");
    const stmt = stmtFromValue(args[0]) orelse
        return Value.initStringLen(ctx, "");
    const idx = Value.fromCVal(args[1]);
    const i: c_int = @intCast(idx.toInt32(ctx) catch 0);
    const name = c.sqlite3_column_name(stmt, i);
    if (name == null) return Value.initStringLen(ctx, "");
    return Value.initStringLen(ctx, std.mem.span(@as([*:0]const u8, @ptrCast(name))));
}

fn sqliteColumnValueNative(
    ctx_opt: ?*Context,
    _: Value,
    args: []const quickjs.c.JSValue,
) Value {
    const ctx = ctx_opt orelse return Value.@"undefined";
    if (args.len < 2) return Value.@"null";
    const stmt = stmtFromValue(args[0]) orelse return Value.@"null";
    const idx = Value.fromCVal(args[1]);
    const i: c_int = @intCast(idx.toInt32(ctx) catch 0);
    return columnValue(ctx, stmt, i);
}

fn sqliteChangesNative(
    _: ?*Context,
    _: Value,
    args: []const quickjs.c.JSValue,
) Value {
    if (args.len < 1) return Value.initInt32(0);
    const db = dbFromValue(args[0]) orelse return Value.initInt32(0);
    return Value.initInt32(c.sqlite3_changes(db));
}

fn sqliteLastInsertRowidNative(
    _: ?*Context,
    _: Value,
    args: []const quickjs.c.JSValue,
) Value {
    if (args.len < 1) return Value.initInt32(0);
    const db = dbFromValue(args[0]) orelse return Value.initInt32(0);
    const id = c.sqlite3_last_insert_rowid(db);
    if (id >= std.math.minInt(i32) and id <= std.math.maxInt(i32)) {
        return Value.initInt32(@intCast(id));
    }
    return Value.initFloat64(@floatFromInt(id));
}

fn sqliteErrmsgNative(
    ctx_opt: ?*Context,
    _: Value,
    args: []const quickjs.c.JSValue,
) Value {
    const ctx = ctx_opt orelse return Value.@"undefined";
    if (args.len < 1) return Value.initStringLen(ctx, "");
    const db = dbFromValue(args[0]) orelse return Value.initStringLen(ctx, "");
    const msg = c.sqlite3_errmsg(db);
    if (msg == null) return Value.initStringLen(ctx, "");
    return Value.initStringLen(ctx, std.mem.span(@as([*:0]const u8, @ptrCast(msg))));
}

fn sqliteVersionNative(
    ctx_opt: ?*Context,
    _: Value,
    _: []const quickjs.c.JSValue,
) Value {
    const ctx = ctx_opt orelse return Value.@"undefined";
    return Value.initStringLen(ctx, std.mem.span(c.sqlite3_libversion()));
}

// ---------------------------------------------------------------------------
// zstd native helpers for the JS side
// ---------------------------------------------------------------------------

fn typedArrayBytes(ctx: *Context, value: Value) ?[]const u8 {
    if (value.getUint8Array(ctx)) |bytes| return bytes;
    if (value.getArrayBuffer(ctx)) |bytes| return bytes;
    return null;
}

fn zstdCompressNative(
    ctx_opt: ?*Context,
    _: Value,
    args: []const quickjs.c.JSValue,
) Value {
    const ctx = ctx_opt orelse return Value.@"undefined";
    if (args.len < 1) return ctx.throwTypeError("zstdCompress(data, level)");
    const src = typedArrayBytes(ctx, Value.fromCVal(args[0])) orelse
        return ctx.throwTypeError("expected a Uint8Array");
    var level: c_int = 3;
    if (args.len > 1) {
        level = @intCast(Value.fromCVal(args[1]).toInt32(ctx) catch 3);
    }
    const out = zstdCompressBytes(src, level) catch
        return ctx.throwInternalError("zstd compression failed");
    defer allocator.free(out);
    return Value.initUint8ArrayCopy(ctx, out);
}

fn zstdDecompressNative(
    ctx_opt: ?*Context,
    _: Value,
    args: []const quickjs.c.JSValue,
) Value {
    const ctx = ctx_opt orelse return Value.@"undefined";
    if (args.len < 1) return ctx.throwTypeError("zstdDecompress(data)");
    const src = typedArrayBytes(ctx, Value.fromCVal(args[0])) orelse
        return ctx.throwTypeError("expected a Uint8Array");
    const out = zstdDecompressBytes(src) catch
        return ctx.throwInternalError("zstd decompression failed");
    defer allocator.free(out);
    return Value.initUint8ArrayCopy(ctx, out);
}

fn zstdCompressDictNative(
    ctx_opt: ?*Context,
    _: Value,
    args: []const quickjs.c.JSValue,
) Value {
    const ctx = ctx_opt orelse return Value.@"undefined";
    if (args.len < 2) return ctx.throwTypeError("zstdCompressDict(data, dict, level)");
    const src = typedArrayBytes(ctx, Value.fromCVal(args[0])) orelse
        return ctx.throwTypeError("expected a Uint8Array");
    const dict = typedArrayBytes(ctx, Value.fromCVal(args[1])) orelse
        return ctx.throwTypeError("expected a Uint8Array");
    var level: c_int = 3;
    if (args.len > 2) {
        level = @intCast(Value.fromCVal(args[2]).toInt32(ctx) catch 3);
    }
    const out = zstdCompressDictBytes(src, dict, level) catch
        return ctx.throwInternalError("zstd compression failed");
    defer allocator.free(out);
    return Value.initUint8ArrayCopy(ctx, out);
}

fn zstdDecompressDictNative(
    ctx_opt: ?*Context,
    _: Value,
    args: []const quickjs.c.JSValue,
) Value {
    const ctx = ctx_opt orelse return Value.@"undefined";
    if (args.len < 2) return ctx.throwTypeError("zstdDecompressDict(data, dict)");
    const src = typedArrayBytes(ctx, Value.fromCVal(args[0])) orelse
        return ctx.throwTypeError("expected a Uint8Array");
    const dict = typedArrayBytes(ctx, Value.fromCVal(args[1])) orelse
        return ctx.throwTypeError("expected a Uint8Array");
    const out = zstdDecompressDictBytes(src, dict) catch
        return ctx.throwInternalError("zstd decompression failed");
    defer allocator.free(out);
    return Value.initUint8ArrayCopy(ctx, out);
}

fn utf8EncodeNative(
    ctx_opt: ?*Context,
    _: Value,
    args: []const quickjs.c.JSValue,
) Value {
    const ctx = ctx_opt orelse return Value.@"undefined";
    if (args.len < 1) return ctx.throwTypeError("utf8Encode(text)");
    const text = jsString(ctx, args[0]) orelse return Value.exception;
    defer allocator.free(text);
    return Value.initUint8ArrayCopy(ctx, text);
}

fn zstdTrainDictNative(
    ctx_opt: ?*Context,
    _: Value,
    args: []const quickjs.c.JSValue,
) Value {
    const ctx = ctx_opt orelse return Value.@"undefined";
    if (args.len < 2) return ctx.throwTypeError("zstdTrainDict(samples, dictSize)");
    const samples_value = Value.fromCVal(args[0]);
    if (!samples_value.isArray()) {
        return ctx.throwTypeError("samples must be an array of Uint8Array");
    }
    const dict_size = Value.fromCVal(args[1]).toInt32(ctx) catch 8192;

    const length_value = samples_value.getPropertyStr(ctx, "length");
    defer length_value.deinit(ctx);
    const count: usize = @intCast(length_value.toInt32(ctx) catch 0);
    if (count == 0) return ctx.throwInternalError("no samples");

    var samples: std.ArrayList([]const u8) = .empty;
    defer samples.deinit(allocator);
    for (0..count) |i| {
        const item = samples_value.getPropertyUint32(ctx, @intCast(i));
        defer item.deinit(ctx);
        const bytes = typedArrayBytes(ctx, item) orelse
            return ctx.throwTypeError("sample must be a Uint8Array");
        samples.append(allocator, bytes) catch
            return ctx.throwOutOfMemory();
    }

    const dict = allocator.alloc(u8, @intCast(@max(dict_size, 256))) catch
        return ctx.throwOutOfMemory();
    defer allocator.free(dict);
    const sizes = allocator.alloc(usize, samples.items.len) catch
        return ctx.throwOutOfMemory();
    defer allocator.free(sizes);

    var total: usize = 0;
    for (samples.items, 0..) |sample, i| {
        sizes[i] = sample.len;
        total += sample.len;
    }
    const joined = allocator.alloc(u8, total) catch
        return ctx.throwOutOfMemory();
    defer allocator.free(joined);
    var offset: usize = 0;
    for (samples.items) |sample| {
        @memcpy(joined[offset..][0..sample.len], sample);
        offset += sample.len;
    }

    const written = c.ZDICT_trainFromBuffer(
        dict.ptr,
        dict.len,
        joined.ptr,
        sizes.ptr,
        @intCast(sizes.len),
    );
    if (c.ZDICT_isError(written) != 0) {
        return ctx.throwInternalError("zstd dictionary training failed");
    }
    return Value.initUint8ArrayCopy(ctx, dict[0..written]);
}

// ---------------------------------------------------------------------------
// Installation
// ---------------------------------------------------------------------------

var installed: bool = false;

fn defineNative(
    ctx: *Context,
    obj: Value,
    name: [:0]const u8,
    comptime func: cfunc.Func,
    length: i32,
) void {
    obj.setPropertyStr(
        ctx,
        name.ptr,
        Value.initCFunction(ctx, func, name, length),
    ) catch {};
}

/// 4 GiB hard heap limit: SQLite fails with SQLITE_NOMEM instead of letting
/// the wasm memory grow without bound.
pub const hard_heap_limit: i64 = 4 * 1024 * 1024 * 1024;

/// Installs `globalThis.__qjs_sqlite` and evaluates the JS wrapper exactly
/// once per context. Safe to call from wizer initialization.
pub fn install(ctx: *Context) void {
    if (installed) return;
    installed = true;

    _ = c.sqlite3_hard_heap_limit64(hard_heap_limit);

    const natives = Value.initObject(ctx);
    defineNative(ctx, natives, "open", sqliteOpenNative, 2);
    defineNative(ctx, natives, "close", sqliteCloseNative, 1);
    defineNative(ctx, natives, "exec", sqliteExecNative, 2);
    defineNative(ctx, natives, "prepare", sqlitePrepareNative, 2);
    defineNative(ctx, natives, "finalize", sqliteFinalizeNative, 1);
    defineNative(ctx, natives, "reset", sqliteResetNative, 1);
    defineNative(ctx, natives, "step", sqliteStepNative, 1);
    defineNative(ctx, natives, "bind", sqliteBindNative, 3);
    defineNative(ctx, natives, "bindName", sqliteBindNameNative, 3);
    defineNative(ctx, natives, "columnCount", sqliteColumnCountNative, 1);
    defineNative(ctx, natives, "columnName", sqliteColumnNameNative, 2);
    defineNative(ctx, natives, "columnValue", sqliteColumnValueNative, 2);
    defineNative(ctx, natives, "changes", sqliteChangesNative, 1);
    defineNative(ctx, natives, "lastInsertRowid", sqliteLastInsertRowidNative, 1);
    defineNative(ctx, natives, "errmsg", sqliteErrmsgNative, 1);
    defineNative(ctx, natives, "version", sqliteVersionNative, 0);
    defineNative(ctx, natives, "zstdCompress", zstdCompressNative, 2);
    defineNative(ctx, natives, "zstdDecompress", zstdDecompressNative, 1);
    defineNative(ctx, natives, "zstdCompressDict", zstdCompressDictNative, 3);
    defineNative(ctx, natives, "zstdDecompressDict", zstdDecompressDictNative, 2);
    defineNative(ctx, natives, "zstdTrainDict", zstdTrainDictNative, 2);
    defineNative(ctx, natives, "utf8Encode", utf8EncodeNative, 1);

    const global = ctx.getGlobalObject();
    defer global.deinit(ctx);
    global.setPropertyStr(ctx, "__qjs_sqlite", natives) catch {};

    const result = ctx.eval(sqlite_js, "<sqlite-module>", .{});
    defer result.deinit(ctx);
    if (result.isException()) {
        const exc = ctx.getException();
        defer exc.deinit(ctx);
        if (exc.toCString(ctx)) |msg| {
            defer ctx.freeCString(msg);
            std.debug.print("sqlite module error: {s}\n", .{std.mem.span(msg)});
        }
        return;
    }
}

fn moduleInit(ctx: *Context, m: *quickjs.ModuleDef) bool {
    const global = ctx.getGlobalObject();
    defer global.deinit(ctx);
    const exports = global.getPropertyStr(ctx, "__qjs_sqlite_exports");
    defer exports.deinit(ctx);
    if (!exports.isObject()) return false;

    const props = exports.getOwnPropertyNames(ctx, .{ .string_mask = true }) catch {
        return false;
    };
    defer Value.freePropertyEnum(ctx, props);
    var has_default = false;
    for (props) |p| {
        const key = p.atom.toCString(ctx) orelse continue;
        defer ctx.freeCString(key);
        const text = std.mem.span(key);
        if (std.mem.eql(u8, text, "default")) has_default = true;
        const val = exports.getProperty(ctx, p.atom);
        if (val.isException()) {
            val.deinit(ctx);
            return false;
        }
        if (!m.setExport(ctx, text, val)) {
            val.deinit(ctx);
            return false;
        }
    }
    if (!has_default) {
        if (!m.setExport(ctx, "default", exports.dup(ctx))) return false;
    }
    return true;
}

/// Builds the `node:sqlite` module for `ctx`, installing the native layer and
/// evaluating the JS wrapper on first use.
pub fn module(ctx: *Context, name: [:0]const u8) ?*quickjs.ModuleDef {
    install(ctx);

    const global = ctx.getGlobalObject();
    defer global.deinit(ctx);
    const exports = global.getPropertyStr(ctx, "__qjs_sqlite_exports");
    defer exports.deinit(ctx);
    if (!exports.isObject()) return null;

    const m = quickjs.ModuleDef.init(ctx, name, moduleInit) orelse return null;

    const props = exports.getOwnPropertyNames(ctx, .{ .string_mask = true }) catch {
        return m;
    };
    defer Value.freePropertyEnum(ctx, props);
    var has_default = false;
    for (props) |p| {
        const key = p.atom.toCString(ctx) orelse continue;
        defer ctx.freeCString(key);
        const text = std.mem.span(key);
        if (std.mem.eql(u8, text, "default")) has_default = true;
        _ = m.addExport(ctx, text);
    }
    if (!has_default) _ = m.addExport(ctx, "default");
    return m;
}
