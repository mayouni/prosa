// gen-violations.js : writes doc/language/VIOLATIONS.md from conformance/violations.json.
'use strict';
const fs = require('fs'), path = require('path'); const root = path.resolve(__dirname, '..', '..');
const v = JSON.parse(fs.readFileSync(path.join(root, 'conformance', 'violations.json'), 'utf8'));
const L = ['# The diagnostics of the court', '', 'The diagnostics of Prosa are the findings the court raises by itself, without a rule of a style; this page lists the ' + Object.keys(v.violations).length + ' codes of contract ' + v.contract + '. It is written from `conformance/violations.json` by `node tools/prosa/gen-violations.js`, so the page and the court cannot disagree.', ''];
const names = { 1: 'Level 1: syntax', 2: 'Level 2: the declaration', 3: 'Level 3: the text', 4: 'Level 4: the measure' };
for (const lv of [1, 2, 3, 4]) {
  L.push('## ' + names[lv], '', '| Code | Severity | What the court says | The invariant |', '|---|---|---|---|');
  for (const [k, x] of Object.entries(v.violations)) if (x.level === lv) L.push('| `' + k + '` | ' + x.severity + ' | ' + x.summary.replace(/\|/g, '/') + ' | ' + x.invariant + ' |');
  L.push('');
}
L.push('## The codes of a style', '', 'A `TERM`, `WORDLIST`, `PATTERN` or `PROFILE` raises the code its declaration names. `TERM_SYNONYM` and `OFF_PROFILE` are the defaults of `TERM` and `PROFILE`. A reading of level 5 carries no code.', '');
fs.writeFileSync(path.join(root, 'doc', 'language', 'VIOLATIONS.md'), L.join('\n'));
console.log('wrote doc/language/VIOLATIONS.md');
