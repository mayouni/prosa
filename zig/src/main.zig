//! prosa : the Prosa court as one executable, ported from tools/prosa/cli.js. It prints byte for byte what
//! `node tools/prosa/cli.js` prints for check, conformance, measure and version (tools/prosa/parity.js measures it).
//! brief, drift, readings and pack are not ported.

const std = @import("std");
const core = @import("core.zig");
const Vec = core.Vec;
const cat = core.cat;

var gpa: std.mem.Allocator = undefined;
var cwd: []const u8 = "";
var root: []const u8 = "";
var contract: core.Contract = undefined;
var out: *std.Io.Writer = undefined;
var err: *std.Io.Writer = undefined;

const usage =
    \\prosa 0.1.0 (language 0.1)
    \\
    \\  prosa check <path>... [--level N] [--style S --form F --subject T --lang L] [--proz F]... [--json] [--quiet]
    \\  prosa measure <path>... [--as NAME] [--json]
    \\  prosa brief <file.proz> [--piece P | --style S [--form F] [--lang L]]
    \\  prosa drift <drafts>... --against <corpus> [--lang L] [--json]
    \\  prosa readings <path>...
    \\  prosa conformance [dir]
    \\  prosa pack <file.proz> [-o out.json]      prosa pack --check
    \\  prosa version
    \\
    \\Exit codes: 0 no error (warnings allowed), 1 an error, 2 a usage or read error.
;

fn oom() noreturn {
    @panic("out of memory");
}
fn eq(a: []const u8, b: []const u8) bool {
    return std.mem.eql(u8, a, b);
}
fn finish(code: u8) noreturn {
    out.flush() catch {};
    err.flush() catch {};
    std.process.exit(code);
}
fn fail(msg: []const u8) noreturn {
    err.print("prosa: {s}\n", .{msg}) catch {};
    finish(2);
}

// ---------------------------------------------------------------- paths and files

fn resolve(base: []const u8, p: []const u8) []const u8 {
    return std.fs.path.resolve(gpa, &.{ base, p }) catch oom();
}
fn posix(p: []const u8) []const u8 {
    if (std.fs.path.sep == '/') return p;
    const s = gpa.dupe(u8, p) catch oom();
    std.mem.replaceScalar(u8, s, std.fs.path.sep, '/');
    return s;
}
fn rel(p: []const u8) []const u8 {
    const r = std.fs.path.relative(gpa, cwd, p) catch oom();
    return if (r.len == 0) "." else posix(r);
}
fn dirname(p: []const u8) []const u8 {
    return std.fs.path.dirname(p) orelse p;
}
const PathKind = enum { file, dir };
fn kindOf(abs: []const u8) ?PathKind {
    if (std.fs.openDirAbsolute(abs, .{})) |d| {
        var dd = d;
        dd.close();
        return .dir;
    } else |_| {}
    if (std.fs.openFileAbsolute(abs, .{})) |f| {
        f.close();
        return .file;
    } else |_| {}
    return null;
}
fn readText(abs: []const u8) ?[]const u8 {
    const s = std.fs.cwd().readFileAlloc(gpa, abs, 1 << 30) catch return null;
    return if (std.mem.startsWith(u8, s, "\xEF\xBB\xBF")) s[3..] else s;
}
fn extLower(p: []const u8) []const u8 {
    const base = std.fs.path.basename(p);
    const dot = std.mem.lastIndexOfScalar(u8, base, '.') orelse return "";
    if (dot == 0) return "";
    return std.ascii.allocLowerString(gpa, base[dot..]) catch oom();
}
fn has(list: []const []const u8, x: []const u8) bool {
    for (list) |y| if (eq(x, y)) return true;
    return false;
}
fn strLt(_: void, a: []const u8, b: []const u8) bool {
    return std.mem.lessThan(u8, a, b);
}
fn walkAbs(abs: []const u8, shown: []const u8, exts: []const []const u8, res: *Vec([]const u8)) void {
    const k = kindOf(abs) orelse fail(cat(&.{ "cannot read ", shown }));
    if (k == .dir) {
        var dir = std.fs.openDirAbsolute(abs, .{ .iterate = true }) catch fail(cat(&.{ "cannot read ", shown }));
        defer dir.close();
        var names: Vec([]const u8) = .{};
        var it = dir.iterate();
        while (it.next() catch null) |e| names.add(gpa.dupe(u8, e.name) catch oom());
        std.mem.sort([]const u8, names.items(), {}, strLt);
        for (names.items()) |n| {
            if (eq(n, "node_modules") or std.mem.startsWith(u8, n, ".git") or eq(n, "zig-out") or eq(n, ".zig-cache")) continue;
            const child = std.fs.path.join(gpa, &.{ abs, n }) catch oom();
            walkAbs(child, child, exts, res);
        }
    } else if (has(exts, extLower(abs))) res.add(abs);
}
fn walk(p: []const u8, exts: []const []const u8, res: *Vec([]const u8)) void {
    walkAbs(resolve(cwd, p), p, exts, res);
}
fn globMatch(p: []const u8, s: []const u8) bool {
    if (p.len == 0) return s.len == 0;
    if (std.mem.startsWith(u8, p, "**/")) {
        if (globMatch(p[3..], s)) return true;
        for (s, 0..) |c, i| {
            if (c == '/' and globMatch(p[3..], s[i + 1 ..])) return true;
        }
        return false;
    }
    if (p[0] == '*') {
        var i: usize = 0;
        while (true) : (i += 1) {
            if (globMatch(p[1..], s[i..])) return true;
            if (i >= s.len or s[i] == '/') return false;
        }
    }
    if (s.len == 0) return false;
    if (p[0] == '?') return s[0] != '/' and globMatch(p[1..], s[1..]);
    return p[0] == s[0] and globMatch(p[1..], s[1..]);
}
fn globFiles(base: []const u8, pattern: []const u8) []const []const u8 {
    var res: Vec([]const u8) = .{};
    const abs = resolve(base, pattern);
    const full = posix(abs);
    const star = std.mem.indexOfAny(u8, full, "*?") orelse {
        if (kindOf(abs) != null) res.add(abs);
        return res.items();
    };
    const slash = std.mem.lastIndexOfScalar(u8, full[0 .. star + 1], '/') orelse return res.items();
    const dir = resolve(cwd, full[0..slash]);
    if (kindOf(dir) == null) return res.items();
    var all: Vec([]const u8) = .{};
    walkAbs(dir, dir, &.{ ".md", ".html", ".htm", ".markdown", ".txt" }, &all);
    for (all.items()) |f| {
        if (globMatch(full, posix(f))) res.add(f);
    }
    return res.items();
}

