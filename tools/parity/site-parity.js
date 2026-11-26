// site-parity.js : judges the Zayn site with the Prosa court under styles/softanza_site/site.proz, each page with the subject
// term that zayn/tools/site-shell.js declares for it, and prints the findings by code beside what the site shell reports.
//   node tools/parity/site-parity.js [path/to/zayn]
// The site shell passes its own term check on every page, so each TITLE_WITHOUT_SUBJECT or LEDE_WITHOUT_SUBJECT here is a
// difference between the two readings of a page, and is listed by name.
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');
const P = require('../prosa/prosa.js'); const { load, contract } = require('../prosa/cli.js');
const zayn = path.resolve(process.argv.slice(2).find(a => !a.startsWith('--')) || 'D:/GitHub/zayn');
const shell = fs.readFileSync(path.join(zayn, 'tools', 'site-shell.js'), 'utf8');
const pages = []; const re = /\{\s*file:\s*'([^']+)'[^}\n]*?term:\s*'([^']+)'/g; let m;
while ((m = re.exec(shell))) pages.push({ file: m[1], term: m[2], home: /home:\s*true/.test(m[0]) });
const L = load([path.resolve(__dirname, '../../styles/softanza_site/site.proz')]);
const by = {}; const rows = []; let judged = 0;
for (const p of pages) {
  const f = path.join(zayn, p.file); if (!fs.existsSync(f)) continue; judged++;
  const r = P.judge(L.decls, { style: 'softanza_site', form: 'page', subject: p.term, language: 'en' }, fs.readFileSync(f, 'utf8'), { contract, level: 3, file: p.file });
  for (const d of r.diagnostics) { (by[d.code] = by[d.code] || []).push(p.file + ':' + d.span.line); rows.push(d); }
}
console.log('the Prosa court on ' + judged + ' page(s) of the Zayn site, each with its declared term:');
for (const k of Object.keys(by).sort()) console.log('  ' + k.padEnd(26) + String(by[k].length).padStart(4) + '   on ' + new Set(by[k].map(x => x.split(':')[0])).size + ' page(s)');
if (!Object.keys(by).length) console.log('  no finding');
if (process.argv.includes('--verbose')) for (const d of rows) console.log('    ' + d.span.file + ':' + d.span.line + ' ' + d.code + ' ' + d.message);
const out = cp.spawnSync('node', ['tools/site-shell.js'], { cwd: zayn, encoding: 'utf8' });
const notes = ((out.stdout || '') + (out.stderr || '')).split('\n').filter(l => /TITLE6|SAY_ONCE|^shell ok|problem/i.test(l)).map(l => l.slice(0, 220));
console.log('\nthe site shell on the same site:'); notes.forEach(n => console.log('  ' + n));
