//! QuickJS-ng standalone interpreter, ported from qjs.c to Zig.
//!
//! Also adds a `build` subcommand that uses esbuild to bundle a JavaScript
//! or TypeScript entry point, then uses wizer to snapshot the evaluated
//! bundle into a new, pre-initialized version of this WebAssembly module.
//!
//! The bundle registers every bare import of the entry point on the
//! `globalThis.__qjs_modules` object. Later code running in the final
//! (pre-initialized) program can `import` those specifiers as if they were
//! ordinary modules.

const std = @import("std");
const builtin = @import("builtin");
const quickjs = @import("quickjs");
const c = quickjs.c;
const sqlite_vfs = @import("sqlite/vfs.zig");
const sqlite_api = @import("sqlite/api.zig");

const ExternRef = sqlite_vfs.ExternRef;

// OPFS host imports. Handles cross the boundary as externrefs and are kept
// in a wasm table on the guest side.
extern "qjs_host" fn opfs_open(
    path: [*]const u8,
    path_len: usize,
    wants_write: c_int,
    create: c_int,
    status: *c_int,
) ExternRef;
extern "qjs_host" fn opfs_close(ref: ExternRef) void;
extern "qjs_host" fn opfs_read(
    ref: ExternRef,
    buf: [*]u8,
    amount: c_int,
    offset: i64,
) c_int;
extern "qjs_host" fn opfs_write(
    ref: ExternRef,
    buf: [*]const u8,
    amount: c_int,
    offset: i64,
) c_int;
extern "qjs_host" fn opfs_truncate(ref: ExternRef, size: i64) c_int;
extern "qjs_host" fn opfs_size(ref: ExternRef) i64;
extern "qjs_host" fn opfs_sync(ref: ExternRef, flags: c_int) c_int;
extern "qjs_host" fn opfs_delete(path: [*]const u8, path_len: usize) c_int;
extern "qjs_host" fn opfs_access(
    path: [*]const u8,
    path_len: usize,
    flags: c_int,
) c_int;

// Host-side externref slot table. The guest contains no wasm table
// instructions, so the module stays wizer-friendly; handles still cross the
// boundary as real externrefs.
extern "qjs_host" fn externref_set(index: c_int, ref: ExternRef) void;
extern "qjs_host" fn externref_get(index: c_int) ExternRef;
extern "qjs_host" fn externref_clear(index: c_int) void;

const host_ops: sqlite_vfs.HostOps = .{
    .open = opfs_open,
    .close = opfs_close,
    .read = opfs_read,
    .write = opfs_write,
    .truncate = opfs_truncate,
    .size = opfs_size,
    .sync = opfs_sync,
    .delete = opfs_delete,
    .access = opfs_access,
    .ref_set = externref_set,
    .ref_get = externref_get,
    .ref_clear = externref_clear,
};
const Io = std.Io;
const Value = quickjs.Value;

// =============================================================================
// Globals
//
// These live in linear memory, so they are part of the wizer snapshot that
// `qjs build` produces.
// =============================================================================

var g_gpa: std.mem.Allocator = if (builtin.os.tag == .wasi)
    std.heap.wasm_allocator
else
    std.heap.page_allocator;
var g_io: ?Io = null;
var g_rt: ?*quickjs.Runtime = null;
var g_ctx: ?*quickjs.Context = null;
var g_preinitialized: bool = false;

/// Path of the bundle that `wizer.initialize` must evaluate, relative to a
/// directory mapped to `/bundle` by wizer's `--mapdir` option.
const bundle_path = "/bundle/bundle.mjs";

/// Web platform globals that QuickJS-ng lacks. Evaluated before any other
/// JavaScript so that bundled polyfills can rely on them. The core script
/// must run first: the URL bundle needs TextDecoder during its own
/// initialization.
const web_globals_js = @embedFile("web_globals.bundle.js");
const url_globals_js = @embedFile("url_globals.bundle.js");

// =============================================================================
// Host imports (provided by tools/run-qjs.mjs)
// =============================================================================

const host = struct {
    extern "qjs_host" fn spawn(argv: [*]const u8, len: usize) i32;
    extern "qjs_host" fn log(ptr: [*]const u8, len: usize) void;

    /// Suspends the wasm stack (JSPI) for `ms` milliseconds. Used to idle
    /// until the next pending timer instead of spinning on the virtual clock.
    extern "qjs_host" fn timer_wait(ms: i64) void;

    /// Transpiles `src` on a host worker thread with bin/ttsc's ttsc.wasm.
    /// `mode` is kept for compatibility (ttsc ignores it). On success returns
    /// the number of bytes written to `out`; on failure returns a negative
    /// value.
    extern "qjs_host" fn transpile(
        src_ptr: [*]const u8,
        src_len: usize,
        lang_ptr: [*]const u8,
        lang_len: usize,
        mode_ptr: [*]const u8,
        mode_len: usize,
        out_ptr: [*]u8,
        out_cap: usize,
    ) i32;
};

// =============================================================================
// Small output helpers
// =============================================================================

fn writeStdout(bytes: []const u8) void {
    const io = g_io orelse return;
    Io.File.stdout().writeStreamingAll(io, bytes) catch {};
}

fn writeStderr(bytes: []const u8) void {
    const io = g_io orelse return;
    Io.File.stderr().writeStreamingAll(io, bytes) catch {};
}

fn printStdout(comptime fmt: []const u8, args: anytype) void {
    var buf: [4096]u8 = undefined;
    const s = std.fmt.bufPrint(&buf, fmt, args) catch {
        writeStdout(fmt);
        return;
    };
    writeStdout(s);
}

fn printStderr(comptime fmt: []const u8, args: anytype) void {
    var buf: [4096]u8 = undefined;
    const s = std.fmt.bufPrint(&buf, fmt, args) catch {
        writeStderr(fmt);
        return;
    };
    writeStderr(s);
}

fn eql(a: []const u8, b: []const u8) bool {
    return std.mem.eql(u8, a, b);
}

// =============================================================================
// JavaScript helpers exposed to the context
// =============================================================================

fn objectString(ctx: *quickjs.Context, val: Value) ?[:0]const u8 {
    const sval = val.toObjectString(ctx);
    if (sval.isException()) return null;
    defer sval.deinit(ctx);
    const cstr = sval.toCString(ctx) orelse return null;
    defer ctx.freeCString(cstr);
    const len = std.mem.len(cstr);
    const buf = g_gpa.allocSentinel(u8, len, 0) catch return null;
    @memcpy(buf, cstr[0..len]);
    return buf;
}

fn jsPrint(
    ctx_opt: ?*quickjs.Context,
    _: Value,
    args: []const c.JSValue,
) Value {
    const ctx = ctx_opt orelse return Value.undefined;
    var buf: std.ArrayList(u8) = .empty;
    defer buf.deinit(g_gpa);

    for (args, 0..) |arg_c, i| {
        if (i != 0) buf.append(g_gpa, ' ') catch {};
        const arg = Value.fromCVal(arg_c);
        if (arg.toCString(ctx)) |cstr| {
            defer ctx.freeCString(cstr);
            buf.appendSlice(g_gpa, std.mem.span(cstr)) catch {};
        } else {
            const exc = ctx.getException();
            defer exc.deinit(ctx);
            if (objectString(ctx, arg)) |s| {
                defer g_gpa.free(s);
                buf.appendSlice(g_gpa, s) catch {};
            } else {
                buf.appendSlice(g_gpa, "<exception>") catch {};
            }
        }
    }
    buf.append(g_gpa, '\n') catch {};
    writeStdout(buf.items);
    return Value.undefined;
}

fn jsGc(
    ctx_opt: ?*quickjs.Context,
    _: Value,
    _: []const c.JSValue,
) Value {
    if (ctx_opt) |ctx| ctx.getRuntime().runGC();
    return Value.undefined;
}

/// Set when guest code calls `exit()`/`process.exit()`. The job loop notices
/// it on the next error boundary and exits from C, because calling
/// `std.process.exit` directly from a JS native unwinds as a catchable
/// WASI exit error instead of terminating the process.
var g_exit_code: i32 = -1;

fn jsExit(
    ctx_opt: ?*quickjs.Context,
    _: Value,
    args: []const c.JSValue,
) Value {
    var code: i32 = 0;
    if (args.len > 0) {
        const arg = Value.fromCVal(args[0]);
        code = @max(0, @min(255, arg.toInt32(ctx_opt orelse return Value.undefined) catch 0));
    }
    g_exit_code = code;
    const ctx = ctx_opt orelse std.process.exit(@intCast(code));
    return ctx.throwInternalError("process.exit");
}