// ---------------------------------------------------------------- the declarations

const From = struct { file: []const u8, line: i64, path: []const u8 };
const Loader = struct {
    seen: std.StringHashMap(void),
    decls: Vec(*core.Decl) = .{},
    diags: Vec(core.Diag) = .{},
    files: Vec([]const u8) = .{},

    fn visit(l: *Loader, f_in: []const u8, from: ?From) void {
        const f = resolve(cwd, f_in);
        if (l.seen.contains(f)) return;
        l.seen.put(f, {}) catch oom();
        const src = readText(f) orelse {
            if (from) |fr| {
                l.diags.add(core.diag(&contract, "UNKNOWN_REFERENCE", rel(fr.file), fr.line, "", &.{
                    .{ .k = "field", .v = "USE" }, .{ .k = "name", .v = fr.path }, .{ .k = "kinds", .v = "readable .proz file" },
                }, .{ .level = 1 }));
                return;
            }
            fail(cat(&.{ "cannot read ", f }));
        };
        const r = core.parse(src, rel(f), &contract);
        l.files.add(f);
        for (r.uses) |u| {
            const target = if (std.mem.startsWith(u8, u.path, "prosa:"))
                std.fs.path.join(gpa, &.{ root, "constitution", cat(&.{ u.path[6..], ".proz" }) }) catch oom()
            else
                resolve(dirname(f), u.path);
            l.visit(target, .{ .file = f, .line = u.line, .path = u.path });
        }
        for (r.decls) |d| d.abs = f;
        l.decls.addAll(r.decls);
        l.diags.addAll(r.diags);
    }
};
fn load(files: []const []const u8) Loader {
    var l: Loader = .{ .seen = std.StringHashMap(void).init(gpa) };
    for (files) |f| l.visit(f, null);
    return l;
}
const PieceFile = struct { piece: *core.Decl, file: []const u8, missing: bool = false };
fn piecesFor(decls: []const *core.Decl) []PieceFile {
    var res: Vec(PieceFile) = .{};
    for (decls) |d| {
        if (!eq(d.kind, "PIECE")) continue;
        const base = dirname(d.abs);
        if (core.strT(d, "FILE")) |one| {
            const f = resolve(base, one);
            res.add(.{ .piece = d, .file = f, .missing = kindOf(f) == null });
        } else if (core.strT(d, "FILES")) |many| {
            for (globFiles(base, many)) |f| res.add(.{ .piece = d, .file = f });
        }
    }
    return res.items();
}
fn allowMatches(a: *const core.Decl, file: []const u8) bool {
    const want = core.strT(a, "FILE") orelse return false;
    return eq(posix(resolve(cwd, file)), posix(resolve(dirname(a.abs), want)));
}
fn anyError(diags: []const core.Diag) bool {
    return core.countSeverity(diags, "error") > 0;
}
fn readOrDie(f: []const u8) []const u8 {
    return readText(f) orelse {
        err.print("prosa: cannot read {s}\n", .{f}) catch {};
        finish(1);
    };
}
fn judgeFile(decls: []const *core.Decl, target: core.Target, f: []const u8, level: i64) []core.Diag {
    return core.judge(decls, target, readOrDie(f), &contract, level, rel(f), &allowMatches);
}

