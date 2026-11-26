// build.js : builds the Prosa site. Node, no dependency.   node site/build.js
// It writes each page of PAGES from the shell below and its fragment in src/<name>.part, copies the reference court
// (tools/prosa/prosa.js) and the contract (conformance/violations.json) into site/, and writes samples.js: the contract,
// the constitution and the three examples of the live court, embedded as data because a page opened from the disk cannot fetch.
// A fragment may hold four placeholders, each replaced by the real thing at build time:
//   <!--run: check conformance/fixtures/x.proz-->        the terminal of a real run of the court
//   <!--proz: styles/ayouni/ayouni.proz programmer-->     one declaration, cut from a real file
//   <!--file: conformance/fixtures/x.md-->                a whole file
//   <!--diagnostics-->                                    the tables of codes, from the contract
// and the facts {{court}}, {{language}}, {{contract}}, {{fixtures}}, {{codes}}, read from the court itself.
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');
const SITE = __dirname, ROOT = path.resolve(SITE, '..'), SRC = path.join(SITE, 'src');
const read = f => fs.readFileSync(path.resolve(ROOT, f), 'utf8').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const die = m => { console.error('build: ' + m); process.exit(1); };

// ---------------------------------------------------------------- the menu, declared once

const SECTIONS = [
  { id: 'approach', label: 'Approach', pages: ['approach', 'prior', 'softanza'] },
  { id: 'language', label: 'Language', pages: ['kinds', 'levels', 'diagnostics', 'text'] },
  { id: 'try', label: 'Live court', pages: ['try'] },
  { id: 'use', label: 'Use', pages: ['commands', 'loops'] },
  { id: 'book', label: 'Book', pages: ['book'] },
];
// five entries a bar at most (the Zayn design system, component "bar"); the family page stands under Approach
const REPO = 'https://github.com/mayouni/prosa';
// subject: the stem of the menu's word, which the court asks for in the h1 and in the first sentence.
const PAGES = {
  index: { subject: 'prosa', kicker: 'A Softanza language for written text', h1: 'Prosa: a correction is made once.',
    title: 'Prosa: a declarative language that governs written text',
    description: 'Prosa is a declarative language that governs written text by compilation: a writing style is declared in .proz files, and a court refuses, by name, every sentence the declaration forbids.' },
  approach: { label: 'Commitments', subject: 'commitment', h1: 'The five commitments of Prosa',
    title: 'Commitments: the five principles of Prosa',
    description: 'The five commitments of Prosa decide what the language declares and what its court refuses: a correction is made once, a voice is a measure, a style is held to itself, a rule enters on evidence, and undecidable is silence.' },
  prior: { label: 'Prior work', subject: 'prior work', h1: 'Prior work compared with Prosa',
    title: 'Prior work: what exists and what Prosa adds',
    description: 'The prior work of Prosa is the set of tools, controlled languages and studies that govern or measure written text. The page states what each one gives and what Prosa adds, with its source.' },
  kinds: { label: 'The kinds', subject: 'kind', h1: 'The ten kinds of declaration',
    title: 'The kinds: the ten declarations of a .proz file',
    description: 'A kind of Prosa is one of the ten forms a declaration takes in a .proz file. The page shows each kind with a declaration cut from a real file of the repository.' },
  levels: { label: 'Levels', subject: 'level', h1: 'The five levels of judgment',
    title: 'Levels: the five stages of the court',
    description: 'A level of Prosa is one of the five stages at which the court judges: syntax, declaration, text, measure and reading. The page shows a real refusal at each level.' },
  diagnostics: { label: 'Diagnostics', subject: 'diagnostic', h1: 'The diagnostics of the court',
    title: 'Diagnostics: every code the court raises',
    description: 'A diagnostic of Prosa is a finding the court raises: it names the file and the line, the code, the rule and the ruling the rule comes from. The page lists every code of the contract.' },
  text: { label: 'Text model', subject: 'text model', h1: 'The text model of Prosa',
    title: 'Text model: how the court reads a text',
    description: 'The text model of Prosa is the set of definitions that turn a Markdown or HTML file into blocks, zones, sentences, words and measures, so that two implementations give the same findings.' },
  try: { subject: 'court', h1: 'The live court of Prosa',
    title: 'Live court: the reference court in the browser',
    description: 'The live court of Prosa is the reference court running in the page: it judges a .proz declaration and a Markdown text and prints its verdict on every change.',
    scripts: ['prosa.js', 'samples.js', 'try.js'] },
  commands: { label: 'Commands', subject: 'command', h1: 'The commands of Prosa',
    title: 'Commands: the eight verbs of the prosa program',
    description: 'A command of Prosa is one verb of the prosa program: check, measure, brief, drift, readings, conformance, pack and version. The page gives the syntax of each and the output of a real run.' },
  loops: { label: 'Loops', subject: 'loop', h1: 'The two loops of Prosa',
    title: 'Loops: the author, the AI agent and the court',
    description: 'A loop of Prosa is the cycle in which a remark or a draft meets the court: the author turns a remark into a rule, and the AI agent turns a finding into a repair.' },
  book: { subject: 'book', h1: 'The book: Prose Under Law',
    title: 'Book: Prose Under Law',
    description: 'The book of Prosa has the working title Prose Under Law. It teaches the language to a writer who works with AI models, and its own chapters are governed by a .proz declaration.' },
  softanza: { label: 'The family', subject: 'softanza', h1: 'Prosa in the Softanza family',
    title: 'Softanza: the family of Prosa, Zayn and Haro',
    description: 'Softanza is the family of languages Prosa belongs to. Prosa governs written text, Zayn governs interfaces, and Haro is the language of languages.' },
};

