#!/usr/bin/env node
// cli.js : the prosa command. It reads files and hands text to the pure court in prosa.js.
'use strict';
const fs = require('fs'); const path = require('path'); const crypto = require('crypto');
const P = require('./prosa.js');
const ROOT = path.resolve(__dirname, '..', '..');
const contract = JSON.parse(fs.readFileSync(path.join(ROOT, 'conformance', 'violations.json'), 'utf8'));
const posix = p => p.split(path.sep).join('/');
const rel = p => posix(path.relative(process.cwd(), p)) || '.';
const readText = f => fs.readFileSync(f, 'utf8').replace(/^﻿/, '');

const USAGE = `prosa ${P.VERSION.court} (language ${P.VERSION.language})

  prosa check <path>... [--level N] [--style S --form F --subject T --lang L] [--proz F]... [--json] [--quiet]
  prosa measure <path>... [--as NAME] [--json]
  prosa brief <file.proz> [--piece P | --style S [--form F] [--lang L]]
  prosa drift <drafts>... --against <corpus> [--lang L] [--json]
  prosa readings <path>...
  prosa conformance [dir]
  prosa pack <file.proz> [-o out.json]      prosa pack --check
  prosa version

Exit codes: 0 no error (warnings allowed), 1 an error, 2 a usage or read error.`;