// ---------------------------------------------------------------- the commands

const Args = struct {
    pos: Vec([]const u8) = .{},
    proz: Vec([]const u8) = .{},
    level: ?[]const u8 = null,
    style: ?[]const u8 = null,
    form: ?[]const u8 = null,
    subject: ?[]const u8 = null,
    lang: ?[]const u8 = null,
    as: ?[]const u8 = null,
    json: bool = false,
    quiet: bool = false,
};
fn parseArgs(argv: []const []const u8) Args {
    var a: Args = .{};
    const takes = [_][]const u8{ "level", "style", "form", "subject", "lang", "as", "against", "piece", "o", "proz" };
    var i: usize = 0;
    while (i < argv.len) : (i += 1) {
        const x = argv[i];
        if (std.mem.startsWith(u8, x, "--") or eq(x, "-o")) {
            const k = std.mem.trimLeft(u8, x, "-");
            if (has(&takes, k)) {
                i += 1;
                const v: ?[]const u8 = if (i < argv.len) argv[i] else null;
                if (eq(k, "proz")) {
                    a.proz.add(v orelse fail("--proz needs a file"));
                } else if (eq(k, "level")) {
                    a.level = v;
                } else if (eq(k, "style")) {
                    a.style = v;
                } else if (eq(k, "form")) {
                    a.form = v;
                } else if (eq(k, "subject")) {
                    a.subject = v;
                } else if (eq(k, "lang")) {
                    a.lang = v;
                } else if (eq(k, "as")) a.as = v;
            } else if (eq(k, "json")) {
                a.json = true;
            } else if (eq(k, "quiet")) a.quiet = true;
        } else a.pos.add(x);
    }
    return a;
}
fn truthy(s: ?[]const u8) ?[]const u8 {
    return if (s != null and s.?.len > 0) s else null;
}
/// parseInt(s, 10), NaN when there are no digits.
fn parseJsInt(s: []const u8) f64 {
    const t = std.mem.trimLeft(u8, s, " \t\r\n");
    var i: usize = 0;
    var neg = false;
    if (i < t.len and (t[i] == '+' or t[i] == '-')) {
        neg = t[i] == '-';
        i += 1;
    }
    const start = i;
    var n: f64 = 0;
    while (i < t.len and t[i] >= '0' and t[i] <= '9') : (i += 1) n = n * 10 + @as(f64, @floatFromInt(t[i] - '0'));
    if (i == start) return std.math.nan(f64);
    return if (neg) -n else n;
}

