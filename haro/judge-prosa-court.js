// node haro/judge-prosa-court.js   (needs the Haro VM and the Haro spike: HARO, HARO_SPIKE)
// Runs every Prosa fixture through the court forged from haro/prosa.stzu and compares it with the reference court at
// level 2, the last level that judges a declaration by itself. The ground truth is prosa.js on the original .proz
// source (parse, then checkDeclarations when no error stands), and it must equal the manifest's expected codes of
// level 1 and 2. A fixture of level 3 or 4 is a lawful declaration at level 2, and the court must judge it clean.
//
// A .proz file is translated MECHANICALLY into the Commons shape, one way, for the court alone:
//   DEFINE KIND name (            ->  DEFINE KIND name AS (
//   )                             ->  ) RATIONALE "none given"
//   // comment                    ->  dropped
//   CODE LACK_LISTED              ->  CODE lack_listed            a code is a lower_snake name in the Commons
//   ON page                       ->  ON [page]                   one name stands for a list of one
//   KEEPS [maker, "a b"]          ->  KEEPS ["maker", "a b"]      a phrase is a text
//   REFUSES ["a" WITHIN 3 "b"]    ->  REFUSES ["a WITHIN 3 b"]    an entry is one text (seam S2)
//   DASHES AT_MOST 4 PER_THOUSAND ->  DASHES "AT_MOST 4 PER_THOUSAND"   a bound is one text (seam S2)
// The shape of each field comes from the table of gen-prosa-stzu.js. A field the table does not hold, and every
// character the translator does not know, passes through untouched, so the court refuses it in its own words.
//
// A RATCHET: haro/twin-expected.csv lists every fixture on which the court and prosa.js differ (fixture, what prosa.js
// says, what the court says, the seam, a class). The run exits 1 on a difference that is not in the file, on a listed
// row whose values changed, and on a listed difference that now agrees. Exit 2: the court was not forged.
//   --write-gbnf   rewrites haro/prosa.gbnf from the forge's output
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const R = p => path.join(ROOT, p);
const P = require(R('tools/prosa/prosa.js'));
const { TABLE } = require('./gen-prosa-stzu.js');
const contract = JSON.parse(fs.readFileSync(R('conformance/violations.json'), 'utf8'));
const man = require(R('conformance/manifest.json'));
const HARO = process.env.HARO || 'D:/GitHub/haro/vm/zig-out/bin/haro.exe';
const SPIKE = process.env.HARO_SPIKE || 'D:/GitHub/haro/spike';
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'prosa-judge-'));
const OUT = path.join(TMP, 'court');
const fwd = p => p.split(path.sep).join('/');