function args(argv) {
  const a = { _: [], proz: [] }; const takes = ['level', 'style', 'form', 'subject', 'lang', 'as', 'against', 'piece', 'o', 'proz'];
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    if (x.startsWith('--') || x === '-o') { const k = x.replace(/^-+/, ''); if (takes.includes(k)) { if (k === 'proz') a.proz.push(argv[++i]); else a[k] = argv[++i]; } else a[k] = true; }
    else a._.push(x);
  }
  return a;
}
function fail(msg) { process.stderr.write('prosa: ' + msg + '\n'); process.exit(2); }
function walk(p, exts, out) {
  out = out || []; let st; try { st = fs.statSync(p); } catch (e) { fail('cannot read ' + p); }
  if (st.isDirectory()) { for (const n of fs.readdirSync(p).sort()) { if (n === 'node_modules' || n.startsWith('.git') || n === 'zig-out' || n === '.zig-cache') continue; walk(path.join(p, n), exts, out); } }
  else if (exts.includes(path.extname(p).toLowerCase())) out.push(path.resolve(p));
  return out;
}
function globFiles(base, pattern) { // * within a name, ** across folders
  const full = posix(path.resolve(base, pattern)); const star = full.search(/[*?]/);
  if (star === -1) return fs.existsSync(full) ? [path.resolve(full)] : [];
  const dir = full.slice(0, full.lastIndexOf('/', star)); if (!fs.existsSync(dir)) return [];
  const re = new RegExp('^' + full.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*\//g, '\u0001').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]').replace(/\u0001/g, '(?:.*/)?') + '$');
  return walk(dir, ['.md', '.html', '.htm', '.markdown', '.txt']).filter(f => re.test(posix(f)));
}

// load(files) -> { decls, diagnostics, files }: the .proz files and what they USE, each read once
function load(files) {
  const seen = new Set(); let decls = [], diagnostics = []; const order = [];
  const visit = (f, from) => {
    f = path.resolve(f); if (seen.has(f)) return; seen.add(f);
    let src; try { src = readText(f); } catch (e) { if (from) { diagnostics.push(P.diag(contract, 'UNKNOWN_REFERENCE', rel(from.file), from.line, '', { field: 'USE', name: from.path, kinds: 'readable .proz file' }, { level: 1 })); return; } fail('cannot read ' + f); }
    const r = P.parse(src, rel(f), contract); order.push(f);
    for (const u of r.uses) visit(u.path.startsWith('prosa:') ? path.join(ROOT, 'constitution', u.path.slice(6) + '.proz') : path.resolve(path.dirname(f), u.path), { file: f, line: u.line, path: u.path });
    for (const d of r.decls) d.abs = f;
    decls = decls.concat(r.decls); diagnostics = diagnostics.concat(r.diagnostics);
  };
  files.forEach(f => visit(f, null));
  return { decls, diagnostics, files: order };
}
function piecesFor(decls) { // -> [{ piece, file }]
  const out = [];
  for (const d of decls) {
    if (d.kind !== 'PIECE') continue; const base = path.dirname(d.abs);
    const one = P.str(d, 'FILE'), many = P.str(d, 'FILES');
    if (one) out.push({ piece: d, file: path.resolve(base, one), missing: !fs.existsSync(path.resolve(base, one)) });
    else if (many) for (const f of globFiles(base, many)) out.push({ piece: d, file: f });
  }
  return out;
}
const allowMatches = (a, file) => { const want = P.str(a, 'FILE'); if (!want) return false; const abs = posix(path.resolve(path.dirname(a.abs), want)); return posix(path.resolve(file)) === abs; };

function runCheck(a) {
  if (!a._.length) fail('check needs a path');
  const level = a.level ? parseInt(a.level, 10) : 4;
  let proz = a.proz.map(f => path.resolve(f)), texts = [];
  for (const p of a._) { for (const f of walk(p, ['.proz', '.md', '.markdown', '.html', '.htm'])) (f.endsWith('.proz') ? proz : texts).push(f); }
  const L = load(proz); let diags = L.diagnostics.slice(); const judged = new Set(L.files.map(rel));
  const syntaxBad = diags.some(d => d.severity === 'error');
  if (level >= 2 && !syntaxBad) diags = diags.concat(P.checkDeclarations(L.decls, contract));
  const declBad = diags.some(d => d.severity === 'error' && d.level <= 2);
  let readings = [];
  if (level >= 3 && !declBad) {
    const jobs = []; const pieces = piecesFor(L.decls);
    const explicit = a._.some(p => !p.endsWith('.proz') && fs.existsSync(p) && (fs.statSync(p).isFile() || texts.length));
    if (a.style) for (const f of texts) jobs.push({ file: f, target: { style: a.style, form: a.form, subject: a.subject, language: a.lang } });
    else {
      for (const pc of pieces) {
        if (pc.missing) { diags.push(P.diag(contract, 'PIECE_FILE_NOT_FOUND', rel(pc.piece.abs), pc.piece.line, pc.piece.name, { path: P.str(pc.piece, 'FILE') })); continue; }
        if (explicit && texts.length && !texts.includes(pc.file)) continue;
        jobs.push({ file: pc.file, target: { piece: pc.piece.name, subject: a.subject } });
      }
    }
    for (const j of jobs) {
      const r = P.judge(L.decls, j.target, readText(j.file), { contract, level, file: rel(j.file), allowMatches });
      diags = diags.concat(r.diagnostics); judged.add(rel(j.file));
      if (level >= 5) readings = readings.concat(readingsOf(L.decls, j, r));
    }
  }
  diags = diags.filter(d => d.level <= level);
  const seenD = new Set(); diags = diags.filter(d => { const k = [d.code, d.span.file, d.span.line, d.subject, d.message].join('|'); if (seenD.has(k)) return false; seenD.add(k); return true; });
  if (a.json) process.stdout.write(JSON.stringify(P.envelope(diags), null, 1) + '\n');
  else if (!a.quiet) {
    process.stdout.write(P.reportText(diags, judged.size, level) + '\n');
    if (readings.length) process.stdout.write('\nReadings (a reading is a record, never a pass):\n' + readings.map(r => '  ' + r.status + '  ' + r.reading + '  ' + r.file + '  ->  ' + r.record).join('\n') + '\n');
  }
  process.exit(diags.some(d => d.severity === 'error') ? 1 : 0);
}
function readingsOf(decls, job, r) {
  const out = []; if (!r.form) return out;
  for (const d of decls) {
    if (d.kind !== 'READING' || P.idv(d, 'ON') !== r.form) continue;
    const rec = path.resolve(path.dirname(d.abs), P.str(d, 'RECORDS'), path.basename(job.file).replace(/\.[^.]+$/, '') + '.' + d.name + '.md');
    out.push({ reading: d.name, file: rel(job.file), record: rel(rec), status: fs.existsSync(rec) ? 'recorded' : 'due     ', asks: P.str(d, 'ASKS') });
  }
  return out;
}
function runReadings(a) {
  const proz = []; for (const p of a._) for (const f of walk(p, ['.proz'])) proz.push(f);
  const L = load(proz); let rows = [];
  for (const pc of piecesFor(L.decls)) { if (pc.missing) continue; rows = rows.concat(readingsOf(L.decls, { file: pc.file }, { form: P.idv(pc.piece, 'FORM') })); }
  if (a.json) process.stdout.write(JSON.stringify(rows, null, 1) + '\n');
  else { for (const r of rows) process.stdout.write(r.status + '  ' + r.reading + '  ' + r.file + '\n    asks: ' + r.asks + '\n    record: ' + r.record + '\n'); process.stdout.write(rows.filter(r => r.status === 'recorded').length + ' recorded, ' + rows.filter(r => r.status !== 'recorded').length + ' due\n'); }
  process.exit(0);
}

function runMeasure(a) {
  if (!a._.length) fail('measure needs a path');
  const files = []; for (const p of a._) walk(p, ['.md', '.markdown', '.html', '.htm'], files);
  if (!files.length) fail('no text files');
  const rows = files.map(f => { const m = P.measure(P.read(readText(f), f).blocks); m.file = rel(f); return m; });
  const t = P.pool(rows); const k = v => Math.round(v * 10000 / Math.max(1, t.words)) / 10; const pct = (v, n) => Math.round(1000 * v / Math.max(1, n)) / 10;
  const long = t.lens.filter(x => x.n > 40 && !x.list).length, short = t.lens.filter(x => x.n < 10).length;
  const prof = { pages: rows.length, words: t.words, sentences: t.sentences, median: t.median, q1: t.q1, q3: t.q3, long_pct: pct(long, t.sentences), under10_pct: pct(short, t.sentences),
    excl_per_k: k(t.excl), q_per_k: k(t.questions), colon_per_k: k(t.colons), dash_per_k: k(t.dashes), one_sentence_para_pct: pct(t.oneSentenceParas, t.paragraphs), ellipses: t.ellipses, colon_leads: t.colonLeads };
  if (a.json) { process.stdout.write(JSON.stringify({ profile: prof, pages: rows.map(r => ({ file: r.file, words: r.words, sentences: r.sentences, median: r.median, excl: r.excl, questions: r.questions, colons: r.colons, dashes: r.dashes, long: r.lens.filter(x => x.n > 40 && !x.list).length })) }, null, 1) + '\n'); process.exit(0); }
  const name = a.as || 'measured_voice'; const room = (v, f) => Math.max(1, Math.ceil(v * f));
  process.stdout.write(`// Measured by prosa measure on ${rows.length} page(s), ${t.words} prose words, ${t.sentences} sentences.
// median ${prof.median} (quartiles ${prof.q1} and ${prof.q3}) | over 40 words ${prof.long_pct} % | under 10 words ${prof.under10_pct} %
// per thousand words: colons ${prof.colon_per_k}, dashes ${prof.dash_per_k}, exclamations ${prof.excl_per_k}, questions ${prof.q_per_k}
// paragraphs of one sentence ${prof.one_sentence_para_pct} %

DEFINE PROFILE ${name} (
  SENTENCE_MEDIAN ${prof.median} WITHIN ${room(prof.median, 0.25)},
  SENTENCES_OVER 40 AT_MOST ${room(prof.long_pct, 1.8)} PER_HUNDRED,
  SENTENCES_UNDER 10 AT_LEAST ${Math.max(1, Math.floor(prof.under10_pct * 0.5))} PER_HUNDRED,
  DASHES AT_MOST ${room(prof.dash_per_k, 2)} PER_THOUSAND,
  COLONS AT_LEAST ${Math.max(1, Math.floor(prof.colon_per_k * 0.5))} PER_THOUSAND,
  EXCLAMATIONS AT_MOST ${room(prof.excl_per_k, 1.7)} PER_THOUSAND,
  MIN_WORDS 300,
  EVIDENCE "Measured on ${a._.length > 2 ? posix(path.dirname(a._[0])) + ' (' + rows.length + ' pages)' : a._.map(posix).join(', ')}: ${t.words} words"
)
`);
  process.exit(0);
}

function runBrief(a) {
  if (!a._.length) fail('brief needs a .proz file');
  const L = load(a._.map(f => path.resolve(f)));
  let target = a.piece ? { piece: a.piece } : a.style ? { style: a.style, form: a.form, language: a.lang, subject: a.subject } : null;
  if (!target) { const p = L.decls.find(d => d.kind === 'PIECE'); const s = L.decls.find(d => d.kind === 'STYLE' && d.abs === path.resolve(a._[0])); target = p ? { piece: p.name } : s ? { style: s.name } : null; }
  if (!target) fail('no PIECE or STYLE to brief');
  process.stdout.write(P.brief(L.decls, target)); process.exit(0);
}

function runDrift(a) {
  if (!a._.length || !a.against) fail('drift needs drafts and --against <corpus>');
  const blocksOf = ps => { let b = []; for (const p of ps) for (const f of walk(p, ['.md', '.markdown', '.html'])) b = b.concat(P.read(readText(f), f).blocks); return b; };
  const r = P.drift(blocksOf(a._), blocksOf([a.against]), { language: a.lang || 'en' });
  if (a.json) { process.stdout.write(JSON.stringify(r, null, 1) + '\n'); process.exit(0); }
  let s = `// prosa drift: ${r.draftWords} draft words against ${r.corpusWords} corpus words.\n// Each candidate is a measure, offered to the author's ruling. A candidate becomes a rule when the author rules on it.\n\n// measure            drafts   corpus\n`;
  for (const m of r.marks) s += '// ' + m.measure.padEnd(18) + String(m.draftsPerK).padStart(7) + String(m.corpusPerK).padStart(9) + (m.measure === 'SENTENCE_MEDIAN' ? '   words' : '   per thousand words') + '\n';
  s += '\n';
  for (const p of r.phrases) s += `// "${p.phrase}": ${p.drafts} in the drafts (${p.draftsPerK} per thousand), ${p.corpus} in the corpus (${p.corpusPerK}); ratio ${p.ratio}\n`;
  if (r.phrases.length) {
    s += `\nDEFINE WORDLIST drift_candidates (\n  REFUSES [${r.phrases.slice(0, 12).map(p => '"' + p.phrase + '"').join(', ')}],\n  CODE DRIFT_CANDIDATE, SEVERITY warning,\n  EVIDENCE "Measured by prosa drift: ${r.draftWords} draft words against ${r.corpusWords} corpus words; awaiting the author's ruling"\n)\n`;
  }
  process.stdout.write(s); process.exit(0);
}

// A fixture is a .proz file whose first line is `// Expected: CODE, CODE` or `// Expected: none`. It may name a text beside it.
function runConformance(a) {
  const dir = path.resolve(a._[0] || path.join(ROOT, 'conformance', 'fixtures')); const files = walk(dir, ['.proz']); let pass = 0, failN = 0; const rows = [];
  const save = process.cwd(); process.chdir(ROOT);
  for (const f of files) {
    const src = readText(f); const m = /^\/\/ Expected:\s*(.*)$/m.exec(src); if (!m) continue;
    const want = m[1].trim() === 'none' ? [] : m[1].split(',').map(s => s.trim()).filter(Boolean).sort();
    const L = load([f]); let d = L.diagnostics.slice();
    if (!d.some(x => x.severity === 'error')) d = d.concat(P.checkDeclarations(L.decls, contract));
    if (!d.some(x => x.severity === 'error')) for (const pc of piecesFor(L.decls)) {
      if (pc.missing) { d.push(P.diag(contract, 'PIECE_FILE_NOT_FOUND', rel(f), pc.piece.line, pc.piece.name, {})); continue; }
      d = d.concat(P.judge(L.decls, { piece: pc.piece.name }, readText(pc.file), { contract, level: 4, file: rel(pc.file), allowMatches }).diagnostics);
    }
    const got = Array.from(new Set(d.map(x => x.code))).sort(); const ok = JSON.stringify(got) === JSON.stringify(want);
    ok ? pass++ : failN++; rows.push({ file: posix(path.relative(ROOT, f)), expect_ids: want, got, ok });
    if (!ok) process.stdout.write('FAIL  ' + rel(f) + '\n      expected: ' + (want.join(', ') || 'none') + '\n      got:      ' + (got.join(', ') || 'none') + '\n');
  }
  if (a.manifest) fs.writeFileSync(path.join(ROOT, 'conformance', 'manifest.json'), JSON.stringify({ contract: contract.contract, fixtures: rows.map(r => ({ file: r.file, expect_ids: r.expect_ids })) }, null, 1) + '\n');
  if (a.json) process.stdout.write(JSON.stringify(rows.map(r => ({ file: r.file, got: r.got })), null, 1) + '\n');
  else process.stdout.write(pass + ' of ' + (pass + failN) + ' fixtures pass\n');
  process.chdir(save); process.exit(failN ? 1 : 0);
}

const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const PACK = ['doc/language/README.md', 'doc/language/GRAMMAR.md', 'doc/language/DECLARATIONS.md', 'doc/language/VIOLATIONS.md', 'doc/language/TEXT.md', 'conformance/violations.json',
  'conformance/manifest.json', 'constitution/reader_rights.proz', 'tools/prosa/prosa.js', 'haro/prosa.stzu'];
function runPack(a) {
  const mf = path.join(ROOT, 'protocol', 'MANIFEST.json');
  if (a.check || a.write) {
    const now = { standard: 'prosa', language: P.VERSION.language, contract: contract.contract, court: P.VERSION.court, files: {} };
    for (const f of PACK) { const p = path.join(ROOT, f); if (fs.existsSync(p)) now.files[f] = sha(p); }
    if (a.write) { fs.mkdirSync(path.dirname(mf), { recursive: true }); fs.writeFileSync(mf, JSON.stringify(now, null, 1) + '\n'); process.stdout.write('wrote protocol/MANIFEST.json: ' + Object.keys(now.files).length + ' files\n'); process.exit(0); }
    if (!fs.existsSync(mf)) fail('no protocol/MANIFEST.json');
    const was = JSON.parse(fs.readFileSync(mf, 'utf8')); let bad = 0;
    for (const k of ['language', 'contract', 'court']) if (was[k] !== now[k]) { bad++; process.stdout.write('version differs: ' + k + ' ' + was[k] + ' in the manifest, ' + now[k] + ' in the tools\n'); }
    for (const f of Object.keys(was.files)) if (was.files[f] !== now.files[f]) { bad++; process.stdout.write('changed since the manifest: ' + f + '\n'); }
    process.stdout.write(bad ? bad + ' difference(s)\n' : 'the pack stands: ' + Object.keys(was.files).length + ' files, language ' + now.language + ', contract ' + now.contract + ', court ' + now.court + '\n');
    process.exit(bad ? 1 : 0);
  }
  if (!a._.length) fail('pack needs a .proz file, or --check');
  const L = load(a._.map(f => path.resolve(f))); let d = L.diagnostics.concat(P.checkDeclarations(L.decls, contract));
  if (d.some(x => x.severity === 'error')) { process.stdout.write(P.reportText(d, L.files.length, 2) + '\n'); process.exit(1); }
  const val = v => (v.t === 'list' ? v.items.map(it => it.map(val)) : v.t === 'kw' ? { kw: v.v } : v.v);
  const law = { standard: 'prosa', language: P.VERSION.language, sources: L.files.map(f => ({ file: rel(f), sha256: sha(f) })),
    declarations: L.decls.map(x => ({ kind: x.kind, name: x.name, file: x.file, line: x.line, fields: Object.fromEntries(x.order.map(k => [k, x.fields[k].values.map(val)])) })) };
  const s = JSON.stringify(law, null, 1) + '\n';
  if (a.o) { fs.writeFileSync(a.o, s); process.stdout.write('wrote ' + a.o + ': ' + law.declarations.length + ' declarations\n'); } else process.stdout.write(s);
  process.exit(0);
}

function main() {
  const [cmd, ...rest] = process.argv.slice(2); const a = args(rest);
  if (cmd === 'check') return runCheck(a);
  if (cmd === 'measure') return runMeasure(a);
  if (cmd === 'brief') return runBrief(a);
  if (cmd === 'drift') return runDrift(a);
  if (cmd === 'readings') return runReadings(a);
  if (cmd === 'conformance') return runConformance(a);
  if (cmd === 'pack') return runPack(a);
  if (cmd === 'version' || cmd === '--version') { process.stdout.write('prosa ' + P.VERSION.court + ' (language ' + P.VERSION.language + ', contract ' + contract.contract + ')\n'); process.exit(0); }
  process.stdout.write(USAGE + '\n'); process.exit(cmd ? 2 : 0);
}
if (require.main === module) main();
module.exports = { load, piecesFor, contract, allowMatches, ROOT };
