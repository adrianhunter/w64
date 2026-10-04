const std = @import("std");

pub fn build(b: *std.Build) !void {
    // Like `standardTargetOptions`, but `-Dcpu=...` (for example
    // `-Dcpu=bleeding_edge`) composes with the default wasm32-wasi target
    // instead of being resolved against the host architecture.
    var target_query: std.Target.Query = blk: {
        const ofmt = b.option(
            []const u8,
            "ofmt",
            "Target object format",
        );
        const dynamic_linker = b.option(
            []const u8,
            "dynamic-linker",
            "Path to interpreter on the target system",
        );
        const triple = b.option(
            []const u8,
            "target",
            "The CPU architecture, OS, and ABI to build for",
        ) orelse "wasm32-wasi";
        const mcpu = b.option(
            []const u8,
            "cpu",
            "Target CPU features to add or subtract",
        );
        break :blk std.Target.Query.parse(.{
            .arch_os_abi = triple,
            .cpu_features = mcpu,
            .object_format = ofmt,
            .dynamic_linker = dynamic_linker,
        }) catch |err| {
            std.debug.print("error: invalid target options: {t}\n", .{err});
            std.process.exit(1);
        };
    };
    // OPFS handles cross the host boundary as externrefs, which requires
    // the reference-types proposal (supported by Node/wasmtime for years).
    if (target_query.cpu_arch == .wasm32) {
        target_query.cpu_features_add.addFeature(
            @intFromEnum(std.Target.wasm.Feature.reference_types),
        );
    }
    const target = b.resolveTargetQuery(target_query);
    const optimize = b.standardOptimizeOption(.{});

    // C headers
    const c_mod = translateC(b, target, optimize);

    // Library
    const lib = try library(b, target, optimize);
    b.installArtifact(lib);

    // SQLite (max performance, independent of the app optimize mode)
    const sqlite_lib = try sqlite(b, target);
    const zstd_lib = try zstd(b, target);
    const sqlite_c = sqliteTranslateC(b, target);

    // Zig module
    const mod = b.addModule("quickjs", .{
        .root_source_file = b.path("src/root.zig"),
        .target = target,
        .optimize = optimize,
        .imports = &.{.{
            .name = "quickjs_c",
            .module = c_mod,
        }},
    });

    // CLI executable
    const exe = b.addExecutable(.{
        .name = "qjs",
        .root_module = b.createModule(.{
            .root_source_file = b.path("src/main.zig"),
            .target = target,
            .optimize = optimize,
            .imports = &.{
                .{
                    .name = "quickjs",
                    .module = mod,
                },
                .{
                    .name = "sqlite_c",
                    .module = sqlite_c,
                },
            },
        }),
    });
    exe.root_module.linkLibrary(lib);
    exe.root_module.linkLibrary(sqlite_lib);
    exe.root_module.linkLibrary(zstd_lib);
    exe.root_module.addIncludePath(b.path("upstream/sqlite3"));
    exe.root_module.addIncludePath(b.path("upstream/zstd/lib"));
    exe.rdynamic = true;
    exe.stack_size = 4 * 1024 * 1024;
    b.installArtifact(exe);

    // Tests. The bindings only support the wasm32 target (that is where
    // QuickJS uses NaN boxing), so run the test binary through Node's WASI
    // implementation.
    const test_mod = b.createModule(.{
        .root_source_file = b.path("src/root.zig"),
        .target = target,
        .optimize = optimize,
        .imports = &.{
            .{
                .name = "quickjs_c",
                .module = c_mod,
            },
            .{
                .name = "sqlite_c",
                .module = sqlite_c,
            },
        },
    });
    const tests = b.addTest(.{
        .root_module = test_mod,
        // Compiler crash without this.
        .use_llvm = true,
    });
    tests.root_module.linkLibrary(lib);
    tests.root_module.linkLibrary(sqlite_lib);
    tests.root_module.linkLibrary(zstd_lib);
    tests.root_module.addIncludePath(b.path("upstream/sqlite3"));
    tests.root_module.addIncludePath(b.path("upstream/zstd/lib"));
    const run_tests = b.addSystemCommand(&.{
        "node",
        "tools/run-tests.mjs",
    });
    run_tests.addFileArg(tests.getEmittedBin());
    run_tests.has_side_effects = true;
    const test_step = b.step("test", "Run unit tests");
    test_step.dependOn(&run_tests.step);
}

pub fn translateC(
    b: *std.Build,
    target: std.Build.ResolvedTarget,
    optimize: std.builtin.OptimizeMode,
) *std.Build.Module {
    const translate = b.addTranslateC(.{
        .root_source_file = b.path("upstream/quickjs-ng/quickjs.h"),
        .target = target,
        .optimize = optimize,
    });

    translate.addIncludePath(b.path("upstream/quickjs-ng"));
    return translate.createModule();
}