// ---- the translator ------------------------------------------------------------------------
function lex(src) { // -> [{ t: str | word | p | other, raw, v }]
  const toks = [];
  for (const line of src.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    let i = 0;
    while (i < line.length) {
      const c = line[i];
      if (c === ' ' || c === '\t') { i++; continue; }
      if (c === '/' && line[i + 1] === '/') break;
      if (c === '"') {
        let j = i + 1, s = '', ok = false;
        while (j < line.length) {
          if (line[j] === '\\' && (line[j + 1] === '"' || line[j + 1] === '\\')) { s += line[j + 1] === '"' ? "'" : '\\'; j += 2; continue; }
          if (line[j] === '"') { ok = true; break; }
          s += line[j++];
        }
        if (!ok) { toks.push({ t: 'other', raw: line.slice(i) }); break; } // an open string reaches the court open
        toks.push({ t: 'str', raw: '"' + s + '"', v: s }); i = j + 1; continue;
      }
      if ('()[],'.includes(c)) { toks.push({ t: 'p', raw: c }); i++; continue; }
      const m = /^[A-Za-z0-9_.]+/.exec(line.slice(i));
      if (m) { toks.push({ t: 'word', raw: m[0], v: m[0] }); i += m[0].length; continue; }
      toks.push({ t: 'other', raw: c }); i++;
    }
    toks.push({ t: 'nl', raw: '\n' });
  }
  return toks;
}
const raw = ts => ts.filter(t => t.t !== 'nl').map(t => t.raw).join(' ');
const bare = ts => ts.filter(t => t.t !== 'nl').map(t => (t.t === 'str' ? t.v : t.raw)).join(' ').replace(/\[ /g, '[').replace(/ \]/g, ']').replace(/ ,/g, ',');
const isList = ts => ts.length >= 2 && ts[0].raw === '[' && ts[ts.length - 1].raw === ']';
function split(ts) { // at the commas of depth 0
  const parts = []; let cur = [], depth = 0;
  for (const t of ts) {
    if (t.raw === '[' && t.t === 'p') depth++;
    if (t.raw === ']' && t.t === 'p') depth--;
    if (t.raw === ',' && t.t === 'p' && depth === 0) { parts.push(cur); cur = []; continue; }
    cur.push(t);
  }
  parts.push(cur);
  return parts.filter(p => p.some(t => t.t !== 'nl'));
}
function field(kind, ts) {
  ts = ts.filter(t => t.t !== 'nl');
  const key = ts[0], val = ts.slice(1);
  const row = key && key.t === 'word' && TABLE[kind] && TABLE[kind].find(r => r[0] === key.raw);
  if (!row || !val.length) return raw(ts);
  const shape = row[1];
  const inner = () => split(val.slice(1, -1));
  let v;
  if (shape === 'code') v = raw(val).toLowerCase();
  else if (shape === 'codes') v = (isList(val) ? raw(val) : '[' + raw(val) + ']').toLowerCase();
  else if (shape === 'ids') v = isList(val) ? raw(val) : '[' + raw(val) + ']';
  else if (shape === 'words') v = '[' + (isList(val) ? inner() : [val]).map(it => '"' + bare(it) + '"').join(', ') + ']';
  else if (shape === 'entries') v = isList(val) ? '[' + inner().map(it => '"' + bare(it) + '"').join(', ') + ']' : raw(val);
  else if (['bound', 'budget', 'first', 'any'].includes(shape)) v = '"' + bare(val) + '"';
  else v = raw(val);
  return key.raw + ' ' + v;
}
function translate(src) {
  const toks = lex(src); const out = []; let i = 0;
  const skip = k => { while (toks[k] && toks[k].t === 'nl') k++; return k; };
  while (i < toks.length) {
    const a = i, b = skip(a + 1), c = skip(b + 1), d = skip(c + 1);
    if (toks[a].raw === 'DEFINE' && toks[b] && toks[b].t === 'word' && toks[c] && toks[c].t === 'word' && toks[d] && toks[d].raw === '(') {
      let j = d + 1, depth = 0, end = -1;
      for (; j < toks.length; j++) {
        if (toks[j].t !== 'p') { if (toks[j].raw === 'DEFINE') break; continue; }
        if (toks[j].raw === '[') depth++;
        else if (toks[j].raw === ']') depth--;
        else if (toks[j].raw === ')' && depth <= 0) { end = j; break; }
      }
      if (end !== -1) {
        const kind = toks[b].raw.toLowerCase();
        const fields = split(toks.slice(d + 1, end)).map(f => '  ' + field(kind, f));
        out.push(`DEFINE ${toks[b].raw} ${toks[c].raw} AS (\n${fields.join(',\n')}\n) RATIONALE "none given"`);
        i = end + 1; continue;
      }
    }
    if (toks[a].t !== 'nl') out.push(toks[a].raw);
    i++;
  }
  return out.join('\n') + '\n';
}

// ---- the forge -----------------------------------------------------------------------------
fs.mkdirSync(OUT, { recursive: true });
{
  const fg = spawnSync(HARO, ['forge.haro', fwd(path.join(__dirname, 'prosa.stzu')), fwd(OUT)], { cwd: SPIKE, encoding: 'utf8' });
  if (!/forged prosa/.test(fg.stdout || '')) { console.error('forge failed:', fg.stdout, fg.stderr, fg.error || ''); process.exit(2); }
  console.log((fg.stdout || '').trim());
  for (const f of fs.readdirSync(SPIKE)) if (/_lib\.haro$|world_stub\.haro$/.test(f)) fs.copyFileSync(path.join(SPIKE, f), path.join(OUT, f));
}
function court(file) {
  const r = spawnSync(HARO, ['prosa_court.haro', 'diagnose', file], { cwd: OUT, encoding: 'utf8' });
  const text = ((r.stdout || '') + (r.stderr || '')).trim();
  try { return { diags: JSON.parse(text.split('\n').pop()).diagnostics || [] }; } catch (e) { return { diags: [{ code: 'UNREADABLE', message: text.slice(0, 120) }] }; }
}

