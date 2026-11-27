//! core.zig : the Prosa court, ported from tools/prosa/prosa.js. Pure: no file access. Text is handled as UTF-16
//! code units, as JavaScript handles it, so that offsets, lengths and line numbers agree; declarations stay UTF-8.

const std = @import("std");

pub var gpa: std.mem.Allocator = undefined;
/// Set when the JavaScript court would have thrown a TypeError (see judgeForm, HEADINGS).
pub var crashed: bool = false;

pub const U = []const u16;
pub const version_court = "0.1.1";
pub const version_language = "0.1";

fn oom() noreturn {
    @panic("out of memory");
}

pub fn Vec(comptime T: type) type {
    return struct {
        l: std.ArrayList(T) = .empty,
        const Self = @This();
        pub fn add(s: *Self, x: T) void {
            s.l.append(gpa, x) catch oom();
        }
        pub fn addAll(s: *Self, xs: []const T) void {
            s.l.appendSlice(gpa, xs) catch oom();
        }
        pub fn items(s: *const Self) []T {
            return s.l.items;
        }
        pub fn len(s: *const Self) usize {
            return s.l.items.len;
        }
    };
}

pub fn cat(parts: []const []const u8) []const u8 {
    return std.mem.concat(gpa, u8, parts) catch oom();
}
fn eq(a: []const u8, b: []const u8) bool {
    return std.mem.eql(u8, a, b);
}
fn has(list: []const []const u8, x: []const u8) bool {
    for (list) |y| if (eq(x, y)) return true;
    return false;
}
fn hasOpt(list: []const ?[]const u8, x: []const u8) bool {
    for (list) |y| if (y) |z| if (eq(x, z)) return true;
    return false;
}

/// String(number) for the numbers this court prints.
pub fn numStr(x: f64) []const u8 {
    if (std.math.isNan(x)) return "NaN";
    if (x == @floor(x) and @abs(x) < 1e15) return std.fmt.allocPrint(gpa, "{d}", .{@as(i64, @intFromFloat(x))}) catch oom();
    return std.fmt.allocPrint(gpa, "{d}", .{x}) catch oom();
}
pub fn intStr(x: i64) []const u8 {
    return std.fmt.allocPrint(gpa, "{d}", .{x}) catch oom();
}

// ---------------------------------------------------------------- UTF-16

pub fn toU16(s: []const u8) []u16 {
    var out: Vec(u16) = .{};
    var i: usize = 0;
    while (i < s.len) {
        const n = std.unicode.utf8ByteSequenceLength(s[i]) catch {
            out.add(0xFFFD);
            i += 1;
            continue;
        };
        if (i + n > s.len) {
            out.add(0xFFFD);
            i += 1;
            continue;
        }
        const cp = std.unicode.utf8Decode(s[i .. i + n]) catch {
            out.add(0xFFFD);
            i += 1;
            continue;
        };
        if (cp >= 0x10000) {
            const v = cp - 0x10000;
            out.add(@intCast(0xD800 + (v >> 10)));
            out.add(@intCast(0xDC00 + (v & 0x3FF)));
        } else out.add(@intCast(cp));
        i += n;
    }
    return out.items();
}
pub fn toU8(s: U) []const u8 {
    var out: Vec(u8) = .{};
    var i: usize = 0;
    while (i < s.len) : (i += 1) {
        var cp: u21 = s[i];
        if (cp >= 0xD800 and cp <= 0xDBFF and i + 1 < s.len and s[i + 1] >= 0xDC00 and s[i + 1] <= 0xDFFF) {
            cp = 0x10000 + ((cp - 0xD800) << 10) + (s[i + 1] - 0xDC00);
            i += 1;
        } else if (cp >= 0xD800 and cp <= 0xDFFF) cp = 0xFFFD;
        var buf: [4]u8 = undefined;
        const n = std.unicode.utf8Encode(cp, &buf) catch unreachable;
        out.addAll(buf[0..n]);
    }
    return out.items();
}
fn L(comptime s: []const u8) U {
    return std.unicode.utf8ToUtf16LeStringLiteral(s);
}
fn ueq(a: U, b: U) bool {
    return std.mem.eql(u16, a, b);
}
fn ustarts(a: U, b: U) bool {
    return std.mem.startsWith(u16, a, b);
}
fn startsA(a: U, comptime lit: []const u8) bool {
    return ustarts(a, L(lit));
}
fn ucount(s: U, sub: U) i64 {
    return @intCast(std.mem.count(u16, s, sub));
}
fn ucountCh(s: U, c: u16) i64 {
    var n: i64 = 0;
    for (s) |x| {
        if (x == c) n += 1;
    }
    return n;
}
pub fn isSpace(c: u16) bool {
    return switch (c) {
        9, 10, 11, 12, 13, 32, 0xA0, 0x1680, 0x2000...0x200A, 0x2028, 0x2029, 0x202F, 0x205F, 0x3000, 0xFEFF => true,
        else => false,
    };
}
fn utrim(s: U) U {
    var a: usize = 0;
    var b: usize = s.len;
    while (a < b and isSpace(s[a])) a += 1;
    while (b > a and isSpace(s[b - 1])) b -= 1;
    return s[a..b];
}
fn utrimEnd(s: U) U {
    var b: usize = s.len;
    while (b > 0 and isSpace(s[b - 1])) b -= 1;
    return s[0..b];
}
fn lowerCh(c: u16) u16 {
    if (c < 0x80) return if (c >= 'A' and c <= 'Z') c + 32 else c;
    if (c >= 0xC0 and c <= 0xDE and c != 0xD7) return c + 32;
    if (c >= 0x100 and c <= 0x17F) {
        if (c == 0x178) return 0xFF;
        if ((c <= 0x12F or (c >= 0x132 and c <= 0x137) or (c >= 0x14A and c <= 0x177)) and c % 2 == 0) return c + 1;
        if (((c >= 0x139 and c <= 0x148) or (c >= 0x179 and c <= 0x17E)) and c % 2 == 1) return c + 1;
        return c;
    }
    if (c >= 0x391 and c <= 0x3A9 and c != 0x3A2) return c + 32;
    if (c >= 0x410 and c <= 0x42F) return c + 32;
    if (c >= 0x400 and c <= 0x40F) return c + 80;
    if (c == 0x212A) return 'k';
    if (c == 0x212B) return 0xE5;
    if (c == 0x2126) return 0x3C9;
    return c;
}
/// toLowerCase, for Latin, Latin-1, Latin Extended-A, basic Greek and Cyrillic.
fn lower(s: U) U {
    var out: Vec(u16) = .{};
    for (s) |c| {
        if (c == 0x130) {
            out.add('i');
            out.add(0x307);
        } else out.add(lowerCh(c));
    }
    return out.items();
}
/// The canonical form a case-insensitive, non-unicode JavaScript pattern compares by: the simple upper case.
fn canon(c: u16) u16 {
    if (c < 0x80) return if (c >= 'a' and c <= 'z') c - 32 else c;
    if (c >= 0xE0 and c <= 0xFE and c != 0xF7) return c - 32;
    if (c == 0xFF) return 0x178;
    if (c == 0xB5 or c == 0x3BC) return 0x39C;
    if (c >= 0x100 and c <= 0x17F) {
        if ((c <= 0x12F or (c >= 0x132 and c <= 0x137) or (c >= 0x14A and c <= 0x177)) and c % 2 == 1 and c != 0x131) return c - 1;
        if (((c >= 0x139 and c <= 0x148) or (c >= 0x179 and c <= 0x17E)) and c % 2 == 0) return c - 1;
        return c;
    }
    if (c == 0x3C2) return 0x3A3;
    if (c >= 0x3B1 and c <= 0x3C9) return c - 32;
    if (c >= 0x430 and c <= 0x44F) return c - 32;
    if (c >= 0x450 and c <= 0x45F) return c - 80;
    return c;
}

// ---------------------------------------------------------------- the contract and diagnostics

pub const Contract = struct {
    version: []const u8 = "",
    codes: std.StringHashMap(V),
    pub const V = struct { severity: ?[]const u8 = null, level: ?i64 = null, summary: ?[]const u8 = null };
};

pub fn loadContract(json: []const u8) !Contract {
    const root = try std.json.parseFromSliceLeaky(std.json.Value, gpa, json, .{ .duplicate_field_behavior = .use_last });
    var c: Contract = .{ .codes = std.StringHashMap(Contract.V).init(gpa) };
    if (root != .object) return error.BadContract;
    if (root.object.get("contract")) |v| {
        if (v == .string) c.version = v.string;
    }
    if (root.object.get("violations")) |vs| {
        if (vs == .object) {
            var it = vs.object.iterator();
            while (it.next()) |e| {
                var v: Contract.V = .{};
                if (e.value_ptr.* == .object) {
                    const o = e.value_ptr.object;
                    if (o.get("severity")) |x| {
                        if (x == .string and x.string.len > 0) v.severity = x.string;
                    }
                    if (o.get("level")) |x| {
                        if (x == .integer and x.integer != 0) v.level = x.integer;
                    }
                    if (o.get("summary")) |x| {
                        if (x == .string and x.string.len > 0) v.summary = x.string;
                    }
                }
                try c.codes.put(e.key_ptr.*, v);
            }
        }
    }
    return c;
}

pub const Diag = struct {
    code: []const u8,
    severity: []const u8,
    level: i64,
    message: []const u8,
    file: []const u8,
    line: i64,
    subject: []const u8,
    cites: []const []const u8,
    /// The column of a rule's match on its line: it keeps two matches with one message apart. Never printed.
    col: i64 = 0,
    /// Set on a file two pieces bind: the piece and the style that raised the finding.
    piece: ?[]const u8 = null,
    style: []const u8 = "",
};
pub const KV = struct { k: []const u8, v: []const u8 };
pub const Extra = struct { message: ?[]const u8 = null, severity: ?[]const u8 = null, level: ?i64 = null, cites: []const []const u8 = &.{} };

fn isW(c: u8) bool {
    return std.ascii.isAlphanumeric(c) or c == '_';
}

pub fn diag(c: *const Contract, code: []const u8, file: []const u8, line: i64, subject: []const u8, vars: []const KV, extra: Extra) Diag {
    const v: Contract.V = c.codes.get(code) orelse .{};
    var tmpl: []const u8 = code;
    if (extra.message != null and extra.message.?.len > 0) {
        tmpl = extra.message.?;
    } else if (v.summary) |s| tmpl = s;
    var msg: Vec(u8) = .{};
    var i: usize = 0;
    while (i < tmpl.len) {
        if (tmpl[i] == '{') {
            var j = i + 1;
            while (j < tmpl.len and isW(tmpl[j])) j += 1;
            if (j > i + 1 and j < tmpl.len and tmpl[j] == '}') {
                const key = tmpl[i + 1 .. j];
                var found: ?[]const u8 = null;
                for (vars) |kv| {
                    if (eq(kv.k, key)) found = kv.v;
                }
                if (found) |f| msg.addAll(f) else msg.addAll(tmpl[i .. j + 1]);
                i = j + 1;
                continue;
            }
        }
        msg.add(tmpl[i]);
        i += 1;
    }
    return .{
        .code = code,
        .severity = extra.severity orelse v.severity orelse "error",
        .level = extra.level orelse v.level orelse 1,
        .message = msg.items(),
        .file = file,
        .line = line,
        .subject = subject,
        .cites = extra.cites,
    };
}

// ---------------------------------------------------------------- level 1: the .proz reader

const KINDS = [_][]const u8{ "STYLE", "TERM", "WORDLIST", "PATTERN", "PROFILE", "FORM", "ZONE", "PIECE", "ALLOW", "READING" };
const RULE_KINDS = [_][]const u8{ "TERM", "WORDLIST", "PATTERN", "PROFILE" };
const ZONES = [_][]const u8{ "title", "heading", "lede", "body", "list", "quote" };
const POSITIONS = [_][]const u8{ "sentence_start", "sentence_end", "paragraph_start", "paragraph_end" };
const MEASURES = [_][]const u8{ "SENTENCE_MEDIAN", "SENTENCES_OVER", "SENTENCES_UNDER", "DASHES", "COLONS", "EXCLAMATIONS", "COLD_EXCLAMATIONS", "QUESTIONS", "ELLIPSES", "COLON_LEADS", "ONE_SENTENCE_PARAGRAPHS" };