/// Exits from C if guest code requested it; returns false otherwise.
fn exitIfRequested() bool {
    if (g_exit_code >= 0) std.process.exit(@intCast(g_exit_code));
    return false;
}

fn jsOsNow(
    _: ?*quickjs.Context,
    _: Value,
    _: []const c.JSValue,
) Value {
    const io = g_io orelse return Value.initFloat64(0);
    const now = Io.Timestamp.now(io, .real).toMilliseconds();
    return Value.initFloat64(@floatFromInt(now));
}

fn jsBjsonStringify(
    ctx_opt: ?*quickjs.Context,
    _: Value,
    args: []const c.JSValue,
) Value {
    const ctx = ctx_opt orelse return Value.undefined;
    if (args.len < 1) return Value.undefined;
    const val = Value.fromCVal(args[0]);
    return val.jsonStringify(ctx, Value.undefined, Value.undefined);
}

fn jsBjsonParse(
    ctx_opt: ?*quickjs.Context,
    _: Value,
    args: []const c.JSValue,
) Value {
    const ctx = ctx_opt orelse return Value.undefined;
    if (args.len < 1) return Value.undefined;
    const val = Value.fromCVal(args[0]);
    const str = val.toCString(ctx) orelse return Value.exception;
    defer ctx.freeCString(str);
    return Value.parseJSON(ctx, std.mem.span(str), "<bjson>");
}

/// Synchronous CommonJS-style module load, exposed to JS as
/// `globalThis.__qjsRequireSync`. The regular module loader runs
/// synchronously (JSPI suspends it on async host I/O); `JS_LoadModule`
/// wraps the result in a promise, so we pump the job queue until it
/// settles and then return the namespace or rethrow the rejection.
fn jsRequireSync(
    ctx_opt: ?*quickjs.Context,
    _: Value,
    args: []const c.JSValue,
) Value {
    const ctx = ctx_opt orelse return Value.undefined;
    if (args.len < 1) {
        return ctx.throwTypeError("require(name) expects a string");
    }

    const spec_val = Value.fromCVal(args[0]);
    const spec_z = spec_val.toCString(ctx) orelse return Value.exception;
    defer ctx.freeCString(spec_z);

    const promise = Value.fromCVal(
        c.JS_LoadModule(ctx.cval(), "<require>", spec_z),
    );
    if (promise.isException()) return Value.exception;
    defer promise.deinit(ctx);

    const rt = ctx.getRuntime();
    while (promise.promiseState(ctx) == .pending) {
        if (!rt.isJobPending()) break;
        _ = rt.executePendingJob() catch return Value.exception;
    }

    switch (promise.promiseState(ctx)) {
        .fulfilled => return promise.promiseResult(ctx),
        .rejected => {
            const reason = promise.promiseResult(ctx);
            return reason.throw(ctx);
        },
        else => return ctx.throwInternalError(
            "require: module did not finish loading",
        ),
    }
}

fn defineGlobal(
    ctx: *quickjs.Context,
    name: [:0]const u8,
    val: Value,
) void {
    const global = ctx.getGlobalObject();
    defer global.deinit(ctx);
    global.setPropertyStr(ctx, name.ptr, val) catch {};
}

fn defineFn(
    ctx: *quickjs.Context,
    obj: Value,
    name: [:0]const u8,
    comptime func: quickjs.cfunc.Func,
    length: i32,
) void {
    obj.setPropertyStr(
        ctx,
        name.ptr,
        Value.initCFunction(ctx, func, name, length),
    ) catch {};
}

/// Installs the same globals as `js_std_add_helpers` plus a few extras that
/// make quickjs-ng comfortable to use under WASI.
fn setupContext(ctx: *quickjs.Context) void {
    const global = ctx.getGlobalObject();
    defer global.deinit(ctx);

    const console = Value.initObject(ctx);
    defineFn(ctx, console, "log", jsPrint, 1);
    defineFn(ctx, console, "info", jsPrint, 1);
    defineFn(ctx, console, "debug", jsPrint, 1);
    defineFn(ctx, console, "warn", jsPrint, 1);
    defineFn(ctx, console, "error", jsPrint, 1);
    defineFn(ctx, console, "trace", jsPrint, 1);
    defineFn(ctx, console, "dir", jsPrint, 1);
    defineFn(ctx, console, "assert", jsPrint, 1);
    defineFn(ctx, console, "table", jsPrint, 1);
    defineFn(ctx, console, "group", jsPrint, 1);
    defineFn(ctx, console, "groupCollapsed", jsPrint, 1);
    defineFn(ctx, console, "groupEnd", jsPrint, 0);
    defineFn(ctx, console, "time", jsPrint, 1);
    defineFn(ctx, console, "timeLog", jsPrint, 1);
    defineFn(ctx, console, "timeEnd", jsPrint, 1);
    defineFn(ctx, console, "count", jsPrint, 1);
    defineFn(ctx, console, "countReset", jsPrint, 1);
    defineFn(ctx, console, "clear", jsPrint, 0);
    global.setPropertyStr(ctx, "console", console) catch {};

    defineFn(ctx, global, "print", jsPrint, 1);
    defineFn(ctx, global, "gc", jsGc, 0);
    defineFn(ctx, global, "__qjsRequireSync", jsRequireSync, 1);

    const navigator = Value.initObject(ctx);
    navigator.setPropertyStr(
        ctx,
        "userAgent",
        Value.initStringLen(ctx, "quickjs-ng/wasi"),
    ) catch {};
    global.setPropertyStr(ctx, "navigator", navigator) catch {};

    global.setPropertyStr(ctx, "scriptArgs", Value.initArray(ctx)) catch {};
    global.setPropertyStr(ctx, "execArgv", Value.initArray(ctx)) catch {};
    global.setPropertyStr(
        ctx,
        "argv0",
        Value.initStringLen(ctx, "qjs"),
    ) catch {};
}

fn setupRuntime(rt: *quickjs.Runtime, ctx: *quickjs.Context) void {
    // Cap the QuickJS heap at (just under) 4 GiB. On wasm32 usize is 32-bit,
    // so maxInt(u32) is the largest expressible limit; 0 would mean
    // "unlimited". Allocation failures become catchable JS out-of-memory
    // errors and the runtime exits cleanly.
    rt.setMemoryLimit(std.math.maxInt(u32));
    rt.setModuleLoaderFunc(void, {}, null, moduleLoader);
    setupContext(ctx);
}

var g_web_globals_installed: bool = false;

/// Installs the embedded web platform globals. Called on demand when a
/// module imports `qjs:web-globals`, so runtimes that do not need them
/// (for example plain `qjs -e`) do not pay for parsing URL/TextDecoder.
fn installWebGlobals(ctx: *quickjs.Context) void {
    if (g_web_globals_installed) return;
    g_web_globals_installed = true;

    const core = ctx.eval(web_globals_js, "<web-globals>", .{});
    defer core.deinit(ctx);
    if (core.isException()) dumpError(ctx);

    const url = ctx.eval(url_globals_js, "<url-globals>", .{});
    defer url.deinit(ctx);
    if (url.isException()) dumpError(ctx);
}

fn emptyModuleInit(_: *quickjs.Context, _: *quickjs.ModuleDef) bool {
    return true;
}

fn webGlobalsModule(ctx: *quickjs.Context) ?*quickjs.ModuleDef {
    installWebGlobals(ctx);
    return quickjs.ModuleDef.init(ctx, "qjs:web-globals", emptyModuleInit);
}

/// Runs pending promise jobs and due timers. When only future timers remain,
/// the wasm stack suspends on the host until the earliest deadline (JSPI);
/// this keeps servers alive without busy-waiting on the virtual clock.
fn jobLoop(ctx: *quickjs.Context) bool {
    const rt = ctx.getRuntime();
    while (true) {
        // Guest code may have called exit() while a promise job ran; the
        // rejection alone would keep waiting on timers forever.
        if (exitIfRequested()) {}
        var worked = false;
        while (rt.isJobPending()) {
            _ = rt.executePendingJob() catch {
                if (exitIfRequested()) {}
                dumpError(ctx);
                return false;
            };
            worked = true;
        }

        // Give the web-globals timer queue a chance to run due timers.
        const res = ctx.eval(
            "globalThis.__qjs_timers_drain ? __qjs_timers_drain() : 0",
            "<timers>",
            .{},
        );
        defer res.deinit(ctx);
        if (res.isException()) {
            if (exitIfRequested()) {}
            dumpError(ctx);
            return false;
        }
        if ((res.toInt32(ctx) catch 0) > 0) worked = true;
        if (worked) continue;

        // Nothing to do right now: block on the host until the next timer.
        const nxt = ctx.eval(
            "globalThis.__qjs_timers_next ? __qjs_timers_next() : -1",
            "<timers>",
            .{},
        );
        defer nxt.deinit(ctx);
        if (nxt.isException()) {
            if (exitIfRequested()) {}
            dumpError(ctx);
            return false;
        }
        const delay = nxt.toInt32(ctx) catch -1;
        if (delay < 0) break;
        host.timer_wait(@intCast(delay));

        const adv = ctx.eval(
            "globalThis.__qjs_timers_advance ? __qjs_timers_advance() : 0",
            "<timers>",
            .{},
        );
        defer adv.deinit(ctx);
        if (adv.isException()) {
            if (exitIfRequested()) {}
            dumpError(ctx);
            return false;
        }
    }
    return true;
}

