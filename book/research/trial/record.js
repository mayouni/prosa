// record.js : keeps the trial's record. Run from D:\GitHub\prosa.
//   node book/research/trial/record.js first <NN-slug.md>   records the chapter's first verdict, exactly as the court returns it
//   node book/research/trial/record.js round <NN-slug.md>   counts one repair round and prints what still stands
// The court is run as: node tools/prosa/cli.js check book/book.proz --json
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');
const out = path.join(__dirname, 'first-verdicts.json');
const [mode, chapter] = process.argv.slice(2);
const r = cp.spawnSync('node', ['tools/prosa/cli.js', 'check', 'book/book.proz', '--json'], { encoding: 'utf8' });
const all = JSON.parse(r.stdout).diagnostics;
const mine = all.filter(d => d.span && d.span.file && d.span.file.split('/').pop() === chapter)
  .map(d => ({ code: d.code, severity: d.severity, subject: d.subject, line: d.span.line, message: d.message }));
const m = cp.spawnSync('node', ['tools/prosa/cli.js', 'measure', 'book/src/en/' + chapter], { encoding: 'utf8' });
const words = Number((m.stdout.match(/(\d+) prose words/) || [])[1]);
const log = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : [];
let e = log.find(x => x.chapter === chapter);
if (mode === 'first') {
  if (e) { console.error('first verdict already recorded for ' + chapter); process.exit(2); }
  e = { chapter, words, findings: mine, rounds: 0, false_positives: [] }; log.push(e);
} else if (mode === 'round') {
  e.rounds += 1; e.words_at_silence = words;
}
fs.writeFileSync(out, JSON.stringify(log, null, 1) + '\n');
console.log(chapter + ': ' + words + ' prose words, ' + mine.length + ' finding(s) standing' + (mode === 'round' ? ', round ' + e.rounds : ' (first verdict)'));
for (const d of mine) console.log('  ' + d.line + '  ' + d.severity + '  ' + d.code + '  ' + d.subject + '  ' + d.message);
