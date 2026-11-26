//! The wasm export surface of the Prosa court: the core and nothing else, for wasm32-freestanding with no imports.
//!
//!   prosa_alloc(len) -> ptr                    memory for the loader to write a string into
//!   prosa_free(ptr, len)                       gives it back
//!   prosa_check(proz, proz_len, text, text_len, level) -> ptr
//!       One .proz source, and one Markdown text or none (text_len 0). `USE "prosa:reader_rights"` is answered from the
//!       constitution built in; any other USE is an UNKNOWN_REFERENCE. With a text, each PIECE of the source is judged
//!       on it, or its first STYLE when it declares no PIECE. ptr is a block: a 4-byte little-endian length, then the
//!       envelope `prosa check --json` prints, as UTF-8; free it as (ptr, 4 + length). 0 when memory runs out.

const std = @import("std");
const core = @import("core.zig");

const backing = std.heap.wasm_allocator;
const violations_json = @embedFile("violations.json");
const reader_rights = @embedFile("reader_rights.proz");

export fn prosa_alloc(len: usize) usize {
    const s = backing.alloc(u8, len) catch return 0;
    return @intFromPtr(s.ptr);
}
export fn prosa_free(ptr: usize, len: usize) void {
    if (ptr == 0) return;
    backing.free(@as([*]u8, @ptrFromInt(ptr))[0..len]);
}
fn bytes(ptr: usize, len: usize) []const u8 {
    if (len == 0) return "";
    return @as([*]const u8, @ptrFromInt(ptr))[0..len];
}
export fn prosa_check(proz: usize, proz_len: usize, text: usize, text_len: usize, level: i32) usize {
    var arena = std.heap.ArenaAllocator.init(backing);
    defer arena.deinit();
    core.gpa = arena.allocator();
    core.crashed = false;
    const res = check(bytes(proz, proz_len), if (text_len == 0) null else bytes(text, text_len), level) catch return 0;
    const block = backing.alloc(u8, 4 + res.len) catch return 0;
    std.mem.writeInt(u32, block[0..4], @intCast(res.len), .little);
    @memcpy(block[4..], res);
    return @intFromPtr(block.ptr);
}

fn check(src: []const u8, text: ?[]const u8, level_in: i32) ![]const u8 {
    const level: i64 = if (level_in < 1) 4 else level_in;
    const contract = try core.loadContract(violations_json);
    var decls: core.Vec(*core.Decl) = .{};
    var diags: core.Vec(core.Diag) = .{};
    const r = core.parse(src, "input.proz", &contract);
    var used = false;
    for (r.uses) |u| {
        if (std.mem.eql(u8, u.path, "prosa:reader_rights")) {
            if (used) continue;
            used = true;
            const c = core.parse(reader_rights, "constitution/reader_rights.proz", &contract);
            decls.addAll(c.decls);
            diags.addAll(c.diags);
        } else diags.add(core.diag(&contract, "UNKNOWN_REFERENCE", "input.proz", u.line, "", &.{
            .{ .k = "field", .v = "USE" }, .{ .k = "name", .v = u.path }, .{ .k = "kinds", .v = "readable .proz file" },
        }, .{ .level = 1 }));
    }
    decls.addAll(r.decls);
    diags.addAll(r.diags);
    if (level >= 2 and core.countSeverity(diags.items(), "error") == 0) diags.addAll(core.checkDeclarations(decls.items(), &contract));
    var bad = false;
    for (diags.items()) |d| {
        if (std.mem.eql(u8, d.severity, "error") and d.level <= 2) bad = true;
    }
    if (level >= 3 and !bad) {
        if (text) |t| {
            var pieces: usize = 0;
            for (r.decls) |d| {
                if (!std.mem.eql(u8, d.kind, "PIECE")) continue;
                pieces += 1;
                diags.addAll(core.judge(decls.items(), .{ .piece = d.name }, t, &contract, level, "input.md", null));
            }
            if (pieces == 0) {
                for (r.decls) |d| {
                    if (!std.mem.eql(u8, d.kind, "STYLE")) continue;
                    diags.addAll(core.judge(decls.items(), .{ .style = d.name }, t, &contract, level, "input.md", null));
                    break;
                }
            }
        }
    }
    if (core.crashed) return error.TypeError;
    var kept: core.Vec(core.Diag) = .{};
    for (diags.items()) |d| {
        if (d.level <= level) kept.add(d);
    }
    var w: std.Io.Writer.Allocating = .init(core.gpa);
    try core.jWrite(&w.writer, core.envelope(kept.items()), 0);
    try w.writer.writeAll("\n");
    return w.written();
}
