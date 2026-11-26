//! The Prosa court as one executable, `prosa`, built from zig/src (Zig 0.15.2).
//!
//!   zig build                                  zig-out/bin/prosa.exe
//!   zig build -Doptimize=ReleaseSmall          the small build
//!   zig build wasm -Doptimize=ReleaseSmall     zig-out/bin/prosa.wasm, the same core behind prosa_check (src/wasm.zig)

const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});

    const exe = b.addExecutable(.{ .name = "prosa", .root_module = b.createModule(.{
        .root_source_file = b.path("src/main.zig"),
        .target = target,
        .optimize = optimize,
    }) });
    b.installArtifact(exe);

    const run = b.addRunArtifact(exe);
    if (b.args) |args| run.addArgs(args);
    b.step("run", "Run prosa").dependOn(&run.step);

    const wasm_root = b.createModule(.{
        .root_source_file = b.path("src/wasm.zig"),
        .target = b.resolveTargetQuery(.{ .cpu_arch = .wasm32, .os_tag = .freestanding }),
        .optimize = optimize,
    });
    wasm_root.addAnonymousImport("violations.json", .{ .root_source_file = b.path("../conformance/violations.json") });
    wasm_root.addAnonymousImport("reader_rights.proz", .{ .root_source_file = b.path("../constitution/reader_rights.proz") });
    const wasm = b.addExecutable(.{ .name = "prosa", .root_module = wasm_root });
    wasm.entry = .disabled;
    wasm.rdynamic = true;
    b.step("wasm", "Build prosa.wasm").dependOn(&b.addInstallArtifact(wasm, .{}).step);
}