fn runCheck(a: *Args) u8 {
    if (a.pos.len() == 0) fail("check needs a path");
    const level: f64 = if (truthy(a.level)) |l| parseJsInt(l) else 4;
    var proz: Vec([]const u8) = .{};
    var texts: Vec([]const u8) = .{};
    for (a.proz.items()) |f| proz.add(resolve(cwd, f));
    for (a.pos.items()) |p| {
        var fs: Vec([]const u8) = .{};
        walk(p, &.{ ".proz", ".md", ".markdown", ".html", ".htm" }, &fs);
        for (fs.items()) |f| {
            if (std.mem.endsWith(u8, f, ".proz")) proz.add(f) else texts.add(f);
        }
    }
    var l = load(proz.items());
    var diags: Vec(core.Diag) = .{};
    diags.addAll(l.diags.items());
    var judged = std.StringHashMap(void).init(gpa);
    for (l.files.items()) |f| judged.put(rel(f), {}) catch oom();
    const syntax_bad = anyError(diags.items());
    if (level >= 2 and !syntax_bad) diags.addAll(core.checkDeclarations(l.decls.items(), &contract));
    var decl_bad = false;
    for (diags.items()) |d| {
        if (eq(d.severity, "error") and d.level <= 2) decl_bad = true;
    }
    if (level >= 3 and !decl_bad) {
        const Job = struct { file: []const u8, target: core.Target, style: []const u8 = "" };
        var jobs: Vec(Job) = .{};
        const pieces = piecesFor(l.decls.items());
        var explicit = false;
        for (a.pos.items()) |p| {
            if (std.mem.endsWith(u8, p, ".proz")) continue;
            const k = kindOf(resolve(cwd, p)) orelse continue;
            if (k == .file or texts.len() > 0) explicit = true;
        }
        if (truthy(a.style)) |style| {
            for (texts.items()) |f| jobs.add(.{ .file = f, .target = .{ .style = style, .form = a.form, .subject = a.subject, .language = a.lang }, .style = style });
        } else {
            for (pieces) |pc| {
                if (pc.missing) {
                    diags.add(core.diag(&contract, "PIECE_FILE_NOT_FOUND", rel(pc.piece.abs), pc.piece.line, pc.piece.name, &.{.{ .k = "path", .v = core.str(pc.piece, "FILE") orelse "" }}, .{}));
                    continue;
                }
                if (explicit and texts.len() > 0 and !has(texts.items(), pc.file)) continue;
                jobs.add(.{ .file = pc.file, .target = .{ .piece = pc.piece.name, .subject = a.subject }, .style = core.idv(pc.piece, "FOLLOWS") orelse "" });
            }
        }
        // a file two pieces bind is judged twice, and each finding names the piece and the style that raised it
        var jobs_on = std.StringHashMap(usize).init(gpa);
        for (jobs.items()) |j| {
            const g = jobs_on.getOrPut(j.file) catch oom();
            g.value_ptr.* = if (g.found_existing) g.value_ptr.* + 1 else 1;
        }
        for (jobs.items()) |j| {
            const r = judgeFile(l.decls.items(), j.target, j.file, @intFromFloat(@min(level, 1000)));
            if (jobs_on.get(j.file).? > 1) for (r) |*d| {
                if (eq(d.file, rel(j.file))) {
                    d.piece = j.target.piece orelse "";
                    d.style = j.style;
                }
            };
            diags.addAll(r);
            judged.put(rel(j.file), {}) catch oom();
        }
    }
    var kept: Vec(core.Diag) = .{};
    var seen = std.StringHashMap(void).init(gpa);
    for (diags.items()) |d| {
        if (!(@as(f64, @floatFromInt(d.level)) <= level)) continue;
        const key = cat(&.{ d.code, "|", d.file, "|", core.intStr(d.line), "|", core.intStr(d.col), "|", d.subject, "|", d.message, "|", d.piece orelse "" });
        if (seen.contains(key)) continue;
        seen.put(key, {}) catch oom();
        kept.add(d);
    }
    if (a.json) {
        core.jWrite(out, core.envelope(kept.items()), 0) catch {};
        out.writeAll("\n") catch {};
    } else if (!a.quiet) {
        core.reportText(out, kept.items(), judged.count(), core.numStr(level)) catch {};
    }
    return if (anyError(kept.items())) 1 else 0;
}

