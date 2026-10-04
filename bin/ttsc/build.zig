const std = @import("std");

// yuku 0.17.0 builds its parser module from `vendor/yuku`, a copy of the
// fetched dependency patched for Zig 0.17.0 (the upstream build.zig still
// targets Zig 0.16 std APIs). The dependency entry in build.zig.zon records
// the exact upstream revision.
fn addYukuImports(
    b: *std.Build,
    target: std.Build.ResolvedTarget,
    optimize: std.builtin.OptimizeMode,
    parser_module: *std.Build.Module,
) void {
    const util_module = b.createModule(.{
        .root_source_file = b.path("vendor/yuku/src/util/root.zig"),
        .target = target,
        .optimize = optimize,
    });
    const codegen_options = b.addOptions();
    codegen_options.addOption(bool, "source_maps", false);
    const parser_extension = b.addOptions().createModule();
    parser_module.addImport("util", util_module);
    parser_module.addImport("codegen_options", codegen_options.createModule());
    parser_module.addImport("parser_extension", parser_extension);
}

pub fn build(b: *std.Build) void {
    const optimize = b.standardOptimizeOption(.{ .preferred_optimize_mode = .ReleaseSmall });

    // `zig build` always produces the wasm32-freestanding bleeding-edge build.
    const wasm_target = b.resolveTargetQuery(.{
        .cpu_arch = .wasm32,
        .os_tag = .freestanding,
        .cpu_model = .{ .explicit = &std.Target.wasm.cpu.bleeding_edge },
    });

    const wasm_parser = b.createModule(.{
        .root_source_file = b.path("vendor/yuku/src/parser/root.zig"),
        .target = wasm_target,
        .optimize = optimize,
    });
    addYukuImports(b, wasm_target, optimize, wasm_parser);

    const wasm_module = b.createModule(.{
        .root_source_file = b.path("src/main.zig"),
        .target = wasm_target,
        .optimize = optimize,
        .strip = true,
    });
    wasm_module.addImport("parser", wasm_parser);

    const wasm = b.addExecutable(.{ .name = "ttsc", .root_module = wasm_module });
    wasm.entry = .disabled;
    wasm.rdynamic = true;

    // Write ttsc.wasm and ttsc-host.js next to the repository's bin directory.
    const update = b.addUpdateSourceFiles();
    update.addCopyFileToSource(wasm.getEmittedBin(), "../ttsc.wasm");
    update.addCopyFileToSource(b.path("src/host.js"), "../ttsc-host.js");
    b.getInstallStep().dependOn(&update.step);

    // Native development tool used to diff the transform against babel.
    const host_target = b.graph.host;
    const host_parser = b.createModule(.{
        .root_source_file = b.path("vendor/yuku/src/parser/root.zig"),
        .target = host_target,
        .optimize = optimize,
    });
    addYukuImports(b, host_target, optimize, host_parser);

    const tool_module = b.createModule(.{
        .root_source_file = b.path("src/tool.zig"),
        .target = host_target,
        .optimize = optimize,
    });
    tool_module.addImport("parser", host_parser);

    const tool = b.addExecutable(.{ .name = "ttsc-tool", .root_module = tool_module });
    const run_tool = b.addRunArtifact(tool);
    run_tool.addPassthruArgs();
    const tool_step = b.step("tool", "Run the native transform tool");
    tool_step.dependOn(&run_tool.step);

    const tests = b.addTest(.{ .root_module = tool_module });
    const run_tests = b.addRunArtifact(tests);
    const test_step = b.step("test", "Run tests");
    test_step.dependOn(&run_tests.step);
}