fn dumpError(ctx: *quickjs.Context) void {
    const exc = ctx.getException();
    defer exc.deinit(ctx);

    if (exc.isError()) {
        const stack = exc.getPropertyStr(ctx, "stack");
        defer stack.deinit(ctx);
        if (stack.isString()) {
            if (stack.toCString(ctx)) |cstr| {
                defer ctx.freeCString(cstr);
                const text = std.mem.span(cstr);
                if (text.len > 0) {
                    writeStderr(text);
                    if (text[text.len - 1] != '\n') writeStderr("\n");
                    return;
                }
            }
        }
    }

    if (exc.toCString(ctx)) |cstr| {
        defer ctx.freeCString(cstr);
        writeStderr(std.mem.span(cstr));
        writeStderr("\n");
        return;
    }

    if (objectString(ctx, exc)) |s| {
        defer g_gpa.free(s);
        writeStderr(s);
        writeStderr("\n");
    } else {
        writeStderr("qjs: unknown exception\n");
    }
}

/// Sets `import.meta.url` and `import.meta.main` on a compiled module value.
fn setImportMeta(
    ctx: *quickjs.Context,
    func_val: Value,
    filename: []const u8,
    is_main: bool,
) bool {
    const ptr = func_val.getPtr() orelse return true;
    const m: *quickjs.ModuleDef = @ptrCast(@alignCast(ptr));

    const meta = m.getImportMeta(ctx);
    if (meta.isException()) return false;
    defer meta.deinit(ctx);

    var url_buf: [1024]u8 = undefined;
    const url = std.fmt.bufPrint(&url_buf, "file://{s}", .{filename}) catch filename;
    meta.setPropertyStr(ctx, "url", Value.initStringLen(ctx, url)) catch {
        return false;
    };
    meta.setPropertyStr(ctx, "main", Value.initBool(is_main)) catch {
        return false;
    };
    return true;
}

// =============================================================================
// Module loading
// =============================================================================

fn registryModuleInit(ctx: *quickjs.Context, m: *quickjs.ModuleDef) bool {
    const name_atom = m.getName(ctx);
    defer name_atom.deinit(ctx);

    const global = ctx.getGlobalObject();
    defer global.deinit(ctx);
    const registry = global.getPropertyStr(ctx, "__qjs_modules");
    defer registry.deinit(ctx);
    if (!registry.isObject()) return false;

    const ns = registry.getProperty(ctx, name_atom);
    if (ns.isException() or ns.isUndefined()) {
        ns.deinit(ctx);
        return false;
    }
    defer ns.deinit(ctx);

    const props = ns.getOwnPropertyNames(ctx, .{ .string_mask = true }) catch {
        return false;
    };
    defer Value.freePropertyEnum(ctx, props);

    var has_default = false;
    for (props) |p| {
        const key = p.atom.toCString(ctx) orelse continue;
        defer ctx.freeCString(key);
        if (eql(std.mem.span(key), "default")) has_default = true;
        const val = ns.getProperty(ctx, p.atom);
        if (val.isException()) {
            val.deinit(ctx);
            return false;
        }
        if (!m.setExport(ctx, std.mem.span(key), val)) {
            val.deinit(ctx);
            return false;
        }
    }
    if (!has_default) {
        if (!m.setExport(ctx, "default", ns.dup(ctx))) return false;
    }
    return true;
}

/// Builds a native module whose exports mirror `globalThis.__qjs_modules`.
fn registryModule(
    ctx: *quickjs.Context,
    name: [:0]const u8,
) ?*quickjs.ModuleDef {
    const global = ctx.getGlobalObject();
    defer global.deinit(ctx);
    const registry = global.getPropertyStr(ctx, "__qjs_modules");
    defer registry.deinit(ctx);
    if (!registry.isObject()) return null;

    const ns = registry.getPropertyStr(ctx, name.ptr);
    defer ns.deinit(ctx);
    if (ns.isUndefined() or ns.isException()) return null;

    const m = quickjs.ModuleDef.init(ctx, name, registryModuleInit) orelse
        return null;

    const props = ns.getOwnPropertyNames(ctx, .{ .string_mask = true }) catch {
        return m;
    };
    defer Value.freePropertyEnum(ctx, props);
    var has_default = false;
    for (props) |p| {
        const key = p.atom.toCString(ctx) orelse continue;
        defer ctx.freeCString(key);
        if (eql(std.mem.span(key), "default")) has_default = true;
        _ = m.addExport(ctx, std.mem.span(key));
    }
    if (!has_default) _ = m.addExport(ctx, "default");
    return m;
}

fn stdModule(ctx: *quickjs.Context) ?*quickjs.ModuleDef {
    const m = quickjs.ModuleDef.init(ctx, "qjs:std", stdModuleInit) orelse
        return null;
    _ = m.addExport(ctx, "print");
    _ = m.addExport(ctx, "exit");
    return m;
}

fn stdModuleInit(ctx: *quickjs.Context, m: *quickjs.ModuleDef) bool {
    if (!m.setExport(
        ctx,
        "print",
        Value.initCFunction(ctx, jsPrint, "print", 1),
    )) return false;
    if (!m.setExport(
        ctx,
        "exit",
        Value.initCFunction(ctx, jsExit, "exit", 1),
    )) return false;
    return true;
}

fn osModule(ctx: *quickjs.Context) ?*quickjs.ModuleDef {
    const m = quickjs.ModuleDef.init(ctx, "qjs:os", osModuleInit) orelse
        return null;
    _ = m.addExport(ctx, "now");
    _ = m.addExport(ctx, "platform");
    _ = m.addExport(ctx, "arch");
    return m;
}

fn osModuleInit(ctx: *quickjs.Context, m: *quickjs.ModuleDef) bool {
    if (!m.setExport(
        ctx,
        "now",
        Value.initCFunction(ctx, jsOsNow, "now", 0),
    )) return false;
    if (!m.setExport(
        ctx,
        "platform",
        Value.initStringLen(ctx, "wasi"),
    )) return false;
    if (!m.setExport(
        ctx,
        "arch",
        Value.initStringLen(ctx, "wasm32"),
    )) return false;
    return true;
}

fn bjsonModule(ctx: *quickjs.Context) ?*quickjs.ModuleDef {
    const m = quickjs.ModuleDef.init(ctx, "qjs:bjson", bjsonModuleInit) orelse
        return null;
    _ = m.addExport(ctx, "stringify");
    _ = m.addExport(ctx, "parse");
    return m;
}

fn bjsonModuleInit(ctx: *quickjs.Context, m: *quickjs.ModuleDef) bool {
    if (!m.setExport(
        ctx,
        "stringify",
        Value.initCFunction(ctx, jsBjsonStringify, "stringify", 1),
    )) return false;
    if (!m.setExport(
        ctx,
        "parse",
        Value.initCFunction(ctx, jsBjsonParse, "parse", 1),
    )) return false;
    return true;
}

fn fileModule(
    ctx: *quickjs.Context,
    name: [:0]const u8,
) ?*quickjs.ModuleDef {
    const io = g_io orelse return null;
    const source = Io.Dir.cwd().readFileAllocOptions(
        io,
        name,
        g_gpa,
        .limited(1 << 30),
        .of(u8),
        0,
    ) catch {
        var buf: [512]u8 = undefined;
        const message = std.fmt.bufPrintSentinel(
            &buf,
            "could not load module '{s}'",
            .{name},
            0,
        ) catch "could not load module";
        _ = ctx.throwReferenceError(message);
        return null;
    };
    defer g_gpa.free(source);

    var transpiled: ?[:0]u8 = null;
    defer if (transpiled) |t| g_gpa.free(t);
    var effective: [:0]const u8 = source;
    if (tsLangForPath(name)) |lang| {
        if (!eql(lang, "js")) {
            transpiled = transpileTsSource(g_gpa, source, lang) orelse {
                _ = ctx.throwInternalError("ttsc failed to transpile module");
                return null;
            };
            effective = transpiled.?;
        }
    }

    const val = ctx.eval(effective, name, .{
        .type = .module,
        .compile_only = true,
    });
    if (val.isException()) return null;
    if (!setImportMeta(ctx, val, name, false)) {
        val.deinit(ctx);
        return null;
    }
    const ptr = val.getPtr() orelse {
        val.deinit(ctx);
        return null;
    };
    return @ptrCast(@alignCast(ptr));
}