fn runConformance(a: *Args) u8 {
    const dir = if (a.pos.len() > 0) resolve(cwd, a.pos.items()[0]) else std.fs.path.join(gpa, &.{ root, "conformance", "fixtures" }) catch oom();
    var files: Vec([]const u8) = .{};
    walkAbs(dir, dir, &.{".proz"}, &files);
    cwd = root;
    var pass: usize = 0;
    var failed: usize = 0;
    var rows: Vec(core.J) = .{};
    for (files.items()) |f| {
        const src = readOrDie(f);
        const want_line = expected(src) orelse continue;
        var want: Vec([]const u8) = .{};
        if (!eq(std.mem.trim(u8, want_line, " \t"), "none")) {
            var it = std.mem.splitScalar(u8, want_line, ',');
            while (it.next()) |s| {
                const t = std.mem.trim(u8, s, " \t");
                if (t.len > 0) want.add(t);
            }
            std.mem.sort([]const u8, want.items(), {}, strLt);
        }
        var l = load(&.{f});
        var d: Vec(core.Diag) = .{};
        d.addAll(l.diags.items());
        if (!anyError(d.items())) d.addAll(core.checkDeclarations(l.decls.items(), &contract));
        if (!anyError(d.items())) {
            for (piecesFor(l.decls.items())) |pc| {
                if (pc.missing) {
                    d.add(core.diag(&contract, "PIECE_FILE_NOT_FOUND", rel(f), pc.piece.line, pc.piece.name, &.{}, .{}));
                    continue;
                }
                d.addAll(judgeFile(l.decls.items(), .{ .piece = pc.piece.name }, pc.file, 4));
            }
        }
        var got: Vec([]const u8) = .{};
        for (d.items()) |x| {
            if (!has(got.items(), x.code)) got.add(x.code);
        }
        std.mem.sort([]const u8, got.items(), {}, strLt);
        var ok = got.len() == want.len();
        if (ok) {
            for (got.items(), want.items()) |g, w| {
                if (!eq(g, w)) ok = false;
            }
        }
        if (ok) pass += 1 else failed += 1;
        rows.add(.{ .obj = gpa.dupe(core.J.Pair, &.{ .{ .k = "file", .v = .{ .s = posix(std.fs.path.relative(gpa, root, f) catch oom()) } }, .{ .k = "got", .v = core.jStrings(got.items()) } }) catch oom() });
        if (!ok) {
            const w = std.mem.join(gpa, ", ", want.items()) catch oom();
            const g = std.mem.join(gpa, ", ", got.items()) catch oom();
            out.print("FAIL  {s}\n      expected: {s}\n      got:      {s}\n", .{ rel(f), if (w.len > 0) w else "none", if (g.len > 0) g else "none" }) catch {};
        }
    }
    if (a.json) {
        core.jWrite(out, .{ .arr = rows.items() }, 0) catch {};
        out.writeAll("\n") catch {};
    } else out.print("{d} of {d} fixtures pass\n", .{ pass, pass + failed }) catch {};
    return if (failed > 0) 1 else 0;
}
/// /^\/\/ Expected:\s*(.*)$/m
fn expected(src: []const u8) ?[]const u8 {
    const key = "// Expected:";
    var from: usize = 0;
    while (std.mem.indexOfPos(u8, src, from, key)) |at| : (from = at + 1) {
        if (at != 0 and src[at - 1] != '\n' and src[at - 1] != '\r') continue;
        var i = at + key.len;
        while (i < src.len and (src[i] == ' ' or src[i] == '\t' or src[i] == '\n' or src[i] == '\r' or src[i] == 11 or src[i] == 12)) i += 1;
        var e = i;
        while (e < src.len and src[e] != '\n' and src[e] != '\r') e += 1;
        return src[i..e];
    }
    return null;
}