// ---- the run -------------------------------------------------------------------------------
const levelOf = id => (contract.violations[id] ? contract.violations[id].level : 3); // a code a style declares belongs to the text
const says = ids => (ids.length ? ids.join('+') : '(clean)');
const uniq = a => [...new Set(a)].sort();
const rows = []; const problems = [];
for (const f of man.fixtures) {
  const name = path.basename(f.file);
  const src = fs.readFileSync(R(f.file), 'utf8');
  const p = P.parse(src, name, contract);
  let d = p.diagnostics;
  if (!d.some(x => x.severity === 'error')) d = d.concat(P.checkDeclarations(p.decls, contract));
  const truth = uniq(d.map(x => x.code));
  const want = uniq(f.expect_ids.filter(id => levelOf(id) <= 2));
  if (says(truth) !== says(want)) problems.push(`prosa.js says ${says(truth)} on ${name} at level 2 and the manifest says ${says(want)}: the ground truth and the manifest disagree`);
  const z = path.join(OUT, name.replace(/\.proz$/, '.z'));
  fs.writeFileSync(z, translate(src));
  const c = court(path.basename(z));
  rows.push({ name, truth, got: uniq(c.diags.map(x => x.code)), msg: c.diags[0] ? c.diags[0].message : '', cites: c.diags.map(x => (x.cites || []).join(' ')), refusing: truth.length > 0 });
}
const agree = rows.filter(r => says(r.truth) === says(r.got));
const differ = rows.filter(r => says(r.truth) !== says(r.got));
const refusing = rows.filter(r => r.refusing);
console.log(`fixtures ${rows.length}, each judged at level 2: agree ${agree.length} (refused under the same codes ${agree.filter(r => r.refusing).length} of ${refusing.length}, lawful judged clean ${agree.filter(r => !r.refusing).length} of ${rows.length - refusing.length}), differ ${differ.length}`);
console.log('\n-- differ (prosa.js -> the court) --');
for (const r of differ) console.log(`${r.name.padEnd(36)} ${says(r.truth)} -> ${says(r.got)}  ${r.msg.slice(0, 100)}`);
{
  const cited = rows.filter(r => r.got.length && says(r.truth) === says(r.got));
  const ok = cited.filter(r => r.got.every(c => r.cites.includes('rule:' + c)));
  console.log(`\n-- cites: ${ok.length} of ${cited.length} agreeing refusals cite rule:<their code>`);
}

// ---- the ratchet ---------------------------------------------------------------------------
const CSV = path.join(__dirname, 'twin-expected.csv');
const listed = new Map(); let baseline = '';
for (const line of (fs.existsSync(CSV) ? fs.readFileSync(CSV, 'utf8') : '').split(/\r?\n/)) {
  if (line.startsWith('# baseline')) { baseline = line; console.log('\n-- ' + line.slice(2)); }
  if (!line.trim() || line.startsWith('#') || line.startsWith('fixture,')) continue;
  const [fixture, prosajs, courtSays, seam, cls] = line.split(',');
  listed.set(fixture, { prosajs, court: courtSays, seam, cls });
}
const current = new Map(differ.map(r => [r.name, { prosajs: says(r.truth), court: says(r.got) }]));
for (const [file, c] of current) {
  const l = listed.get(file);
  if (!l) problems.push(`NEW difference, not in twin-expected.csv: ${file}  prosa.js ${c.prosajs}, court ${c.court}`);
  else if (l.prosajs !== c.prosajs || l.court !== c.court) problems.push(`CHANGED difference: ${file}  listed prosa.js ${l.prosajs}, court ${l.court}; now prosa.js ${c.prosajs}, court ${c.court}`);
}
for (const [file, l] of listed) if (!current.has(file)) problems.push(`listed difference now AGREES, delete its row: ${file} (${l.seam})`);

// ---- the grammar the forge writes ------------------------------------------------------------
{
  const commit = (/haro commit ([0-9a-f]{7,40})/.exec(baseline) || [])[1] || 'unknown';
  const made = fs.readFileSync(path.join(OUT, 'prosa.gbnf'), 'utf8').replace(/\r\n/g, '\n');
  const want = `# haro/prosa.gbnf -- written by haro/judge-prosa-court.js from the forge at haro commit ${commit}. The judge fails when this file differs from what the forge writes now.\n` + made;
  const GBNF = path.join(__dirname, 'prosa.gbnf');
  if (process.argv.includes('--write-gbnf')) { fs.writeFileSync(GBNF, want); console.log(`\n-- wrote haro/prosa.gbnf (${want.length} bytes, forge ${commit})`); }
  else {
    const have = fs.existsSync(GBNF) ? fs.readFileSync(GBNF, 'utf8').replace(/\r\n/g, '\n') : null;
    if (have === null) problems.push('haro/prosa.gbnf is missing: run the judge with --write-gbnf');
    else if (have !== want) problems.push('haro/prosa.gbnf differs from the grammar the forge writes now: run the judge with --write-gbnf and read the difference');
    else console.log(`\n-- haro/prosa.gbnf matches the forge's output (${want.length} bytes, forge ${commit})`);
  }
}
const byClass = {};
for (const l of listed.values()) byClass[l.cls] = (byClass[l.cls] || 0) + 1;
console.log(`\n-- ratchet: ${listed.size} listed (${Object.entries(byClass).map(([k, v]) => k + ' ' + v).join(', ')}), ${current.size} differing now, ${problems.length} problem(s)`);
for (const m of problems) console.log('  RATCHET: ' + m);
fs.rmSync(TMP, { recursive: true, force: true });
process.exitCode = problems.length ? 1 : 0;