fn jsYukuTranspile(
    ctx_opt: ?*quickjs.Context,
    _: Value,
    args: []const c.JSValue,
) Value {
    const ctx = ctx_opt orelse return Value.undefined;
    if (args.len < 1) {
        return ctx.throwTypeError("transpile(source, lang) expects a source string");
    }

    const src_val = Value.fromCVal(args[0]);
    const source_z = src_val.toCString(ctx) orelse return Value.exception;
    defer ctx.freeCString(source_z);
    const source = std.mem.span(source_z);

    var lang_storage: [16]u8 = undefined;
    var lang: []const u8 = "ts";
    if (args.len > 1) {
        const lang_val = Value.fromCVal(args[1]);
        const lang_z = lang_val.toCString(ctx) orelse return Value.exception;
        defer ctx.freeCString(lang_z);
        const lang_slice = std.mem.span(lang_z);
        const n = @min(lang_slice.len, lang_storage.len);
        @memcpy(lang_storage[0..n], lang_slice[0..n]);
        lang = lang_storage[0..n];
    }

    var mode: []const u8 = "strip";
    if (args.len > 2) {
        const mode_val = Value.fromCVal(args[2]);
        const mode_z = mode_val.toCString(ctx) orelse return Value.exception;
        defer ctx.freeCString(mode_z);
        mode = std.mem.span(mode_z);
    }

    // Small-vec optimization: transpiler output usually fits in the stack
    // buffer, so the common path performs no heap allocation. If the 4 GiB
    // hard limits are ever hit, allocation fails and a JS exception is
    // thrown instead of trapping.
    const cap = @max(64 * 1024, source.len * 4);
    var scratch_buf: [64 * 1024]u8 align(16) = undefined;
    var scratch: std.heap.BufferFirstAllocator = .init(&scratch_buf, g_gpa);
    const out = scratch.allocator().alloc(u8, cap) catch
        return ctx.throwOutOfMemory();
    defer scratch.allocator().free(out);
    @memset(out, 0);

    const n = host.transpile(
        source.ptr,
        source.len,
        lang.ptr,
        lang.len,
        mode.ptr,
        mode.len,
        out.ptr,
        out.len,
    );
    if (n < 0) {
        if (n == -1) {
            // The worker writes the diagnostic message into `out`.
            const message = std.mem.sliceTo(out, 0);
            var buf: [512]u8 = undefined;
            const text = std.fmt.bufPrintSentinel(
                &buf,
                "transpile failed: {s}",
                .{message},
                0,
            ) catch "transpile failed";
            return ctx.throwInternalError(text);
        }
        return ctx.throwInternalError("transpile worker unavailable");
    }
    return Value.initStringLen(ctx, out[0..@intCast(n)]);
}

fn ttscModuleInit(ctx: *quickjs.Context, m: *quickjs.ModuleDef) bool {
    if (!m.setExport(
        ctx,
        "transpile",
        Value.initCFunction(ctx, jsYukuTranspile, "transpile", 2),
    )) return false;
    return true;
}

fn ttscModule(ctx: *quickjs.Context) ?*quickjs.ModuleDef {
    const m = quickjs.ModuleDef.init(ctx, "qjs:ttsc", ttscModuleInit) orelse
        return null;
    _ = m.addExport(ctx, "transpile");
    return m;
}

fn moduleLoader(
    _: void,
    ctx: *quickjs.Context,
    name: [:0]const u8,
) ?*quickjs.ModuleDef {
    if (eql(name, "qjs:std")) return stdModule(ctx);
    if (eql(name, "qjs:os")) return osModule(ctx);
    if (eql(name, "qjs:bjson")) return bjsonModule(ctx);
    if (eql(name, "qjs:web-globals")) return webGlobalsModule(ctx);
    if (eql(name, "qjs:ttsc") or eql(name, "qjs:yuku")) return ttscModule(ctx);
    if (eql(name, "node:sqlite") or eql(name, "sqlite")) {
        return sqlite_api.module(ctx, name);
    }
    if (registryModule(ctx, name)) |m| return m;
    return fileModule(ctx, name);
}

// =============================================================================
// Evaluation
// =============================================================================

fn evalBuf(
    ctx: *quickjs.Context,
    buf: []const u8,
    filename: []const u8,
    flags: quickjs.EvalFlags,
    is_main: bool,
) bool {
    const fname = g_gpa.dupeSentinel(u8, filename, 0) catch return false;
    defer g_gpa.free(fname);

    var val: Value = undefined;
    if (flags.type == .module) {
        const compiled = ctx.eval(buf, fname, .{
            .type = .module,
            .compile_only = true,
        });
        if (compiled.isException()) {
            dumpError(ctx);
            return false;
        }
        if (!setImportMeta(ctx, compiled, filename, is_main)) {
            compiled.deinit(ctx);
            dumpError(ctx);
            return false;
        }
        val = ctx.evalFunction(compiled);
    } else {
        val = ctx.eval(buf, fname, flags);
    }
    defer val.deinit(ctx);

    if (val.isException()) {
        if (exitIfRequested()) {}
        dumpError(ctx);
        return false;
    }
    if (!jobLoop(ctx)) return false;

    // Modules with top-level await evaluate to a promise; surface rejections
    // instead of silently dropping them (which would end the process).
    if (val.isPromise() and val.promiseState(ctx) == .rejected) {
        const reason = val.promiseResult(ctx);
        defer reason.deinit(ctx);
        writeStderr("qjs: top-level await rejected: ");
        if (reason.isError()) {
            const name_val = reason.getPropertyStr(ctx, "name");
            defer name_val.deinit(ctx);
            const msg_val = reason.getPropertyStr(ctx, "message");
            defer msg_val.deinit(ctx);
            if (name_val.toCString(ctx)) |cstr| {
                defer ctx.freeCString(cstr);
                writeStderr(std.mem.span(cstr));
                writeStderr(": ");
            }
            if (msg_val.toCString(ctx)) |cstr| {
                defer ctx.freeCString(cstr);
                writeStderr(std.mem.span(cstr));
            }
        } else if (objectString(ctx, reason)) |s| {
            defer g_gpa.free(s);
            writeStderr(s);
        } else {
            writeStderr("<unknown rejection>");
        }
        if (reason.isError()) {
            const stack = reason.getPropertyStr(ctx, "stack");
            defer stack.deinit(ctx);
            if (stack.isString()) {
                if (stack.toCString(ctx)) |cstr| {
                    defer ctx.freeCString(cstr);
                    writeStderr("\n");
                    writeStderr(std.mem.span(cstr));
                }
            }
        }
        writeStderr("\n");
        return false;
    }
    return true;
}

/// Transpiles TypeScript through the host's ttsc.wasm (bin/ttsc). Returns
/// null for non-TypeScript input or when transpilation fails.
fn transpileTsSource(
    allocator: std.mem.Allocator,
    source: []const u8,
    lang: []const u8,
) ?[:0]u8 {
    const cap = @max(64 * 1024, source.len * 4);
    var scratch_buf: [64 * 1024]u8 align(16) = undefined;
    var scratch: std.heap.BufferFirstAllocator = .init(&scratch_buf, g_gpa);
    const out = scratch.allocator().alloc(u8, cap) catch return null;
    defer scratch.allocator().free(out);
    @memset(out, 0);
    const n = host.transpile(
        source.ptr,
        source.len,
        lang.ptr,
        lang.len,
        "strip".ptr,
        "strip".len,
        out.ptr,
        out.len,
    );
    if (n < 0) return null;
    const len: usize = @intCast(n);
    const buf = allocator.allocSentinel(u8, len, 0) catch return null;
    @memcpy(buf[0..len], out[0..len]);
    return buf;
}

