// site.js : what every page of the Prosa site does once it is painted, after the design system of Zayn (site/stz.js there).
// 1. The theme: Vellum or Lamplight, chosen in the bar and kept on this browser; "System" follows the reader's system.
// 2. The room (K24 WIDE_ROOM): a code block or a table whose content needs more than the column takes the room free to its
//    right, up to the window less the gutter, and wraps only past that. Nothing ever scrolls inside the page.
// 3. The last line (K11 BALANCE): running text fills its measure, narrowed only as far as its last line needs to hold a third
//    of its widest line; a paragraph no narrowing mends is balanced instead.
(function () {
  'use strict';
  var html = document.documentElement, sel = document.getElementById('theme');
  if (sel) {
    var kept = null; try { kept = localStorage.getItem('prosa-theme'); } catch (e) { kept = null; }
    sel.value = kept === 'vellum' || kept === 'lamplight' ? kept : 'system';
    sel.addEventListener('change', function () {
      var v = sel.value;
      if (v === 'system') { delete html.dataset.theme; try { localStorage.removeItem('prosa-theme'); } catch (e) { /* kept nowhere */ } }
      else { html.dataset.theme = v; try { localStorage.setItem('prosa-theme', v); } catch (e) { /* kept for this page only */ } }
    });
  }

  var WIDE = 'main pre, main .table';
  var outline = document.querySelector('.layout.with-outline > nav.outline');
  function inner(box) {
    var s = getComputedStyle(box), b = box.getBoundingClientRect();
    return { left: b.left + parseFloat(s.paddingLeft), right: b.right - parseFloat(s.paddingRight), width: b.width - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight) };
  }
  function widen() {
    var rem = parseFloat(getComputedStyle(html).fontSize) || 16, gutter = 1.4 * rem, page = html.clientWidth;
    var all = document.querySelectorAll(WIDE);
    for (var k = 0; k < all.length; k++) { all[k].style.width = ''; all[k].style.maxWidth = ''; }
    for (var j = 0; j < all.length; j++) {
      var el = all[j], r0 = el.getBoundingClientRect(); if (!r0.width) continue;
      var col = inner(el.closest('main'));
      if (Math.abs(r0.left - col.left) > 2) continue; // a block that does not start at the column's edge keeps its place
      el.style.maxWidth = 'none'; el.style.width = 'max-content';
      var natural = Math.ceil(el.getBoundingClientRect().width);
      el.style.width = ''; el.style.maxWidth = '';
      if (natural <= col.width + 1) continue;
      var right = page - gutter;
      if (outline) { var o = outline.getBoundingClientRect(); if (o.left > r0.left) right = Math.min(right, o.left - 2 * rem); }
      var width = Math.max(r0.width, Math.min(natural, right - r0.left));
      if (width <= r0.width + 1) continue;
      el.style.maxWidth = 'none'; el.style.width = Math.floor(width) + 'px';
    }
  }

  function lines(p) {
    var r = document.createRange(); r.selectNodeContents(p);
    // a rendered line is the set of boxes whose middles share one band: inline code sits a little higher or lower than the words
    var rects = [].slice.call(r.getClientRects()).filter(function (b) { return b.width > 0; }), out = [];
    rects.sort(function (a, c) { return (a.top + a.bottom) - (c.top + c.bottom); });
    rects.forEach(function (b) {
      var mid = (b.top + b.bottom) / 2, last = out[out.length - 1];
      if (last && mid < last.bottom && mid > last.top) { last.left = Math.min(last.left, b.left); last.right = Math.max(last.right, b.right); }
      else out.push({ top: b.top, bottom: b.bottom, left: b.left, right: b.right });
    });
    return out.map(function (l) { return l.right - l.left; });
  }
  function shortLast(w) { return w.length > 1 && w[w.length - 1] < Math.max.apply(null, w) / 3; }
  function mend() {
    var all = document.querySelectorAll('main p, main li, header .sub, footer p');
    for (var i = 0; i < all.length; i++) {
      var p = all[i]; if (p.closest('pre, table, nav')) continue;
      p.style.maxWidth = ''; p.style.textWrap = '';
      if (!shortLast(lines(p))) continue;
      var full = Math.floor(p.getBoundingClientRect().width), best = 0, step = Math.max(4, Math.round(full * 0.02));
      for (var w = full - step; w >= full * 0.7 && !best; w -= step) { p.style.maxWidth = w + 'px'; if (!shortLast(lines(p))) best = w; }
      if (best) p.style.maxWidth = best + 'px'; else { p.style.maxWidth = ''; p.style.textWrap = 'balance'; }
    }
  }

  function lay() { widen(); mend(); }
  window.ProsaLay = lay;
  lay();
  window.addEventListener('load', lay);
  var t = null; window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(lay, 60); });
})();