const Spec = struct { kind: []const u8, k: []const u8, w: []const u8 };
const SPECS = [_]Spec{
    .{ .kind = "COMMON", .k = "CODE", .w = "code" },        .{ .kind = "COMMON", .k = "SEVERITY", .w = "severity" },
    .{ .kind = "COMMON", .k = "EVIDENCE", .w = "str" },     .{ .kind = "COMMON", .k = "LANGUAGE", .w = "id" },
    .{ .kind = "COMMON", .k = "IN", .w = "ids" },           .{ .kind = "COMMON", .k = "ON", .w = "ids" },
    .{ .kind = "COMMON", .k = "MENTIONS", .w = "id" },      .{ .kind = "COMMON", .k = "KEEPS", .w = "words" },
    .{ .kind = "COMMON", .k = "SAYS", .w = "str" },
    .{ .kind = "STYLE", .k = "LANGUAGES", .w = "ids" },     .{ .kind = "STYLE", .k = "ADOPTS", .w = "ids" },
    .{ .kind = "STYLE", .k = "HOLDS", .w = "ids" },         .{ .kind = "STYLE", .k = "DECLINES", .w = "ids" },
    .{ .kind = "STYLE", .k = "MEASURED_FROM", .w = "str" },
    .{ .kind = "TERM", .k = "MEANS", .w = "str" },          .{ .kind = "TERM", .k = "REFUSES", .w = "entries" },
    .{ .kind = "TERM", .k = "WRITES", .w = "str" },
    .{ .kind = "WORDLIST", .k = "REFUSES", .w = "entries" }, .{ .kind = "WORDLIST", .k = "AT_MOST", .w = "budget" },
    .{ .kind = "PATTERN", .k = "MATCHES", .w = "entries" }, .{ .kind = "PATTERN", .k = "AT", .w = "id" },
    .{ .kind = "PATTERN", .k = "AT_MOST", .w = "budget" },  .{ .kind = "PATTERN", .k = "REFUSED", .w = "str" },
    .{ .kind = "PATTERN", .k = "WRITTEN", .w = "str" },
    .{ .kind = "PROFILE", .k = "MIN_WORDS", .w = "num" },   .{ .kind = "PROFILE", .k = "CODE", .w = "code" },
    .{ .kind = "PROFILE", .k = "SEVERITY", .w = "severity" }, .{ .kind = "PROFILE", .k = "EVIDENCE", .w = "str" },
    .{ .kind = "PROFILE", .k = "LANGUAGE", .w = "id" },     .{ .kind = "PROFILE", .k = "ON", .w = "ids" },
    .{ .kind = "FORM", .k = "EXTENDS", .w = "id" },         .{ .kind = "FORM", .k = "TITLE_WORDS", .w = "bound" },
    .{ .kind = "FORM", .k = "TITLE_HOLDS", .w = "id" },     .{ .kind = "FORM", .k = "FIRST_SENTENCE_HOLDS", .w = "id" },
    .{ .kind = "FORM", .k = "SAY_ONCE", .w = "first" },     .{ .kind = "FORM", .k = "HEADINGS", .w = "words" },
    .{ .kind = "FORM", .k = "HEADING_CASE", .w = "id" },    .{ .kind = "FORM", .k = "CLOSES_WITHOUT", .w = "words" },
    .{ .kind = "FORM", .k = "HOLES_CLOSED_AT", .w = "ids" }, .{ .kind = "FORM", .k = "EVIDENCE", .w = "str" },
    .{ .kind = "ZONE", .k = "EXEMPT_FROM", .w = "codes" },  .{ .kind = "ZONE", .k = "REASON", .w = "str" },
    .{ .kind = "PIECE", .k = "FILE", .w = "str" },          .{ .kind = "PIECE", .k = "FILES", .w = "str" },
    .{ .kind = "PIECE", .k = "FOLLOWS", .w = "id" },        .{ .kind = "PIECE", .k = "FORM", .w = "id" },
    .{ .kind = "PIECE", .k = "SUBJECT", .w = "str" },       .{ .kind = "PIECE", .k = "SUBJECT_FROM", .w = "id" },
    .{ .kind = "PIECE", .k = "LANGUAGE", .w = "id" },       .{ .kind = "PIECE", .k = "READER", .w = "any" },
    .{ .kind = "ALLOW", .k = "FILE", .w = "str" },          .{ .kind = "ALLOW", .k = "LINE_HOLDS", .w = "str" },
    .{ .kind = "ALLOW", .k = "EXCUSES", .w = "code" },      .{ .kind = "ALLOW", .k = "REASON", .w = "str" },
    .{ .kind = "READING", .k = "ON", .w = "id" },           .{ .kind = "READING", .k = "ASKS", .w = "str" },
    .{ .kind = "READING", .k = "RECORDS", .w = "str" },     .{ .kind = "READING", .k = "EVIDENCE", .w = "str" },
};
fn fieldSpec(kind: []const u8, k: []const u8) ?[]const u8 {
    for (SPECS) |s| {
        if (eq(s.kind, kind) and eq(s.k, k)) return s.w;
    }
    if (eq(kind, "TERM") or eq(kind, "WORDLIST") or eq(kind, "PATTERN")) {
        for (SPECS) |s| {
            if (eq(s.kind, "COMMON") and eq(s.k, k)) return s.w;
        }
    }
    if (eq(kind, "PROFILE") and has(&MEASURES, k)) return "bound";
    return null;
}
fn required(kind: []const u8) []const []const u8 {
    if (eq(kind, "TERM")) return &.{ "MEANS", "REFUSES" };
    if (eq(kind, "WORDLIST")) return &.{ "REFUSES", "CODE" };
    if (eq(kind, "PATTERN")) return &.{ "MATCHES", "CODE" };
    if (eq(kind, "ZONE")) return &.{ "EXEMPT_FROM", "REASON" };
    if (eq(kind, "PIECE")) return &.{"FOLLOWS"};
    if (eq(kind, "ALLOW")) return &.{ "FILE", "LINE_HOLDS", "EXCUSES", "REASON" };
    if (eq(kind, "READING")) return &.{ "ON", "ASKS", "RECORDS" };
    return &.{};
}

const Tok = struct { t: u8, s: []const u8 = "", n: f64 = 0, line: i64 }; // t: ( ) [ ] , s n i k
pub const Val = struct { t: u8, s: []const u8 = "", n: f64 = 0, items: []const []const Val = &.{}, line: i64 = 0 }; // t: s n i k l
pub const Field = struct { name: []const u8, line: i64, values: []const Val };
pub const Decl = struct {
    kind: []const u8,
    name: []const u8,
    line: i64,
    file: []const u8,
    abs: []const u8 = "",
    fields: []const Field = &.{},
    pub fn get(d: *const Decl, k: []const u8) ?Field {
        for (d.fields) |f| {
            if (eq(f.name, k)) return f;
        }
        return null;
    }
};
pub const Use = struct { path: []const u8, line: i64 };
pub const Parsed = struct { decls: []*Decl, uses: []Use, diags: []Diag };

fn lex(src: []const u8, file: []const u8, c: *const Contract, out: *Vec(Diag)) []Tok {
    var toks: Vec(Tok) = .{};
    var i: usize = 0;
    var line: i64 = 1;
    const n = src.len;
    while (i < n) {
        const ch = src[i];
        if (ch == '\n') {
            line += 1;
            i += 1;
            continue;
        }
        if (ch == ' ' or ch == '\t' or ch == '\r') {
            i += 1;
            continue;
        }
        if (ch == 0xEF and i + 2 < n and src[i + 1] == 0xBB and src[i + 2] == 0xBF) {
            i += 3;
            continue;
        }
        if (ch == '/' and i + 1 < n and src[i + 1] == '/') {
            while (i < n and src[i] != '\n') i += 1;
            continue;
        }
        if (ch == '(' or ch == ')' or ch == '[' or ch == ']' or ch == ',') {
            toks.add(.{ .t = ch, .line = line });
            i += 1;
            continue;
        }
        if (ch == '"') {
            var j = i + 1;
            var s: Vec(u8) = .{};
            var ok = false;
            while (j < n and src[j] != '\n') {
                if (src[j] == '\\' and j + 1 < n and (src[j + 1] == '"' or src[j + 1] == '\\')) {
                    s.add(src[j + 1]);
                    j += 2;
                    continue;
                }
                if (src[j] == '"') {
                    ok = true;
                    break;
                }
                s.add(src[j]);
                j += 1;
            }
            if (!ok) {
                out.add(diag(c, "UNTERMINATED_STRING", file, line, "", &.{}, .{}));
                i = j;
                continue;
            }
            toks.add(.{ .t = 's', .s = s.items(), .line = line });
            i = j + 1;
            continue;
        }
        var j = i;
        while (j < n and j - i < 80 and (isW(src[j]) or src[j] == '.')) j += 1;
        if (j > i) {
            const w = src[i..j];
            i = j;
            if (isNumber(w)) {
                toks.add(.{ .t = 'n', .n = std.fmt.parseFloat(f64, w) catch 0, .line = line });
            } else if (isKwWord(w)) {
                toks.add(.{ .t = 'k', .s = w, .line = line });
            } else if (isIdWord(w)) {
                toks.add(.{ .t = 'i', .s = w, .line = line });
            } else out.add(diag(c, "UNEXPECTED_TOKEN", file, line, "", &.{.{ .k = "token", .v = w }}, .{}));
            continue;
        }
        var len: usize = std.unicode.utf8ByteSequenceLength(ch) catch 1;
        if (i + len > n) len = 1;
        out.add(diag(c, "UNEXPECTED_TOKEN", file, line, "", &.{.{ .k = "token", .v = src[i .. i + len] }}, .{}));
        i += len;
    }
    return toks.items();
}
fn isNumber(w: []const u8) bool {
    var i: usize = 0;
    while (i < w.len and std.ascii.isDigit(w[i])) i += 1;
    if (i == 0) return false;
    if (i == w.len) return true;
    if (w[i] != '.') return false;
    const s = i + 1;
    i = s;
    while (i < w.len and std.ascii.isDigit(w[i])) i += 1;
    return i > s and i == w.len;
}
fn isKwWord(w: []const u8) bool {
    if (w.len == 0 or !std.ascii.isUpper(w[0])) return false;
    for (w) |ch| {
        if (!(std.ascii.isUpper(ch) or std.ascii.isDigit(ch) or ch == '_')) return false;
    }
    return true;
}
fn isIdWord(w: []const u8) bool {
    if (w.len == 0 or !std.ascii.isLower(w[0])) return false;
    for (w) |ch| {
        if (!(std.ascii.isLower(ch) or std.ascii.isDigit(ch) or ch == '_')) return false;
    }
    return true;
}
fn tokStr(t: Tok) []const u8 {
    return switch (t.t) {
        'n' => numStr(t.n),
        's', 'i', 'k' => t.s,
        else => gpa.dupe(u8, &.{t.t}) catch oom(),
    };
}

const Parser = struct {
    toks: []const Tok,
    p: usize = 0,
    out: *Vec(Diag),
    file: []const u8,
    c: *const Contract,

    fn at(self: *Parser, i: usize) ?Tok {
        return if (i < self.toks.len) self.toks[i] else null;
    }
    fn bad(self: *Parser, tok: ?Tok, what: []const u8) void {
        self.out.add(diag(self.c, "UNEXPECTED_TOKEN", self.file, if (tok) |t| t.line else 0, "", &.{
            .{ .k = "token", .v = if (tok) |t| tokStr(t) else "end of file" },
            .{ .k = "expected", .v = what },
        }, .{}));
    }
    fn isDefine(self: *Parser, i: usize) bool {
        return i < self.toks.len and self.toks[i].t == 'k' and eq(self.toks[i].s, "DEFINE");
    }
    fn value(self: *Parser) ?Val {
        const t = self.at(self.p) orelse return null;
        if (t.t == 's' or t.t == 'n' or t.t == 'i' or t.t == 'k') {
            self.p += 1;
            return .{ .t = t.t, .s = t.s, .n = t.n, .line = t.line };
        }
        if (t.t == '[') {
            self.p += 1;
            var items: Vec([]const Val) = .{};
            var cur: Vec(Val) = .{};
            while (self.p < self.toks.len and self.toks[self.p].t != ']') {
                const x = self.toks[self.p];
                if (x.t == ',') {
                    if (cur.len() > 0) items.add(cur.items());
                    cur = .{};
                    self.p += 1;
                    continue;
                }
                if (x.t == '(' or x.t == ')') {
                    self.bad(x, "a value or ]");
                    return .{ .t = 'l', .items = items.items(), .line = t.line };
                }
                const v = self.value() orelse break;
                cur.add(v);
            }
            if (cur.len() > 0) items.add(cur.items());
            if (self.p >= self.toks.len) {
                self.bad(null, "]");
                return .{ .t = 'l', .items = items.items(), .line = t.line };
            }
            self.p += 1;
            return .{ .t = 'l', .items = items.items(), .line = t.line };
        }
        return null;
    }
};

pub fn parse(src: []const u8, file: []const u8, c: *const Contract) Parsed {
    var out: Vec(Diag) = .{};
    const toks = lex(src, file, c, &out);
    const lex_bad = out.len() > 0;
    var decls: Vec(*Decl) = .{};
    var uses: Vec(Use) = .{};
    var ps: Parser = .{ .toks = toks, .out = &out, .file = file, .c = c };
    const n = toks.len;
    while (ps.p < n) {
        const t = toks[ps.p];
        if (t.t == 'k' and eq(t.s, "USE")) {
            const nx = ps.at(ps.p + 1);
            if (nx != null and nx.?.t == 's') {
                uses.add(.{ .path = nx.?.s, .line = t.line });
                ps.p += 2;
            } else {
                ps.bad(nx, "a quoted path");
                ps.p += 1;
            }
            continue;
        }
        if (!ps.isDefine(ps.p)) {
            ps.bad(t, "DEFINE");
            ps.p += 1;
            while (ps.p < n and !ps.isDefine(ps.p)) ps.p += 1;
            continue;
        }
        const kind = ps.at(ps.p + 1);
        const name = ps.at(ps.p + 2);
        const open = ps.at(ps.p + 3);
        if (kind == null or kind.?.t != 'k') {
            ps.bad(kind, "a kind");
            ps.p += 1;
            continue;
        }
        if (!has(&KINDS, kind.?.s)) out.add(diag(c, "UNKNOWN_KIND", file, kind.?.line, kind.?.s, &.{.{ .k = "kind", .v = kind.?.s }}, .{}));
        if (name == null or name.?.t != 'i') {
            ps.bad(name, "a lower_snake name");
            ps.p += 2;
            continue;
        }
        if (open == null or open.?.t != '(') {
            ps.bad(open, "(");
            ps.p += 3;
            continue;
        }
        ps.p += 4;
        const d = gpa.create(Decl) catch oom();
        d.* = .{ .kind = kind.?.s, .name = name.?.s, .line = t.line, .file = file };
        var fields: Vec(Field) = .{};
        var closed = false;
        while (ps.p < n) {
            const f = toks[ps.p];
            if (f.t == ')') {
                ps.p += 1;
                closed = true;
                break;
            }
            if (f.t == ',') {
                ps.p += 1;
                continue;
            }
            if (f.t != 'k') {
                ps.bad(f, "a field keyword");
                ps.p += 1;
                continue;
            }
            if (eq(f.s, "DEFINE")) break;
            ps.p += 1;
            var vals: Vec(Val) = .{};
            while (ps.p < n and toks[ps.p].t != ',' and toks[ps.p].t != ')') {
                if (ps.isDefine(ps.p)) break;
                const v = ps.value() orelse {
                    ps.bad(ps.at(ps.p), "a value");
                    ps.p += 1;
                    break;
                };
                vals.add(v);
            }
            var dup = false;
            for (fields.items()) |x| {
                if (eq(x.name, f.s)) dup = true;
            }
            if (dup) {
                out.add(diag(c, "DUPLICATE_FIELD", file, f.line, d.name, &.{.{ .k = "field", .v = f.s }}, .{}));
            } else fields.add(.{ .name = f.s, .line = f.line, .values = vals.items() });
        }
        d.fields = fields.items();
        if (!closed) ps.bad(ps.at(ps.p), ")");
        decls.add(d);
    }
    if (!lex_bad) {
        for (decls.items()) |d| {
            if (has(&KINDS, d.kind)) shape(d, c, &out);
        }
    }
    return .{ .decls = decls.items(), .uses = uses.items(), .diags = out.items() };
}