fn evalFile(
    ctx: *quickjs.Context,
    filename: []const u8,
    module: i8,
) bool {
    const io = g_io orelse return false;
    const source = Io.Dir.cwd().readFileAllocOptions(
        io,
        filename,
        g_gpa,
        .limited(1 << 30),
        .of(u8),
        0,
    ) catch |err| {
        printStderr("qjs: cannot open file '{s}' ({t})\n", .{ filename, err });
        return false;
    };
    defer g_gpa.free(source);

    var transpiled: ?[:0]u8 = null;
    defer if (transpiled) |t| g_gpa.free(t);
    var effective: [:0]const u8 = source;
    if (tsLangForPath(filename)) |lang| {
        if (!eql(lang, "js")) {
            transpiled = transpileTsSource(g_gpa, source, lang) orelse {
                printStderr("qjs: ttsc failed for '{s}'\n", .{filename});
                return false;
            };
            effective = transpiled.?;
        }
    }

    var is_module = module == 1;
    if (module < 0) {
        is_module = std.mem.endsWith(u8, filename, ".mjs") or
            quickjs.detectModule(effective);
    }
    const flags: quickjs.EvalFlags = if (is_module)
        .{ .type = .module }
    else
        .{};
    return evalBuf(ctx, effective, filename, flags, true);
}

// =============================================================================
// REPL
// =============================================================================

fn runRepl(ctx: *quickjs.Context) void {
    const io = g_io orelse return;
    var stdin = Io.File.stdin();
    var read_buf: [4096]u8 = undefined;
    var reader = stdin.readerStreaming(io, &read_buf);

    while (true) {
        writeStdout("qjs > ");
        const line = reader.interface.takeDelimiterInclusive('\n') catch {
            writeStdout("\n");
            break;
        };
        const trimmed = std.mem.trimEnd(u8, line, "\r\n");
        if (trimmed.len == 0 and line.len == 0) break;
        if (trimmed.len == 0) continue;

        // Copy into a stable, NUL-terminated buffer before handing the
        // source to the engine; the reader may reuse its buffer on the
        // next read and QuickJS can look one byte past the end of input.
        var line_copy: [4096]u8 = @splat(0);
        if (trimmed.len >= line_copy.len) continue;
        @memcpy(line_copy[0..trimmed.len], trimmed);
        const res = ctx.eval(line_copy[0..trimmed.len], "<repl>", .{});
        defer res.deinit(ctx);
        if (res.isException()) {
            dumpError(ctx);
            continue;
        }
        _ = jobLoop(ctx);
        if (!res.isUndefined()) {
            if (res.toCString(ctx)) |cstr| {
                defer ctx.freeCString(cstr);
                writeStdout(std.mem.span(cstr));
                writeStdout("\n");
            }
        }
    }
}

// =============================================================================
// `qjs build`
// =============================================================================

fn runHostCommand(
    gpa: std.mem.Allocator,
    argv: []const []const u8,
) !void {
    // Small-vec optimization: the encoded argv almost always fits in the
    // stack buffer, so the common case performs no heap allocation.
    var scratch_buf: [4096]u8 align(16) = undefined;
    var scratch: std.heap.BufferFirstAllocator = .init(&scratch_buf, gpa);
    const alloc = scratch.allocator();

    var buf: std.ArrayList(u8) = .empty;
    defer buf.deinit(alloc);
    for (argv, 0..) |arg, i| {
        if (i != 0) try buf.append(alloc, 0);
        try buf.appendSlice(alloc, arg);
    }
    const rc = host.spawn(buf.items.ptr, buf.items.len);
    if (rc != 0) return error.HostCommandFailed;
}

fn envGet(init: std.process.Init, key: []const u8) ?[]const u8 {
    return init.environ_map.get(key);
}

fn isIdentChar(ch: u8) bool {
    return std.ascii.isAlphanumeric(ch) or ch == '_' or ch == '$';
}

fn scanBareImports(
    gpa: std.mem.Allocator,
    src: []const u8,
    out: *std.ArrayList([]const u8),
) !void {
    var i: usize = 0;
    while (i < src.len) {
        const ch = src[i];
        // Skip comments so JSDoc examples like `from "itty-router"` do not
        // register bogus modules.
        if (ch == '/' and i + 1 < src.len) {
            if (src[i + 1] == '/') {
                i += 2;
                while (i < src.len and src[i] != '\n') i += 1;
                continue;
            }
            if (src[i + 1] == '*') {
                i += 2;
                while (i + 1 < src.len and
                    !(src[i] == '*' and src[i + 1] == '/')) i += 1;
                i = @min(i + 2, src.len);
                continue;
            }
        }
        if (ch != '"' and ch != '\'') {
            i += 1;
            continue;
        }
        // Find the word immediately before the quote.
        var j = i;
        while (j > 0 and (src[j - 1] == ' ' or src[j - 1] == '\t')) j -= 1;
        var k = j;
        while (k > 0 and isIdentChar(src[k - 1])) k -= 1;
        const word = src[k..j];

        const start = i + 1;
        var end = start;
        while (end < src.len and src[end] != ch) : (end += 1) {
            if (src[end] == '\\') end += 1;
        }
        i = if (end < src.len) end + 1 else src.len;

        if (!eql(word, "from") and !eql(word, "import")) continue;
        const spec = src[start..@min(end, src.len)];
        if (spec.len == 0) continue;
        if (spec[0] == '.' or spec[0] == '/' or spec[0] == '#') continue;
        if (std.mem.indexOf(u8, spec, "://") != null) continue;
        if (std.mem.startsWith(u8, spec, "node:")) continue;
        if (std.mem.startsWith(u8, spec, "qjs:")) continue;
        if (std.mem.startsWith(u8, spec, "data:")) continue;
        if (std.mem.startsWith(u8, spec, "wasm:")) continue;

        for (out.items) |seen| {
            if (eql(seen, spec)) break;
        } else {
            try out.append(gpa, try gpa.dupe(u8, spec));
        }
    }
}

fn appendEscaped(
    gpa: std.mem.Allocator,
    out: *std.ArrayList(u8),
    s: []const u8,
) !void {
    for (s) |ch| {
        switch (ch) {
            '"' => try out.appendSlice(gpa, "\\\""),
            '\\' => try out.appendSlice(gpa, "\\\\"),
            '\n' => try out.appendSlice(gpa, "\\n"),
            '\r' => try out.appendSlice(gpa, "\\r"),
            '\t' => try out.appendSlice(gpa, "\\t"),
            else => try out.append(gpa, ch),
        }
    }
}

fn appendLine(
    gpa: std.mem.Allocator,
    out: *std.ArrayList(u8),
    s: []const u8,
) !void {
    try out.appendSlice(gpa, s);
    try out.append(gpa, '\n');
}

fn tsLangForPath(path: []const u8) ?[]const u8 {
    const ext = std.fs.path.extension(path);
    if (eql(ext, ".ts") or eql(ext, ".mts") or eql(ext, ".cts")) return "ts";
    if (eql(ext, ".tsx")) return "tsx";
    if (eql(ext, ".js") or eql(ext, ".mjs") or eql(ext, ".cjs")) return "js";
    if (eql(ext, ".jsx")) return "jsx";
    return null;
}

/// Writes a single-file bundle without esbuild. TypeScript is erased by
/// bin/ttsc's ttsc.wasm (qjs:ttsc / qjs_host.transpile).
fn tryDirectBundle(
    gpa: std.mem.Allocator,
    io: Io,
    cwd: Io.Dir,
    input_path: []const u8,
    source: []const u8,
    workdir: []const u8,
    lang: []const u8,
) !void {
    const basename = std.fs.path.basename(input_path);
    const source_path = try std.fmt.allocPrint(
        gpa,
        "{s}/source_{s}",
        .{ workdir, basename },
    );
    defer gpa.free(source_path);

    if (eql(lang, "ts") or eql(lang, "tsx")) {
        const cap = @max(64 * 1024, source.len * 4);
        var scratch_buf: [64 * 1024]u8 align(16) = undefined;
        var scratch: std.heap.BufferFirstAllocator = .init(&scratch_buf, gpa);
        const out = try scratch.allocator().alloc(u8, cap);
        defer scratch.allocator().free(out);
        @memset(out, 0);
        const n = host.transpile(
            source.ptr,
            source.len,
            lang.ptr,
            lang.len,
            "strip".ptr,
            "strip".len,
            out.ptr,
            out.len,
        );
        if (n < 0) return error.TranspileFailed;
        try cwd.writeFile(io, .{
            .sub_path = source_path,
            .data = out[0..@intCast(n)],
        });
    } else {
        try cwd.writeFile(io, .{ .sub_path = source_path, .data = source });
    }

    var scratch_buf: [1024]u8 align(16) = undefined;
    var scratch: std.heap.BufferFirstAllocator = .init(&scratch_buf, gpa);
    const alloc = scratch.allocator();

    var wrapper: std.ArrayList(u8) = .empty;
    defer wrapper.deinit(alloc);
    try wrapper.appendSlice(alloc, "import \"./source_");
    try appendEscaped(alloc, &wrapper, basename);
    try wrapper.appendSlice(alloc, "\";\n");
    const bundle_out_path = try std.fmt.allocPrint(
        gpa,
        "{s}/bundle.mjs",
        .{workdir},
    );
    defer gpa.free(bundle_out_path);
    try cwd.writeFile(io, .{ .sub_path = bundle_out_path, .data = wrapper.items });
}