// ---------------------------------------------------------------- the facts, read from the court

const cli = args => { const r = cp.spawnSync(process.execPath, [path.join(ROOT, 'tools/prosa/cli.js')].concat(args), { cwd: ROOT, encoding: 'utf8' }); return (r.stdout || '') + (r.stderr || ''); };
const contract = JSON.parse(read('conformance/violations.json'));
const ver = /prosa (\S+) \(language (\S+), contract (\S+)\)/.exec(cli(['version'])) || die('prosa version gave no version');
const fix = /(\d+) of (\d+) fixtures pass/.exec(cli(['conformance'])) || die('prosa conformance gave no count');
if (fix[1] !== fix[2]) die('the conformance suite does not pass: ' + fix[0]);
const FACTS = { court: ver[1], language: ver[2], contract: ver[3], fixtures: fix[2], codes: String(Object.keys(contract.violations).length) };

// ---------------------------------------------------------------- the placeholders

function hiProz(src) { // comments, strings and keywords of a .proz text
  return src.split('\n').map(line => {
    let out = '', re = /(\/\/.*$)|("(?:\\.|[^"\\])*")|\b([A-Z][A-Z0-9_]*)\b/g, last = 0, m;
    while ((m = re.exec(line))) {
      out += esc(line.slice(last, m.index)) + '<span class="' + (m[1] ? 'c' : m[2] ? 's' : 'k') + '">' + esc(m[0]) + '</span>'; last = m.index + m[0].length;
    }
    return out + esc(line.slice(last));
  }).join('\n');
}
function hiTerm(out) { // the finding's head line, its indented lines, the count
  return out.replace(/\s+$/, '').split('\n').map(l => {
    const m = /^(\S+:\d+  )(error|warning)(  )([A-Z][A-Z0-9_]*)(.*)$/.exec(l);
    if (m) { const c = m[2] === 'error' ? 'bad' : 'warn'; return esc(m[1]) + '<span class="' + c + '">' + m[2] + '</span>' + m[3] + '<span class="' + c + '">' + m[4] + '</span>' + esc(m[5]); }
    if (/^    /.test(l)) return '<span class="dim">' + esc(l) + '</span>';
    if (/^0 error\(s\), 0 warning\(s\)/.test(l) || /^\d+ of \d+ fixtures pass$/.test(l)) return '<span class="good">' + esc(l) + '</span>';
    return esc(l);
  }).join('\n');
}
function cut(file, name) { // one declaration of a .proz file, by name
  const lines = read(file).split('\n'); const a = lines.findIndex(l => new RegExp('^DEFINE [A-Z]+ ' + name + ' \\(').test(l));
  if (a === -1) die(file + ' declares no ' + name);
  let b = a; if (!/\)\s*$/.test(lines[a]) || /\(\s*$/.test(lines[a])) { b = lines.findIndex((l, k) => k > a && /^\)/.test(l)); if (b === -1) die(file + ': ' + name + ' is not closed'); }
  return lines.slice(a, b + 1).join('\n');
}
function fill(html, page) {
  html = html.replace(/<!--run: (.+?)-->/g, (m, a) => {
    const bare = a.trim() === '-'; const args = bare ? [] : a.trim().split(/\s+/); const out = cli(args); // "-" is the program with no argument
    if (!out.trim()) die(page + ': prosa ' + a + ' printed nothing');
    return '<pre class="term"><span class="dim">$ prosa' + (bare ? '' : ' ' + esc(a.trim())) + '</span>\n' + (/--json|^pack|^measure|^drift|^brief/.test(a.trim()) ? esc(out.replace(/\s+$/, '')) : hiTerm(out)) + '</pre>';
  });
  html = html.replace(/<!--proz: (\S+) (\S+)-->/g, (m, f, n) => '<pre class="shot">' + hiProz(cut(f, n)) + '</pre>');
  html = html.replace(/<!--file: (\S+)-->/g, (m, f) => '<pre class="shot">' + (f.endsWith('.proz') ? hiProz(read(f).replace(/\s+$/, '')) : esc(read(f).replace(/\s+$/, ''))) + '</pre>');
  html = html.replace(/<!--diagnostics-->/g, diagnosticsTables);
  html = html.replace(/\{\{(\w+)\}\}/g, (m, k) => (FACTS[k] !== undefined ? FACTS[k] : die(page + ': no fact ' + k)));
  return html;
}
function diagnosticsTables() {
  const names = { 1: 'Level 1: the syntax of a .proz file', 2: 'Level 2: the declaration', 3: 'Level 3: the text', 4: 'Level 4: the measure' };
  let out = '';
  for (const lv of [1, 2, 3, 4]) {
    const rows = Object.keys(contract.violations).filter(c => contract.violations[c].level === lv);
    out += '<h3>' + names[lv] + '</h3>\n<div class="table"><table>\n<thead><tr><th scope="col">Code</th><th scope="col">Severity</th><th scope="col">What the court says</th><th scope="col">The invariant</th></tr></thead>\n<tbody>\n';
    for (const c of rows) { const v = contract.violations[c]; out += '<tr><th scope="row"><code>' + c + '</code></th><td>' + v.severity + '</td><td><code class="msg">' + esc(v.summary) + '</code></td><td>' + esc(v.invariant) + '</td></tr>\n'; }
    out += '</tbody></table></div>\n';
  }
  return out;
}

