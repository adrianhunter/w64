//! ttsc: TypeScript/TSX -> JavaScript, compiled for
//! wasm32-freestanding with the bleeding-edge CPU features (externref).
//!
//! The single export `default(code, filename) -> code` takes JS strings by
//! externref and returns a JS string by externref. All string traffic goes
//! through the sibling `./ttsc-host.js` module, which works with the
//! WebAssembly ESM integration and with es-module-shims. No heap: the
//! transform runs out of a fixed static arena.

const std = @import("std");
const parser = @import("parser");
const transform = @import("transform.zig");

pub const ExternRef = *addrspace(.externref) anyopaque;

extern "./ttsc-host.js" fn strLength(s: ExternRef) i32;
extern "./ttsc-host.js" fn charCodeAt(s: ExternRef, i: i32) i32;
extern "./ttsc-host.js" fn startOut() void;
extern "./ttsc-host.js" fn pushCodeUnit(c: i32) void;
extern "./ttsc-host.js" fn finishOut() ExternRef;

var arena_buf: [64 * 1024 * 1024]u8 align(16) = undefined;
var fba: std.heap.FixedBufferAllocator = std.heap.FixedBufferAllocator.init(&arena_buf);

const max_source = 8 * 1024 * 1024;
var source_buf: [max_source]u8 = undefined;
var filename_buf: [1024]u8 = undefined;

export fn default(code: ExternRef, filename: ExternRef) ExternRef {
    fba.reset();
    const alloc = fba.allocator();

    const source = readString(code, &source_buf) catch return fail();
    const filename_bytes = readString(filename, &filename_buf) catch return fail();
    const lang = langFor(filename_bytes);

    var t = transform.Transformer.init(alloc, .{});
    defer t.deinit();

    const transformed = t.transformText(source, lang) catch return fail();
    const final_src = std.fmt.allocPrint(alloc, "{s}{s}", .{ t.imports.items, transformed }) catch return fail();

    var tree = parser.parse(alloc, final_src, .{
        .lang = lang,
        .source_type = .module,
        .comments = .both,
    }) catch return fail();
    defer tree.deinit();

    const result = parser.codegen.generate(alloc, &tree, .{
        .strip = true,
        .comments = .all,
    }) catch return fail();
    defer result.deinit(alloc);

    return emitUtf8(result.code);
}

fn fail() ExternRef {
    startOut();
    return finishOut();
}

fn readString(ref: ExternRef, buf: []u8) ![]const u8 {
    const len = strLength(ref);
    if (len < 0) return error.BadInput;
    var out: usize = 0;
    var i: i32 = 0;
    while (i < len) {
        const unit: u32 = @as(u32, @intCast(charCodeAt(ref, i))) & 0xFFFF;
        i += 1;
        var cp: u21 = undefined;
        if (unit >= 0xD800 and unit <= 0xDBFF and i < len) {
            const low: u32 = @as(u32, @intCast(charCodeAt(ref, i))) & 0xFFFF;
            if (low >= 0xDC00 and low <= 0xDFFF) {
                i += 1;
                cp = @intCast(0x10000 + ((unit - 0xD800) << 10) + (low - 0xDC00));
            } else cp = 0xFFFD;
        } else if (unit >= 0xD800 and unit <= 0xDFFF) {
            cp = 0xFFFD;
        } else {
            cp = @intCast(unit);
        }
        var tmp: [4]u8 = undefined;
        const n = std.unicode.utf8Encode(cp, &tmp) catch blk: {
            break :blk std.unicode.utf8Encode(0xFFFD, &tmp) catch unreachable;
        };
        if (out + n > buf.len) return error.BadInput;
        @memcpy(buf[out..][0..n], tmp[0..n]);
        out += n;
    }
    return buf[0..out];
}

fn emitUtf8(bytes: []const u8) ExternRef {
    startOut();
    var i: usize = 0;
    while (i < bytes.len) {
        const b0 = bytes[i];
        if (b0 < 0x80) {
            pushCodeUnit(b0);
            i += 1;
        } else if (b0 < 0xE0 and i + 1 < bytes.len) {
            const b1 = bytes[i + 1];
            const cp: u21 = (@as(u21, b0 & 0x1F) << 6) | (b1 & 0x3F);
            pushCodeUnit(@intCast(cp));
            i += 2;
        } else if (b0 < 0xF0 and i + 2 < bytes.len) {
            const b1 = bytes[i + 1];
            const b2 = bytes[i + 2];
            const cp: u21 = (@as(u21, b0 & 0x0F) << 12) | (@as(u21, b1 & 0x3F) << 6) | (b2 & 0x3F);
            pushCodeUnit(@intCast(cp));
            i += 3;
        } else if (b0 < 0xF8 and i + 3 < bytes.len) {
            const b1 = bytes[i + 1];
            const b2 = bytes[i + 2];
            const b3 = bytes[i + 3];
            var cp: u32 = (@as(u32, b0 & 0x07) << 18) | (@as(u32, b1 & 0x3F) << 12) | (@as(u32, b2 & 0x3F) << 6) | (b3 & 0x3F);
            cp -= 0x10000;
            pushCodeUnit(@intCast(0xD800 + (cp >> 10)));
            pushCodeUnit(@intCast(0xDC00 + (cp & 0x3FF)));
            i += 4;
        } else {
            pushCodeUnit(0xFFFD);
            i += 1;
        }
    }
    return finishOut();
}

fn langFor(filename: []const u8) parser.ast.Lang {
    if (std.mem.endsWith(u8, filename, ".tsx")) return .tsx;
    if (std.mem.endsWith(u8, filename, ".jsx")) return .jsx;
    if (std.mem.endsWith(u8, filename, ".ts")) return .ts;
    if (std.mem.endsWith(u8, filename, ".mts")) return .ts;
    if (std.mem.endsWith(u8, filename, ".cts")) return .ts;
    if (std.mem.endsWith(u8, filename, ".d.ts")) return .dts;
    return .js;
}