fn one(d: *const Decl, k: []const u8, t: u8) ?Val {
    const f = d.get(k) orelse return null;
    if (f.values.len == 1 and f.values[0].t == t) return f.values[0];
    return null;
}
/// The quoted string of a field, which may be empty.
pub fn str(d: *const Decl, k: []const u8) ?[]const u8 {
    return if (one(d, k, 's')) |v| v.s else null;
}
/// The same, where JavaScript reads it for truth: an empty string is absent.
pub fn strT(d: *const Decl, k: []const u8) ?[]const u8 {
    const s = str(d, k) orelse return null;
    return if (s.len == 0) null else s;
}
pub fn idv(d: *const Decl, k: []const u8) ?[]const u8 {
    return if (one(d, k, 'i')) |v| v.s else null;
}
pub fn kwv(d: *const Decl, k: []const u8) ?[]const u8 {
    return if (one(d, k, 'k')) |v| v.s else null;
}
pub fn numv(d: *const Decl, k: []const u8) ?f64 {
    return if (one(d, k, 'n')) |v| v.n else null;
}
fn idIs(d: *const Decl, k: []const u8, want: []const u8) bool {
    const v = idv(d, k) orelse return false;
    return eq(v, want);
}
fn valStr(v: Val) []const u8 { // String(v.v)
    return switch (v.t) {
        'n' => numStr(v.n),
        'l' => "undefined",
        else => v.s,
    };
}
pub fn flat(d: *const Decl, k: []const u8) []const ?[]const u8 {
    const f = d.get(k) orelse return &.{};
    var out: Vec(?[]const u8) = .{};
    if (f.values.len == 1 and f.values[0].t == 'l') {
        for (f.values[0].items) |it| out.add(if (it.len == 1) valStr(it[0]) else null);
    } else if (f.values.len == 1) {
        out.add(valStr(f.values[0]));
    } else out.add(null);
    return out.items();
}

pub const Bound = struct { unit: ?[]const u8 = null, threshold: ?f64 = null, min: ?f64 = null, max: ?f64 = null, text: []const u8 = "" };
fn isN(v: []const Val, i: usize) bool {
    return i < v.len and v[i].t == 'n';
}
fn isK(v: []const Val, i: usize, k: []const u8) bool {
    return i < v.len and v[i].t == 'k' and eq(v[i].s, k);
}
pub fn bound(values: []const Val) ?Bound {
    var v = values;
    var b: Bound = .{};
    if (v.len > 0 and v[v.len - 1].t == 'k' and (eq(v[v.len - 1].s, "PER_THOUSAND") or eq(v[v.len - 1].s, "PER_HUNDRED"))) {
        b.unit = v[v.len - 1].s;
        v = v[0 .. v.len - 1];
    }
    var q: usize = 0;
    if (isN(v, 0) and (isK(v, 1, "AT_MOST") or isK(v, 1, "AT_LEAST") or isK(v, 1, "BETWEEN"))) {
        b.threshold = v[0].n;
        q = 1;
    }
    if (isN(v, q) and isK(v, q + 1, "WITHIN") and isN(v, q + 2) and v.len == q + 3) {
        b.min = v[q].n - v[q + 2].n;
        b.max = v[q].n + v[q + 2].n;
        b.text = cat(&.{ numStr(v[q].n), " within ", numStr(v[q + 2].n) });
    } else if (isK(v, q, "AT_MOST") and isN(v, q + 1) and v.len == q + 2) {
        b.max = v[q + 1].n;
        b.text = cat(&.{ "at most ", numStr(v[q + 1].n) });
    } else if (isK(v, q, "AT_LEAST") and isN(v, q + 1) and v.len == q + 2) {
        b.min = v[q + 1].n;
        b.text = cat(&.{ "at least ", numStr(v[q + 1].n) });
    } else if (isK(v, q, "BETWEEN") and isN(v, q + 1) and isK(v, q + 2, "AND") and isN(v, q + 3) and v.len == q + 4) {
        b.min = v[q + 1].n;
        b.max = v[q + 3].n;
        b.text = cat(&.{ "between ", numStr(v[q + 1].n), " and ", numStr(v[q + 3].n) });
    } else return null;
    if (b.unit) |u| b.text = cat(&.{ b.text, if (eq(u, "PER_THOUSAND")) " per thousand words" else " per hundred" });
    return b;
}
fn budgetOf(values: []const Val) ?Bound {
    var v: Vec(Val) = .{};
    v.add(.{ .t = 'k', .s = "AT_MOST" });
    v.addAll(values);
    return bound(v.items());
}

fn shape(d: *const Decl, c: *const Contract, out: *Vec(Diag)) void {
    const S = struct {
        fn badv(dd: *const Decl, cc: *const Contract, o: *Vec(Diag), k: []const u8, why: []const u8) void {
            o.add(diag(cc, "BAD_VALUE", dd.file, dd.get(k).?.line, dd.name, &.{ .{ .k = "field", .v = k }, .{ .k = "why", .v = why } }, .{}));
        }
    };
    for (d.fields) |f| {
        const k = f.name;
        const want = fieldSpec(d.kind, k) orelse {
            out.add(diag(c, "UNKNOWN_FIELD", d.file, f.line, d.name, &.{ .{ .k = "field", .v = k }, .{ .k = "kind", .v = d.kind } }, .{}));
            continue;
        };
        const v = f.values;
        if (eq(want, "str")) {
            if (str(d, k) == null) S.badv(d, c, out, k, "one quoted string is expected");
        } else if (eq(want, "id")) {
            if (idv(d, k) == null) S.badv(d, c, out, k, "one lower_snake name is expected");
        } else if (eq(want, "num")) {
            if (numv(d, k) == null) S.badv(d, c, out, k, "one number is expected");
        } else if (eq(want, "code")) {
            if (kwv(d, k) == null) S.badv(d, c, out, k, "one UPPER_SNAKE code is expected");
        } else if (eq(want, "severity")) {
            if (!(idIs(d, k, "error") or idIs(d, k, "warning"))) S.badv(d, c, out, k, "error or warning is expected");
        } else if (eq(want, "ids")) {
            var b = false;
            for (flat(d, k)) |x| {
                if (x == null or !isIdWord(x.?)) b = true;
            }
            if (b) S.badv(d, c, out, k, "a list of lower_snake names is expected");
        } else if (eq(want, "codes")) {
            var b = false;
            for (flat(d, k)) |x| {
                if (x == null or !isKwWord(x.?)) b = true;
            }
            if (b) S.badv(d, c, out, k, "a list of UPPER_SNAKE codes is expected");
        } else if (eq(want, "words")) {
            var b = false;
            for (flat(d, k)) |x| {
                if (x == null) b = true;
            }
            if (b) S.badv(d, c, out, k, "a list of words or quoted strings is expected");
        } else if (eq(want, "entries")) {
            if (!(v.len == 1 and v[0].t == 'l' and v[0].items.len > 0) or compileEntries(v[0]) == null) S.badv(d, c, out, k, "a list of entries is expected");
        } else if (eq(want, "bound")) {
            if (bound(v) == null) S.badv(d, c, out, k, "a bound is expected: N WITHIN D, AT_MOST N, AT_LEAST N or BETWEEN A AND B");
        } else if (eq(want, "budget")) {
            const b = budgetOf(v);
            if (b == null or b.?.unit == null or !eq(b.?.unit.?, "PER_THOUSAND")) S.badv(d, c, out, k, "N PER_THOUSAND is expected");
        } else if (eq(want, "first")) {
            if (!(v.len == 2 and v[0].t == 'k' and eq(v[0].s, "FIRST") and v[1].t == 'n')) S.badv(d, c, out, k, "FIRST N is expected");
        }
    }
    for (required(d.kind)) |k| {
        if (d.get(k) == null) out.add(diag(c, "MISSING_FIELD", d.file, d.line, d.name, &.{ .{ .k = "field", .v = k }, .{ .k = "kind", .v = d.kind } }, .{}));
    }
    if (eq(d.kind, "PIECE") and (d.get("FILE") == null) == (d.get("FILES") == null))
        out.add(diag(c, "MISSING_FIELD", d.file, d.line, d.name, &.{ .{ .k = "field", .v = "FILE or FILES (one of the two)" }, .{ .k = "kind", .v = d.kind } }, .{}));
    if (d.get("MENTIONS") != null and !(idIs(d, "MENTIONS", "skipped") or idIs(d, "MENTIONS", "judged"))) S.badv(d, c, out, "MENTIONS", "skipped or judged is expected");
    if (d.get("AT") != null and !(idv(d, "AT") != null and has(&POSITIONS, idv(d, "AT").?))) S.badv(d, c, out, "AT", "one of sentence_start, sentence_end, paragraph_start, paragraph_end");
    if (d.get("IN") != null) {
        var b = false;
        for (flat(d, "IN")) |z| {
            if (z == null or !has(&ZONES, z.?)) b = true;
        }
        if (b) S.badv(d, c, out, "IN", "zones are title, heading, lede, body, list, quote");
    }
}

// ---------------------------------------------------------------- words and entries

pub const Token = struct { w: U, raw: U, at: usize, end: usize };
fn isWordCh(c: u16) bool {
    return (c >= 'A' and c <= 'Z') or (c >= 'a' and c <= 'z') or (c >= '0' and c <= '9') or (c >= 0xC0 and c <= 0xFF);
}
pub fn tokens(text: U, keep_star: bool) []Token {
    var out: Vec(Token) = .{};
    const n = text.len;
    var i: usize = 0;
    while (i < n) {
        const c = text[i];
        if (isWordCh(c)) {
            var j = i + 1;
            while (j < n and isWordCh(text[j])) j += 1;
            while (j + 1 < n and (text[j] == '\'' or text[j] == 0x2019 or text[j] == '-') and isWordCh(text[j + 1])) {
                j += 2;
                while (j < n and isWordCh(text[j])) j += 1;
            }
            const end = if (keep_star and j < n and text[j] == '*') j + 1 else j;
            out.add(.{ .w = lower(text[i..end]), .raw = text[i..end], .at = i, .end = end });
            i = end;
        } else if (c == '.' and i + 2 < n and text[i + 1] == '.' and text[i + 2] == '.') {
            out.add(.{ .w = text[i .. i + 3], .raw = text[i .. i + 3], .at = i, .end = i + 3 });
            i += 3;
        } else if (isSpace(c)) {
            i += 1;
        } else {
            const len: usize = if (c >= 0xD800 and c <= 0xDBFF and i + 1 < n and text[i + 1] >= 0xDC00 and text[i + 1] <= 0xDFFF) 2 else 1;
            out.add(.{ .w = lower(text[i .. i + len]), .raw = text[i .. i + len], .at = i, .end = i + len });
            i += len;
        }
    }
    return out.items();
}
fn tokens8(s: []const u8, keep_star: bool) []Token {
    return tokens(toU16(s), keep_star);
}

pub const El = struct { alts: []const []const U = &.{}, emoji: bool = false, any: bool = false, gap: f64 = 1 };
pub const Entry = struct { els: []const El, write: ?[]const u8 = null };

pub fn compileEntries(list: Val) ?[]const Entry {
    var entries: Vec(Entry) = .{};
    for (list.items) |item| {
        var els: Vec(El) = .{};
        var write: ?[]const u8 = null;
        var gap: f64 = 1;
        var i: usize = 0;
        while (i < item.len) : (i += 1) {
            const v = item[i];
            if (v.t == 'k' and eq(v.s, "WRITE")) {
                if (i + 1 >= item.len or item[i + 1].t != 's' or i + 2 != item.len) return null;
                write = item[i + 1].s;
                break;
            }
            if (v.t == 'k' and eq(v.s, "WITHIN")) {
                if (i + 1 >= item.len or item[i + 1].t != 'n' or els.len() == 0) return null;
                gap = item[i + 1].n;
                i += 1;
                continue;
            }
            if (v.t == 'k' and eq(v.s, "EMOJI")) {
                els.add(.{ .emoji = true, .gap = gap });
                gap = 1;
                continue;
            }
            if (v.t == 'k' and eq(v.s, "ANY")) {
                els.add(.{ .any = true, .gap = gap });
                gap = 1;
                continue;
            }
            var alts: Vec([]const u8) = .{};
            if (v.t == 's' or v.t == 'i') {
                alts.add(v.s);
            } else if (v.t == 'l') {
                for (v.items) |x| {
                    if (x.len == 1 and (x[0].t == 's' or x[0].t == 'i')) alts.add(x[0].s) else return null;
                }
                if (alts.len() == 0) return null;
            } else return null;
            var seqs: Vec([]const U) = .{};
            for (alts.items()) |a| {
                const u = toU16(a);
                for (u) |*ch| {
                    if (ch.* == '_') ch.* = ' ';
                }
                const ts = tokens(u, true);
                if (ts.len == 0) return null;
                var seq: Vec(U) = .{};
                for (ts) |t| seq.add(t.w);
                seqs.add(seq.items());
            }
            els.add(.{ .alts = seqs.items(), .gap = gap });
            gap = 1;
        }
        if (els.len() == 0 or gap != 1) return null;
        entries.add(.{ .els = els.items(), .write = write });
    }
    return entries.items();
}
fn isWord(w: U) bool {
    if (w.len == 0) return false;
    const c = w[0];
    return (c >= 'a' and c <= 'z') or (c >= '0' and c <= '9') or (c >= 0xE0 and c <= 0xFF);
}
fn wordIs(tok: U, pat: U) bool {
    if (pat.len > 1 and pat[pat.len - 1] == '*') return ustarts(tok, pat[0 .. pat.len - 1]);
    return ueq(tok, pat);
}
fn seqAt(toks: []const Token, i: usize, seq: []const U) ?usize {
    for (seq, 0..) |s, k| {
        if (i + k >= toks.len or !wordIs(toks[i + k].w, s)) return null;
    }
    return i + seq.len;
}
fn isEmoji(raw: U) bool {
    var i: usize = 0;
    while (i < raw.len) : (i += 1) {
        var cp: u32 = raw[i];
        if (cp >= 0xD800 and cp <= 0xDBFF and i + 1 < raw.len and raw[i + 1] >= 0xDC00 and raw[i + 1] <= 0xDFFF) {
            cp = 0x10000 + ((cp - 0xD800) << 10) + (raw[i + 1] - 0xDC00);
            i += 1;
        }
        if ((cp >= 0x1F000 and cp <= 0x1FAFF) or (cp >= 0x2600 and cp <= 0x27BF)) return true;
    }
    return false;
}
fn elAt(toks: []const Token, i: usize, el: El) ?usize {
    if (i >= toks.len) return null;
    if (el.emoji) return if (isEmoji(toks[i].raw)) i + 1 else null;
    if (el.any) return if (isWord(toks[i].w)) i + 1 else null;
    for (el.alts) |s| {
        if (seqAt(toks, i, s)) |e| return e;
    }
    return null;
}
fn entryAt(toks: []const Token, i: usize, e: *const Entry, k: usize) ?usize {
    const el = e.els[k];
    const tries: f64 = if (k == 0) 1 else el.gap;
    var g: usize = 0;
    while (@as(f64, @floatFromInt(g)) < tries) : (g += 1) {
        if (g > 0 and !(i + g - 1 < toks.len and isWord(toks[i + g - 1].w))) break;
        const end = elAt(toks, i + g, el) orelse continue;
        if (k + 1 == e.els.len) return end;
        if (entryAt(toks, end, e, k + 1)) |rest| return rest;
    }
    return null;
}
pub const Hit = struct { from: usize, to: usize, entry: *const Entry };
fn hitLt(_: void, a: Hit, b: Hit) bool {
    return a.from < b.from;
}
pub fn findEntries(toks: []const Token, entries: []const Entry) []Hit {
    var hits: Vec(Hit) = .{};
    for (entries) |*e| {
        var i: usize = 0;
        while (i < toks.len) : (i += 1) {
            if (entryAt(toks, i, e, 0)) |end| {
                hits.add(.{ .from = i, .to = end, .entry = e });
                i = end - 1;
            }
        }
    }
    std.mem.sort(Hit, hits.items(), {}, hitLt);
    return hits.items();
}
fn keptRanges(toks: []const Token, phrases: []const []const u8) [][2]usize {
    var r: Vec([2]usize) = .{};
    for (phrases) |ph| {
        var seq: Vec(U) = .{};
        for (tokens8(ph, true)) |t| seq.add(t.w);
        if (seq.len() == 0) continue;
        for (0..toks.len) |i| {
            if (seqAt(toks, i, seq.items())) |e| r.add(.{ i, e });
        }
    }
    return r.items();
}