fn cmdBuild(init: std.process.Init, args: []const [:0]const u8) !void {
    const gpa = init.gpa;
    const io = init.io;
    g_io = io;
    g_gpa = gpa;
    const cwd = Io.Dir.cwd();

    var input: ?[]const u8 = null;
    var out_wasm: ?[]const u8 = null;
    var prelude: ?[]const u8 = null;
    var externals: std.ArrayList([]const u8) = .empty;
    defer externals.deinit(gpa);

    var i: usize = 2;
    while (i < args.len) : (i += 1) {
        const arg = args[i];
        if (eql(arg, "-o") or eql(arg, "--out")) {
            i += 1;
            if (i >= args.len) {
                printStderr("qjs build: missing output path\n", .{});
                return error.InvalidArguments;
            }
            out_wasm = args[i];
        } else if (eql(arg, "--prelude")) {
            i += 1;
            if (i >= args.len) {
                printStderr("qjs build: missing prelude path\n", .{});
                return error.InvalidArguments;
            }
            prelude = args[i];
        } else if (eql(arg, "--external")) {
            i += 1;
            if (i >= args.len) {
                printStderr("qjs build: missing external name\n", .{});
                return error.InvalidArguments;
            }
            try externals.append(gpa, args[i]);
        } else if (eql(arg, "-h") or eql(arg, "--help")) {
            printStdout(build_help, .{});
            return;
        } else if (input == null) {
            input = arg;
        } else {
            printStderr("qjs build: unexpected argument '{s}'\n", .{arg});
            return error.InvalidArguments;
        }
    }

    const input_path = input orelse {
        printStderr("usage: qjs build <input> [-o output.wasm]\n", .{});
        return error.InvalidArguments;
    };

    const self_path = envGet(init, "QJS_SELF") orelse {
        printStderr(
            "qjs build: QJS_SELF is not set; run this command through " ++
                "tools/run-qjs.mjs\n",
            .{},
        );
        return error.MissingEnvironment;
    };

    const workdir = ".qjs-build";
    cwd.createDirPath(io, workdir) catch |err| {
        printStderr("qjs build: cannot create {s}: {t}\n", .{ workdir, err });
        return err;
    };

    const source = try cwd.readFileAlloc(
        io,
        input_path,
        gpa,
        .limited(1 << 30),
    );
    defer gpa.free(source);

    var specifiers: std.ArrayList([]const u8) = .empty;
    defer {
        for (specifiers.items) |s| gpa.free(s);
        specifiers.deinit(gpa);
    }
    try scanBareImports(gpa, source, &specifiers);

    const direct_lang = tsLangForPath(input_path);
    var built_directly = false;
    if (specifiers.items.len == 0 and direct_lang != null) {
        const lang = direct_lang.?;
        printStdout(
            "stripping {s} ({s}) with ttsc...\n",
            .{ input_path, lang },
        );
        var direct_ok = true;
        tryDirectBundle(gpa, io, cwd, input_path, source, workdir, lang) catch |err| {
            printStderr(
                "qjs build: ttsc stripping failed ({t}); " ++
                    "falling back to esbuild\n",
                .{err},
            );
            direct_ok = false;
        };
        built_directly = direct_ok;
    }

    const entry_path = workdir ++ "/entry.mjs";
    const bundle_out = workdir ++ "/bundle.mjs";
    const stub_path = workdir ++ "/qjs_host_stub.wat";
    try cwd.writeFile(io, .{ .sub_path = stub_path, .data = host_stub });

    // A prelude is evaluated before the bundle during wizer initialization.
    // It is how module sets that the bundle imports at link time (for
    // example a shared package registry) get registered first. Always write
    // the file (even when empty) so a stale prelude cannot leak into a build.
    {
        const prelude_data: []const u8 = if (prelude) |prelude_path| blk: {
            const prelude_src = cwd.readFileAllocOptions(
                io,
                prelude_path,
                gpa,
                .limited(1 << 30),
                .of(u8),
                0,
            ) catch |err| {
                printStderr(
                    "qjs build: cannot read prelude '{s}': {t}\n",
                    .{ prelude_path, err },
                );
                return err;
            };
            break :blk prelude_src;
        } else "// qjs: no prelude\n";
        defer if (prelude != null) gpa.free(prelude_data);
        try cwd.writeFile(io, .{
            .sub_path = workdir ++ "/prelude.mjs",
            .data = prelude_data,
        });
    }

    if (!built_directly) {
        // Generate the bundle entry point.
        var entry: std.ArrayList(u8) = .empty;
        defer entry.deinit(gpa);
        try appendLine(gpa, &entry, "globalThis.__qjs_modules ??= {};");
        for (specifiers.items, 0..) |spec, idx| {
            var idx_buf: [16]u8 = undefined;
            const idx_str = std.fmt.bufPrint(&idx_buf, "{d}", .{idx}) catch
                unreachable;

            var line: std.ArrayList(u8) = .empty;
            defer line.deinit(gpa);
            try line.appendSlice(gpa, "import * as __qjs_m");
            try line.appendSlice(gpa, idx_str);
            try line.appendSlice(gpa, " from \"");
            try appendEscaped(gpa, &line, spec);
            try line.appendSlice(gpa, "\";");
            try appendLine(gpa, &entry, line.items);

            line.clearRetainingCapacity();
            try line.appendSlice(gpa, "globalThis.__qjs_modules[\"");
            try appendEscaped(gpa, &line, spec);
            try line.appendSlice(gpa, "\"] = __qjs_m");
            try line.appendSlice(gpa, idx_str);
            try line.appendSlice(gpa, ";");
            try appendLine(gpa, &entry, line.items);
        }

        var import_line: std.ArrayList(u8) = .empty;
        defer import_line.deinit(gpa);
        try import_line.appendSlice(gpa, "import \"");
        // The entry point lives in the work directory, so rewrite relative
        // input paths accordingly.
        if (input_path.len > 0 and input_path[0] != '/') {
            try import_line.appendSlice(gpa, "../");
        }
        try appendEscaped(gpa, &import_line, input_path);
        try import_line.appendSlice(gpa, "\";");
        try appendLine(gpa, &entry, import_line.items);

        try cwd.writeFile(io, .{ .sub_path = entry_path, .data = entry.items });

        const esbuild = envGet(init, "QJS_ESBUILD") orelse "esbuild";
        printStdout("bundling {s} with esbuild...\n", .{input_path});
        var esbuild_argv: std.ArrayList([]const u8) = .empty;
        defer esbuild_argv.deinit(gpa);
        try esbuild_argv.appendSlice(gpa, &.{
            esbuild,
            entry_path,
            "--bundle",
            "--format=esm",
            "--platform=browser",
            "--target=es2022",
            "--log-level=warning",
            "--define:global=globalThis",
            // Modules provided by the runtime registry are always external.
            "--external:qjs:*",
            "--external:node:*",
        });
        // Only the dynamically built flags below may be freed; entries before
        // this index are static strings.
        const dynamic_flag_start = esbuild_argv.items.len;
        for (externals.items) |external| {
            var flag: std.ArrayList(u8) = .empty;
            defer flag.deinit(gpa);
            try flag.appendSlice(gpa, "--external:");
            try flag.appendSlice(gpa, external);
            try esbuild_argv.append(gpa, try flag.toOwnedSlice(gpa));
        }
        var outfile_flag: std.ArrayList(u8) = .empty;
        defer outfile_flag.deinit(gpa);
        try outfile_flag.appendSlice(gpa, "--outfile=");
        try outfile_flag.appendSlice(gpa, bundle_out);
        try esbuild_argv.append(gpa, outfile_flag.items);
        defer {
            for (esbuild_argv.items[dynamic_flag_start..]) |a| {
                if (std.mem.startsWith(u8, a, "--external:")) gpa.free(a);
            }
        }
        try runHostCommand(gpa, esbuild_argv.items);
    }

    const wizer = envGet(init, "QJS_WIZER") orelse "wizer";
    const out_path = out_wasm orelse "qjs-bundled.wasm";
    var mapdir: std.ArrayList(u8) = .empty;
    defer mapdir.deinit(gpa);
    try mapdir.appendSlice(gpa, "/bundle::" ++ workdir);
    var preload: std.ArrayList(u8) = .empty;
    defer preload.deinit(gpa);
    try preload.appendSlice(gpa, "qjs_host=" ++ stub_path);

    printStdout("pre-initializing with wizer -> {s}\n", .{out_path});
    try runHostCommand(gpa, &.{
        wizer,
        self_path,
        "-o",
        out_path,
        "--allow-wasi",
        "--wasm-reference-types",
        "true",
        "--mapdir",
        mapdir.items,
        "--preload",
        preload.items,
    });

    printStdout("wrote {s}\n", .{out_path});
}

