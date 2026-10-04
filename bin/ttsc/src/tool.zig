//! Native development driver: transform a file and print the JavaScript.
//! `zig build tool -- <file>`

const std = @import("std");
const parser = @import("parser");
const transform = @import("transform.zig");

pub fn main(init: std.process.Init) !void {
    const io = init.io;
    const gpa = std.heap.smp_allocator;
    const arena = init.arena.allocator();

    const args = try init.minimal.args.toSlice(arena);
    if (args.len < 2) {
        std.debug.print("usage: ttsc-tool <file>\n", .{});
        return error.MissingArgument;
    }
    const path = args[1];
    const source = try std.Io.Dir.cwd().readFileAlloc(io, path, gpa, .limited(1 << 30));
    defer gpa.free(source);

    const lang = langFor(path);
    var t = transform.Transformer.init(gpa, .{});
    defer t.deinit();

    const transformed = try t.transformText(source, lang);
    const final_src = try std.fmt.allocPrint(gpa, "{s}{s}", .{ t.imports.items, transformed });
    defer gpa.free(final_src);

    var tree = try parser.parse(gpa, final_src, .{
        .lang = lang,
        .source_type = .module,
        .comments = .both,
    });
    defer tree.deinit();

    const result = try parser.codegen.generate(gpa, &tree, .{
        .strip = true,
        .comments = .all,
    });
    defer result.deinit(gpa);

    var stdout_buffer: [4096]u8 = undefined;
    var stdout_writer = std.Io.File.stdout().writer(io, &stdout_buffer);
    const stdout = &stdout_writer.interface;
    try stdout.writeAll(result.code);
    try stdout.writeAll("\n");
    try stdout.flush();

    if (tree.hasDiagnostics()) {
        for (tree.diagnostics.items) |d| {
            const start = d.span.start;
            const end = @min(d.span.end, final_src.len);
            const lo = if (start > 80) start - 80 else 0;
            const hi = @min(end + 40, final_src.len);
            std.debug.print("TREE DIAG: {s} at {d}..{d}\n---\n{s}\n---\n", .{ d.message, start, end, final_src[lo..hi] });
        }
    }
    for (result.diagnostics) |d| {
        std.debug.print("CODEGEN DIAG: {s}\n", .{d.message});
    }
}

fn langFor(path: []const u8) parser.ast.Lang {
    if (std.mem.endsWith(u8, path, ".tsx")) return .tsx;
    if (std.mem.endsWith(u8, path, ".jsx")) return .jsx;
    if (std.mem.endsWith(u8, path, ".ts")) return .ts;
    return .js;
}
