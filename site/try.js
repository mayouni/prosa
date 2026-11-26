// try.js : the live court. It runs the reference court (prosa.js, window.Prosa) on the two editors of try.html,
// in the order the command `prosa check` follows: syntax, then the declaration, then the text of the first PIECE.
(function () {
  'use strict';
  var P = window.Prosa, S = window.PROSA_SITE;
  var $ = function (id) { return document.getElementById(id); };
  var proz = $('proz'), text = $('text'), sample = $('sample'), level = $('level'), verdict = $('verdict'), state = $('state'), brief = $('brief');
  if (!P || !S) { state.textContent = 'The court script did not load: the page needs prosa.js and samples.js beside it.'; return; }
  var C = S.contract;

  // court(prozSource, textSource, level) -> { report, errors, warnings, target, decls }
  function court(src, txt, lv) {
    var r = P.parse(src, 'style.proz', C), decls = r.decls, diags = r.diagnostics.slice(), files = 1;
    r.uses.forEach(function (u) {
      var lib = S.constitution[u.path];
      if (lib) { var c = P.parse(lib, u.path, C); decls = decls.concat(c.decls); diags = diags.concat(c.diagnostics); files++; }
      else diags.push(P.diag(C, 'UNKNOWN_REFERENCE', 'style.proz', u.line, '', { field: 'USE', name: u.path, kinds: 'file carried by this page' }, { level: 1 }));
    });
    var bad = function (max) { return diags.some(function (d) { return d.severity === 'error' && d.level <= max; }); };
    if (lv >= 2 && !bad(1)) diags = diags.concat(P.checkDeclarations(decls, C));
    var piece = decls.filter(function (d) { return d.kind === 'PIECE'; })[0], style = decls.filter(function (d) { return d.kind === 'STYLE'; })[0];
    var target = piece ? { piece: piece.name } : style ? { style: style.name } : null;
    var file = (piece && (P.str(piece, 'FILE') || P.str(piece, 'FILES'))) || 'text.md';
    if (lv >= 3 && !bad(2) && target) { diags = diags.concat(P.judge(decls, target, txt, { contract: C, level: lv, file: file }).diagnostics); files++; }
    diags = diags.filter(function (d) { return d.level <= lv; });
    return { report: P.reportText(diags, files, lv), target: target, decls: decls, lawful: !bad(2),
      errors: diags.filter(function (d) { return d.severity === 'error'; }).length, warnings: diags.filter(function (d) { return d.severity === 'warning'; }).length };
  }
  window.ProsaLiveCourt = court;

  // one span per line, as the build gives every code block: a long line wraps under its own indentation (prosa.css, pre .l)
  function line(into, text) {
    var l = document.createElement('span'), i = text.length - text.replace(/^ +/, '').length;
    l.className = 'ln'; if (i) l.style.setProperty('--ind', String(i)); into.appendChild(l); return l;
  }
  function paint(report) { // the finding's head line in colour, built as nodes: the editors' text never becomes markup
    verdict.textContent = '';
    report.split('\n').forEach(function (text) {
      var l = line(verdict, text);
      var m = /^(\S+:\d+  )(error|warning)(  )([A-Z][A-Z0-9_]*)(.*)$/.exec(text), span = function (cls, t) { var s = document.createElement('span'); s.className = cls; s.textContent = t; return s; };
      if (m) { var c = m[2] === 'error' ? 'bad' : 'warn'; l.appendChild(document.createTextNode(m[1])); l.appendChild(span(c, m[2])); l.appendChild(document.createTextNode(m[3])); l.appendChild(span(c, m[4])); l.appendChild(document.createTextNode(m[5])); }
      else if (/^    /.test(text)) l.appendChild(span('dim', text));
      else l.textContent = text;
    });
  }
  function plain(pre, text) { pre.textContent = ''; text.split('\n').forEach(function (t) { line(pre, t).textContent = t; }); }
  // an editor is as tall as its text: nothing scrolls inside the page
  function grow(ta) { ta.style.height = 'auto'; ta.style.height = (ta.scrollHeight + 2) + 'px'; }
  function run() {
    var out;
    try { out = court(proz.value, text.value, parseInt(level.value, 10)); }
    catch (e) { state.className = 'state refused'; state.textContent = 'The court stopped on this input: ' + e.message; verdict.textContent = ''; return; }
    paint(out.report);
    var refused = out.errors > 0;
    state.className = 'state ' + (refused ? 'refused' : 'lawful');
    state.textContent = (refused ? 'Refused: ' : 'Lawful: ') + out.errors + ' error(s), ' + out.warnings + ' warning(s).';
    var b = '';
    try { if (out.target && out.lawful) b = P.brief(out.decls, out.target); } catch (e) { b = ''; }
    plain(brief, b ? b.replace(/\s+$/, '') : 'The brief is written from a lawful declaration that holds a style.');
  }
  function load(k) { var s = S.samples[k]; proz.value = s.proz; text.value = s.text; grow(proz); grow(text); run(); }

  S.samples.forEach(function (s, k) { var o = document.createElement('option'); o.value = String(k); o.textContent = s.label; sample.appendChild(o); });
  sample.addEventListener('change', function () { load(parseInt(sample.value, 10)); });
  level.addEventListener('change', run);
  var timer = null, later = function () { clearTimeout(timer); timer = setTimeout(run, 120); };
  proz.addEventListener('input', function () { grow(proz); later(); }); text.addEventListener('input', function () { grow(text); later(); });
  var again = null; window.addEventListener('resize', function () { clearTimeout(again); again = setTimeout(function () { grow(proz); grow(text); }, 60); });
  // Tab indents in an editor; Escape gives Tab back to the page, so the keyboard is never held
  [proz, text].forEach(function (ta) {
    var free = false;
    ta.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { free = true; return; }
      if (e.key === 'Tab' && !free && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault(); var a = ta.selectionStart, b = ta.selectionEnd; ta.value = ta.value.slice(0, a) + '  ' + ta.value.slice(b); ta.selectionStart = ta.selectionEnd = a + 2; grow(ta); later();
      }
    });
    ta.addEventListener('blur', function () { free = false; });
  });
  load(0);
})();
