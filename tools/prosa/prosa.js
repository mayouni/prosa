// prosa.js : the reference court of the Prosa language. Pure functions, no file access, no dependency.
// It runs under Node (module.exports) and in a browser (window.Prosa). The specification is doc/language/.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Prosa = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const VERSION = { language: '0.1', court: '0.1.0' };

  const KINDS = ['STYLE', 'TERM', 'WORDLIST', 'PATTERN', 'PROFILE', 'FORM', 'ZONE', 'PIECE', 'ALLOW', 'READING'];
  const RULE_KINDS = ['TERM', 'WORDLIST', 'PATTERN', 'PROFILE'];
  const ZONES = ['title', 'heading', 'lede', 'body', 'list', 'quote'];
  const POSITIONS = ['sentence_start', 'sentence_end', 'paragraph_start', 'paragraph_end'];
  const MEASURES = ['SENTENCE_MEDIAN', 'SENTENCES_OVER', 'SENTENCES_UNDER', 'DASHES', 'COLONS', 'EXCLAMATIONS', 'COLD_EXCLAMATIONS',
    'QUESTIONS', 'ELLIPSES', 'COLON_LEADS', 'ONE_SENTENCE_PARAGRAPHS'];
  const COMMON = { CODE: 'code', SEVERITY: 'severity', EVIDENCE: 'str', LANGUAGE: 'id', IN: 'ids', ON: 'ids', MENTIONS: 'id', KEEPS: 'words', SAYS: 'str' };
  const FIELDS = {
    STYLE: { LANGUAGES: 'ids', ADOPTS: 'ids', HOLDS: 'ids', DECLINES: 'ids', MEASURED_FROM: 'str' },
    TERM: Object.assign({ MEANS: 'str', REFUSES: 'entries', WRITES: 'str' }, COMMON),
    WORDLIST: Object.assign({ REFUSES: 'entries', AT_MOST: 'budget' }, COMMON),
    PATTERN: Object.assign({ MATCHES: 'entries', AT: 'id', AT_MOST: 'budget', REFUSED: 'str', WRITTEN: 'str' }, COMMON),
    PROFILE: { MIN_WORDS: 'num', CODE: 'code', SEVERITY: 'severity', EVIDENCE: 'str', LANGUAGE: 'id', ON: 'ids' },
    FORM: { EXTENDS: 'id', TITLE_WORDS: 'bound', TITLE_HOLDS: 'id', FIRST_SENTENCE_HOLDS: 'id', SAY_ONCE: 'first', HEADINGS: 'words',
      HEADING_CASE: 'id', CLOSES_WITHOUT: 'words', HOLES_CLOSED_AT: 'ids', EVIDENCE: 'str' },
    ZONE: { EXEMPT_FROM: 'codes', REASON: 'str' },
    PIECE: { FILE: 'str', FILES: 'str', FOLLOWS: 'id', FORM: 'id', SUBJECT: 'str', SUBJECT_FROM: 'id', LANGUAGE: 'id', READER: 'any' },
    ALLOW: { FILE: 'str', LINE_HOLDS: 'str', EXCUSES: 'code', REASON: 'str' },
    READING: { ON: 'id', ASKS: 'str', RECORDS: 'str', EVIDENCE: 'str' },
  };
  MEASURES.forEach(m => { FIELDS.PROFILE[m] = 'bound'; });
  const REQUIRED = {
    STYLE: [], TERM: ['MEANS', 'REFUSES'], WORDLIST: ['REFUSES', 'CODE'], PATTERN: ['MATCHES', 'CODE'], PROFILE: [], FORM: [],
    ZONE: ['EXEMPT_FROM', 'REASON'], PIECE: ['FOLLOWS'], ALLOW: ['FILE', 'LINE_HOLDS', 'EXCUSES', 'REASON'], READING: ['ON', 'ASKS', 'RECORDS'],
  };
  const DEFAULTS = { TERM: ['TERM_SYNONYM', 'error'], WORDLIST: [null, 'warning'], PATTERN: [null, 'error'], PROFILE: ['OFF_PROFILE', 'warning'] };

  // ---------------------------------------------------------------- diagnostics

  function diag(contract, code, file, line, subject, vars, extra) {
    const v = (contract && contract.violations && contract.violations[code]) || {};
    let message = (extra && extra.message) || v.summary || code;
    message = message.replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] !== undefined ? String(vars[k]) : m));
    return {
      code, severity: (extra && extra.severity) || v.severity || 'error', level: (extra && extra.level) || v.level || 1,
      message, span: { file: file || '', line: line || 0 }, subject: subject || '', cites: (extra && extra.cites) || [], language: 'prosa',
    };
  }

  // ---------------------------------------------------------------- level 1: the .proz reader

  function lex(src, file, contract, out) {
    const toks = []; let i = 0, line = 1; const n = src.length;
    while (i < n) {
      const c = src[i];
      if (c === '\n') { line++; i++; continue; }
      if (c === ' ' || c === '\t' || c === '\r' || c === '﻿') { i++; continue; }
      if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
      if ('()[],'.includes(c)) { toks.push({ t: c, line }); i++; continue; }
      if (c === '"') {
        let j = i + 1, s = '', ok = false;
        while (j < n && src[j] !== '\n') {
          if (src[j] === '\\' && (src[j + 1] === '"' || src[j + 1] === '\\')) { s += src[j + 1]; j += 2; continue; }
          if (src[j] === '"') { ok = true; break; }
          s += src[j++];
        }
        if (!ok) { out.push(diag(contract, 'UNTERMINATED_STRING', file, line, '')); i = j; continue; }
        toks.push({ t: 'str', v: s, line }); i = j + 1; continue;
      }
      const m = /^[A-Za-z0-9_.]+/.exec(src.slice(i, i + 80));
      if (m) {
        const w = m[0]; i += w.length;
        if (/^[0-9]+(\.[0-9]+)?$/.test(w)) toks.push({ t: 'num', v: parseFloat(w), line });
        else if (/^[A-Z][A-Z0-9_]*$/.test(w)) toks.push({ t: 'kw', v: w, line });
        else if (/^[a-z][a-z0-9_]*$/.test(w)) toks.push({ t: 'id', v: w, line });
        else out.push(diag(contract, 'UNEXPECTED_TOKEN', file, line, '', { token: w }));
        continue;
      }
      out.push(diag(contract, 'UNEXPECTED_TOKEN', file, line, '', { token: c })); i++;
    }
    return toks;
  }

  // parse(src, file, contract) -> { decls, uses, diagnostics }
  function parse(src, file, contract) {
    const out = []; const toks = lex(src, file, contract, out); const lexBad = out.length > 0; const decls = []; const uses = []; let p = 0;
    const bad = (tok, what) => out.push(diag(contract, 'UNEXPECTED_TOKEN', file, tok ? tok.line : 0, '', { token: tok ? (tok.v !== undefined ? tok.v : tok.t) : 'end of file', expected: what }));
    function value() {
      const t = toks[p];
      if (!t) return null;
      if (t.t === 'str' || t.t === 'num' || t.t === 'id' || t.t === 'kw') { p++; return t; }
      if (t.t === '[') {
        p++; const items = []; let cur = [];
        while (p < toks.length && toks[p].t !== ']') {
          if (toks[p].t === ',') { if (cur.length) items.push(cur); cur = []; p++; continue; }
          if (toks[p].t === '(' || toks[p].t === ')') { bad(toks[p], 'a value or ]'); return { t: 'list', items, line: t.line }; }
          const v = value(); if (!v) break; cur.push(v);
        }
        if (cur.length) items.push(cur);
        if (!toks[p]) { bad(null, ']'); return { t: 'list', items, line: t.line }; }
        p++; return { t: 'list', items, line: t.line };
      }
      return null;
    }
    while (p < toks.length) {
      const t = toks[p];
      if (t.t === 'kw' && t.v === 'USE') {
        if (toks[p + 1] && toks[p + 1].t === 'str') { uses.push({ path: toks[p + 1].v, line: t.line }); p += 2; } else { bad(toks[p + 1], 'a quoted path'); p++; }
        continue;
      }
      if (!(t.t === 'kw' && t.v === 'DEFINE')) { bad(t, 'DEFINE'); p++; while (p < toks.length && !(toks[p].t === 'kw' && toks[p].v === 'DEFINE')) p++; continue; }
      const kind = toks[p + 1], name = toks[p + 2], open = toks[p + 3];
      if (!kind || kind.t !== 'kw') { bad(kind, 'a kind'); p++; continue; }
      if (!KINDS.includes(kind.v)) { out.push(diag(contract, 'UNKNOWN_KIND', file, kind.line, kind.v, { kind: kind.v })); }
      if (!name || name.t !== 'id') { bad(name, 'a lower_snake name'); p += 2; continue; }
      if (!open || open.t !== '(') { bad(open, '('); p += 3; continue; }
      p += 4;
      const d = { kind: kind.v, name: name.v, line: t.line, file, fields: {}, order: [] };
      let closed = false;
      while (p < toks.length) {
        const f = toks[p];
        if (f.t === ')') { p++; closed = true; break; }
        if (f.t === ',') { p++; continue; }
        if (f.t !== 'kw') { bad(f, 'a field keyword'); p++; continue; }
        if (f.v === 'DEFINE') break;
        p++;
        const vals = [];
        while (p < toks.length && toks[p].t !== ',' && toks[p].t !== ')') {
          if (toks[p].t === 'kw' && toks[p].v === 'DEFINE') break;
          const v = value(); if (!v) { bad(toks[p], 'a value'); p++; break; } vals.push(v);
        }
        if (d.fields[f.v]) out.push(diag(contract, 'DUPLICATE_FIELD', file, f.line, d.name, { field: f.v }));
        else { d.fields[f.v] = { line: f.line, values: vals }; d.order.push(f.v); }
      }
      if (!closed) bad(toks[p], ')');
      decls.push(d);
    }
    if (!lexBad) for (const d of decls) if (KINDS.includes(d.kind)) shape(d, contract, out);
    return { decls, uses, diagnostics: out };
  }

  const one = (f, t) => f && f.values.length === 1 && f.values[0].t === t ? f.values[0].v : undefined;
  const str = (d, k) => one(d.fields[k], 'str');
  const idv = (d, k) => one(d.fields[k], 'id');
  const kwv = (d, k) => one(d.fields[k], 'kw');
  const numv = (d, k) => one(d.fields[k], 'num');
  function flat(d, k) { // a list of single words, or one bare word
    const f = d.fields[k]; if (!f) return [];
    if (f.values.length === 1 && f.values[0].t === 'list') return f.values[0].items.map(it => (it.length === 1 ? String(it[0].v) : null));
    if (f.values.length === 1 && f.values[0].t !== 'list') return [String(f.values[0].v)];
    return [null];
  }
  function bound(f) { // N WITHIN D | AT_MOST N [unit] | AT_LEAST N [unit] | BETWEEN A AND B [unit], with an optional leading threshold
    const v = f.values.slice(); const b = {};
    const unit = v.length && v[v.length - 1].t === 'kw' && ['PER_THOUSAND', 'PER_HUNDRED'].includes(v[v.length - 1].v) ? v.pop().v : null;
    b.unit = unit;
    const isN = x => x && x.t === 'num', isK = (x, k) => x && x.t === 'kw' && x.v === k;
    let q = 0;
    if (isN(v[0]) && (isK(v[1], 'AT_MOST') || isK(v[1], 'AT_LEAST') || isK(v[1], 'BETWEEN'))) { b.threshold = v[0].v; q = 1; }
    if (isN(v[q]) && isK(v[q + 1], 'WITHIN') && isN(v[q + 2]) && v.length === q + 3) { b.min = v[q].v - v[q + 2].v; b.max = v[q].v + v[q + 2].v; b.text = v[q].v + ' within ' + v[q + 2].v; }
    else if (isK(v[q], 'AT_MOST') && isN(v[q + 1]) && v.length === q + 2) { b.max = v[q + 1].v; b.text = 'at most ' + v[q + 1].v; }
    else if (isK(v[q], 'AT_LEAST') && isN(v[q + 1]) && v.length === q + 2) { b.min = v[q + 1].v; b.text = 'at least ' + v[q + 1].v; }
    else if (isK(v[q], 'BETWEEN') && isN(v[q + 1]) && isK(v[q + 2], 'AND') && isN(v[q + 3]) && v.length === q + 4) { b.min = v[q + 1].v; b.max = v[q + 3].v; b.text = 'between ' + v[q + 1].v + ' and ' + v[q + 3].v; }
    else return null;
    if (unit) b.text += unit === 'PER_THOUSAND' ? ' per thousand words' : ' per hundred';
    return b;
  }

  function shape(d, contract, out) {
    const spec = FIELDS[d.kind];
    const badv = (k, why) => out.push(diag(contract, 'BAD_VALUE', d.file, d.fields[k].line, d.name, { field: k, why }));
    for (const k of d.order) {
      const f = d.fields[k], want = spec[k];
      if (!want) { out.push(diag(contract, 'UNKNOWN_FIELD', d.file, f.line, d.name, { field: k, kind: d.kind })); continue; }
      const v = f.values;
      if (want === 'str') { if (str(d, k) === undefined) badv(k, 'one quoted string is expected'); }
      else if (want === 'id') { if (idv(d, k) === undefined) badv(k, 'one lower_snake name is expected'); }
      else if (want === 'num') { if (numv(d, k) === undefined) badv(k, 'one number is expected'); }
      else if (want === 'code') { if (kwv(d, k) === undefined) badv(k, 'one UPPER_SNAKE code is expected'); }
      else if (want === 'severity') { if (!['error', 'warning'].includes(idv(d, k))) badv(k, 'error or warning is expected'); }
      else if (want === 'ids') { if (flat(d, k).some(x => x === null || !/^[a-z][a-z0-9_]*$/.test(x))) badv(k, 'a list of lower_snake names is expected'); }
      else if (want === 'codes') { if (flat(d, k).some(x => x === null || !/^[A-Z][A-Z0-9_]*$/.test(x))) badv(k, 'a list of UPPER_SNAKE codes is expected'); }
      else if (want === 'words') { if (flat(d, k).some(x => x === null)) badv(k, 'a list of words or quoted strings is expected'); }
      else if (want === 'entries') { if (!(v.length === 1 && v[0].t === 'list' && v[0].items.length) || !compileEntries(v[0])) badv(k, 'a list of entries is expected'); }
      else if (want === 'bound') { if (!bound(f)) badv(k, 'a bound is expected: N WITHIN D, AT_MOST N, AT_LEAST N or BETWEEN A AND B'); }
      else if (want === 'budget') { const b = bound({ values: [{ t: 'kw', v: 'AT_MOST' }].concat(v) }); if (!b || b.unit !== 'PER_THOUSAND') badv(k, 'N PER_THOUSAND is expected'); }
      else if (want === 'first') { if (!(v.length === 2 && v[0].t === 'kw' && v[0].v === 'FIRST' && v[1].t === 'num')) badv(k, 'FIRST N is expected'); }
    }
    for (const k of REQUIRED[d.kind]) if (!d.fields[k]) out.push(diag(contract, 'MISSING_FIELD', d.file, d.line, d.name, { field: k, kind: d.kind }));
    if (d.kind === 'PIECE' && !d.fields.FILE === !d.fields.FILES) out.push(diag(contract, 'MISSING_FIELD', d.file, d.line, d.name, { field: 'FILE or FILES (one of the two)', kind: d.kind }));
    if (d.fields.MENTIONS && !['skipped', 'judged'].includes(idv(d, 'MENTIONS'))) badv('MENTIONS', 'skipped or judged is expected');
    if (d.fields.AT && !POSITIONS.includes(idv(d, 'AT'))) badv('AT', 'one of ' + POSITIONS.join(', '));
    if (d.fields.IN && flat(d, 'IN').some(z => !ZONES.includes(z))) badv('IN', 'zones are ' + ZONES.join(', '));
  }

  // ---------------------------------------------------------------- words and entries

  const WORD = "[A-Za-z\\u00C0-\\u00FF0-9]+(?:['\\u2019\\-][A-Za-z\\u00C0-\\u00FF0-9]+)*";
  const TOKEN = new RegExp(WORD + '\\*?|\\.\\.\\.|[^\\s]', 'gu');
  const EMOJI = /[\u{1F300}-\u{1FAFF}☀-➿\u{1F000}-\u{1F2FF}]/u;
  function tokens(text, keepStar) {
    const out = []; let m; TOKEN.lastIndex = 0;
    while ((m = TOKEN.exec(text))) {
      let w = m[0];
      if (!keepStar && w.length > 1 && w.endsWith('*')) { w = w.slice(0, -1); TOKEN.lastIndex--; }
      out.push({ w: w.toLowerCase(), raw: w, at: m.index, end: m.index + w.length });
    }
    return out;
  }
  // An entry is a sequence of elements: a word or phrase, a group of alternatives, the class EMOJI, with WITHIN N between two of them.
  // A trailing WRITE "x" gives the written form. A word ending in * is a stem.
  function compileEntries(list) {
    const entries = [];
    for (const item of list.items) {
      const e = { els: [], write: null, text: '' }; let gap = 1;
      for (let i = 0; i < item.length; i++) {
        const v = item[i];
        if (v.t === 'kw' && v.v === 'WRITE') { if (!item[i + 1] || item[i + 1].t !== 'str' || i + 2 !== item.length) return null; e.write = item[i + 1].v; break; }
        if (v.t === 'kw' && v.v === 'WITHIN') { if (!item[i + 1] || item[i + 1].t !== 'num' || !e.els.length) return null; gap = item[i + 1].v; i++; continue; }
        if (v.t === 'kw' && v.v === 'EMOJI') { e.els.push({ alts: null, emoji: true, gap }); gap = 1; continue; }
        if (v.t === 'kw' && v.v === 'ANY') { e.els.push({ alts: null, any: true, gap }); gap = 1; continue; }
        let alts;
        if (v.t === 'str' || v.t === 'id') alts = [String(v.v)];
        else if (v.t === 'list') { alts = v.items.map(x => (x.length === 1 && (x[0].t === 'str' || x[0].t === 'id') ? String(x[0].v) : null)); if (alts.includes(null) || !alts.length) return null; }
        else return null;
        const seqs = alts.map(a => tokens(a.replace(/_/g, ' '), true).map(t => t.w));
        if (seqs.some(s => !s.length)) return null;
        e.els.push({ alts: seqs, gap }); gap = 1;
      }
      if (!e.els.length || gap !== 1) return null;
      e.text = e.els.map(x => (x.emoji ? 'an emoji' : x.any ? 'a word' : x.alts.length === 1 ? x.alts[0].join(' ') : x.alts[0].join(' ') + ' (or another of its group)')).join(' ... ');
      entries.push(e);
    }
    return entries;
  }
  const isWord = w => /^[a-zà-ÿ0-9]/.test(w);
  function wordIs(tok, pat) { return pat.endsWith('*') && pat.length > 1 ? tok.startsWith(pat.slice(0, -1)) : tok === pat; }
  function seqAt(toks, i, seq) { for (let k = 0; k < seq.length; k++) if (!toks[i + k] || !wordIs(toks[i + k].w, seq[k])) return -1; return i + seq.length; }
  function elAt(toks, i, el) { // -> the index after the element, or -1
    if (!toks[i]) return -1;
    if (el.emoji) return EMOJI.test(toks[i].raw) ? i + 1 : -1;
    if (el.any) return isWord(toks[i].w) ? i + 1 : -1;
    for (const s of el.alts) { const e = seqAt(toks, i, s); if (e !== -1) return e; }
    return -1;
  }
  function entryAt(toks, i, e, k) { // match element k at or after i within its gap
    const el = e.els[k]; const tries = k === 0 ? 1 : el.gap;
    for (let g = 0; g < tries; g++) {
      if (g > 0 && !(toks[i + g - 1] && isWord(toks[i + g - 1].w))) break; // a gap holds words only: it never crosses punctuation
      const end = elAt(toks, i + g, el);
      if (end === -1) continue;
      if (k + 1 === e.els.length) return end;
      const rest = entryAt(toks, end, e, k + 1);
      if (rest !== -1) return rest;
    }
    return -1;
  }
  function findEntries(toks, entries) { // -> [{from, to, entry}] leftmost, not overlapping per entry
    const hits = [];
    for (const e of entries) for (let i = 0; i < toks.length; i++) { const end = entryAt(toks, i, e, 0); if (end !== -1) { hits.push({ from: i, to: end, entry: e }); i = end - 1; } }
    return hits.sort((a, b) => a.from - b.from);
  }
  function keptRanges(toks, phrases) {
    const r = [];
    for (const ph of phrases) { const seq = tokens(ph, true).map(t => t.w); if (!seq.length) continue; for (let i = 0; i < toks.length; i++) { const e = seqAt(toks, i, seq); if (e !== -1) r.push([i, e]); } }
    return r;
  }

  // ---------------------------------------------------------------- the text reader

  // readMarkdown(text) -> { front, blocks }. A block is { kind: prose|code|skip, text, line, list, quote, headings, zone }.
  // The split follows the house lint so that the measures agree with it: see doc/language/TEXT.md.
  function readMarkdown(text) {
    text = text.replace(/\r\n?/g, '\n');
    const lines = text.split('\n'); const front = {}; let i = 0;
    if (text.startsWith('---')) {
      let end = -1;
      for (let j = 1; j < lines.length; j++) if (lines[j].startsWith('---')) { end = j; break; }
      if (end !== -1) {
        for (let j = 1; j < end; j++) { const m = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(lines[j]); if (m) front[m[1]] = m[2].trim().replace(/^["'](.*)["']$/, '$1'); }
        i = end + 1;
      }
    }
    const blocks = []; let zone = null; let para = [], paraLine = 0;
    const flush = () => {
      if (!para.length) return;
      const raw = para.join('\n'); const p = raw.trim(); para = [];
      if (!p) return;
      const b = { kind: 'prose', text: p, line: paraLine, list: false, quote: false, headings: [], zone };
      const zm = /^<!--\s*prosa:(zone\s+([a-z][a-z0-9_]*)|end)\s*-->$/.exec(p);
      if (zm) { zone = zm[2] || null; b.kind = 'skip'; b.zone = zone; blocks.push(b); return; }
      if (/^(#|\||<!--|!\[|\*Figure|\*Fig|<figure|<div|<svg)/.test(p) || /^\*[^*\n]{3,120}\*$/.test(p)) {
        b.kind = 'skip';
        if (p[0] === '#') p.split('\n').forEach((ln, k) => { const h = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(ln); if (h) b.headings.push({ level: h[1].length, text: plain(h[2]), line: paraLine + k }); });
      } else if (/^(    |\t)/.test(raw)) b.kind = 'code';
      else { b.list = /^\s*([-*•]|\d+[.)])\s/.test(p); b.quote = p[0] === '>'; }
      blocks.push(b);
    };
    for (; i < lines.length; i++) {
      const ln = lines[i];
      if (/^(```|~~~)/.test(ln)) {
        flush(); const start = i; const body = [ln]; i++;
        while (i < lines.length && !/^(```|~~~)\s*$/.test(lines[i])) body.push(lines[i++]);
        if (i < lines.length) body.push(lines[i]);
        blocks.push({ kind: 'code', text: body.join('\n'), line: start + 1, list: false, quote: false, headings: [], zone });
        continue;
      }
      if (/^\s*$/.test(ln)) { flush(); continue; }
      if (!para.length) paraLine = i + 1;
      para.push(ln);
    }
    flush();
    return { front, blocks };
  }
  function plain(s) { return s.replace(/`([^`]*)`/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1').trim(); }

  // readHtml(text) -> the same model, from a page: h1 to h6 are headings, p and blockquote are prose, li, td, th, dd, dt,
  // figcaption and summary are list items, pre is code. Scripts, styles, code, templates and nav menus are not read.
  function readHtml(text) {
    text = text.replace(/\r\n?/g, '\n');
    const lineOf = at => text.slice(0, at).split('\n').length;
    const blank = s => s.replace(/[^\n]/g, ' ');
    let t = text.replace(/<(script|style|code|template|nav)\b[\s\S]*?<\/\1>/gi, blank);
    const dec = s => s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&rsquo;/g, "'").replace(/&mdash;/g, '—').replace(/&hellip;/g, '…').replace(/\s+/g, ' ').trim();
    const blocks = []; let zone = null; const front = {};
    const tm = /<title>([\s\S]*?)<\/title>/i.exec(t); if (tm) front.page_title = dec(tm[1]);
    const lang = /<html[^>]*\blang="([a-z]{2})/i.exec(t); if (lang) front.lang = lang[1];
    const metaRe = /<meta\s+name="prosa:([a-z_]+)"\s+content="([^"]*)"/gi; let mm; while ((mm = metaRe.exec(t))) front[mm[1]] = mm[2];
    const re = /<!--\s*prosa:(zone\s+([a-z][a-z0-9_]*)|end)\s*-->|<(h[1-6]|p|li|blockquote|pre|td|th|dd|dt|figcaption|summary)\b[^>]*>([\s\S]*?)<\/\3>/gi; let m;
    while ((m = re.exec(t))) {
      const line = lineOf(m.index);
      if (m[1]) { zone = m[2] || null; continue; }
      const tag = m[3].toLowerCase();
      if (tag === 'pre') { blocks.push({ kind: 'code', text: m[4], line, list: false, quote: false, headings: [], zone }); continue; }
      const s = dec(m[4]); if (!s) continue;
      if (tag[0] === 'h') blocks.push({ kind: 'skip', text: s, line, list: false, quote: false, headings: [{ level: +tag[1], text: s, line }], zone });
      else blocks.push({ kind: 'prose', text: s, line, list: tag !== 'p' && tag !== 'blockquote', quote: tag === 'blockquote', headings: [], zone });
    }
    return { front, blocks };
  }
  function read(text, file) { return /\.html?$/i.test(file || '') ? readHtml(text) : readMarkdown(text); }

  function sentences(p) {
    p = p.replace(/`[^`]*`/g, 'CODE').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    return p.split(/(?<=[.!?…])\s+(?=[A-Z«"'(\[])/).map(s => s.trim()).filter(s => wc(s) > 1);
  }
  const wc = s => { const t = s.trim(); return t ? t.split(/\s+/).length : 0; };
  const count = (s, sub) => s.split(sub).length - 1;
  const r1 = x => Math.round(x * 10) / 10;

  // measure(blocks) -> the profile of a text. The definitions are those of the house lint (FRAMEWORK.md, sections 4 and 5).
  function measure(blocks) {
    const prose = blocks.filter(b => b.kind === 'prose');
    const joined = prose.map(b => b.text).join('\n\n');
    const words = (joined.match(/[A-Za-zÀ-ÿ'’]+/g) || []).length;
    const lens = []; let long = 0, short = {}; const longAt = [];
    const allLens = [];
    for (const b of prose) for (const s of sentences(b.text)) { const n = wc(s); allLens.push({ n, list: b.list, line: b.line }); lens.push(n); }
    lens.sort((a, b) => a - b);
    let excl = 0, cold = 0; const coldAt = [];
    blocks.forEach((b, idx) => {
      if (b.kind !== 'prose') return; const n = count(b.text, '!'); if (!n) return; excl += n;
      const prev = blocks.slice(Math.max(0, idx - 2), idx).map(x => x.kind);
      const afterRun = prev.includes('code') || /(prints|printed|gives|returns|answers|complains|says|shows|output|verdict|kept|raised|ran|run it|execute)/.test(b.text.toLowerCase());
      if (!afterRun) { cold += n; coldAt.push(b.line); }
    });
    let colonLeads = 0;
    blocks.forEach((b, idx) => { if (b.kind === 'prose' && b.text.trimEnd().endsWith(':') && blocks[idx + 1] && blocks[idx + 1].kind === 'prose') colonLeads++; });
    return {
      words, sentences: lens.length, paragraphs: prose.length, lens: allLens,
      median: lens.length ? lens[Math.floor(lens.length / 2)] : 0, q1: lens.length ? lens[Math.floor(lens.length / 4)] : 0, q3: lens.length ? lens[Math.floor(3 * lens.length / 4)] : 0,
      excl, cold, coldAt, questions: count(joined, '?'), colons: count(joined, ':'),
      dashes: count(joined, '—') + count(joined, ' - ') + count(joined, '–'),
      ellipses: prose.filter(b => /(\.\.\.|…)\s*$/.test(b.text)).length, colonLeads,
      oneSentenceParas: prose.filter(b => sentences(b.text).length === 1 && wc(b.text) > 3).length,
    };
  }
  function pool(ms) { // the profile of a corpus: every sentence of every page in one pool
    const t = { words: 0, sentences: 0, paragraphs: 0, lens: [], excl: 0, cold: 0, coldAt: [], questions: 0, colons: 0, dashes: 0, ellipses: 0, colonLeads: 0, oneSentenceParas: 0 };
    for (const m of ms) { for (const k of Object.keys(t)) { if (Array.isArray(t[k])) t[k] = t[k].concat(m[k]); else t[k] += m[k]; } }
    const l = t.lens.map(x => x.n).sort((a, b) => a - b);
    t.median = l.length ? l[Math.floor(l.length / 2)] : 0; t.q1 = l.length ? l[Math.floor(l.length / 4)] : 0; t.q3 = l.length ? l[Math.floor(3 * l.length / 4)] : 0;
    return t;
  }
  function measured(m, name, b) { // the value of one measure under one bound
    const perK = c => (m.words ? c * 1000 / m.words : 0);
    const over = n => m.lens.filter(x => x.n > n && !x.list).length, under = n => m.lens.filter(x => x.n < n).length;
    const raw = { SENTENCE_MEDIAN: m.median, SENTENCES_OVER: over(b.threshold), SENTENCES_UNDER: under(b.threshold), DASHES: m.dashes, COLONS: m.colons, EXCLAMATIONS: m.excl,
      COLD_EXCLAMATIONS: m.cold, QUESTIONS: m.questions, ELLIPSES: m.ellipses, COLON_LEADS: m.colonLeads, ONE_SENTENCE_PARAGRAPHS: m.oneSentenceParas }[name];
    if (b.unit === 'PER_THOUSAND') return r1(perK(raw));
    if (b.unit === 'PER_HUNDRED') return r1(100 * raw / Math.max(1, name === 'ONE_SENTENCE_PARAGRAPHS' ? m.paragraphs : m.sentences));
    return raw;
  }

  // ---------------------------------------------------------------- level 2: the declaration by itself

  function index(decls) { const ix = {}; for (const d of decls) if (!ix[d.name]) ix[d.name] = d; return ix; }
  function chain(ix, start, field, kind) { // the declarations reached through ADOPTS or EXTENDS, nearest first; null on a cycle
    const seen = [], todo = [start];
    while (todo.length) {
      const n = todo.shift(); const d = ix[n];
      if (!d || d.kind !== kind) continue;
      if (seen.includes(d)) { if (n === start) return null; continue; }
      seen.push(d);
      for (const x of flat(d, field)) if (x) { if (x === start) return null; todo.push(x); }
    }
    return seen;
  }
  function rulesOf(ix, styleName) { // the rules a style holds, with those it adopts, less those it declines
    const styles = chain(ix, styleName, 'ADOPTS', 'STYLE') || []; const out = []; const declined = new Set();
    for (const s of styles) flat(s, 'DECLINES').forEach(x => declined.add(x));
    for (const s of styles) for (const r of flat(s, 'HOLDS')) { const d = ix[r]; if (d && RULE_KINDS.includes(d.kind) && !declined.has(r) && !out.includes(d)) out.push(d); }
    return out;
  }
  function formOf(ix, name) { // the fields of a form, its own over those it extends
    const forms = chain(ix, name, 'EXTENDS', 'FORM') || []; const f = { name, decls: forms, fields: {} };
    for (const d of forms) for (const k of d.order) if (!f.fields[k]) f.fields[k] = { decl: d, field: d.fields[k] };
    return f;
  }
  const writtenOf = d => str(d, 'WRITES') || d.name.replace(/_/g, ' ');
  const langOk = (d, lang) => !d.fields.LANGUAGE || idv(d, 'LANGUAGE') === lang;

  function checkDeclarations(decls, contract) {
    const out = []; const ix = index(decls); const D = (code, d, vars, line) => out.push(diag(contract, code, d.file, line || d.line, d.name, vars));
    const seen = {};
    for (const d of decls) { if (seen[d.name]) D('DUPLICATE_DECLARATION', d, { name: d.name, first: seen[d.name].line }); else seen[d.name] = d; }
    const ref = (d, field, kinds) => { for (const x of flat(d, field)) if (x && (!ix[x] || !kinds.includes(ix[x].kind))) D('UNKNOWN_REFERENCE', d, { field, name: x, kinds: kinds.join(' or ') }, d.fields[field].line); };
    for (const d of decls) {
      if (!KINDS.includes(d.kind)) continue;
      if ((RULE_KINDS.includes(d.kind) || d.kind === 'FORM') && !str(d, 'EVIDENCE')) D('RULE_WITHOUT_EVIDENCE', d, { kind: d.kind });
      if (d.kind === 'STYLE') { ref(d, 'ADOPTS', ['STYLE']); ref(d, 'HOLDS', RULE_KINDS); ref(d, 'DECLINES', RULE_KINDS); if (chain(ix, d.name, 'ADOPTS', 'STYLE') === null) D('ADOPTION_CYCLE', d, { field: 'ADOPTS' }); }
      if (d.kind === 'FORM') { ref(d, 'EXTENDS', ['FORM']); if (chain(ix, d.name, 'EXTENDS', 'FORM') === null) D('ADOPTION_CYCLE', d, { field: 'EXTENDS' }); }
      if (RULE_KINDS.includes(d.kind)) ref(d, 'ON', ['FORM']);
      if (d.kind === 'READING') ref(d, 'ON', ['FORM']);
      if (d.kind === 'PIECE') {
        ref(d, 'FOLLOWS', ['STYLE']); ref(d, 'FORM', ['FORM']);
        const fn = idv(d, 'FORM');
        if (fn && ix[fn] && ix[fn].kind === 'FORM') { const f = formOf(ix, fn); if ((f.fields.TITLE_HOLDS || f.fields.FIRST_SENTENCE_HOLDS) && !d.fields.SUBJECT && !d.fields.SUBJECT_FROM) D('PIECE_WITHOUT_SUBJECT', d, { form: fn }); }
      }
      if (d.kind === 'PROFILE') for (const k of d.order) { if (MEASURES.includes(k)) { const b = bound(d.fields[k]); if (b && b.min !== undefined && b.max !== undefined && b.min > b.max) D('BOUND_INVERTED', d, { field: k }, d.fields[k].line); } }
      if (d.kind === 'PATTERN' && d.fields.MATCHES) {
        const lang = idv(d, 'LANGUAGE') || 'en';
        const test = (k, want, code) => { const s = str(d, k); if (s === undefined) return; const hit = judgeRule(d, [{ kind: 'prose', text: s, line: 1, headings: [] }], lang, contract, {}, true).length > 0; if (hit !== want) D(code, d, { text: s }, d.fields[k].line); };
        test('REFUSED', true, 'EXAMPLE_NOT_REFUSED'); test('WRITTEN', false, 'EXAMPLE_NOT_LAWFUL');
      }
    }
    for (const s of decls) { // a term's written word is refused by another rule of the same style
      if (s.kind !== 'STYLE') continue;
      const rules = rulesOf(ix, s.name);
      for (const t of rules) {
        if (t.kind !== 'TERM') continue; const w = tokens(writtenOf(t));
        for (const r of rules) {
          if (r === t || !['TERM', 'WORDLIST'].includes(r.kind) || !r.fields.REFUSES) continue;
          if (t.fields.LANGUAGE && r.fields.LANGUAGE && idv(t, 'LANGUAGE') !== idv(r, 'LANGUAGE')) continue;
          const es = r.fields.REFUSES.values[0] && r.fields.REFUSES.values[0].t === 'list' ? compileEntries(r.fields.REFUSES.values[0]) : null;
          if (es && findEntries(w, es).some(h => h.from === 0 && h.to === w.length)) D('TERM_REFUSED_AND_REQUIRED', t, { word: writtenOf(t), rule: r.name, style: s.name });
        }
      }
    }
    return out;
  }

  // ---------------------------------------------------------------- level 3: the text against the rules

  function maskText(s, mentions) { // inline code is a name, not prose; a short quotation is a mention
    let t = s.replace(/`[^`\n]*`/g, m => ' '.repeat(m.length));
    if (mentions) t = t.replace(/["“«][^"”»\n]{1,120}["”»]/g, m => ' '.repeat(m.length));
    return t;
  }
  function zoneOf(b, ledeBlock) { return b.list ? 'list' : b.quote ? 'quote' : b === ledeBlock ? 'lede' : 'body'; }

  // judgeRule(rule, blocks, language, contract, ctx, quiet) -> the findings of one TERM, WORDLIST or PATTERN
  function judgeRule(d, blocks, lang, contract, ctx, selfTest) {
    const out = []; const field = d.kind === 'PATTERN' ? 'MATCHES' : 'REFUSES';
    const f = d.fields[field]; if (!f || !f.values[0] || f.values[0].t !== 'list') return out;
    const entries = compileEntries(f.values[0]); if (!entries) return out;
    if (!selfTest && !langOk(d, lang)) return out;
    const mentions = idv(d, 'MENTIONS') === 'skipped'; const keeps = flat(d, 'KEEPS').filter(Boolean); const at = idv(d, 'AT');
    const zones = d.fields.IN ? flat(d, 'IN') : ['lede', 'body', 'list', 'quote'];
    const code = kwv(d, 'CODE') || DEFAULTS[d.kind][0]; const severity = idv(d, 'SEVERITY') || DEFAULTS[d.kind][1];
    const cites = ['rule:' + d.name]; const ev = str(d, 'EVIDENCE'); if (ev) cites.push('evidence:' + ev);
    const hitsAll = [];
    const scan = (text, line, zone) => {
      const masked = maskText(text, mentions); const toks = tokens(masked); if (!toks.length) return;
      const kept = keeps.length ? keptRanges(toks, keeps) : [];
      let starts = null, ends = null;
      if (at === 'sentence_start' || at === 'sentence_end') {
        starts = new Set([0]); ends = new Set([toks.length]); const re = /(?<=[.!?…])\s+(?=[A-Z«"'(\[])/g; let m;
        while ((m = re.exec(masked))) { const k = toks.findIndex(t => t.at >= m.index + m[0].length); if (k !== -1) { starts.add(k); ends.add(k); } }
      }
      for (const h of findEntries(toks, entries)) {
        if (kept.some(r => r[0] < h.to && h.from < r[1])) continue;
        let to = h.to; while (toks[to] && !isWord(toks[to].w) && /^[.!?…)"'”»]|^\.\.\.$/.test(toks[to].raw)) to++;
        if (at === 'paragraph_start' && h.from !== 0) continue;
        if (at === 'paragraph_end' && to !== toks.length && h.to !== toks.length) continue;
        if (at === 'sentence_start' && !starts.has(h.from)) continue;
        if (at === 'sentence_end' && !ends.has(to) && !ends.has(h.to)) continue;
        const hit = text.slice(toks[h.from].at, toks[h.to - 1].end);
        hitsAll.push({ hit, line: line + count(text.slice(0, toks[h.from].at), '\n'), entry: h.entry, zone });
      }
    };
    const lede = blocks.find(b => b.kind === 'prose');
    for (const b of blocks) {
      if (b.kind === 'prose') { const z = zoneOf(b, lede); if (zones.includes(z)) scan(b.text, b.line, z); }
      for (const h of b.headings || []) { const z = h.level === 1 ? 'title' : 'heading'; if (zones.includes(z)) scan(h.text, h.line, z); }
    }
    if (ctx && ctx.title && zones.includes('title') && !blocks.some(b => (b.headings || []).some(h => h.level === 1))) scan(ctx.title, 1, 'title');
    const says = str(d, 'SAYS'), written = str(d, 'WRITTEN');
    const msg = h => {
      if (d.kind === 'TERM') return '"' + h.hit + '" stands for ' + (str(d, 'MEANS') || d.name) + ': the house word is "' + (h.entry.write || writtenOf(d)) + '".';
      if (d.kind === 'WORDLIST') return '"' + h.hit + '" is on the list ' + d.name + '.' + (h.entry.write ? ' Write "' + h.entry.write + '".' : says ? ' ' + says : '');
      return (says || 'The text matches the refused pattern ' + d.name + ' ("' + h.hit + '").') + (written ? ' Written form: ' + written : h.entry.write ? ' Write "' + h.entry.write + '".' : '');
    };
    const budget = d.fields.AT_MOST ? bound({ values: [{ t: 'kw', v: 'AT_MOST' }].concat(d.fields.AT_MOST.values) }) : null;
    if (budget && !selfTest) {
      const words = ctx && ctx.words ? ctx.words : 0; const rate = words ? r1(hitsAll.length * 1000 / words) : 0;
      if (hitsAll.length && rate > budget.max && words >= (ctx.minWords || 0)) out.push(diag(contract, code, ctx.file, hitsAll[0].line, d.name, {}, { severity, level: 4, cites,
        message: 'The list ' + d.name + ' stands ' + hitsAll.length + ' times, ' + rate + ' per thousand words; the style allows ' + budget.max + '. First: "' + hitsAll[0].hit + '".' }));
      return out;
    }
    for (const h of hitsAll) out.push(diag(contract, code, ctx && ctx.file, h.line, d.name, {}, { severity, level: 3, cites, message: msg(h) }));
    return out;
  }

  const STOP = {
    en: 'a an the and or but nor so yet of in on at to for from by with without into onto over under as is are was were be been being it its this that these those there here he she they we you i his her their our your my me him them us who whom whose which what when where why how not no do does did done has have had will would can could may might must shall should if then than also very more most less least one two three each every all any some such only own same other another just about after before between through during above below up down out off again further once both few many much per via is isn aren doesn don didn won hasn haven'.split(' '),
    fr: 'le la les un une des du de d l et ou mais donc or ni car à au aux en dans sur sous par pour avec sans vers chez entre comme est sont était étaient être été ce cet cette ces il elle ils elles nous vous je tu on se sa son ses leur leurs notre nos votre vos mon ma mes qui que quoi dont où quand comment pourquoi ne pas plus moins très tout tous toute toutes chaque aucun aucune si alors aussi y a ont avait fait peut peuvent doit qu n s c j m t'.split(' '),
  };

  function judgeForm(form, doc, piece, contract, file, lang) {
    const out = []; const F = k => form.fields[k] && form.fields[k].field; const blocks = doc.blocks;
    const heads = []; for (const b of blocks) for (const h of b.headings || []) heads.push(h);
    const h1 = heads.find(h => h.level === 1);
    const title = h1 ? h1.text : doc.front.title || ''; const titleLine = h1 ? h1.line : 1;
    const cite = k => { const d = form.fields[k].decl; const c = ['rule:' + d.name]; if (str(d, 'EVIDENCE')) c.push('evidence:' + str(d, 'EVIDENCE')); return c; };
    const D = (code, line, vars, k) => out.push(diag(contract, code, file, line, piece, vars, { cites: cite(k) }));
    const subject = doc.subject || '';
    const holds = (text, term) => new RegExp('(^|[^A-Za-z\\u00C0-\\u00FF])' + term.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'), 'i').test(text);
    if (F('TITLE_WORDS') && title) { const b = bound(F('TITLE_WORDS')); const n = wc(title); if (b && b.max !== undefined && n > b.max) D('TITLE_TOO_LONG', titleLine, { n, max: b.max, title }, 'TITLE_WORDS'); }
    if (F('TITLE_HOLDS') && subject) { if (!title) D('TITLE_MISSING', 1, {}, 'TITLE_HOLDS'); else if (!holds(title, subject)) D('TITLE_WITHOUT_SUBJECT', titleLine, { subject, title }, 'TITLE_HOLDS'); }
    const prose = blocks.filter(b => b.kind === 'prose' && !(b.zone && doc.exempt && doc.exempt(b.zone, 'LEDE_WITHOUT_SUBJECT')));
    const under = h1 ? prose.filter(b => b.line > h1.line) : prose; // the first sentence under the title: a kicker above the title is not the lede
    if (F('FIRST_SENTENCE_HOLDS') && subject && under.length) { const s = sentences(under[0].text)[0] || under[0].text; if (!holds(s, subject)) D('LEDE_WITHOUT_SUBJECT', under[0].line, { subject }, 'FIRST_SENTENCE_HOLDS'); }
    if (F('SAY_ONCE')) {
      const limit = F('SAY_ONCE').values[1].v; const stop = new Set(STOP[lang] || STOP.en); const subj = new Set(tokens(subject).map(t => t.w));
      const seen = {}; let n = 0; const units = [{ text: title, line: titleLine }];
      for (const b of blocks) { for (const h of b.headings || []) if (h !== h1) units.push({ text: h.text, line: h.line }); if (b.kind === 'prose') units.push({ text: b.text, line: b.line }); }
      const told = new Set();
      outer: for (const u of units) {
        const toks = tokens(maskText(u.text, false)); let prev = null;
        for (const t of toks) {
          if (!isWord(t.w)) { prev = null; continue; }
          if (++n > limit) break outer;
          const content = !stop.has(t.w) && t.w.length > 2 && !/^\d+$/.test(t.w);
          if (content && prev) {
            const pair = prev + ' ' + t.w;
            if (!(subj.has(prev) || subj.has(t.w))) { if (seen[pair] && !told.has(pair)) { told.add(pair); D('SAY_ONCE', u.line + count(u.text.slice(0, t.at), '\n'), { pair, first: seen[pair], limit }, 'SAY_ONCE'); } else if (!seen[pair]) seen[pair] = u.line; }
          }
          prev = content ? t.w : null;
        }
      }
    }
    if (F('HEADINGS')) {
      const want = form.fields.HEADINGS.decl.fields.HEADINGS.values[0].items.map(it => String(it[0].v)); const h2 = heads.filter(h => h.level === 2);
      const norm = s => s.toLowerCase().replace(/\s+/g, ' ').trim(); let last = -1;
      for (const w of want) { const k = h2.findIndex(h => norm(h.text) === norm(w)); if (k === -1) D('HEADING_MISSING', titleLine, { heading: w }, 'HEADINGS'); else { if (k < last) D('HEADING_OUT_OF_ORDER', h2[k].line, { heading: w }, 'HEADINGS'); last = Math.max(last, k); } }
    }
    if (F('HEADING_CASE') && idv(form.fields.HEADING_CASE.decl, 'HEADING_CASE') === 'sentence') {
      for (const h of heads) { const ws = h.text.split(/\s+/).filter(w => /^[A-Za-zÀ-ÿ]{4,}/.test(w)); if (ws.length >= 3 && ws.every(w => /^[A-ZÀ-Þ][a-zà-ÿ]/.test(w))) D('HEADING_NOT_SENTENCE_CASE', h.line, { heading: h.text }, 'HEADING_CASE'); }
    }
    if (F('CLOSES_WITHOUT')) {
      const refused = flat(form.fields.CLOSES_WITHOUT.decl, 'CLOSES_WITHOUT').filter(Boolean).map(s => s.toLowerCase());
      const h2 = heads.filter(h => h.level === 2); const lastH = h2[h2.length - 1]; const lastP = prose[prose.length - 1];
      for (const r of refused) {
        if (lastH && holds(lastH.text, r)) { D('CLOSES_ON_SUMMARY', lastH.line, { phrase: r }, 'CLOSES_WITHOUT'); break; }
        if (lastP && lastP.text.toLowerCase().startsWith(r)) { D('CLOSES_ON_SUMMARY', lastP.line, { phrase: r }, 'CLOSES_WITHOUT'); break; }
      }
    }
    if (F('HOLES_CLOSED_AT') && flat(form.fields.HOLES_CLOSED_AT.decl, 'HOLES_CLOSED_AT').includes(doc.front.status || '')) {
      for (const b of blocks) if (b.kind === 'prose') { let m; const re = /\[AUTHOR:[^\]]*\]/g; while ((m = re.exec(b.text))) D('HOLE_OPEN', b.line + count(b.text.slice(0, m.index), '\n'), { hole: m[0].slice(0, 60), status: doc.front.status }, 'HOLES_CLOSED_AT'); }
    }
    return out;
  }

  // judge(decls, target, text, opts) -> the findings on one text.
  // target: { piece } or { style, form, subject, language }. opts: { contract, level, file }.
  function judge(decls, target, text, opts) {
    opts = opts || {}; const contract = opts.contract; const level = opts.level || 4; const file = opts.file || '';
    const ix = index(decls); let out = []; const t = Object.assign({}, target);
    const piece = t.piece ? ix[t.piece] : null;
    if (piece) { t.style = t.style || idv(piece, 'FOLLOWS'); t.form = t.form || idv(piece, 'FORM'); t.subject = t.subject || str(piece, 'SUBJECT'); t.language = t.language || idv(piece, 'LANGUAGE'); }
    const doc = read(text, file);
    if (!t.subject && piece && idv(piece, 'SUBJECT_FROM') === 'front_matter') t.subject = doc.front.subject || '';
    const lang = t.language || doc.front.lang || doc.front.language || 'en';
    doc.subject = t.subject || '';
    const zones = {}; for (const d of decls) if (d.kind === 'ZONE') zones[d.name] = flat(d, 'EXEMPT_FROM');
    doc.exempt = (z, code) => !!(zones[z] && zones[z].includes(code));
    const name = piece ? piece.name : t.style || '';
    if (level >= 3) {
      const m = measure(doc.blocks);
      const ctx = { file, title: doc.front.title || '', words: m.words, minWords: 0 };
      const rules = rulesOf(ix, t.style);
      for (const r of rules) {
        if (r.kind === 'PROFILE') continue;
        if (r.fields.ON && t.form && !flat(r, 'ON').includes(t.form) && !(chain(ix, t.form, 'EXTENDS', 'FORM') || []).some(f => flat(r, 'ON').includes(f.name))) continue;
        if (r.fields.ON && !t.form) continue;
        out = out.concat(judgeRule(r, doc.blocks, lang, contract, ctx, false));
      }
      if (t.form && ix[t.form]) { if (piece && doc.front.subject === undefined && !t.subject && idv(piece, 'SUBJECT_FROM') === 'front_matter') out.push(diag(contract, 'SUBJECT_NOT_FOUND', file, 1, name, {})); out = out.concat(judgeForm(formOf(ix, t.form), doc, name, contract, file, lang)); }
      if (level >= 4) {
        for (const r of rules) {
          if (r.kind !== 'PROFILE' || !langOk(r, lang)) continue;
          if (r.fields.ON && (!t.form || !flat(r, 'ON').includes(t.form))) continue;
          const min = numv(r, 'MIN_WORDS') === undefined ? 300 : numv(r, 'MIN_WORDS'); if (m.words < min) continue;
          const cites = ['rule:' + r.name]; if (str(r, 'EVIDENCE')) cites.push('evidence:' + str(r, 'EVIDENCE'));
          for (const k of r.order) {
            if (!MEASURES.includes(k)) continue; const b = bound(r.fields[k]); if (!b) continue; const v = measured(m, k, b);
            if ((b.min !== undefined && v < b.min) || (b.max !== undefined && v > b.max)) out.push(diag(contract, kwv(r, 'CODE') || 'OFF_PROFILE', file, 1, k + (b.threshold !== undefined ? ' ' + b.threshold : ''), {}, {
              severity: idv(r, 'SEVERITY') || 'warning', level: 4, cites, message: 'The measure ' + k + (b.threshold !== undefined ? ' ' + b.threshold : '') + ' is ' + v + '; the profile ' + r.name + ' asks ' + b.text + '.' }));
          }
        }
      }
      out = out.filter(d => d.level <= level);
      // zones excuse what they declare
      const zoneAt = line => { let z = null; for (const b of doc.blocks) { if (b.line > line) break; z = b.zone; } return z; };
      out = out.filter(d => { const z = zoneAt(d.span.line); return !(z && doc.exempt(z, d.code)); });
      // an ALLOW excuses one line with a reason, and fails when it no longer matches a line
      const lines = text.replace(/\r\n?/g, '\n').split('\n');
      for (const a of decls) {
        if (a.kind !== 'ALLOW' || !opts.allowMatches || !opts.allowMatches(a, file)) continue;
        const holds = str(a, 'LINE_HOLDS') || ''; const code = kwv(a, 'EXCUSES');
        const at = []; lines.forEach((l, k) => { if (holds && l.includes(holds)) at.push(k + 1); });
        const blockLines = ln => { const b = doc.blocks.filter(x => x.line <= ln).pop(); return b ? [b.line, b.line + count(b.text, '\n')] : [ln, ln]; };
        const before = out.length;
        out = out.filter(d => !(d.code === code && at.some(ln => { const r = blockLines(ln); return d.span.line === ln || (d.span.line >= r[0] && d.span.line <= r[1] && lines[d.span.line - 1] && lines[d.span.line - 1].includes(holds)); })));
        if (!at.length || out.length === before) out.push(diag(contract, 'ALLOW_STALE', a.file, a.line, a.name, { code, holds }));
      }
    }
    out.sort((a, b) => a.span.line - b.span.line || (a.code < b.code ? -1 : a.code > b.code ? 1 : 0));
    return { diagnostics: out, doc, language: lang, style: t.style, form: t.form, subject: t.subject };
  }

  // ---------------------------------------------------------------- the report

  function reportText(diags, files, level) {
    const L = [];
    for (const d of diags) {
      L.push(d.span.file + ':' + d.span.line + '  ' + d.severity + '  ' + d.code + (d.subject ? '  ' + d.subject : ''));
      L.push('    ' + d.message);
      const rule = d.cites.find(c => c.startsWith('rule:')), ev = d.cites.find(c => c.startsWith('evidence:'));
      if (rule) L.push('    Rule ' + rule.slice(5) + (ev ? ' · ' + ev.slice(9) : ''));
      L.push('');
    }
    const e = diags.filter(d => d.severity === 'error').length, w = diags.filter(d => d.severity === 'warning').length;
    L.push(e + ' error(s), ' + w + ' warning(s) across ' + files + ' file(s) at level ' + level);
    return L.join('\n');
  }
  function envelope(diags) {
    return { diagnostics: diags.map(d => ({ code: d.code, severity: d.severity, message: d.message, span: d.span, cites: d.cites, language: 'prosa', level: d.level, subject: d.subject })) };
  }

  // brief(decls, target) -> the contract an AI agent receives before it drafts. It states what to write.
  function brief(decls, target) {
    const ix = index(decls); const t = Object.assign({}, target); const piece = t.piece ? ix[t.piece] : null;
    if (piece) { t.style = idv(piece, 'FOLLOWS'); t.form = idv(piece, 'FORM'); t.subject = t.subject || str(piece, 'SUBJECT'); t.language = idv(piece, 'LANGUAGE'); }
    const lang = t.language || 'en'; const rules = rulesOf(ix, t.style).filter(r => langOk(r, lang)); const L = [];
    L.push('# The writing contract of ' + (piece ? 'the piece ' + piece.name : 'the style ' + t.style), '');
    L.push('This contract states the declared style ' + t.style + ' for a text in language `' + lang + '`. The Prosa court judges the text against it after every write.', '');
    if (t.form && ix[t.form]) {
      const f = formOf(ix, t.form); const F = k => f.fields[k] && f.fields[k].field; L.push('## The form: ' + t.form, '');
      if (F('TITLE_WORDS')) L.push('- The title holds ' + bound(F('TITLE_WORDS')).text + ' words.');
      if (F('TITLE_HOLDS')) L.push('- The title names the subject' + (t.subject ? ', "' + t.subject + '"' : '') + '.');
      if (F('FIRST_SENTENCE_HOLDS')) L.push('- The first sentence names the subject' + (t.subject ? ', "' + t.subject + '",' : '') + ' and says what it is.');
      if (F('SAY_ONCE')) L.push('- A statement is made once in the first ' + F('SAY_ONCE').values[1].v + ' words: each line adds a fact the line above lacks.');
      if (F('HEADINGS')) L.push('- The sections are, in this order: ' + flat(f.fields.HEADINGS.decl, 'HEADINGS').join(' / ') + '.');
      if (F('HEADING_CASE')) L.push('- Headings are written in sentence case.');
      if (F('CLOSES_WITHOUT')) L.push('- The text closes on something new for the reader; it does not close on: ' + flat(f.fields.CLOSES_WITHOUT.decl, 'CLOSES_WITHOUT').join(', ') + '.');
      if (F('HOLES_CLOSED_AT')) L.push('- A particular only the author knows is marked `[AUTHOR: what is needed]` and left open.');
      L.push('');
    }
    const terms = rules.filter(r => r.kind === 'TERM');
    if (terms.length) { L.push('## One thing, one word', ''); for (const r of terms) L.push('- Write "' + writtenOf(r) + '" for ' + str(r, 'MEANS') + ' (in place of: ' + r.fields.REFUSES.values[0].items.map(it => String(it[0].v)).join(', ') + ').'); L.push(''); }
    const pats = rules.filter(r => r.kind === 'PATTERN');
    if (pats.length) {
      L.push('## Written forms', '');
      for (const r of pats) { const w = str(r, 'WRITTEN'), x = str(r, 'REFUSED'), s = str(r, 'SAYS'); L.push('- ' + (s || 'Rule ' + r.name + '.') + (w ? ' Written: *' + w + '*' : '') + (x ? ' Refused: *' + x + '*' : '')); }
      L.push('');
    }
    const show = v => (v.t === 'list' ? v.items.map(x => x.map(show).join(' ')).join(' / ') : v.t === 'kw' ? (v.v === 'WITHIN' ? '...' : v.v === 'EMOJI' ? 'an emoji' : '') : v.t === 'num' ? '' : String(v.v));
    const lists = rules.filter(r => r.kind === 'WORDLIST');
    if (lists.length) {
      L.push('## Words', '');
      for (const r of lists) {
        const items = r.fields.REFUSES.values[0].items; const swaps = items.filter(it => it.some(v => v.t === 'kw' && v.v === 'WRITE'));
        const budget = r.fields.AT_MOST ? ' (at most ' + r.fields.AT_MOST.values[0].v + ' per thousand words)' : '';
        if (swaps.length) L.push('- ' + r.name + ': ' + swaps.map(it => 'write "' + it[it.length - 1].v + '" where "' + it.slice(0, -2).map(show).join(' ') + '" would come').join('; ') + '.');
        const bare = items.filter(it => !swaps.includes(it)).map(it => it.map(show).join(' '));
        if (bare.length) L.push('- The sentence stands without the words of the list ' + r.name + budget + ': ' + bare.slice(0, 24).join(', ') + (bare.length > 24 ? ', and ' + (bare.length - 24) + ' more' : '') + '.');
      }
      L.push('');
    }
    const profs = rules.filter(r => r.kind === 'PROFILE');
    if (profs.length) {
      L.push('## The measure of the voice', '');
      const say = { SENTENCE_MEDIAN: 'The median sentence holds', SENTENCES_OVER: 'Sentences over', SENTENCES_UNDER: 'Sentences under', DASHES: 'Dashes:', COLONS: 'Colons:', EXCLAMATIONS: 'Exclamations:', COLD_EXCLAMATIONS: 'Exclamations away from a run or a result:', QUESTIONS: 'Questions:', ELLIPSES: 'Paragraphs that end on an ellipsis:', COLON_LEADS: 'Paragraphs that end on a colon before prose:', ONE_SENTENCE_PARAGRAPHS: 'Paragraphs of one sentence:' };
      for (const r of profs) for (const k of r.order) { if (!MEASURES.includes(k)) continue; const b = bound(r.fields[k]); L.push('- ' + say[k] + ' ' + (b.threshold !== undefined ? b.threshold + ' words: ' : '') + b.text + (k === 'SENTENCE_MEDIAN' ? ' words' : '') + '.'); }
      L.push('');
    }
    L.push('## The loop', '', 'Draft, run `prosa check <file> --json`, and repair each finding by its code until the court is silent. A finding names the rule, the written form and the ruling it comes from.');
    return L.join('\n') + '\n';
  }

  // drift(draftBlocks, corpusBlocks) -> what the drafts over-use against the corpus, as candidates for the author's ruling
  function drift(draftBlocks, corpusBlocks, opts) {
    opts = opts || {}; const minCount = opts.minCount || 3, minRatio = opts.minRatio || 4; const stop = new Set(STOP[opts.language || 'en']);
    const grams = blocks => {
      const c = {}; let words = 0;
      for (const b of blocks) {
        if (b.kind !== 'prose') continue; const toks = tokens(maskText(b.text, false)).map(t => t.w);
        for (let i = 0; i < toks.length; i++) {
          if (isWord(toks[i])) words++;
          for (let n = 1; n <= 3; n++) {
            const g = toks.slice(i, i + n); if (g.length < n || !g.every(isWord)) continue;
            // a mark of style is a turn of phrase, not a topic: two or three words, one content word at most
            if (n === 1 || g.filter(w => !stop.has(w)).length > 1 || (g.every(w => stop.has(w)) && n < 3)) continue;
            const key = g.join(' '); c[key] = (c[key] || 0) + 1;
          }
        }
      }
      return { c, words };
    };
    const a = grams(draftBlocks), b = grams(corpusBlocks); const out = [];
    for (const k of Object.keys(a.c)) {
      if (a.c[k] < minCount) continue;
      const ra = a.c[k] * 1000 / Math.max(1, a.words), rb = ((b.c[k] || 0) + 0.5) * 1000 / Math.max(1, b.words);
      if (ra / rb >= minRatio) out.push({ phrase: k, drafts: a.c[k], draftsPerK: Math.round(ra * 100) / 100, corpus: b.c[k] || 0, corpusPerK: Math.round(((b.c[k] || 0) * 1000 / Math.max(1, b.words)) * 100) / 100, ratio: r1(ra / rb) });
    }
    out.sort((x, y) => y.ratio * Math.log(1 + y.drafts) - x.ratio * Math.log(1 + x.drafts));
    const kept = []; for (const o of out) { if (!kept.some(k => k.phrase.includes(o.phrase) && k.drafts >= o.drafts * 0.8)) kept.push(o); if (kept.length >= (opts.top || 30)) break; }
    const ma = measure(draftBlocks), mb = measure(corpusBlocks); const perK = (m, v) => r1(v * 1000 / Math.max(1, m.words));
    const marks = [['dashes', 'DASHES'], ['colons', 'COLONS'], ['excl', 'EXCLAMATIONS'], ['questions', 'QUESTIONS']].map(([k, n]) => ({ measure: n, draftsPerK: perK(ma, ma[k]), corpusPerK: perK(mb, mb[k]) }));
    marks.push({ measure: 'SENTENCE_MEDIAN', draftsPerK: ma.median, corpusPerK: mb.median });
    return { phrases: kept, marks, draftWords: a.words, corpusWords: b.words };
  }

  return { VERSION, KINDS, RULE_KINDS, MEASURES, ZONES, parse, checkDeclarations, judge, judgeRule, read, readMarkdown, readHtml, sentences, measure, pool, measured, bound,
    tokens, compileEntries, findEntries, rulesOf, formOf, index, flat, str, idv, kwv, numv, reportText, envelope, brief, drift, diag };
});