const host_stub =
    \\(module
    \\  (func (export "spawn") (param i32 i32) (result i32)
    \\    i32.const 1)
    \\  (func (export "log") (param i32 i32))
    \\  (func (export "transpile") (param i32 i32 i32 i32 i32 i32 i32 i32) (result i32)
    \\    i32.const -1)
    \\  (func (export "timer_wait") (param i64))
    \\  (func (export "opfs_open") (param i32 i32 i32 i32 i32) (result externref)
    \\    ref.null extern)
    \\  (func (export "opfs_close") (param externref))
    \\  (func (export "opfs_read") (param externref i32 i32 i64) (result i32)
    \\    i32.const -1)
    \\  (func (export "opfs_write") (param externref i32 i32 i64) (result i32)
    \\    i32.const -1)
    \\  (func (export "opfs_truncate") (param externref i64) (result i32)
    \\    i32.const -1)
    \\  (func (export "opfs_size") (param externref) (result i64)
    \\    i64.const -1)
    \\  (func (export "opfs_sync") (param externref i32) (result i32)
    \\    i32.const -1)
    \\  (func (export "opfs_delete") (param i32 i32) (result i32)
    \\    i32.const -1)
    \\  (func (export "opfs_access") (param i32 i32 i32) (result i32)
    \\    i32.const -1)
    \\  (func (export "externref_set") (param i32 externref))
    \\  (func (export "externref_get") (param i32) (result externref)
    \\    ref.null extern)
    \\  (func (export "externref_clear") (param i32))
    \\)
;

const build_help =
    \\usage: qjs build <input> [-o output.wasm]
    \\
    \\Bundles <input> (JavaScript or TypeScript) with esbuild, exposing every
    \\bare import as a module on globalThis.__qjs_modules, and then produces a
    \\pre-initialized copy of qjs.wasm using wizer.
    \\
    \\options:
    \\  -o, --out <path>     output wasm (default: qjs-bundled.wasm)
    \\  --prelude <path>     module evaluated before the bundle at init time
    \\  --external <name>    leave <name> as an import (repeatable)
    \\
    \\environment:
    \\  QJS_SELF    path to the base qjs.wasm (set by tools/run-qjs.mjs)
    \\  QJS_ESBUILD path to the esbuild binary (default: esbuild)
    \\  QJS_WIZER   path to the wizer binary (default: wizer)
    \\
;

// =============================================================================
// `qjs test`
// =============================================================================

fn cmdTest(init: std.process.Init, args: []const [:0]const u8) !void {
    _ = args;
    g_io = init.io;
    g_gpa = init.gpa;

    if (!g_preinitialized or g_ctx == null) {
        printStderr(
            "qjs test: no pre-initialized bundle; build one with `qjs build`\n",
            .{},
        );
        return error.NoPreinitializedBundle;
    }
    const ctx = g_ctx.?;
    ctx.getRuntime().updateStackTop();

    const snippet =
        \\import { run } from "deno:test-runner";
        \\globalThis.__qjs_test_result = null;
        \\run().then(
        \\  (code) => { globalThis.__qjs_test_result = code; },
        \\  (error) => {
        \\    print(String((error && error.stack) || error));
        \\    globalThis.__qjs_test_result = 1;
        \\  },
        \\);
        \\
    ;
    if (!evalBuf(ctx, snippet, "<qjs-test>", .{ .type = .module }, false)) {
        return error.JavaScriptError;
    }

    const res = ctx.eval("globalThis.__qjs_test_result", "<qjs-test>", .{});
    defer res.deinit(ctx);
    if (res.isNull() or res.isUndefined()) {
        printStderr("qjs test: tests did not complete\n", .{});
        std.process.exit(1);
    }
    const code = res.toInt32(ctx) catch 1;
    std.process.exit(@intCast(@max(0, @min(255, code))));
}

// =============================================================================
// wizer.initialize
// =============================================================================

fn wizerInitialize() callconv(.c) void {
    wizerInit() catch |err| {
        printStderr("qjs: pre-initialization failed: {t}\n", .{err});
        std.process.exit(1);
    };
}

comptime {
    @export(&wizerInitialize, .{ .name = "wizer-initialize" });
}

fn wizerInit() !void {
    const gpa = std.heap.wasm_allocator;
    g_gpa = gpa;

    var threaded: std.Io.Threaded = .init(gpa, .{});
    const io = threaded.io();
    g_io = io;

    const rt = try quickjs.Runtime.init();
    const ctx = try quickjs.Context.init(rt);
    setupRuntime(rt, ctx);
    g_rt = rt;
    g_ctx = ctx;

    // Optional prelude: registered modules that the bundle links against.
    if (Io.Dir.cwd().readFileAllocOptions(
        io,
        "/bundle/prelude.mjs",
        gpa,
        .limited(1 << 30),
        .of(u8),
        0,
    )) |prelude_source| {
        defer gpa.free(prelude_source);
        if (!evalBuf(
            ctx,
            prelude_source,
            "/bundle/prelude.mjs",
            .{ .type = .module },
            false,
        )) {
            return error.PreludeEvaluationFailed;
        }
    } else |_| {}

    const source = try Io.Dir.cwd().readFileAllocOptions(
        io,
        bundle_path,
        gpa,
        .limited(1 << 30),
        .of(u8),
        0,
    );
    defer gpa.free(source);

    if (!evalBuf(ctx, source, "/bundle/bundle.mjs", .{ .type = .module }, false)) {
        return error.BundleEvaluationFailed;
    }
    @memset(source, 0);
    rt.runGC();
    g_preinitialized = true;
}

// =============================================================================
// CLI
// =============================================================================

const Options = struct {
    expr: ?[]const u8 = null,
    module: i8 = -1,
    interactive: bool = false,
    empty_run: bool = false,
    load_std: bool = false,
    dump_memory: bool = false,
    trace_memory: bool = false,
    dump_flags: u64 = 0,
    memory_limit: i64 = -1,
    stack_size: i64 = -1,
    optind: usize = 1,
};

fn help() noreturn {
    printStdout(
        \\QuickJS-ng version {s}
        \\usage: qjs [options] [file [args]]
        \\-h  --help         list options
        \\-v  --version      print version string and then exit
        \\-e  --eval EXPR    evaluate EXPR
        \\-i  --interactive  go to interactive mode
        \\-C  --script       load as JS classic script (default=autodetect)
        \\-m  --module       load as ES module (default=autodetect)
        \\-I  --include file include an additional file
        \\    --std          make 'std', 'os' and 'bjson' available to script
        \\-d  --dump         dump the memory usage stats
        \\-T  --trace        trace memory allocation
        \\-D  --dump-flags   flags for dumping debug data
        \\    --memory-limit n       limit the memory usage to 'n' Kbytes
        \\    --stack-size n         limit the stack size to 'n' Kbytes
        \\-q  --quit         just instantiate the interpreter and quit
        \\
        \\subcommands:
        \\    build <input> [-o out.wasm]   bundle and pre-initialize a module
        \\    test                          run Deno.test tests in the bundle
        \\
    , .{quickjs.version()});
    std.process.exit(0);
}

fn parseLimit(s: []const u8) ?i64 {
    var i: usize = 0;
    while (i < s.len and (std.ascii.isDigit(s[i]) or s[i] == '.')) i += 1;
    if (i == 0) return null;
    const num = std.fmt.parseFloat(f64, s[0..i]) catch return null;
    var unit: f64 = 1024;
    if (i < s.len) {
        switch (s[i]) {
            'b', 'B' => unit = 1,
            'k', 'K' => unit = 1024,
            'm', 'M' => unit = 1024 * 1024,
            'g', 'G' => unit = 1024 * 1024 * 1024,
            else => return null,
        }
        if (i + 1 != s.len) return null;
    }
    return @intFromFloat(num * unit);
}