// ---------------------------------------------------------------- the text reader

pub const Heading = struct { level: i64, text: U, line: i64 };
pub const Kind = enum { prose, code, skip };
pub const Block = struct { kind: Kind, text: U, line: i64, list: bool = false, quote: bool = false, headings: []const Heading = &.{}, zone: ?[]const u8 = null };
pub const FrontKV = struct { k: []const u8, v: U };
pub const Doc = struct {
    front: []const FrontKV,
    blocks: []const Block,
    pub fn frontGet(d: *const Doc, k: []const u8) ?U {
        var r: ?U = null;
        for (d.front) |kv| {
            if (eq(kv.k, k)) r = kv.v;
        }
        return r;
    }
    /// front[k] || ''
    pub fn frontT(d: *const Doc, k: []const u8) U {
        return d.frontGet(k) orelse &.{};
    }
};

fn normalizeNewlines(t: U) []u16 {
    var out: Vec(u16) = .{};
    var i: usize = 0;
    while (i < t.len) : (i += 1) {
        if (t[i] == '\r') {
            out.add('\n');
            if (i + 1 < t.len and t[i + 1] == '\n') i += 1;
        } else out.add(t[i]);
    }
    return out.items();
}
fn splitLines(t: U) []U {
    var out: Vec(U) = .{};
    var it = std.mem.splitScalar(u16, t, '\n');
    while (it.next()) |l| out.add(l);
    return out.items();
}
fn ujoin(parts: []const U) []u16 {
    var out: Vec(u16) = .{};
    for (parts, 0..) |p, k| {
        if (k > 0) out.add(10);
        out.addAll(p);
    }
    return out.items();
}
fn blankLine(l: U) bool {
    for (l) |c| {
        if (!isSpace(c)) return false;
    }
    return true;
}
const CodeMode = enum { inner, code, blank };
fn codeSpans(s: U, mode: CodeMode) []u16 {
    var out: Vec(u16) = .{};
    var i: usize = 0;
    while (i < s.len) {
        if (s[i] == '`') {
            var j = i + 1;
            var ok = false;
            while (j < s.len) : (j += 1) {
                if (s[j] == '`') {
                    ok = true;
                    break;
                }
                if (mode == .blank and s[j] == '\n') break;
            }
            if (ok) {
                switch (mode) {
                    .inner => out.addAll(s[i + 1 .. j]),
                    .code => out.addAll(L("CODE")),
                    .blank => for (i..j + 1) |_| out.add(' '),
                }
                i = j + 1;
                continue;
            }
        }
        out.add(s[i]);
        i += 1;
    }
    return out.items();
}
fn links(s: U) []u16 { // \[([^\]]+)\]\([^)]+\) -> $1
    var out: Vec(u16) = .{};
    const n = s.len;
    var i: usize = 0;
    while (i < n) {
        if (s[i] == '[') {
            var j = i + 1;
            while (j < n and s[j] != ']') j += 1;
            if (j < n and j > i + 1 and j + 1 < n and s[j + 1] == '(') {
                var k = j + 2;
                while (k < n and s[k] != ')') k += 1;
                if (k < n and k > j + 2) {
                    out.addAll(s[i + 1 .. j]);
                    i = k + 1;
                    continue;
                }
            }
        }
        out.add(s[i]);
        i += 1;
    }
    return out.items();
}
fn isEm(c: u16) bool {
    return c == '*' or c == '_';
}
fn emphasis(s: U) []u16 { // [*_]{1,3}([^*_]+)[*_]{1,3} -> $1
    var out: Vec(u16) = .{};
    const n = s.len;
    var i: usize = 0;
    while (i < n) {
        if (isEm(s[i])) {
            var c: usize = 0;
            while (c < 3 and i + c < n and isEm(s[i + c])) c += 1;
            const b = i + c;
            if (b < n and !isEm(s[b])) {
                var e = b;
                while (e < n and !isEm(s[e])) e += 1;
                if (e < n) {
                    var cl: usize = 0;
                    while (cl < 3 and e + cl < n and isEm(s[e + cl])) cl += 1;
                    out.addAll(s[b..e]);
                    i = e + cl;
                    continue;
                }
            }
        }
        out.add(s[i]);
        i += 1;
    }
    return out.items();
}
fn plain(s: U) U {
    return utrim(emphasis(links(codeSpans(s, .inner))));
}
fn zoneMarker(p: U) ?struct { zone: ?[]const u8 } { // ^<!--\s*prosa:(zone\s+([a-z][a-z0-9_]*)|end)\s*-->$
    if (!startsA(p, "<!--")) return null;
    var i: usize = 4;
    while (i < p.len and isSpace(p[i])) i += 1;
    if (!startsA(p[i..], "prosa:")) return null;
    i += 6;
    var zone: ?[]const u8 = null;
    if (startsA(p[i..], "zone") and i + 4 < p.len and isSpace(p[i + 4])) {
        i += 4;
        while (i < p.len and isSpace(p[i])) i += 1;
        const s = i;
        if (!(i < p.len and p[i] >= 'a' and p[i] <= 'z')) return null;
        while (i < p.len and ((p[i] >= 'a' and p[i] <= 'z') or (p[i] >= '0' and p[i] <= '9') or p[i] == '_')) i += 1;
        zone = toU8(p[s..i]);
    } else if (startsA(p[i..], "end")) {
        i += 3;
    } else return null;
    while (i < p.len and isSpace(p[i])) i += 1;
    if (!(startsA(p[i..], "-->") and i + 3 == p.len)) return null;
    return .{ .zone = zone };
}
fn headingOf(ln: U) ?struct { level: i64, text: U } { // ^(#{1,6})\s+(.*?)\s*#*\s*$
    var h: usize = 0;
    while (h < ln.len and ln[h] == '#') h += 1;
    if (h < 1 or h > 6) return null;
    var i = h;
    while (i < ln.len and isSpace(ln[i])) i += 1;
    if (i == h) return null;
    var e = ln.len;
    while (e > i and isSpace(ln[e - 1])) e -= 1;
    while (e > i and ln[e - 1] == '#') e -= 1;
    while (e > i and isSpace(ln[e - 1])) e -= 1;
    return .{ .level = @intCast(h), .text = ln[i..e] };
}
fn skipStart(p: U) bool {
    return startsA(p, "#") or startsA(p, "|") or startsA(p, "<!--") or startsA(p, "![") or startsA(p, "*Figure") or startsA(p, "*Fig") or
        startsA(p, "<figure") or startsA(p, "<div") or startsA(p, "<svg");
}
fn caption(p: U) bool { // ^\*[^*\n]{3,120}\*$
    if (p.len < 5 or p.len > 122 or p[0] != '*' or p[p.len - 1] != '*') return false;
    for (p[1 .. p.len - 1]) |c| {
        if (c == '*' or c == '\n') return false;
    }
    return true;
}
fn listStart(p: U) bool { // ^\s*([-*•]|\d+[.)])\s
    var i: usize = 0;
    while (i < p.len and isSpace(p[i])) i += 1;
    if (i >= p.len) return false;
    if (p[i] == '-' or p[i] == '*' or p[i] == 0x2022) return i + 1 < p.len and isSpace(p[i + 1]);
    const s = i;
    while (i < p.len and p[i] >= '0' and p[i] <= '9') i += 1;
    if (i == s or i >= p.len or !(p[i] == '.' or p[i] == ')')) return false;
    return i + 1 < p.len and isSpace(p[i + 1]);
}
fn fenceOpen(ln: U) bool {
    return startsA(ln, "```") or startsA(ln, "~~~");
}
fn fenceClose(ln: U) bool {
    return fenceOpen(ln) and blankLine(ln[3..]);
}

const MdReader = struct {
    blocks: Vec(Block) = .{},
    zone: ?[]const u8 = null,
    para: Vec(U) = .{},
    para_line: i64 = 0,

    fn flush(r: *MdReader) void {
        if (r.para.len() == 0) return;
        const raw = ujoin(r.para.items());
        const p = utrim(raw);
        r.para = .{};
        if (p.len == 0) return;
        var b: Block = .{ .kind = .prose, .text = p, .line = r.para_line, .zone = r.zone };
        if (zoneMarker(p)) |zm| {
            r.zone = zm.zone;
            b.kind = .skip;
            b.zone = r.zone;
            r.blocks.add(b);
            return;
        }
        if (skipStart(p) or caption(p)) {
            b.kind = .skip;
            if (p[0] == '#') {
                var hs: Vec(Heading) = .{};
                for (splitLines(p), 0..) |ln, k| {
                    if (headingOf(ln)) |h| hs.add(.{ .level = h.level, .text = plain(h.text), .line = r.para_line + @as(i64, @intCast(k)) });
                }
                b.headings = hs.items();
            }
        } else if (startsA(raw, "    ") or startsA(raw, "\t")) {
            b.kind = .code;
        } else {
            b.list = listStart(p);
            b.quote = p[0] == '>';
        }
        r.blocks.add(b);
    }
};

pub fn readMarkdown(text_in: U) Doc {
    const text = normalizeNewlines(text_in);
    const lines = splitLines(text);
    var front: Vec(FrontKV) = .{};
    var i: usize = 0;
    if (startsA(text, "---")) {
        var end: ?usize = null;
        var j: usize = 1;
        while (j < lines.len) : (j += 1) {
            if (startsA(lines[j], "---")) {
                end = j;
                break;
            }
        }
        if (end) |e| {
            j = 1;
            while (j < e) : (j += 1) {
                const ln = lines[j];
                if (ln.len == 0 or !((ln[0] < 128 and std.ascii.isAlphabetic(@intCast(ln[0]))) or ln[0] == '_')) continue;
                var k: usize = 1;
                while (k < ln.len and ln[k] < 128 and (isW(@intCast(ln[k])) or ln[k] == '-')) k += 1;
                if (k >= ln.len or ln[k] != ':') continue;
                var s = k + 1;
                while (s < ln.len and isSpace(ln[s])) s += 1;
                var bad = false;
                for (ln[s..]) |c| {
                    if (c == 0x2028 or c == 0x2029) bad = true;
                }
                if (bad) continue;
                var v = utrim(ln[s..]);
                if (v.len >= 2 and (v[0] == '"' or v[0] == '\'') and (v[v.len - 1] == '"' or v[v.len - 1] == '\'')) v = v[1 .. v.len - 1];
                front.add(.{ .k = toU8(ln[0..k]), .v = v });
            }
            i = e + 1;
        }
    }
    var r: MdReader = .{};
    while (i < lines.len) : (i += 1) {
        const ln = lines[i];
        if (fenceOpen(ln)) {
            r.flush();
            const start = i;
            var body: Vec(U) = .{};
            body.add(ln);
            i += 1;
            while (i < lines.len and !fenceClose(lines[i])) : (i += 1) body.add(lines[i]);
            if (i < lines.len) body.add(lines[i]);
            r.blocks.add(.{ .kind = .code, .text = ujoin(body.items()), .line = @intCast(start + 1), .zone = r.zone });
            continue;
        }
        if (blankLine(ln)) {
            r.flush();
            continue;
        }
        if (r.para.len() == 0) r.para_line = @intCast(i + 1);
        r.para.add(ln);
    }
    r.flush();
    return .{ .front = front.items(), .blocks = r.blocks.items() };
}

// ---- readHtml: the same model from a page

