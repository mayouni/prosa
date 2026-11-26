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

  function paint(report) { // the finding's head line in colour, built as nodes: the editors' text never becomes markup
    verdict.textContent = '';
    report.split('\n').forEach(function (line, k) {
      if (k) verdict.appendChild(document.createTextNode('\n'));
      var m = /^(\S+:\d+  )(error|warning)(  )([A-Z][A-Z0-9_]*)(.*)$/.exec(line), span = function (cls, t) { var s = document.createElement('span'); s.className = cls; s.textContent = t; return s; };
      if (m) { var c = m[2] === 'error' ? 'bad' : 'warn'; verdict.appendChild(document.createTextNode(m[1])); verdict.appendChild(span(c, m[2])); verdict.appendChild(document.createTextNode(m[3])); verdict.appendChild(span(c, m[4])); verdict.appendChild(document.createTextNode(m[5])); }
      else if (/^    /.test(line)) verdict.appendChild(span('dim', line));
      else verdict.appendChild(document.createTextNode(line));
    });
  }
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
    brief.textContent = b || 'The brief is written from a lawful declaration that holds a style.';
  }
  function load(k) { var s = S.samples[k]; proz.value = s.proz; text.value = s.text; run(); }

  S.samples.forEach(function (s, k) { var o = document.createElement('option'); o.value = String(k); o.textContent = s.label; sample.appendChild(o); });
  sample.addEventListener('change', function () { load(parseInt(sample.value, 10)); });
  level.addEventListener('change', run);
  var timer = null, later = function () { clearTimeout(timer); timer = setTimeout(run, 120); };
  proz.addEventListener('input', later); text.addEventListener('input', later);
  // Tab indents in an editor; Escape gives Tab back to the page, so the keyboard is never held
  [proz, text].forEach(function (ta) {
    var free = false;
    ta.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { free = true; return; }
      if (e.key === 'Tab' && !free && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault(); var a = ta.selectionStart, b = ta.selectionEnd; ta.value = ta.value.slice(0, a) + '  ' + ta.value.slice(b); ta.selectionStart = ta.selectionEnd = a + 2; later();
      }
    });
    ta.addEventListener('blur', function () { free = false; });
  });
  load(0);
})();