fn setScriptArgs(
    ctx: *quickjs.Context,
    args: []const [:0]const u8,
    start: usize,
) void {
    const global = ctx.getGlobalObject();
    defer global.deinit(ctx);

    const script_args = Value.initArray(ctx);
    for (args[start..], 0..) |arg, idx| {
        script_args.setPropertyUint32(
            ctx,
            @intCast(idx),
            Value.initStringLen(ctx, arg),
        ) catch {};
    }
    global.setPropertyStr(ctx, "scriptArgs", script_args) catch {};

    const exec_argv = Value.initArray(ctx);
    for (args, 0..) |arg, idx| {
        exec_argv.setPropertyUint32(
            ctx,
            @intCast(idx),
            Value.initStringLen(ctx, arg),
        ) catch {};
    }
    global.setPropertyStr(ctx, "execArgv", exec_argv) catch {};

    if (args.len > 0) {
        global.setPropertyStr(
            ctx,
            "argv0",
            Value.initStringLen(ctx, args[0]),
        ) catch {};
    }
}

fn printMemoryUsage(ctx: *quickjs.Context) void {
    const usage = ctx.getRuntime().computeMemoryUsage();
    printStdout(
        \\memory usage:
        \\  malloc_size:      {d}
        \\  memory_used_size: {d}
        \\  malloc_count:     {d}
        \\  obj_count:        {d}
        \\  atom_count:       {d}
        \\  str_count:        {d}
        \\  str_size:         {d}
        \\
    , .{
        usage.malloc_size,
        usage.memory_used_size,
        usage.malloc_count,
        usage.obj_count,
        usage.atom_count,
        usage.str_count,
        usage.str_size,
    });
}

pub fn main(init: std.process.Init) !void {
    g_io = init.io;
    g_gpa = init.gpa;
    sqlite_vfs.setHostOps(&host_ops);

    const arena = init.arena.allocator();
    const args = try init.minimal.args.toSlice(arena);

    if (args.len >= 2 and eql(args[1], "build")) {
        return cmdBuild(init, args);
    }
    if (args.len >= 2 and eql(args[1], "test")) {
        return cmdTest(init, args);
    }

    var opts: Options = .{};
    var includes: std.ArrayList([]const u8) = .empty;
    defer includes.deinit(init.gpa);

    var optind: usize = 1;
    while (optind < args.len and args[optind].len > 1 and
        args[optind][0] == '-')
    {
        const arg = args[optind];
        optind += 1;
        if (eql(arg, "--")) break;

        if (arg[1] == '-') {
            const body = arg[2..];
            const eq_idx = std.mem.indexOfScalar(u8, body, '=');
            const name = if (eq_idx) |e| body[0..e] else body;
            var optarg: ?[]const u8 =
                if (eq_idx) |e| body[e + 1 ..] else null;

            if (eql(name, "help")) {
                help();
            } else if (eql(name, "version")) {
                printStdout("{s}\n", .{quickjs.version()});
                return;
            } else if (eql(name, "eval")) {
                if (optarg == null) {
                    if (optind >= args.len) {
                        printStderr("qjs: missing expression for -e\n", .{});
                        std.process.exit(1);
                    }
                    optarg = args[optind];
                    optind += 1;
                }
                opts.expr = optarg;
            } else if (eql(name, "include")) {
                if (optarg == null) {
                    if (optind >= args.len) {
                        printStderr("qjs: expecting filename\n", .{});
                        std.process.exit(1);
                    }
                    optarg = args[optind];
                    optind += 1;
                }
                try includes.append(init.gpa, optarg.?);
            } else if (eql(name, "interactive")) {
                opts.interactive = true;
            } else if (eql(name, "module")) {
                opts.module = 1;
            } else if (eql(name, "script")) {
                opts.module = 0;
            } else if (eql(name, "dump")) {
                opts.dump_memory = true;
            } else if (eql(name, "dump-flags")) {
                opts.dump_flags = if (optarg) |v|
                    std.fmt.parseInt(u64, v, 16) catch 0
                else
                    0;
            } else if (eql(name, "trace")) {
                opts.trace_memory = true;
            } else if (eql(name, "std")) {
                opts.load_std = true;
            } else if (eql(name, "quit")) {
                opts.empty_run = true;
            } else if (eql(name, "memory-limit")) {
                if (optarg == null) {
                    if (optind >= args.len) {
                        printStderr("qjs: expecting memory limit\n", .{});
                        std.process.exit(1);
                    }
                    optarg = args[optind];
                    optind += 1;
                }
                opts.memory_limit = parseLimit(optarg.?) orelse -1;
            } else if (eql(name, "stack-size")) {
                if (optarg == null) {
                    if (optind >= args.len) {
                        printStderr("qjs: expecting stack size\n", .{});
                        std.process.exit(1);
                    }
                    optarg = args[optind];
                    optind += 1;
                }
                opts.stack_size = parseLimit(optarg.?) orelse -1;
            } else {
                printStderr("qjs: unknown option '--{s}'\n", .{name});
                help();
            }
        } else {
            var j: usize = 1;
            while (j < arg.len) : (j += 1) {
                switch (arg[j]) {
                    'h', '?' => help(),
                    'v' => {
                        printStdout("{s}\n", .{quickjs.version()});
                        return;
                    },
                    'e', 'I' => {
                        const opt = arg[j];
                        var v: []const u8 = undefined;
                        if (j + 1 < arg.len) {
                            v = arg[j + 1 ..];
                        } else {
                            if (optind >= args.len) {
                                printStderr(
                                    "qjs: missing argument for -{c}\n",
                                    .{opt},
                                );
                                std.process.exit(1);
                            }
                            v = args[optind];
                            optind += 1;
                        }
                        if (opt == 'e') {
                            opts.expr = v;
                        } else {
                            try includes.append(init.gpa, v);
                        }
                        j = arg.len;
                    },
                    'i' => opts.interactive = true,
                    'm' => opts.module = 1,
                    'C' => opts.module = 0,
                    'd' => opts.dump_memory = true,
                    'T' => opts.trace_memory = true,
                    'q' => opts.empty_run = true,
                    else => {
                        printStderr("qjs: unknown option '-{c}'\n", .{arg[j]});
                        help();
                    },
                }
            }
        }
    }
    opts.optind = optind;

    var rt: *quickjs.Runtime = undefined;
    var ctx: *quickjs.Context = undefined;
    if (g_preinitialized and g_rt != null and g_ctx != null) {
        rt = g_rt.?;
        ctx = g_ctx.?;
    } else {
        rt = try quickjs.Runtime.init();
        ctx = try quickjs.Context.init(rt);
        setupRuntime(rt, ctx);
        g_rt = rt;
        g_ctx = ctx;
    }

    if (opts.memory_limit >= 0) {
        rt.setMemoryLimit(@intCast(opts.memory_limit));
    }
    if (opts.stack_size >= 0) {
        rt.setMaxStackSize(@intCast(opts.stack_size));
    }
    if (opts.dump_flags != 0) {
        rt.setDumpFlags(@bitCast(opts.dump_flags));
    }
    rt.updateStackTop();
    setScriptArgs(ctx, args, opts.optind);

    if (!opts.empty_run) {
        if (opts.load_std) {
            const std_setup =
                \\import * as bjson from 'qjs:bjson';
                \\import * as std from 'qjs:std';
                \\import * as os from 'qjs:os';
                \\globalThis.bjson = bjson;
                \\globalThis.std = std;
                \\globalThis.os = os;
            ;
            if (!evalBuf(ctx, std_setup, "<input>", .{ .type = .module }, false)) {
                return error.JavaScriptError;
            }
        }

        for (includes.items) |include| {
            if (!evalFile(ctx, include, 0)) return error.JavaScriptError;
        }

        var interactive = opts.interactive;
        if (opts.expr) |expr| {
            const flags: quickjs.EvalFlags = if (opts.module == 1)
                .{ .type = .module }
            else
                .{};
            if (!evalBuf(ctx, expr, "<cmdline>", flags, true)) {
                return error.JavaScriptError;
            }
        } else if (opts.optind >= args.len) {
            interactive = true;
        } else {
            if (!evalFile(ctx, args[opts.optind], opts.module)) {
                return error.JavaScriptError;
            }
        }

        if (!jobLoop(ctx)) return error.JavaScriptError;

        if (interactive) {
            runRepl(ctx);
        }
    }

    if (opts.dump_memory) {
        printMemoryUsage(ctx);
    }
}