fn lowA(c: u16) u16 {
    return if (c >= 'A' and c <= 'Z') c + 32 else c;
}
fn startsCI(s: U, at: usize, comptime lit: []const u8) bool {
    if (at + lit.len > s.len) return false;
    inline for (lit, 0..) |ch, k| {
        if (lowA(s[at + k]) != ch) return false;
    }
    return true;
}
fn startsCIu(s: U, at: usize, lit: U) bool {
    if (at + lit.len > s.len) return false;
    for (lit, 0..) |ch, k| {
        if (lowA(s[at + k]) != lowA(ch)) return false;
    }
    return true;
}
fn isWU(c: u16) bool {
    return c < 128 and isW(@intCast(c));
}
fn isAl(c: u16) bool {
    return (c >= 'a' and c <= 'z') or (c >= 'A' and c <= 'Z');
}
/// The word after `<` at `at`, when a word boundary follows it.
fn tagWord(t: U, at: usize) ?U {
    var j = at + 1;
    while (j < t.len and isWU(t[j])) j += 1;
    if (j == at + 1) return null;
    return t[at + 1 .. j];
}
fn wordIn(w: U, comptime names: []const []const u8) bool {
    inline for (names) |n| {
        if (w.len == n.len and startsCI(w, 0, n)) return true;
    }
    return false;
}
/// The first `</name>` at or after `from`, case-insensitively: the index of its `<`.
fn closeOf(t: U, from: usize, name: U) ?usize {
    var i = from;
    while (i + name.len + 3 <= t.len) : (i += 1) {
        if (t[i] == '<' and t[i + 1] == '/' and startsCIu(t, i + 2, name) and t[i + 2 + name.len] == '>') return i;
    }
    return null;
}
fn replaceAllU(s: U, comptime from: []const u8, to: U) U {
    if (std.mem.indexOf(u16, s, L(from)) == null) return s;
    return std.mem.replaceOwned(u16, gpa, s, L(from), to) catch oom();
}
fn htmlDec(s_in: U) U {
    var o: Vec(u16) = .{};
    var i: usize = 0;
    while (i < s_in.len) {
        if (s_in[i] == '<') {
            if (std.mem.indexOfScalarPos(u16, s_in, i + 1, '>')) |j| {
                if (j > i + 1) {
                    i = j + 1;
                    continue;
                }
            }
        }
        o.add(s_in[i]);
        i += 1;
    }
    var s: U = o.items();
    s = replaceAllU(s, "&nbsp;", L(" "));
    s = replaceAllU(s, "&amp;", L("&"));
    s = replaceAllU(s, "&lt;", L("<"));
    s = replaceAllU(s, "&gt;", L(">"));
    s = replaceAllU(s, "&quot;", L("\""));
    var q: Vec(u16) = .{}; // &#39;|&rsquo; in one pass
    i = 0;
    while (i < s.len) {
        if (startsA(s[i..], "&#39;")) {
            q.add('\'');
            i += 5;
        } else if (startsA(s[i..], "&rsquo;")) {
            q.add('\'');
            i += 7;
        } else {
            q.add(s[i]);
            i += 1;
        }
    }
    s = q.items();
    s = replaceAllU(s, "&mdash;", &[_]u16{0x2014});
    s = replaceAllU(s, "&hellip;", &[_]u16{0x2026});
    var w: Vec(u16) = .{};
    var sp = false;
    for (s) |c| {
        if (isSpace(c)) {
            if (!sp) w.add(' ');
            sp = true;
        } else {
            w.add(c);
            sp = false;
        }
    }
    return utrim(w.items());
}
const HtmlZone = struct { end: usize, zone: ?[]const u8 };
fn htmlZoneAt(p: U, at: usize) ?HtmlZone { // <!--\s*prosa:(zone\s+([a-z][a-z0-9_]*)|end)\s*-->, case-insensitive
    if (!startsCI(p, at, "<!--")) return null;
    var i: usize = at + 4;
    while (i < p.len and isSpace(p[i])) i += 1;
    if (!startsCI(p, i, "prosa:")) return null;
    i += 6;
    var zone: ?[]const u8 = null;
    var ok = false;
    if (startsCI(p, i, "zone") and i + 4 < p.len and isSpace(p[i + 4])) {
        var k = i + 4;
        while (k < p.len and isSpace(p[k])) k += 1;
        const s = k;
        if (k < p.len and isAl(p[k])) {
            while (k < p.len and (isAl(p[k]) or (p[k] >= '0' and p[k] <= '9') or p[k] == '_')) k += 1;
            zone = toU8(p[s..k]);
            i = k;
            ok = true;
        }
    }
    if (!ok) {
        if (!startsCI(p, i, "end")) return null;
        i += 3;
    }
    while (i < p.len and isSpace(p[i])) i += 1;
    if (!startsCI(p, i, "-->")) return null;
    return .{ .end = i + 3, .zone = zone };
}
pub fn readHtml(text_in: U) Doc {
    const text = normalizeNewlines(text_in);
    const t = gpa.dupe(u16, text) catch oom();
    const n = t.len;
    var i: usize = 0;
    while (i < n) { // scripts, styles, code, templates and nav menus are blanked
        if (t[i] == '<') {
            if (tagWord(t, i)) |w| {
                if (wordIn(w, &.{ "script", "style", "code", "template", "nav" })) {
                    if (closeOf(t, i + 1 + w.len, w)) |c| {
                        const end = c + w.len + 3;
                        for (t[i..end]) |*x| {
                            if (x.* != '\n') x.* = ' ';
                        }
                        i = end;
                        continue;
                    }
                }
            }
        }
        i += 1;
    }
    var front: Vec(FrontKV) = .{};
    i = 0;
    while (i < n) : (i += 1) {
        if (startsCI(t, i, "<title>")) {
            if (closeOf(t, i + 7, L("title"))) |c| front.add(.{ .k = "page_title", .v = htmlDec(t[i + 7 .. c]) });
            break;
        }
    }
    i = 0;
    find_lang: while (i < n) : (i += 1) {
        if (!startsCI(t, i, "<html")) continue;
        const e = std.mem.indexOfScalarPos(u16, t, i + 5, '>') orelse n;
        var j = e;
        while (j > i + 5) : (j -= 1) {
            if (!isWU(t[j - 1]) and startsCI(t, j, "lang=\"") and j + 8 <= n and isAl(t[j + 6]) and isAl(t[j + 7])) {
                front.add(.{ .k = "lang", .v = t[j + 6 .. j + 8] });
                break :find_lang;
            }
        }
    }
    i = 0;
    while (i < n) : (i += 1) { // <meta\s+name="prosa:([a-z_]+)"\s+content="([^"]*)"
        if (!startsCI(t, i, "<meta")) continue;
        var j = i + 5;
        const s0 = j;
        while (j < n and isSpace(t[j])) j += 1;
        if (j == s0 or !startsCI(t, j, "name=\"prosa:")) continue;
        j += 12;
        const ks = j;
        while (j < n and (isAl(t[j]) or t[j] == '_')) j += 1;
        if (j == ks or j >= n or t[j] != '"') continue;
        const key = t[ks..j];
        j += 1;
        const s1 = j;
        while (j < n and isSpace(t[j])) j += 1;
        if (j == s1 or !startsCI(t, j, "content=\"")) continue;
        j += 9;
        const ve = std.mem.indexOfScalarPos(u16, t, j, '"') orelse continue;
        front.add(.{ .k = toU8(key), .v = t[j..ve] });
        i = ve;
    }
    var blocks: Vec(Block) = .{};
    var zone: ?[]const u8 = null;
    var line: i64 = 1;
    var counted: usize = 0;
    i = 0;
    while (i < n) {
        if (t[i] != '<') {
            i += 1;
            continue;
        }
        if (htmlZoneAt(t, i)) |z| {
            zone = z.zone;
            i = z.end;
            continue;
        }
        const w = tagWord(t, i) orelse {
            i += 1;
            continue;
        };
        const is_h = w.len == 2 and lowA(w[0]) == 'h' and w[1] >= '1' and w[1] <= '6';
        if (!is_h and !wordIn(w, &.{ "p", "li", "blockquote", "pre", "td", "th", "dd", "dt", "figcaption", "summary" })) {
            i += 1;
            continue;
        }
        const gt = std.mem.indexOfScalarPos(u16, t, i + 1 + w.len, '>') orelse {
            i += 1;
            continue;
        };
        const c = closeOf(t, gt + 1, w) orelse {
            i += 1;
            continue;
        };
        line += ucountCh(t[counted..i], '\n');
        counted = i;
        const body = t[gt + 1 .. c];
        const end = c + w.len + 3;
        i = end;
        if (wordIn(w, &.{"pre"})) {
            blocks.add(.{ .kind = .code, .text = body, .line = line, .zone = zone });
            continue;
        }
        const s = htmlDec(body);
        if (s.len == 0) continue;
        if (is_h) {
            const hs = gpa.dupe(Heading, &.{.{ .level = w[1] - '0', .text = s, .line = line }}) catch oom();
            blocks.add(.{ .kind = .skip, .text = s, .line = line, .headings = hs, .zone = zone });
        } else {
            const p = wordIn(w, &.{"p"});
            const bq = wordIn(w, &.{"blockquote"});
            blocks.add(.{ .kind = .prose, .text = s, .line = line, .list = !p and !bq, .quote = bq, .zone = zone });
        }
    }
    return .{ .front = front.items(), .blocks = blocks.items() };
}
/// read(text, file): a page when the file's name ends in .htm or .html, Markdown otherwise.
pub fn read(text: U, file: []const u8) Doc {
    const low = std.ascii.allocLowerString(gpa, file) catch oom();
    if (std.mem.endsWith(u8, low, ".html") or std.mem.endsWith(u8, low, ".htm")) return readHtml(text);
    return readMarkdown(text);
}

const Break = struct { index: usize, end: usize };
fn sentenceBreaks(s: U) []Break { // (?<=[.!?…])\s+(?=[A-Z«"'(\[])
    var out: Vec(Break) = .{};
    var i: usize = 1;
    while (i < s.len) {
        const p = s[i - 1];
        if (isSpace(s[i]) and (p == '.' or p == '!' or p == '?' or p == 0x2026)) {
            var j = i;
            while (j < s.len and isSpace(s[j])) j += 1;
            if (j < s.len) {
                const c = s[j];
                if ((c >= 'A' and c <= 'Z') or c == 0xAB or c == '"' or c == '\'' or c == '(' or c == '[') out.add(.{ .index = i, .end = j });
            }
            i = j;
            continue;
        }
        i += 1;
    }
    return out.items();
}
pub fn wc(s: U) i64 {
    var n: i64 = 0;
    var in = false;
    for (s) |c| {
        if (isSpace(c)) {
            in = false;
        } else if (!in) {
            in = true;
            n += 1;
        }
    }
    return n;
}
pub fn sentences(p_in: U) []U {
    const p = links(codeSpans(p_in, .code));
    var out: Vec(U) = .{};
    var from: usize = 0;
    for (sentenceBreaks(p)) |b| {
        const s = utrim(p[from..b.index]);
        if (wc(s) > 1) out.add(s);
        from = b.end;
    }
    const s = utrim(p[from..]);
    if (wc(s) > 1) out.add(s);
    return out.items();
}
fn r1(x: f64) f64 {
    return @floor(x * 10 + 0.5) / 10;
}

pub const Len = struct { n: i64, list: bool, line: i64 };
pub const M = struct {
    words: i64 = 0,
    sentences: i64 = 0,
    paragraphs: i64 = 0,
    lens: []const Len = &.{},
    median: i64 = 0,
    q1: i64 = 0,
    q3: i64 = 0,
    excl: i64 = 0,
    cold: i64 = 0,
    questions: i64 = 0,
    colons: i64 = 0,
    dashes: i64 = 0,
    ellipses: i64 = 0,
    colonLeads: i64 = 0,
    oneSentenceParas: i64 = 0,
};
fn isLetterish(c: u16) bool {
    return (c >= 'A' and c <= 'Z') or (c >= 'a' and c <= 'z') or (c >= 0xC0 and c <= 0xFF) or c == '\'' or c == 0x2019;
}
const RUN_WORDS = [_][]const u8{ "prints", "printed", "gives", "returns", "answers", "complains", "says", "shows", "output", "verdict", "kept", "raised", "ran", "run it", "execute" };
pub fn quartiles(m: *M, sorted: []const i64) void {
    const n = sorted.len;
    m.median = if (n > 0) sorted[n / 2] else 0;
    m.q1 = if (n > 0) sorted[n / 4] else 0;
    m.q3 = if (n > 0) sorted[3 * n / 4] else 0;
}
pub fn measure(blocks: []const Block) M {
    var m: M = .{};
    var joined: Vec(u16) = .{};
    var lens: Vec(i64) = .{};
    var all: Vec(Len) = .{};
    var first = true;
    for (blocks) |b| {
        if (b.kind != .prose) continue;
        m.paragraphs += 1;
        if (!first) joined.addAll(L("\n\n"));
        first = false;
        joined.addAll(b.text);
        const ss = sentences(b.text);
        for (ss) |s| {
            const n = wc(s);
            all.add(.{ .n = n, .list = b.list, .line = b.line });
            lens.add(n);
        }
        const t = utrimEnd(b.text);
        if (std.mem.endsWith(u16, t, L("...")) or (t.len > 0 and t[t.len - 1] == 0x2026)) m.ellipses += 1;
        if (ss.len == 1 and wc(b.text) > 3) m.oneSentenceParas += 1;
    }
    const j = joined.items();
    var in = false;
    for (j) |c| {
        if (isLetterish(c)) {
            if (!in) m.words += 1;
            in = true;
        } else in = false;
    }
    std.mem.sort(i64, lens.items(), {}, std.sort.asc(i64));
    for (blocks, 0..) |b, idx| {
        if (b.kind != .prose) continue;
        const n = ucountCh(b.text, '!');
        if (n > 0) {
            m.excl += n;
            var after = false;
            var k: usize = if (idx >= 2) idx - 2 else 0;
            while (k < idx) : (k += 1) {
                if (blocks[k].kind == .code) after = true;
            }
            if (!after) {
                const low = toU8(lower(b.text));
                for (RUN_WORDS) |w| {
                    if (std.mem.indexOf(u8, low, w) != null) after = true;
                }
            }
            if (!after) m.cold += n;
        }
        const t = utrimEnd(b.text);
        if (t.len > 0 and t[t.len - 1] == ':' and idx + 1 < blocks.len and blocks[idx + 1].kind == .prose) m.colonLeads += 1;
    }
    m.sentences = @intCast(lens.len());
    m.lens = all.items();
    quartiles(&m, lens.items());
    m.questions = ucountCh(j, '?');
    m.colons = ucountCh(j, ':');
    m.dashes = ucountCh(j, 0x2014) + ucount(j, L(" - ")) + ucountCh(j, 0x2013);
    return m;
}
fn fi(x: i64) f64 {
    return @floatFromInt(x);
}
pub fn measured(m: *const M, name: []const u8, b: Bound) f64 {
    var raw: f64 = 0;
    if (eq(name, "SENTENCE_MEDIAN")) {
        raw = fi(m.median);
    } else if (eq(name, "SENTENCES_OVER")) {
        if (b.threshold) |t| {
            for (m.lens) |x| {
                if (fi(x.n) > t and !x.list) raw += 1;
            }
        }
    } else if (eq(name, "SENTENCES_UNDER")) {
        if (b.threshold) |t| {
            for (m.lens) |x| {
                if (fi(x.n) < t) raw += 1;
            }
        }
    } else if (eq(name, "DASHES")) {
        raw = fi(m.dashes);
    } else if (eq(name, "COLONS")) {
        raw = fi(m.colons);
    } else if (eq(name, "EXCLAMATIONS")) {
        raw = fi(m.excl);
    } else if (eq(name, "COLD_EXCLAMATIONS")) {
        raw = fi(m.cold);
    } else if (eq(name, "QUESTIONS")) {
        raw = fi(m.questions);
    } else if (eq(name, "ELLIPSES")) {
        raw = fi(m.ellipses);
    } else if (eq(name, "COLON_LEADS")) {
        raw = fi(m.colonLeads);
    } else if (eq(name, "ONE_SENTENCE_PARAGRAPHS")) {
        raw = fi(m.oneSentenceParas);
    }
    if (b.unit) |u| {
        if (eq(u, "PER_THOUSAND")) return r1(if (m.words != 0) raw * 1000 / fi(m.words) else 0);
        if (eq(u, "PER_HUNDRED")) return r1(100 * raw / @max(1, fi(if (eq(name, "ONE_SENTENCE_PARAGRAPHS")) m.paragraphs else m.sentences)));
    }
    return raw;
}