// ---------------------------------------------------------------- the painted page, under the Zayn design system

const slug = t => t.replace(/<[^>]+>/g, '').toLowerCase().replace(/&[a-z#0-9]+;/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function ids(html) { // every h2 of the main column has an id, so the outline can name it
  const used = new Set();
  return html.replace(/<h2(\s[^>]*)?>([\s\S]*?)<\/h2>/g, (m, at, t) => {
    if (at && /\bid=/.test(at)) return m;
    let id = slug(t) || 'section'; while (used.has(id)) id += '-2'; used.add(id);
    return '<h2' + (at || '') + ' id="' + id + '">' + t + '</h2>';
  });
}
function outline(html) { // "On this page": a side list of one level, on every page of three or more sections
  const hs = [...html.matchAll(/<h2[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/h2>/g)];
  if (hs.length < 3) return '';
  return '<nav class="outline" aria-label="On this page">\n  <p class="head">On this page</p>\n  <ul>\n' +
    hs.map(h => '    <li><a href="#' + h[1] + '">' + h[2].replace(/<[^>]+>/g, '') + '</a></li>').join('\n') + '\n  </ul>\n</nav>\n';
}
function hang(html) { // each source line of a code block wraps under its own indentation, two columns further (K27)
  return html.replace(/(<pre\b[^>]*>)([\s\S]*?)(<\/pre>)/g, (m, a, b, c) => a + b.split('\n').map(l => {
    const t = l.replace(/<[^>]+>/g, '').replace(/&[a-z#0-9]+;/g, 'x'); const i = t.length - t.replace(/^ +/, '').length;
    return '<span class="ln"' + (i ? ' style="--ind:' + i + '"' : '') + '>' + l + '</span>';
  }).join('') + c);
}
function labels(html) { // each cell of a table carries its column's name, read on a phone where the rows stack
  return html.replace(/<table>([\s\S]*?)<\/table>/g, (m, t) => {
    const head = /<thead>([\s\S]*?)<\/thead>/.exec(t); if (!head) return m;
    const names = [...head[1].matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map(x => x[1].replace(/<[^>]+>/g, '').replace(/"/g, '&quot;'));
    return '<table>' + t.replace(/<tr>([\s\S]*?)<\/tr>/g, (r, cells) => {
      if (/<th scope="col"/.test(cells)) return r;
      let k = 0; return '<tr>' + cells.replace(/<(td|th)(\s[^>]*)?>/g, (c, tag, at) => '<' + tag + (at || '') + ' data-label="' + (names[k++] || '') + '">') + '</tr>';
    }) + '</table>';
  });
}
function typeset(html) { // outside code: a link that leaves the site ends in the arrow up and to the right, and no line starts with a sign
  const all = html.split(/(<pre[\s\S]*?<\/pre>|<code[\s\S]*?<\/code>|<script[\s\S]*?<\/script>|<[^>]+>)/);
  let link = null; // the opening tag of the link the text is in
  return all.map((part, k) => {
    if (k % 2) { if (/^<a\s/.test(part)) link = part; else if (part === '</a>') link = null; return part; }
    let out = part.replace(/(\S) ([%;!?»])/g, '$1 $2');
    if (link && all[k + 1] === '</a>' && /href="https?:/.test(link) && !/↗\s*$/.test(out)) out = out.replace(/\s*$/, ' ↗');
    return out;
  }).join('');
}

// ---------------------------------------------------------------- the shell

function shell(name) {
  const p = PAGES[name]; const sec = SECTIONS.find(s => s.pages.includes(name)); const front = name === 'index';
  const body = fs.readFileSync(path.join(SRC, name + '.part'), 'utf8').replace(/\r\n?/g, '\n');
  const cutAt = body.indexOf('<!--main-->'); if (cutAt === -1) die(name + '.part has no <!--main-->');
  const lede = fill(body.slice(0, cutAt).trim(), name), main = ids(fill(body.slice(cutAt + 11).trim(), name));
  const side = outline(main);
  const menu = SECTIONS.map(s => '      <a' + (s === sec ? ' class="here" aria-current="true"' : '') + ' href="' + s.pages[0] + '.html">' + s.label + '</a>').join('\n');
  const band = sec && sec.pages.length > 1 ? '<nav class="band" aria-label="Pages of the section">\n  <div class="wrap">\n' +
    sec.pages.map(q => '    <a' + (q === name ? ' aria-current="page"' : '') + ' href="' + q + '.html">' + PAGES[q].label + '</a>').join('\n') + '\n  </div>\n</nav>\n' : '';
  // the path, for assistive technology: the bars show it to the eye (Zayn, Rule 108)
  const here = t => '<span class="here-crumb" aria-current="page">' + t + '</span>';
  const crumbs = [front ? here('Prosa') : '<a href="index.html">Prosa</a>'];
  if (sec && sec.pages.length === 1) crumbs.push(here(sec.label));
  if (sec && sec.pages.length > 1) crumbs.push('<a href="' + sec.pages[0] + '.html">' + sec.label + '</a>', here(p.label));
  const trail = '<nav class="vh" aria-label="Breadcrumb">' + crumbs.join('<span class="sep"> › </span>') + '</nav>';
  const page = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.description)}">
<meta name="prosa:subject" content="${p.subject}">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%232a1f1b'/%3E%3Cpath d='M9 8h9a6 6 0 0 1 0 12h-5v5H9z' fill='%23ff8c69'/%3E%3C/svg%3E">
<link rel="stylesheet" href="prosa.css">
<script>try{var t=localStorage.getItem('prosa-theme');if(t==='vellum'||t==='lamplight')document.documentElement.dataset.theme=t}catch(e){}</script>
</head>
<body${front ? ' class="front"' : ''}>
<a class="skip" href="#main">Skip to the content</a>
<div class="bars">
<nav class="site" aria-label="Main menu">
  <div class="wrap">
    <div class="menu">
      <a class="brand"${front ? ' aria-current="page"' : ''} href="index.html">Prosa</a>
      <div class="entries">
${menu}
      </div>
      <div class="end">
        <select id="theme" aria-label="Colour theme">
          <option value="system">System</option>
          <option value="vellum">Vellum</option>
          <option value="lamplight">Lamplight</option>
        </select>
        <a href="${REPO}">GitHub</a>
      </div>
    </div>
  </div>
</nav>
${band}</div>
${trail}

<header class="${front ? 'hero' : 'page'}">
  <div class="wrap">
    <div class="kicker">${p.kicker || sec.label}</div>
    <h1>${p.h1}</h1>
    ${lede}
  </div>
</header>

<div class="layout${side ? ' with-outline' : ''}">
${side}<main id="main">
${main}
</main>
</div>

<footer class="site">
  <div class="wrap">
    <p class="fine">Prosa, a <a href="https://mayouni.github.io/stzsite/index.html">Softanza</a> language. © 2026 Mansour Ayouni, MIT licence. This site is judged by its own declaration, <a href="site.proz">site.proz</a>.</p>
  </div>
</footer>
${(p.scripts || []).concat(['site.js']).map(s => '<script src="' + s + '"></script>\n').join('')}</body>
</html>
`;
  return typeset(hang(labels(page)));
}

// ---------------------------------------------------------------- the live court's data

function samples() {
  const dir = path.join(SRC, 'samples'); const S = n => fs.readFileSync(path.join(dir, n), 'utf8').replace(/\r\n?/g, '\n').replace(/\s+$/, '') + '\n';
  const list = [
    { id: 'term', label: 'A term: one thing, one word', proz: S('term.proz'), text: S('term.md'), file: 'term.md' },
    { id: 'affirmative', label: 'The affirmative rule of a public page', proz: S('affirmative.proz'), text: S('affirmative.md'), file: 'affirmative.md' },
    { id: 'profile', label: 'A profile: the measure of a voice', proz: S('profile.proz'), text: S('profile.md'), file: 'profile.md' },
  ];
  const data = { contract, constitution: { 'prosa:reader_rights': read('constitution/reader_rights.proz') }, samples: list };
  return '// samples.js : written by build.js. The contract of diagnostics, the constitution and the examples of the live court.\nwindow.PROSA_SITE = ' + JSON.stringify(data, null, 1) + ';\n';
}

// ---------------------------------------------------------------- the build

fs.copyFileSync(path.join(ROOT, 'tools/prosa/prosa.js'), path.join(SITE, 'prosa.js'));
fs.copyFileSync(path.join(ROOT, 'conformance/violations.json'), path.join(SITE, 'violations.json'));
fs.writeFileSync(path.join(SITE, 'samples.js'), samples());
const refusedNames = /\b(ring|zing)\b/i; // the house names neither on a Prosa page
for (const name of Object.keys(PAGES)) {
  const html = shell(name);
  const seen = html.replace(/<script[\s\S]*?<\/script>/g, '');
  const hit = seen.split('\n').findIndex(l => refusedNames.test(l));
  if (hit !== -1) die(name + '.html line ' + (hit + 1) + ' names a language the site does not name');
  fs.writeFileSync(path.join(SITE, name + '.html'), html);
}
console.log('built ' + Object.keys(PAGES).length + ' pages, prosa ' + FACTS.court + ', ' + FACTS.fixtures + ' fixtures, ' + FACTS.codes + ' codes');