fn round(x: f64) f64 {
    return @floor(x + 0.5);
}
fn fi(x: i64) f64 {
    return @floatFromInt(x);
}
fn runMeasure(a: *Args) u8 {
    if (a.pos.len() == 0) fail("measure needs a path");
    var files: Vec([]const u8) = .{};
    for (a.pos.items()) |p| walk(p, &.{ ".md", ".markdown", ".html", ".htm" }, &files);
    if (files.len() == 0) fail("no text files");
    var t: core.M = .{};
    var lens: Vec(core.Len) = .{};
    var pages: Vec(core.J) = .{};
    const N = core.numStr;
    for (files.items()) |f| {
        const m = core.measure(core.read(core.toU16(readOrDie(f)), f).blocks);
        t.words += m.words;
        t.sentences += m.sentences;
        t.paragraphs += m.paragraphs;
        t.excl += m.excl;
        t.cold += m.cold;
        t.questions += m.questions;
        t.colons += m.colons;
        t.dashes += m.dashes;
        t.ellipses += m.ellipses;
        t.colonLeads += m.colonLeads;
        t.oneSentenceParas += m.oneSentenceParas;
        lens.addAll(m.lens);
        var long_n: i64 = 0;
        for (m.lens) |x| {
            if (x.n > 40 and !x.list) long_n += 1;
        }
        pages.add(.{ .obj = gpa.dupe(core.J.Pair, &.{
            .{ .k = "file", .v = .{ .s = rel(f) } },         .{ .k = "words", .v = .{ .i = m.words } },
            .{ .k = "sentences", .v = .{ .i = m.sentences } }, .{ .k = "median", .v = .{ .i = m.median } },
            .{ .k = "excl", .v = .{ .i = m.excl } },         .{ .k = "questions", .v = .{ .i = m.questions } },
            .{ .k = "colons", .v = .{ .i = m.colons } },     .{ .k = "dashes", .v = .{ .i = m.dashes } },
            .{ .k = "long", .v = .{ .i = long_n } },
        }) catch oom() });
    }
    var sorted: Vec(i64) = .{};
    var long: i64 = 0;
    var short: i64 = 0;
    for (lens.items()) |x| {
        sorted.add(x.n);
        if (x.n > 40 and !x.list) long += 1;
        if (x.n < 10) short += 1;
    }
    std.mem.sort(i64, sorted.items(), {}, std.sort.asc(i64));
    core.quartiles(&t, sorted.items());
    const words = @max(1, fi(t.words));
    const K = struct {
        fn k(v: i64, w: f64) f64 {
            return round(fi(v) * 10000 / w) / 10;
        }
        fn pct(v: i64, n: i64) f64 {
            return round(1000 * fi(v) / @max(1, fi(n))) / 10;
        }
        fn room(v: f64, f: f64) f64 {
            return @max(1, @ceil(v * f));
        }
    };
    const long_pct = K.pct(long, t.sentences);
    const under10 = K.pct(short, t.sentences);
    const excl_k = K.k(t.excl, words);
    const q_k = K.k(t.questions, words);
    const colon_k = K.k(t.colons, words);
    const dash_k = K.k(t.dashes, words);
    const one_pct = K.pct(t.oneSentenceParas, t.paragraphs);
    const n_pages: i64 = @intCast(files.len());
    if (a.json) {
        const prof = gpa.dupe(core.J.Pair, &.{
            .{ .k = "pages", .v = .{ .i = n_pages } },       .{ .k = "words", .v = .{ .i = t.words } },
            .{ .k = "sentences", .v = .{ .i = t.sentences } }, .{ .k = "median", .v = .{ .i = t.median } },
            .{ .k = "q1", .v = .{ .i = t.q1 } },             .{ .k = "q3", .v = .{ .i = t.q3 } },
            .{ .k = "long_pct", .v = .{ .f = long_pct } },   .{ .k = "under10_pct", .v = .{ .f = under10 } },
            .{ .k = "excl_per_k", .v = .{ .f = excl_k } },   .{ .k = "q_per_k", .v = .{ .f = q_k } },
            .{ .k = "colon_per_k", .v = .{ .f = colon_k } }, .{ .k = "dash_per_k", .v = .{ .f = dash_k } },
            .{ .k = "one_sentence_para_pct", .v = .{ .f = one_pct } }, .{ .k = "ellipses", .v = .{ .i = t.ellipses } },
            .{ .k = "colon_leads", .v = .{ .i = t.colonLeads } },
        }) catch oom();
        core.jWrite(out, .{ .obj = gpa.dupe(core.J.Pair, &.{ .{ .k = "profile", .v = .{ .obj = prof } }, .{ .k = "pages", .v = .{ .arr = pages.items() } } }) catch oom() }, 0) catch {};
        out.writeAll("\n") catch {};
        return 0;
    }
    const name = truthy(a.as) orelse "measured_voice";
    var where: []const u8 = undefined;
    if (a.pos.len() > 2) {
        where = cat(&.{ posix(std.fs.path.dirname(a.pos.items()[0]) orelse "."), " (", core.intStr(n_pages), " pages)" });
    } else {
        var ps: Vec([]const u8) = .{};
        for (a.pos.items()) |p| ps.add(posix(p));
        where = std.mem.join(gpa, ", ", ps.items()) catch oom();
    }
    out.print(
        \\// Measured by prosa measure on {d} page(s), {d} prose words, {d} sentences.
        \\// median {d} (quartiles {d} and {d}) | over 40 words {s} % | under 10 words {s} %
        \\// per thousand words: colons {s}, dashes {s}, exclamations {s}, questions {s}
        \\// paragraphs of one sentence {s} %
        \\
        \\DEFINE PROFILE {s} (
        \\  SENTENCE_MEDIAN {d} WITHIN {s},
        \\  SENTENCES_OVER 40 AT_MOST {s} PER_HUNDRED,
        \\  SENTENCES_UNDER 10 AT_LEAST {s} PER_HUNDRED,
        \\  DASHES AT_MOST {s} PER_THOUSAND,
        \\  COLONS AT_LEAST {s} PER_THOUSAND,
        \\  EXCLAMATIONS AT_MOST {s} PER_THOUSAND,
        \\  MIN_WORDS 300,
        \\  EVIDENCE "Measured on {s}: {d} words"
        \\)
        \\
    , .{
        n_pages,                               t.words,                                t.sentences,
        t.median,                              t.q1,                                   t.q3,
        N(long_pct),                           N(under10),                             N(colon_k),
        N(dash_k),                             N(excl_k),                              N(q_k),
        N(one_pct),                            name,                                   t.median,
        N(K.room(fi(t.median), 0.25)),         N(K.room(long_pct, 1.8)),               N(@max(1, @floor(under10 * 0.5))),
        N(K.room(dash_k, 2)),                  N(@max(1, @floor(colon_k * 0.5))),      N(K.room(excl_k, 1.7)),
        where,                                 t.words,
    }) catch {};
    return 0;
}

