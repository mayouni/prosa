#!/usr/bin/env node
// parity.js : the Zig court against the reference court. Each case runs `node tools/prosa/cli.js` and
// `zig/zig-out/bin/prosa` with the same arguments from the repository's root and compares stdout byte for byte
// and the exit code. Exit 0 when every case is identical, 1 on any difference, 2 when the binary is not built.
//   node tools/prosa/parity.js [--verbose]
'use strict';
const fs = require('fs'); const path = require('path'); const { spawnSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..', '..');
const CLI = path.join(ROOT, 'tools', 'prosa', 'cli.js');
const BIN = path.join(ROOT, 'zig', 'zig-out', 'bin', process.platform === 'win32' ? 'prosa.exe' : 'prosa');
const verbose = process.argv.includes('--verbose');
if (!fs.existsSync(BIN)) { process.stderr.write('parity: ' + BIN + ' is not built: cd zig && zig build\n'); process.exit(2); }

const run = (cmd, args) => { const r = spawnSync(cmd, args, { cwd: ROOT, maxBuffer: 1 << 28 }); return { out: r.stdout || Buffer.alloc(0), code: r.status }; };
const cases = [];
const add = (...args) => cases.push(args);

add('version');
add('conformance');
add('conformance', '--json');
const fx = path.join(ROOT, 'conformance', 'fixtures');
for (const n of fs.readdirSync(fx).sort()) {
  if (!n.endsWith('.proz')) continue;
  add('check', 'conformance/fixtures/' + n, '--json');
  add('check', 'conformance/fixtures/' + n);
}
for (const l of ['1', '2', '3', '4']) add('check', 'conformance/fixtures', '--level', l);
add('check', 'styles/ayouni/ayouni.proz', '--level', '2');
add('check', 'styles/ayouni/ayouni.proz', '--level', '2', '--json');
for (const n of fs.readdirSync(fx).sort()) if (n.endsWith('.md')) add('measure', 'conformance/fixtures/' + n);
add('measure', 'conformance/fixtures');
add('measure', 'conformance/fixtures', '--json');
const BOOK = 'D:/GitHub/ayouni/books/zayn-book/src/en';
if (fs.existsSync(BOOK)) {
  const book = ['check', BOOK, '--proz', 'styles/ayouni/ayouni.proz', '--style', 'ayouni', '--form', 'titled_chapter'];
  add(...book); add(...book, '--json');
  add('check', BOOK, '--proz', 'styles/ayouni/ayouni.proz', '--style', 'ayouni_public', '--level', '3');
  add('measure', BOOK); add('measure', BOOK, '--json', '--as', 'book_voice');
} else process.stdout.write('skipped  ' + BOOK + ' is missing: the book cases are not run\n');

let same = 0, diff = 0;
for (const args of cases) {
  const a = run(process.execPath, [CLI].concat(args)), b = run(BIN, args);
  const ok = a.code === b.code && a.out.equals(b.out);
  ok ? same++ : diff++;
  if (!ok || verbose) process.stdout.write((ok ? 'identical  ' : 'DIFFERENT  ') + 'prosa ' + args.join(' ') + '\n');
  if (!ok) {
    if (a.code !== b.code) process.stdout.write('           exit code: node ' + a.code + ', zig ' + b.code + '\n');
    const x = a.out.toString('utf8').split('\n'), y = b.out.toString('utf8').split('\n');
    let k = 0; while (k < x.length && k < y.length && x[k] === y[k]) k++;
    if (k < x.length || k < y.length) process.stdout.write('           first difference at line ' + (k + 1) + '\n             node: ' + JSON.stringify(x[k]) + '\n             zig:  ' + JSON.stringify(y[k]) + '\n');
  }
}
process.stdout.write(same + ' identical of ' + (same + diff) + ' cases' + (diff ? ', ' + diff + ' different' : '') + '\n');
process.exit(diff ? 1 : 0);
