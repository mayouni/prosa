#!/usr/bin/env node
// hook.js : the Claude Code hook of Prosa. It runs the court on every write to a governed file.
// Register it as a PostToolUse hook on Write and Edit (see doc/AGENTS.md). It reads the hook's JSON on stdin, finds the
// .proz files that govern the written file, and judges it. On an error it exits 2 and prints the findings on stderr,
// which Claude Code hands back to the AI agent as feedback. A file no PIECE names is left alone: the hook exits 0.
'use strict';
const fs = require('fs'), path = require('path');
const P = require('./prosa.js'); const { load, piecesFor, contract, allowMatches } = require('./cli.js');

function governing(file) { // the .proz files in the folders above the written file, nearest first
  const out = []; let dir = path.dirname(file);
  for (let up = 0; up < 8; up++) {
    let names = []; try { names = fs.readdirSync(dir); } catch (e) { break; }
    for (const n of names.sort()) if (n.endsWith('.proz')) out.push(path.join(dir, n));
    if (names.includes('.git') || path.dirname(dir) === dir) break;
    dir = path.dirname(dir);
  }
  return out;
}
function judgeFile(file) {
  file = path.resolve(file); let diags = []; let governed = false;
  if (file.endsWith('.proz')) {
    const L = load([file]); diags = L.diagnostics.slice();
    if (!diags.some(d => d.severity === 'error')) diags = diags.concat(P.checkDeclarations(L.decls, contract));
    return { governed: true, diags };
  }
  if (!/\.(md|markdown|html?)$/i.test(file)) return { governed: false, diags };
  for (const pz of governing(file)) {
    let L; try { L = load([pz]); } catch (e) { continue; }
    if (L.diagnostics.some(d => d.severity === 'error') || P.checkDeclarations(L.decls, contract).some(d => d.severity === 'error')) continue;
    const mine = piecesFor(L.decls).filter(pc => !pc.missing && path.resolve(pc.file) === file);
    for (const pc of mine) {
      governed = true;
      const r = P.judge(L.decls, { piece: pc.piece.name }, fs.readFileSync(file, 'utf8').replace(/^﻿/, ''), { contract, level: 4, file: path.relative(process.cwd(), file).split(path.sep).join('/'), allowMatches });
      if (mine.length > 1) for (const d of r.diagnostics) d.by = { piece: pc.piece.name, style: r.style || '' }; // two pieces: each finding names its own
      diags = diags.concat(r.diagnostics);
    }
    if (governed) break;
  }
  return { governed, diags };
}
function main() {
  let input = ''; try { input = fs.readFileSync(0, 'utf8'); } catch (e) { /* no stdin */ }
  let file = process.argv[2];
  if (!file) { try { const j = JSON.parse(input); file = j.tool_input && (j.tool_input.file_path || j.tool_input.path); } catch (e) { /* not a hook call */ } }
  if (!file || !fs.existsSync(file)) process.exit(0);
  const r = judgeFile(file);
  if (!r.governed || !r.diags.length) process.exit(0);
  const errors = r.diags.filter(d => d.severity === 'error').length;
  const text = 'The Prosa court judged ' + path.basename(file) + ':\n\n' + P.reportText(r.diags, 1, 4) + '\n\nRepair each finding by its code. A finding names the rule, the written form and the ruling it comes from.\n';
  if (errors) { process.stderr.write(text); process.exit(2); }
  process.stdout.write(text); process.exit(0);
}
if (require.main === module) main();
module.exports = { judgeFile, governing };