pub fn library(
    b: *std.Build,
    target: std.Build.ResolvedTarget,
    optimize: std.builtin.OptimizeMode,
) !*std.Build.Step.Compile {
    const lib_mod = b.createModule(.{
        .target = target,
        .optimize = optimize,
        .link_libc = true,
    });

    lib_mod.addIncludePath(b.path("upstream/quickjs-ng"));

    var flags: std.ArrayList([]const u8) = .empty;
    try flags.appendSlice(b.allocator, &.{
        "-funsigned-char",
        "-fno-omit-frame-pointer",
        "-fno-sanitize=undefined",
        "-fno-sanitize-trap=undefined",
        "-DENABLE_DUMPS",
    });
    if (target.result.os.tag == .wasi) {
        try flags.appendSlice(b.allocator, &.{
            "-D_WASI_EMULATED_PROCESS_CLOCKS",
            "-D_WASI_EMULATED_SIGNAL",
        });
    } else {
        try flags.appendSlice(b.allocator, &.{
            "-D_GNU_SOURCE",
            "-fvisibility=hidden",
        });
    }
    lib_mod.addCSourceFiles(.{
        .root = b.path("upstream/quickjs-ng"),
        .files = &.{
            "dtoa.c",
            "libregexp.c",
            "libunicode.c",
            "quickjs.c",
        },
        .flags = flags.items,
    });

    if (target.result.os.tag == .wasi) {
        lib_mod.linkSystemLibrary("wasi-emulated-process-clocks", .{});
        lib_mod.linkSystemLibrary("wasi-emulated-signal", .{});
    }

    return b.addLibrary(.{
        .name = "quickjs-ng",
        .root_module = lib_mod,
        .linkage = .static,
    });
}

/// SQLite amalgamation compiled for maximum performance. The optimization
/// mode is intentionally hardcoded so `--release=small` keeps the rest of
/// the binary small while SQLite stays fast.
pub fn sqlite(
    b: *std.Build,
    target: std.Build.ResolvedTarget,
) !*std.Build.Step.Compile {
    const mod = b.createModule(.{
        .target = target,
        .optimize = .ReleaseFast,
        .link_libc = true,
    });
    mod.addIncludePath(b.path("upstream/sqlite3"));
    mod.addCSourceFiles(.{
        .root = b.path("upstream/sqlite3"),
        .files = &.{"sqlite3.c"},
        .flags = &.{
            "-DSQLITE_OS_OTHER=1",
            "-DSQLITE_THREADSAFE=0",
            "-DSQLITE_OMIT_LOAD_EXTENSION",
            "-DSQLITE_OMIT_DEPRECATED",
            "-DSQLITE_OMIT_TRACE",
            "-DSQLITE_DEFAULT_MEMSTATUS=0",
            "-DSQLITE_DQS=0",
            "-DSQLITE_USE_URI=1",
            "-DSQLITE_DEFAULT_WAL_SYNCHRONOUS=1",
            "-DSQLITE_MAX_MMAP_SIZE=0",
            "-DSQLITE_TEMP_STORE=3",
            "-DSQLITE_ENABLE_MATH_FUNCTIONS",
            "-DSQLITE_ENABLE_JSON1",
            "-fno-sanitize=undefined",
            "-fno-sanitize-trap=undefined",
        },
    });
    return b.addLibrary(.{
        .name = "sqlite3",
        .root_module = mod,
        .linkage = .static,
    });
}

/// zstd compiled for maximum performance (single-threaded, no asm, no
/// legacy frame support).
pub fn zstd(
    b: *std.Build,
    target: std.Build.ResolvedTarget,
) !*std.Build.Step.Compile {
    const mod = b.createModule(.{
        .target = target,
        .optimize = .ReleaseFast,
        .link_libc = true,
    });
    mod.addIncludePath(b.path("upstream/zstd/lib"));
    mod.addCSourceFiles(.{
        .root = b.path("upstream/zstd/lib"),
        .files = &.{
            "common/debug.c",
            "common/entropy_common.c",
            "common/error_private.c",
            "common/fse_decompress.c",
            "common/pool.c",
            "common/threading.c",
            "common/xxhash.c",
            "common/zstd_common.c",
            "compress/fse_compress.c",
            "compress/hist.c",
            "compress/huf_compress.c",
            "compress/zstd_compress.c",
            "compress/zstd_compress_literals.c",
            "compress/zstd_compress_sequences.c",
            "compress/zstd_compress_superblock.c",
            "compress/zstd_double_fast.c",
            "compress/zstd_fast.c",
            "compress/zstd_lazy.c",
            "compress/zstd_ldm.c",
            "compress/zstd_opt.c",
            "compress/zstd_preSplit.c",
            "compress/zstdmt_compress.c",
            "decompress/huf_decompress.c",
            "decompress/zstd_ddict.c",
            "decompress/zstd_decompress.c",
            "decompress/zstd_decompress_block.c",
            "dictBuilder/cover.c",
            "dictBuilder/divsufsort.c",
            "dictBuilder/fastcover.c",
            "dictBuilder/zdict.c",
        },
        .flags = &.{
            "-DZSTD_MULTITHREAD=0",
            "-DZSTD_DISABLE_ASM=1",
            "-DZSTD_LEGACY_SUPPORT=0",
            "-DXXH_NAMESPACE=ZSTD_",
            "-fno-sanitize=undefined",
            "-fno-sanitize-trap=undefined",
        },
    });
    return b.addLibrary(.{
        .name = "zstd",
        .root_module = mod,
        .linkage = .static,
    });
}

/// Translate-c module exposing sqlite3.h + zstd.h + zdict.h.
pub fn sqliteTranslateC(
    b: *std.Build,
    target: std.Build.ResolvedTarget,
) *std.Build.Module {
    const translate = b.addTranslateC(.{
        .root_source_file = b.path("upstream/sqlite3/sqlite_shim.h"),
        .target = target,
        .optimize = .ReleaseFast,
    });
    translate.addIncludePath(b.path("upstream/sqlite3"));
    translate.addIncludePath(b.path("upstream/zstd/lib"));
    return translate.createModule();
}