fn findRoot(start: []const u8) ?[]const u8 {
    var dir: []const u8 = start;
    while (true) {
        const probe = std.fs.path.join(gpa, &.{ dir, "conformance", "violations.json" }) catch oom();
        if (kindOf(probe) == .file) return dir;
        const up = std.fs.path.dirname(dir) orelse return null;
        if (up.len == dir.len) return null;
        dir = up;
    }
}

pub fn main() void {
    var arena_state = std.heap.ArenaAllocator.init(std.heap.page_allocator);
    gpa = arena_state.allocator();
    core.gpa = gpa;
    var out_buf: [65536]u8 = undefined;
    var out_w = std.fs.File.stdout().writer(&out_buf);
    out = &out_w.interface;
    var err_buf: [4096]u8 = undefined;
    var err_w = std.fs.File.stderr().writer(&err_buf);
    err = &err_w.interface;

    const raw = std.process.argsAlloc(gpa) catch oom();
    const argv: []const []const u8 = if (raw.len > 1) raw[1..] else &.{};
    cwd = std.process.getCwdAlloc(gpa) catch fail("cannot read the current directory");
    root = findRoot(cwd) orelse blk: {
        const exe = std.fs.selfExeDirPathAlloc(gpa) catch fail("cannot find conformance/violations.json");
        break :blk findRoot(exe) orelse fail("cannot find conformance/violations.json above the current directory or the executable");
    };
    const cj = readText(std.fs.path.join(gpa, &.{ root, "conformance", "violations.json" }) catch oom()) orelse fail("cannot read conformance/violations.json");
    contract = core.loadContract(cj) catch fail("conformance/violations.json is not a contract");

    if (argv.len == 0) {
        out.print("{s}\n", .{usage}) catch {};
        finish(0);
    }
    const cmd = argv[0];
    var a = parseArgs(argv[1..]);
    if (eq(cmd, "check")) finish(runCheck(&a));
    if (eq(cmd, "measure")) finish(runMeasure(&a));
    if (eq(cmd, "conformance")) finish(runConformance(&a));
    if (eq(cmd, "version") or eq(cmd, "--version")) {
        out.print("prosa {s} (language {s}, contract {s})\n", .{ core.version_court, core.version_language, contract.version }) catch {};
        finish(0);
    }
    if (eq(cmd, "brief") or eq(cmd, "drift") or eq(cmd, "readings") or eq(cmd, "pack")) fail(cat(&.{ cmd, " is not ported to this binary: run node tools/prosa/cli.js ", cmd }));
    out.print("{s}\n", .{usage}) catch {};
    finish(2);
}