// ---------------------------------------------------------------- level 2: the declaration by itself

pub const Index = std.StringHashMap(*const Decl);
pub fn index(decls: []const *Decl) Index {
    var ix = Index.init(gpa);
    for (decls) |d| {
        if (!ix.contains(d.name)) ix.put(d.name, d) catch oom();
    }
    return ix;
}
fn chain(ix: *const Index, start_opt: ?[]const u8, field: []const u8, kind: []const u8) ?[]const *const Decl {
    var seen: Vec(*const Decl) = .{};
    const start = start_opt orelse return seen.items();
    var todo: Vec([]const u8) = .{};
    todo.add(start);
    var h: usize = 0;
    while (h < todo.len()) : (h += 1) {
        const n = todo.items()[h];
        const d = ix.get(n) orelse continue;
        if (!eq(d.kind, kind)) continue;
        var was = false;
        for (seen.items()) |s| {
            if (s == d) was = true;
        }
        if (was) {
            if (eq(n, start)) return null;
            continue;
        }
        seen.add(d);
        for (flat(d, field)) |x| {
            if (x != null and x.?.len > 0) {
                if (eq(x.?, start)) return null;
                todo.add(x.?);
            }
        }
    }
    return seen.items();
}
pub fn rulesOf(ix: *const Index, style: ?[]const u8) []const *const Decl {
    const styles = chain(ix, style, "ADOPTS", "STYLE") orelse &.{};
    var out: Vec(*const Decl) = .{};
    var declined: Vec([]const u8) = .{};
    for (styles) |s| {
        for (flat(s, "DECLINES")) |x| {
            if (x) |y| declined.add(y);
        }
    }
    for (styles) |s| {
        for (flat(s, "HOLDS")) |r| {
            const name = r orelse continue;
            const d = ix.get(name) orelse continue;
            if (!has(&RULE_KINDS, d.kind) or has(declined.items(), name)) continue;
            var was = false;
            for (out.items()) |o| {
                if (o == d) was = true;
            }
            if (!was) out.add(d);
        }
    }
    return out.items();
}
pub const FormField = struct { k: []const u8, decl: *const Decl, field: Field };
pub const Form = struct {
    name: []const u8,
    fields: []const FormField,
    pub fn get(f: *const Form, k: []const u8) ?FormField {
        for (f.fields) |x| {
            if (eq(x.k, k)) return x;
        }
        return null;
    }
};
pub fn formOf(ix: *const Index, name: []const u8) Form {
    const forms = chain(ix, name, "EXTENDS", "FORM") orelse &.{};
    var fs: Vec(FormField) = .{};
    for (forms) |d| {
        for (d.fields) |f| {
            var was = false;
            for (fs.items()) |x| {
                if (eq(x.k, f.name)) was = true;
            }
            if (!was) fs.add(.{ .k = f.name, .decl = d, .field = f });
        }
    }
    return .{ .name = name, .fields = fs.items() };
}
fn writtenOf(d: *const Decl) []const u8 {
    if (strT(d, "WRITES")) |w| return w;
    const s = gpa.dupe(u8, d.name) catch oom();
    std.mem.replaceScalar(u8, s, '_', ' ');
    return s;
}
fn langOk(d: *const Decl, lang: []const u8) bool {
    return d.get("LANGUAGE") == null or idIs(d, "LANGUAGE", lang);
}

const Checker = struct {
    out: Vec(Diag) = .{},
    c: *const Contract,
    ix: *const Index,
    fn D(s: *Checker, code: []const u8, d: *const Decl, vars: []const KV, line: ?i64) void {
        s.out.add(diag(s.c, code, d.file, line orelse d.line, d.name, vars, .{}));
    }
    fn ref(s: *Checker, d: *const Decl, field: []const u8, kinds: []const []const u8) void {
        for (flat(d, field)) |xo| {
            const x = xo orelse continue;
            if (x.len == 0) continue;
            const t = s.ix.get(x);
            if (t == null or !has(kinds, t.?.kind))
                s.D("UNKNOWN_REFERENCE", d, &.{ .{ .k = "field", .v = field }, .{ .k = "name", .v = x }, .{ .k = "kinds", .v = std.mem.join(gpa, " or ", kinds) catch oom() } }, d.get(field).?.line);
        }
    }
};

pub fn checkDeclarations(decls: []const *Decl, c: *const Contract) []Diag {
    const ix = index(decls);
    var ck: Checker = .{ .c = c, .ix = &ix };
    var seen = std.StringHashMap(i64).init(gpa);
    for (decls) |d| {
        if (seen.get(d.name)) |first| {
            ck.D("DUPLICATE_DECLARATION", d, &.{ .{ .k = "name", .v = d.name }, .{ .k = "first", .v = intStr(first) } }, null);
        } else seen.put(d.name, d.line) catch oom();
    }
    for (decls) |d| {
        if (!has(&KINDS, d.kind)) continue;
        const is_rule = has(&RULE_KINDS, d.kind);
        if ((is_rule or eq(d.kind, "FORM")) and strT(d, "EVIDENCE") == null) ck.D("RULE_WITHOUT_EVIDENCE", d, &.{.{ .k = "kind", .v = d.kind }}, null);
        if (eq(d.kind, "STYLE")) {
            ck.ref(d, "ADOPTS", &.{"STYLE"});
            ck.ref(d, "HOLDS", &RULE_KINDS);
            ck.ref(d, "DECLINES", &RULE_KINDS);
            if (chain(&ix, d.name, "ADOPTS", "STYLE") == null) ck.D("ADOPTION_CYCLE", d, &.{.{ .k = "field", .v = "ADOPTS" }}, null);
        }
        if (eq(d.kind, "FORM")) {
            ck.ref(d, "EXTENDS", &.{"FORM"});
            if (chain(&ix, d.name, "EXTENDS", "FORM") == null) ck.D("ADOPTION_CYCLE", d, &.{.{ .k = "field", .v = "EXTENDS" }}, null);
        }
        if (is_rule) ck.ref(d, "ON", &.{"FORM"});
        if (eq(d.kind, "READING")) ck.ref(d, "ON", &.{"FORM"});
        if (eq(d.kind, "PIECE")) {
            ck.ref(d, "FOLLOWS", &.{"STYLE"});
            ck.ref(d, "FORM", &.{"FORM"});
            if (idv(d, "FORM")) |fn_| {
                if (ix.get(fn_)) |fd| {
                    if (eq(fd.kind, "FORM")) {
                        const f = formOf(&ix, fn_);
                        if ((f.get("TITLE_HOLDS") != null or f.get("FIRST_SENTENCE_HOLDS") != null) and d.get("SUBJECT") == null and d.get("SUBJECT_FROM") == null)
                            ck.D("PIECE_WITHOUT_SUBJECT", d, &.{.{ .k = "form", .v = fn_ }}, null);
                    }
                }
            }
        }
        if (eq(d.kind, "PROFILE")) {
            for (d.fields) |f| {
                if (!has(&MEASURES, f.name)) continue;
                if (bound(f.values)) |b| {
                    if (b.min != null and b.max != null and b.min.? > b.max.?) ck.D("BOUND_INVERTED", d, &.{.{ .k = "field", .v = f.name }}, f.line);
                }
            }
        }
        if (eq(d.kind, "PATTERN") and d.get("MATCHES") != null) {
            const lang = idv(d, "LANGUAGE") orelse "en";
            const tests = [_]struct { k: []const u8, want: bool, code: []const u8 }{
                .{ .k = "REFUSED", .want = true, .code = "EXAMPLE_NOT_REFUSED" },
                .{ .k = "WRITTEN", .want = false, .code = "EXAMPLE_NOT_LAWFUL" },
            };
            for (tests) |t| {
                const s = str(d, t.k) orelse continue;
                const blocks = [_]Block{.{ .kind = .prose, .text = toU16(s), .line = 1 }};
                const hit = judgeRule(d, &blocks, lang, c, null, true).len > 0;
                if (hit != t.want) ck.D(t.code, d, &.{.{ .k = "text", .v = s }}, d.get(t.k).?.line);
            }
        }
    }
    for (decls) |s| {
        if (!eq(s.kind, "STYLE")) continue;
        const rules = rulesOf(&ix, s.name);
        for (rules) |t| {
            if (!eq(t.kind, "TERM")) continue;
            const w = tokens8(writtenOf(t), false);
            for (rules) |r| {
                if (r == t or !(eq(r.kind, "TERM") or eq(r.kind, "WORDLIST"))) continue;
                const rf = r.get("REFUSES") orelse continue;
                if (t.get("LANGUAGE") != null and r.get("LANGUAGE") != null) {
                    const a = idv(t, "LANGUAGE");
                    const b = idv(r, "LANGUAGE");
                    if ((a == null) != (b == null) or (a != null and !eq(a.?, b.?))) continue;
                }
                if (rf.values.len == 0 or rf.values[0].t != 'l') continue;
                const es = compileEntries(rf.values[0]) orelse continue;
                var whole = false;
                for (findEntries(w, es)) |h| {
                    if (h.from == 0 and h.to == w.len) whole = true;
                }
                if (whole) ck.D("TERM_REFUSED_AND_REQUIRED", t, &.{ .{ .k = "word", .v = writtenOf(t) }, .{ .k = "rule", .v = r.name }, .{ .k = "style", .v = s.name } }, null);
            }
        }
    }
    return ck.out.items();
}

// ---------------------------------------------------------------- level 3: the text against the rules

fn maskText(s: U, mentions: bool) []u16 {
    const t = codeSpans(s, .blank);
    if (!mentions) return t;
    const n = t.len;
    var i: usize = 0;
    while (i < n) {
        const c = t[i];
        if (c == '"' or c == 0x201C or c == 0xAB) {
            var j = i + 1;
            while (j < n and j - (i + 1) < 120 and !(t[j] == '"' or t[j] == 0x201D or t[j] == 0xBB or t[j] == '\n')) j += 1;
            if (j > i + 1 and j < n and (t[j] == '"' or t[j] == 0x201D or t[j] == 0xBB)) {
                for (t[i .. j + 1]) |*x| x.* = ' ';
                i = j + 1;
                continue;
            }
        }
        i += 1;
    }
    return t;
}

pub const Ctx = struct { file: []const u8 = "", title: U = &.{}, words: i64 = 0 };
const RuleHit = struct { hit: U, line: i64, col: i64 = 0, entry: *const Entry };

const Scanner = struct {
    entries: []const Entry,
    mentions: bool,
    keeps: []const []const u8,
    at: ?[]const u8,
    hits: Vec(RuleHit) = .{},

    fn atIs(s: *const Scanner, w: []const u8) bool {
        return s.at != null and eq(s.at.?, w);
    }
    fn scan(s: *Scanner, text: U, line: i64) void {
        const masked = maskText(text, s.mentions);
        const toks = tokens(masked, false);
        if (toks.len == 0) return;
        const kept: []const [2]usize = if (s.keeps.len > 0) keptRanges(toks, s.keeps) else &.{};
        var marks: Vec(usize) = .{}; // starts and ends hold the same indexes, but for 0 and toks.length
        const by_sentence = s.atIs("sentence_start") or s.atIs("sentence_end");
        if (by_sentence) {
            for (sentenceBreaks(masked)) |b| {
                for (toks, 0..) |t, k| {
                    if (t.at >= b.end) {
                        marks.add(k);
                        break;
                    }
                }
            }
        }
        for (findEntries(toks, s.entries)) |h| {
            var skip = false;
            for (kept) |r| {
                if (r[0] < h.to and h.from < r[1]) skip = true;
            }
            if (skip) continue;
            var to = h.to;
            while (to < toks.len and !isWord(toks[to].w) and trailing(toks[to].raw[0])) to += 1;
            if (s.atIs("paragraph_start") and h.from != 0) continue;
            if (s.atIs("paragraph_end") and to != toks.len and h.to != toks.len) continue;
            if (s.atIs("sentence_start") and !(h.from == 0 or std.mem.indexOfScalar(usize, marks.items(), h.from) != null)) continue;
            if (s.atIs("sentence_end")) {
                const ok = to == toks.len or h.to == toks.len or std.mem.indexOfScalar(usize, marks.items(), to) != null or std.mem.indexOfScalar(usize, marks.items(), h.to) != null;
                if (!ok) continue;
            }
            const a = toks[h.from].at;
            const nl = std.mem.lastIndexOfScalar(u16, text[0..a], '\n');
            s.hits.add(.{ .hit = text[a..toks[h.to - 1].end], .line = line + ucountCh(text[0..a], '\n'), .col = @intCast(if (nl) |x| a - x else a + 1), .entry = h.entry });
        }
    }
};
fn trailing(c: u16) bool {
    return c == '.' or c == '!' or c == '?' or c == 0x2026 or c == ')' or c == '"' or c == '\'' or c == 0x201D or c == 0xBB;
}

