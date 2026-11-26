// lint-parity.js : compares the Prosa court, running styles/ayouni/ayouni.proz, with the house lint style_lint.py, page by page.
//   node tools/parity/lint-parity.js <folder> [--lang fr] [--lint path/to/style_lint.py] [--verbose]
// It prints, for each count, the number of pages on which the two agree, and exits 1 when a measure differs.
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), cp = require('child_process');
const P = require('../prosa/prosa.js'); const { load, contract } = require('../prosa/cli.js');
const argv = process.argv.slice(2); const opt = k => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : null);
const dir = argv[0]; const lang = opt('--lang') || 'en'; const verbose = argv.includes('--verbose');
const lint = opt('--lint') || 'D:/GitHub/ayouni/writing-framework/tools/style_lint.py';
if (!dir) { console.error('usage: lint-parity.js <folder> [--lang fr]'); process.exit(2); }
const tmp = path.join(os.tmpdir(), 'prosa-parity-' + process.pid + '.json');
cp.spawnSync('python', [lint, dir, '--json', tmp, '--lang', lang], { encoding: 'utf8' });
const theirs = JSON.parse(fs.readFileSync(tmp, 'utf8')); fs.unlinkSync(tmp);
const L = load([path.resolve(__dirname, '../../styles/ayouni/ayouni.proz')]); const ix = P.index(L.decls);
const hits = (name, blocks) => (ix[name] && (!ix[name].fields.LANGUAGE || P.idv(ix[name], 'LANGUAGE') === lang) ? P.judgeRule(ix[name], blocks, lang, contract, {}, true).length : 0);
const r1 = x => Math.round(x * 10) / 10;
const MEASURES = ['words', 'sentences', 'median', 'long', 'excl', 'questions', 'colon_per_k', 'dash_per_k', 'ellipses', 'colon_leads', 'one_sentence_paras', 'paragraphs'];
const RULES = ['calques', 'intensifiers', 'hedges', 'superlatives', 'forbidden', 'emoji'];
const agree = {}, total = {}, diffs = [];
for (const t of theirs) {
  const text = fs.readFileSync(t.file, 'utf8').replace(/^\uFEFF/, ''); const blocks = P.readMarkdown(text).blocks; const m = P.measure(blocks); const k = 1000 / Math.max(1, m.words);
  const ours = { words: Math.max(1, m.words), sentences: m.sentences, median: m.median, long: m.lens.filter(x => x.n > 40 && !x.list).length, excl: m.excl, questions: m.questions,
    colon_per_k: r1(m.colons * k), dash_per_k: r1(m.dashes * k), ellipses: m.ellipses, colon_leads: m.colonLeads, one_sentence_paras: m.oneSentenceParas, paragraphs: m.paragraphs,
    calques: lang === 'en' ? hits('calques', blocks) : 0, intensifiers: hits(lang === 'fr' ? 'intensifs' : 'intensifiers', blocks), hedges: hits(lang === 'fr' ? 'attenuations' : 'hedges', blocks),
    superlatives: hits(lang === 'fr' ? 'superlatifs' : 'superlatives', blocks),
    forbidden: lang === 'fr' ? hits('artisan', blocks) + hits('programmeur', blocks) + hits('mots_interdits', blocks) : hits('crafter', blocks) + hits('programmer', blocks) + hits('forbidden_words', blocks),
    emoji: hits('no_emoji', blocks.map(b => Object.assign({}, b, { headings: [] }))) };
  for (const key of MEASURES.concat(RULES)) {
    total[key] = (total[key] || 0) + 1;
    if (ours[key] === t[key]) agree[key] = (agree[key] || 0) + 1; else diffs.push({ file: path.basename(t.file), key, lint: t[key], prosa: ours[key] });
  }
}
console.log('parity with style_lint.py on ' + theirs.length + ' page(s) of ' + dir + ' (' + lang + ')');
let measuresOk = true;
for (const key of MEASURES.concat(RULES)) { const a = agree[key] || 0; if (MEASURES.includes(key) && a !== total[key]) measuresOk = false; console.log('  ' + key.padEnd(20) + String(a).padStart(4) + ' of ' + total[key] + (a === total[key] ? '' : '   <- differs')); }
if (verbose || diffs.length <= 40) for (const d of diffs) console.log('    ' + d.file + ': ' + d.key + ' lint ' + d.lint + ', prosa ' + d.prosa);
process.exit(measuresOk ? 0 : 1);