pub fn judgeRule(d: *const Decl, blocks: []const Block, lang: []const u8, c: *const Contract, ctx: ?Ctx, self_test: bool) []Diag {
    var out: Vec(Diag) = .{};
    const is_pattern = eq(d.kind, "PATTERN");
    const f = d.get(if (is_pattern) "MATCHES" else "REFUSES") orelse return out.items();
    if (f.values.len == 0 or f.values[0].t != 'l') return out.items();
    const entries = compileEntries(f.values[0]) orelse return out.items();
    if (!self_test and !langOk(d, lang)) return out.items();
    var keeps: Vec([]const u8) = .{};
    for (flat(d, "KEEPS")) |k| {
        if (k != null and k.?.len > 0) keeps.add(k.?);
    }
    const default_zones = [_]?[]const u8{ "lede", "body", "list", "quote" };
    const zones: []const ?[]const u8 = if (d.get("IN") != null) flat(d, "IN") else &default_zones;
    const code = kwv(d, "CODE") orelse (if (eq(d.kind, "TERM")) "TERM_SYNONYM" else if (eq(d.kind, "PROFILE")) "OFF_PROFILE" else "null");
    const severity = idv(d, "SEVERITY") orelse (if (eq(d.kind, "WORDLIST")) "warning" else if (eq(d.kind, "PROFILE")) "warning" else "error");
    var cites: Vec([]const u8) = .{};
    cites.add(cat(&.{ "rule:", d.name }));
    if (strT(d, "EVIDENCE")) |ev| cites.add(cat(&.{ "evidence:", ev }));
    var sc: Scanner = .{ .entries = entries, .mentions = idIs(d, "MENTIONS", "skipped"), .keeps = keeps.items(), .at = idv(d, "AT") };
    var lede: ?usize = null;
    for (blocks, 0..) |b, k| {
        if (b.kind == .prose) {
            lede = k;
            break;
        }
    }
    var has_h1 = false;
    for (blocks, 0..) |b, k| {
        if (b.kind == .prose) {
            const z: []const u8 = if (b.list) "list" else if (b.quote) "quote" else if (lede != null and lede.? == k) "lede" else "body";
            if (hasOpt(zones, z)) sc.scan(b.text, b.line);
        }
        for (b.headings) |h| {
            if (h.level == 1) has_h1 = true;
            if (hasOpt(zones, if (h.level == 1) "title" else "heading")) sc.scan(h.text, h.line);
        }
    }
    if (ctx != null and ctx.?.title.len > 0 and hasOpt(zones, "title") and !has_h1) sc.scan(ctx.?.title, 1);
    const hits = sc.hits.items();
    const says = strT(d, "SAYS");
    const written = strT(d, "WRITTEN");
    const file = if (ctx) |x| x.file else "";
    if (d.get("AT_MOST") != null and !self_test) {
        if (budgetOf(d.get("AT_MOST").?.values)) |budget| {
            const words: i64 = if (ctx) |x| x.words else 0;
            const rate: f64 = if (words != 0) r1(fi(@intCast(hits.len)) * 1000 / fi(words)) else 0;
            if (hits.len > 0 and budget.max != null and rate > budget.max.?) out.add(diag(c, code, file, hits[0].line, d.name, &.{}, .{ .severity = severity, .level = 4, .cites = cites.items(), .message = cat(&.{
                "The list ",             d.name,           " stands ", intStr(@intCast(hits.len)), " times, ", numStr(rate), " per thousand words; the style allows ",
                numStr(budget.max.?), ". First: \"", toU8(hits[0].hit), "\".",
            }) }));
            return out.items();
        }
    }
    for (hits) |h| {
        const hit = toU8(h.hit);
        const ew: ?[]const u8 = if (h.entry.write != null and h.entry.write.?.len > 0) h.entry.write else null;
        var msg: []const u8 = undefined;
        if (eq(d.kind, "TERM")) {
            msg = cat(&.{ "\"", hit, "\" stands for ", strT(d, "MEANS") orelse d.name, ": the house word is \"", ew orelse writtenOf(d), "\"." });
        } else if (eq(d.kind, "WORDLIST")) {
            msg = cat(&.{ "\"", hit, "\" is on the list ", d.name, ".", if (ew) |w| cat(&.{ " Write \"", w, "\"." }) else if (says) |s| cat(&.{ " ", s }) else "" });
        } else {
            msg = cat(&.{
                says orelse cat(&.{ "The text matches the refused pattern ", d.name, " (\"", hit, "\")." }),
                if (written) |w| cat(&.{ " Written form: ", w }) else if (ew) |w| cat(&.{ " Write \"", w, "\"." }) else "",
            });
        }
        // the column keeps two matches on one line apart when the message is the same for both (a PATTERN with SAYS)
        var x = diag(c, code, file, h.line, d.name, &.{}, .{ .severity = severity, .level = 3, .cites = cites.items(), .message = msg });
        x.col = h.col;
        out.add(x);
    }
    return out.items();
}

const STOP_EN = "a an the and or but nor so yet of in on at to for from by with without into onto over under as is are was were be been being it its this that these those there here he she they we you i his her their our your my me him them us who whom whose which what when where why how not no do does did done has have had will would can could may might must shall should if then than also very more most less least one two three each every all any some such only own same other another just about after before between through during above below up down out off again further once both few many much per via is isn aren doesn don didn won hasn haven";
const STOP_FR = "le la les un une des du de d l et ou mais donc or ni car à au aux en dans sur sous par pour avec sans vers chez entre comme est sont était étaient être été ce cet cette ces il elle ils elles nous vous je tu on se sa son ses leur leurs notre nos votre vos mon ma mes qui que quoi dont où quand comment pourquoi ne pas plus moins très tout tous toute toutes chaque aucun aucune si alors aussi y a ont avait fait peut peuvent doit qu n s c j m t";

fn isLetterCI(c: u16) bool {
    return (c >= 'A' and c <= 'Z') or (c >= 'a' and c <= 'z') or (c >= 0xC0 and c <= 0xFF) or c == 0x178;
}
fn termAt(text: U, pos: usize, t: U) bool {
    var i = pos;
    var k: usize = 0;
    while (k < t.len) {
        if (isSpace(t[k])) {
            while (k < t.len and isSpace(t[k])) k += 1;
            if (i >= text.len or !isSpace(text[i])) return false;
            while (i < text.len and isSpace(text[i])) i += 1;
        } else {
            if (i >= text.len or canon(text[i]) != canon(t[k])) return false;
            i += 1;
            k += 1;
        }
    }
    return true;
}
/// new RegExp('(^|[^A-Za-zÀ-ÿ])' + term, 'i').test(text)
fn holds(text: U, term: U) bool {
    const t = utrim(term);
    if (termAt(text, 0, t)) return true;
    for (text, 0..) |c, i| {
        if (!isLetterCI(c) and termAt(text, i + 1, t)) return true;
    }
    return false;
}

pub const JDoc = struct {
    doc: Doc,
    subject: []const u8 = "",
    zone_names: []const []const u8 = &.{},
    zone_codes: []const []const ?[]const u8 = &.{},
    fn exempt(j: *const JDoc, z: []const u8, code: []const u8) bool {
        var r: ?[]const ?[]const u8 = null;
        for (j.zone_names, 0..) |n, i| {
            if (eq(n, z)) r = j.zone_codes[i];
        }
        return r != null and hasOpt(r.?, code);
    }
};

const FormJudge = struct {
    out: Vec(Diag) = .{},
    c: *const Contract,
    form: *const Form,
    file: []const u8,
    piece: []const u8,
    fn D(s: *FormJudge, code: []const u8, line: i64, vars: []const KV, k: []const u8) void {
        const d = s.form.get(k).?.decl;
        var cites: Vec([]const u8) = .{};
        cites.add(cat(&.{ "rule:", d.name }));
        if (strT(d, "EVIDENCE")) |ev| cites.add(cat(&.{ "evidence:", ev }));
        s.out.add(diag(s.c, code, s.file, line, s.piece, vars, .{ .cites = cites.items() }));
    }
};
fn allDigits(w: U) bool {
    for (w) |c| {
        if (!(c >= '0' and c <= '9')) return false;
    }
    return w.len > 0;
}
fn norm(s: U) U { // lower case, runs of space to one space, trimmed
    var out: Vec(u16) = .{};
    var sp = false;
    for (lower(s)) |c| {
        if (isSpace(c)) {
            if (!sp) out.add(' ');
            sp = true;
        } else {
            out.add(c);
            sp = false;
        }
    }
    return utrim(out.items());
}

fn judgeForm(form: *const Form, jd: *const JDoc, piece: []const u8, c: *const Contract, file: []const u8, lang: []const u8) []Diag {
    var fj: FormJudge = .{ .c = c, .form = form, .file = file, .piece = piece };
    const blocks = jd.doc.blocks;
    var heads: Vec(Heading) = .{};
    for (blocks) |b| heads.addAll(b.headings);
    var h1i: ?usize = null;
    for (heads.items(), 0..) |h, k| {
        if (h.level == 1) {
            h1i = k;
            break;
        }
    }
    const h1: ?Heading = if (h1i) |k| heads.items()[k] else null;
    const title: U = if (h1) |h| h.text else jd.doc.frontT("title");
    const title_line: i64 = if (h1) |h| h.line else 1;
    const subject8 = jd.subject;
    const subject = toU16(subject8);
    const title8 = toU8(title);
    if (form.get("TITLE_WORDS") != null and title.len > 0) {
        if (bound(form.get("TITLE_WORDS").?.field.values)) |b| {
            const n = wc(title);
            if (b.max != null and fi(n) > b.max.?) fj.D("TITLE_TOO_LONG", title_line, &.{ .{ .k = "n", .v = intStr(n) }, .{ .k = "max", .v = numStr(b.max.?) }, .{ .k = "title", .v = title8 } }, "TITLE_WORDS");
        }
    }
    if (form.get("TITLE_HOLDS") != null and subject.len > 0) {
        if (title.len == 0) {
            fj.D("TITLE_MISSING", 1, &.{}, "TITLE_HOLDS");
        } else if (!holds(title, subject)) fj.D("TITLE_WITHOUT_SUBJECT", title_line, &.{ .{ .k = "subject", .v = subject8 }, .{ .k = "title", .v = title8 } }, "TITLE_HOLDS");
    }
    var prose: Vec(Block) = .{};
    for (blocks) |b| {
        if (b.kind == .prose and !(b.zone != null and b.zone.?.len > 0 and jd.exempt(b.zone.?, "LEDE_WITHOUT_SUBJECT"))) prose.add(b);
    }
    var under: ?Block = null;
    for (prose.items()) |b| {
        if (h1 == null or b.line > h1.?.line) {
            under = b;
            break;
        }
    }
    if (form.get("FIRST_SENTENCE_HOLDS") != null and subject.len > 0 and under != null) {
        const ss = sentences(under.?.text);
        const s: U = if (ss.len > 0 and ss[0].len > 0) ss[0] else under.?.text;
        if (!holds(s, subject)) fj.D("LEDE_WITHOUT_SUBJECT", under.?.line, &.{.{ .k = "subject", .v = subject8 }}, "FIRST_SENTENCE_HOLDS");
    }
    if (form.get("SAY_ONCE")) |so| say: {
        if (so.field.values.len < 2) break :say;
        const limit = so.field.values[1].n;
        var stop = std.StringHashMap(void).init(gpa);
        var it = std.mem.splitScalar(u8, if (eq(lang, "fr")) STOP_FR else STOP_EN, ' ');
        while (it.next()) |w| stop.put(w, {}) catch oom();
        // the subject excuses its own words and their plurals: "commitments" for the subject "commitment", and back
        var subj = std.StringHashMap(void).init(gpa);
        for (tokens(subject, false)) |t| {
            if (!isWord(t.w)) continue;
            const s = toU8(t.w);
            subj.put(s, {}) catch oom();
            subj.put(cat(&.{ s, "s" }), {}) catch oom();
            subj.put(cat(&.{ s, "es" }), {}) catch oom();
            if (s.len > 1 and s[s.len - 1] == 'y') subj.put(cat(&.{ s[0 .. s.len - 1], "ies" }), {}) catch oom();
            if (s.len > 1 and s[s.len - 1] == 's') subj.put(s[0 .. s.len - 1], {}) catch oom();
            if (s.len > 2 and std.mem.endsWith(u8, s, "es")) subj.put(s[0 .. s.len - 2], {}) catch oom();
            if (s.len > 3 and std.mem.endsWith(u8, s, "ies")) subj.put(cat(&.{ s[0 .. s.len - 3], "y" }), {}) catch oom();
        }
        var seen = std.StringHashMap(i64).init(gpa);
        var told = std.StringHashMap(void).init(gpa);
        var n: f64 = 0;
        const Unit = struct { text: U, line: i64 };
        var units: Vec(Unit) = .{};
        units.add(.{ .text = title, .line = title_line });
        var hk: usize = 0;
        for (blocks) |b| {
            for (b.headings) |h| {
                if (h1i == null or hk != h1i.?) units.add(.{ .text = h.text, .line = h.line });
                hk += 1;
            }
            if (b.kind == .prose) units.add(.{ .text = b.text, .line = b.line });
        }
        outer: for (units.items()) |u| {
            var prev: ?[]const u8 = null;
            for (tokens(maskText(u.text, false), false)) |t| {
                if (!isWord(t.w)) {
                    prev = null;
                    continue;
                }
                n += 1;
                if (n > limit) break :outer;
                const w8 = toU8(t.w);
                const content = !stop.contains(w8) and t.w.len > 2 and !allDigits(t.w);
                if (content and prev != null) {
                    const pair = cat(&.{ prev.?, " ", w8 });
                    if (!(subj.contains(prev.?) or subj.contains(w8))) {
                        if (seen.get(pair)) |first| {
                            if (!told.contains(pair)) {
                                told.put(pair, {}) catch oom();
                                fj.D("SAY_ONCE", u.line + ucountCh(u.text[0..t.at], '\n'), &.{ .{ .k = "pair", .v = pair }, .{ .k = "first", .v = intStr(first) }, .{ .k = "limit", .v = numStr(limit) } }, "SAY_ONCE");
                            }
                        } else seen.put(pair, u.line) catch oom();
                    }
                }
                prev = if (content) w8 else null;
            }
        }
    }
    var h2: Vec(Heading) = .{};
    for (heads.items()) |h| {
        if (h.level == 2) h2.add(h);
    }
    if (form.get("HEADINGS")) |hf| {
        var last: i64 = -1;
        for (flat(hf.decl, "HEADINGS")) |wq| { // a list of headings, or one bare heading
            const w = wq orelse continue;
            const nw = norm(toU16(w));
            var k: i64 = -1;
            for (h2.items(), 0..) |h, x| {
                if (ueq(norm(h.text), nw)) {
                    k = @intCast(x);
                    break;
                }
            }
            if (k == -1) {
                fj.D("HEADING_MISSING", title_line, &.{.{ .k = "heading", .v = w }}, "HEADINGS");
            } else {
                if (k < last) fj.D("HEADING_OUT_OF_ORDER", h2.items()[@intCast(k)].line, &.{.{ .k = "heading", .v = w }}, "HEADINGS");
                last = @max(last, k);
            }
        }
    }
    if (form.get("HEADING_CASE")) |hc| {
        if (idIs(hc.decl, "HEADING_CASE", "sentence")) {
            for (heads.items()) |h| {
                var count: usize = 0;
                var every = true;
                var it = std.mem.tokenizeAny(u16, h.text, &[_]u16{ 9, 10, 11, 12, 13, 32, 0xA0, 0x1680, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200A, 0x2028, 0x2029, 0x202F, 0x205F, 0x3000, 0xFEFF });
                while (it.next()) |w| {
                    if (w.len < 4) continue;
                    var letters = true;
                    for (w[0..4]) |ch| {
                        if (!((ch >= 'A' and ch <= 'Z') or (ch >= 'a' and ch <= 'z') or (ch >= 0xC0 and ch <= 0xFF))) letters = false;
                    }
                    if (!letters) continue;
                    count += 1;
                    const up = (w[0] >= 'A' and w[0] <= 'Z') or (w[0] >= 0xC0 and w[0] <= 0xDE);
                    const lo = (w[1] >= 'a' and w[1] <= 'z') or (w[1] >= 0xE0 and w[1] <= 0xFF);
                    if (!(up and lo)) every = false;
                }
                if (count >= 3 and every) fj.D("HEADING_NOT_SENTENCE_CASE", h.line, &.{.{ .k = "heading", .v = toU8(h.text) }}, "HEADING_CASE");
            }
        }
    }
    if (form.get("CLOSES_WITHOUT")) |cw| {
        const last_h: ?Heading = if (h2.len() > 0) h2.items()[h2.len() - 1] else null;
        const last_p: ?Block = if (prose.len() > 0) prose.items()[prose.len() - 1] else null;
        for (flat(cw.decl, "CLOSES_WITHOUT")) |ro| {
            if (ro == null or ro.?.len == 0) continue;
            const r = lower(toU16(ro.?));
            const r8 = toU8(r);
            if (last_h != null and holds(last_h.?.text, r)) {
                fj.D("CLOSES_ON_SUMMARY", last_h.?.line, &.{.{ .k = "phrase", .v = r8 }}, "CLOSES_WITHOUT");
                break;
            }
            if (last_p != null and ustarts(lower(last_p.?.text), r)) {
                fj.D("CLOSES_ON_SUMMARY", last_p.?.line, &.{.{ .k = "phrase", .v = r8 }}, "CLOSES_WITHOUT");
                break;
            }
        }
    }
    if (form.get("HOLES_CLOSED_AT")) |hc| {
        const status = toU8(jd.doc.frontT("status"));
        if (hasOpt(flat(hc.decl, "HOLES_CLOSED_AT"), status)) {
            for (blocks) |b| {
                if (b.kind != .prose) continue;
                var from: usize = 0;
                while (std.mem.indexOfPos(u16, b.text, from, L("[AUTHOR:"))) |at| {
                    const end = std.mem.indexOfScalarPos(u16, b.text, at, ']') orelse break;
                    const m = b.text[at .. end + 1];
                    fj.D("HOLE_OPEN", b.line + ucountCh(b.text[0..at], '\n'), &.{ .{ .k = "hole", .v = toU8(m[0..@min(60, m.len)]) }, .{ .k = "status", .v = status } }, "HOLES_CLOSED_AT");
                    from = end + 1;
                }
            }
        }
    }
    return fj.out.items();
}

pub const Target = struct { piece: ?[]const u8 = null, style: ?[]const u8 = null, form: ?[]const u8 = null, subject: ?[]const u8 = null, language: ?[]const u8 = null };
pub const AllowFn = *const fn (a: *const Decl, file: []const u8) bool;
fn truthy(s: ?[]const u8) ?[]const u8 {
    return if (s != null and s.?.len > 0) s else null;
}
fn diagLt(_: void, a: Diag, b: Diag) bool {
    if (a.line != b.line) return a.line < b.line;
    return std.mem.lessThan(u8, a.code, b.code);
}

/// judge(decls, target, text, opts) -> the findings on one text (Markdown; a page in HTML is not read by this port).
pub fn judge(decls: []const *Decl, target: Target, text8: []const u8, c: *const Contract, level_in: i64, file: []const u8, allow: ?AllowFn) []Diag {
    const level: i64 = if (level_in == 0) 4 else level_in;
    const ix = index(decls);
    var out: Vec(Diag) = .{};
    var t: Target = .{ .piece = truthy(target.piece), .style = truthy(target.style), .form = truthy(target.form), .subject = truthy(target.subject), .language = truthy(target.language) };
    const piece: ?*const Decl = if (t.piece) |p| ix.get(p) else null;
    if (piece) |p| {
        t.style = t.style orelse idv(p, "FOLLOWS");
        t.form = t.form orelse idv(p, "FORM");
        t.subject = t.subject orelse strT(p, "SUBJECT");
        t.language = t.language orelse idv(p, "LANGUAGE");
    }
    const text = toU16(text8);
    const doc = read(text, file);
    const from_front = piece != null and idIs(piece.?, "SUBJECT_FROM", "front_matter");
    const had_subject = t.subject != null;
    if (t.subject == null and from_front) t.subject = truthy(toU8(doc.frontT("subject")));
    const lang: []const u8 = t.language orelse truthy(toU8(doc.frontT("lang"))) orelse truthy(toU8(doc.frontT("language"))) orelse "en";
    var jd: JDoc = .{ .doc = doc, .subject = t.subject orelse "" };
    var zn: Vec([]const u8) = .{};
    var zc: Vec([]const ?[]const u8) = .{};
    for (decls) |d| {
        if (eq(d.kind, "ZONE")) {
            zn.add(d.name);
            zc.add(flat(d, "EXEMPT_FROM"));
        }
    }
    jd.zone_names = zn.items();
    jd.zone_codes = zc.items();
    const name: []const u8 = if (piece) |p| p.name else t.style orelse "";
    if (level >= 3) {
        const m = measure(doc.blocks);
        const ctx: Ctx = .{ .file = file, .title = doc.frontT("title"), .words = m.words };
        const rules = rulesOf(&ix, t.style);
        for (rules) |r| {
            if (eq(r.kind, "PROFILE")) continue;
            if (r.get("ON") != null) {
                const form = t.form orelse continue;
                const on = flat(r, "ON");
                if (!hasOpt(on, form)) {
                    var any = false;
                    for (chain(&ix, form, "EXTENDS", "FORM") orelse &.{}) |fd| {
                        if (hasOpt(on, fd.name)) any = true;
                    }
                    if (!any) continue;
                }
            }
            out.addAll(judgeRule(r, doc.blocks, lang, c, ctx, false));
        }
        if (t.form != null and ix.get(t.form.?) != null) {
            if (piece != null and doc.frontGet("subject") == null and !had_subject and t.subject == null and from_front) out.add(diag(c, "SUBJECT_NOT_FOUND", file, 1, name, &.{}, .{}));
            const form = formOf(&ix, t.form.?);
            out.addAll(judgeForm(&form, &jd, name, c, file, lang));
        }
        if (level >= 4) {
            for (rules) |r| {
                if (!eq(r.kind, "PROFILE") or !langOk(r, lang)) continue;
                if (r.get("ON") != null and (t.form == null or !hasOpt(flat(r, "ON"), t.form.?))) continue;
                const min = numv(r, "MIN_WORDS") orelse 300;
                if (fi(m.words) < min) continue;
                var cites: Vec([]const u8) = .{};
                cites.add(cat(&.{ "rule:", r.name }));
                if (strT(r, "EVIDENCE")) |ev| cites.add(cat(&.{ "evidence:", ev }));
                for (r.fields) |f| {
                    if (!has(&MEASURES, f.name)) continue;
                    const b = bound(f.values) orelse continue;
                    const v = measured(&m, f.name, b);
                    if ((b.min != null and v < b.min.?) or (b.max != null and v > b.max.?)) {
                        const subj = if (b.threshold) |th| cat(&.{ f.name, " ", numStr(th) }) else f.name;
                        out.add(diag(c, kwv(r, "CODE") orelse "OFF_PROFILE", file, 1, subj, &.{}, .{
                            .severity = idv(r, "SEVERITY") orelse "warning",
                            .level = 4,
                            .cites = cites.items(),
                            .message = cat(&.{ "The measure ", subj, " is ", numStr(v), "; the profile ", r.name, " asks ", b.text, "." }),
                        }));
                    }
                }
            }
        }
        var kept: Vec(Diag) = .{};
        for (out.items()) |d| {
            if (d.level > level) continue;
            var z: ?[]const u8 = null;
            for (doc.blocks) |b| {
                if (b.line > d.line) break;
                z = b.zone;
            }
            if (z != null and z.?.len > 0 and jd.exempt(z.?, d.code)) continue;
            kept.add(d);
        }
        out = kept;
        const lines = splitLines(normalizeNewlines(text));
        for (decls) |a| {
            if (!eq(a.kind, "ALLOW") or allow == null or !allow.?(a, file)) continue;
            const hold8 = strT(a, "LINE_HOLDS") orelse "";
            const hold = toU16(hold8);
            const code = kwv(a, "EXCUSES");
            var at: Vec(i64) = .{};
            if (hold.len > 0) {
                for (lines, 0..) |l, k| {
                    if (std.mem.indexOf(u16, l, hold) != null) at.add(@intCast(k + 1));
                }
            }
            const before = out.len();
            var next: Vec(Diag) = .{};
            for (out.items()) |d| {
                if (code != null and eq(d.code, code.?) and std.mem.indexOfScalar(i64, at.items(), d.line) != null) continue;
                next.add(d);
            }
            out = next;
            if (at.len() == 0 or out.len() == before) out.add(diag(c, "ALLOW_STALE", a.file, a.line, a.name, &.{ .{ .k = "code", .v = code orelse "undefined" }, .{ .k = "holds", .v = hold8 } }, .{}));
        }
    }
    std.mem.sort(Diag, out.items(), {}, diagLt);
    return out.items();
}

// ---------------------------------------------------------------- the report

pub fn countSeverity(diags: []const Diag, sev: []const u8) usize {
    var n: usize = 0;
    for (diags) |d| {
        if (eq(d.severity, sev)) n += 1;
    }
    return n;
}

pub fn reportText(w: *std.Io.Writer, diags: []const Diag, files: usize, level: []const u8) !void {
    for (diags) |d| {
        try w.print("{s}:{d}  {s}  {s}", .{ d.file, d.line, d.severity, d.code });
        if (d.subject.len > 0) try w.print("  {s}", .{d.subject});
        try w.print("\n    {s}\n", .{d.message});
        var rule: ?[]const u8 = null;
        var ev: ?[]const u8 = null;
        for (d.cites) |ci| {
            if (rule == null and std.mem.startsWith(u8, ci, "rule:")) rule = ci[5..];
            if (ev == null and std.mem.startsWith(u8, ci, "evidence:")) ev = ci[9..];
        }
        if (rule) |r| {
            try w.print("    Rule {s}", .{r});
            if (ev) |e| try w.print(" \xc2\xb7 {s}", .{e});
            try w.writeAll("\n");
        }
        if (d.piece) |p| try w.print("    Piece {s} \xc2\xb7 style {s}\n", .{ p, d.style });
        try w.writeAll("\n");
    }
    try w.print("{d} error(s), {d} warning(s) across {d} file(s) at level {s}\n", .{ countSeverity(diags, "error"), countSeverity(diags, "warning"), files, level });
}

/// A value JSON.stringify(x, null, 1) prints.
pub const J = union(enum) {
    s: []const u8,
    i: i64,
    f: f64,
    arr: []const J,
    obj: []const Pair,
    pub const Pair = struct { k: []const u8, v: J };
};
fn jString(w: *std.Io.Writer, s: []const u8) !void {
    try w.writeByte('"');
    for (s) |ch| {
        switch (ch) {
            '"' => try w.writeAll("\\\""),
            '\\' => try w.writeAll("\\\\"),
            8 => try w.writeAll("\\b"),
            12 => try w.writeAll("\\f"),
            '\n' => try w.writeAll("\\n"),
            '\r' => try w.writeAll("\\r"),
            '\t' => try w.writeAll("\\t"),
            else => if (ch < 0x20) try w.print("\\u{x:0>4}", .{ch}) else try w.writeByte(ch),
        }
    }
    try w.writeByte('"');
}
pub fn jWrite(w: *std.Io.Writer, v: J, depth: usize) !void {
    switch (v) {
        .s => |s| try jString(w, s),
        .i => |i| try w.print("{d}", .{i}),
        .f => |f| try w.writeAll(numStr(f)),
        .arr => |a| {
            if (a.len == 0) return w.writeAll("[]");
            try w.writeAll("[\n");
            for (a, 0..) |x, k| {
                try w.splatByteAll(' ', depth + 1);
                try jWrite(w, x, depth + 1);
                try w.writeAll(if (k + 1 < a.len) ",\n" else "\n");
            }
            try w.splatByteAll(' ', depth);
            try w.writeByte(']');
        },
        .obj => |o| {
            if (o.len == 0) return w.writeAll("{}");
            try w.writeAll("{\n");
            for (o, 0..) |p, k| {
                try w.splatByteAll(' ', depth + 1);
                try jString(w, p.k);
                try w.writeAll(": ");
                try jWrite(w, p.v, depth + 1);
                try w.writeAll(if (k + 1 < o.len) ",\n" else "\n");
            }
            try w.splatByteAll(' ', depth);
            try w.writeByte('}');
        },
    }
}
pub fn jStrings(xs: []const []const u8) J {
    var a: Vec(J) = .{};
    for (xs) |x| a.add(.{ .s = x });
    return .{ .arr = a.items() };
}
pub fn envelope(diags: []const Diag) J {
    var a: Vec(J) = .{};
    for (diags) |d| {
        const span = gpa.dupe(J.Pair, &.{ .{ .k = "file", .v = .{ .s = d.file } }, .{ .k = "line", .v = .{ .i = d.line } } }) catch oom();
        const base = [_]J.Pair{
            .{ .k = "code", .v = .{ .s = d.code } },
            .{ .k = "severity", .v = .{ .s = d.severity } },
            .{ .k = "message", .v = .{ .s = d.message } },
            .{ .k = "span", .v = .{ .obj = span } },
            .{ .k = "cites", .v = jStrings(d.cites) },
            .{ .k = "language", .v = .{ .s = "prosa" } },
            .{ .k = "level", .v = .{ .i = d.level } },
            .{ .k = "subject", .v = .{ .s = d.subject } },
        };
        const by = [_]J.Pair{ .{ .k = "piece", .v = .{ .s = d.piece orelse "" } }, .{ .k = "style", .v = .{ .s = d.style } } };
        a.add(.{ .obj = if (d.piece != null) std.mem.concat(gpa, J.Pair, &.{ &base, &by }) catch oom() else gpa.dupe(J.Pair, &base) catch oom() });
    }
    return .{ .obj = gpa.dupe(J.Pair, &.{.{ .k = "diagnostics", .v = .{ .arr = a.items() } }}) catch oom() };
}
