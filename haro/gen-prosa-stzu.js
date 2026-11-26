// Generates haro/prosa.stzu from Prosa's own data:  node haro/gen-prosa-stzu.js
//
// The kinds, the measures and the zones come from tools/prosa/prosa.js. The summaries of the diagnostics come from
// conformance/violations.json. The per-kind field table, the positions and the required fields are not exported by
// prosa.js, so this file keeps its own table (TABLE below) and checks it against the reference court before it writes:
// every field of the table must be a field the court knows, every field the court requires must be marked required
// here, and every word of a closed vocabulary must be a word the court accepts. A table that drifts stops the run.
//
// Required from another script (the judge), this file writes nothing and exports the table.
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const R = p => path.join(ROOT, p);
const P = require(R('tools/prosa/prosa.js'));
const contract = JSON.parse(fs.readFileSync(R('conformance/violations.json'), 'utf8'));
const V = contract.violations;

const low = s => s.toLowerCase();
const KINDS = P.KINDS.map(low);
const RULE_KINDS = P.RULE_KINDS.map(low);
const MEASURES = P.MEASURES.map(low);
const ZONES = P.ZONES.slice();
// Not exported by prosa.js: the same words as its POSITIONS, its severity check and its MENTIONS check.
const POSITIONS = ['sentence_start', 'sentence_end', 'paragraph_start', 'paragraph_end'];
const SEVERITIES = ['error', 'warning'];
const MENTION_MODES = ['skipped', 'judged'];

// ------------------------------------------------------------------ the field table
// One row per field: [FIELD, the shape prosa.js reads, the seat type declared here]. The order is the order of
// doc/language/DECLARATIONS.md. The shapes are those of FIELDS in prosa.js: str id num code severity ids codes words
// entries bound budget first any.
const COMMON = [
  ['EVIDENCE', 'str', 'text'], ['CODE', 'code', 'name'], ['SEVERITY', 'severity', 'severities'], ['LANGUAGE', 'id', 'name'],
  ['ON', 'ids', '[form]'], ['IN', 'ids', '[zones]'], ['MENTIONS', 'id', 'mention_modes'], ['KEEPS', 'words', '[phrase]'], ['SAYS', 'str', 'text'],
];
const TABLE = {
  style: [['HOLDS', 'ids', '[rule]'], ['ADOPTS', 'ids', '[style]'], ['DECLINES', 'ids', '[rule]'], ['LANGUAGES', 'ids', '[tongue]'], ['MEASURED_FROM', 'str', 'text']],
  term: [['MEANS', 'str', 'text'], ['REFUSES', 'entries', '[entry]'], ['WRITES', 'str', 'text'], ...COMMON],
  wordlist: [['REFUSES', 'entries', '[entry]'], ['AT_MOST', 'budget', 'text'], ...COMMON],
  pattern: [['MATCHES', 'entries', '[entry]'], ['AT', 'id', 'positions'], ['REFUSED', 'str', 'text'], ['WRITTEN', 'str', 'text'], ['AT_MOST', 'budget', 'text'], ...COMMON],
  profile: [...P.MEASURES.map(m => [m, 'bound', 'text']), ['MIN_WORDS', 'num', 'number'],
    ['EVIDENCE', 'str', 'text'], ['CODE', 'code', 'name'], ['SEVERITY', 'severity', 'severities'], ['LANGUAGE', 'id', 'name'], ['ON', 'ids', '[form]']],
  form: [['EXTENDS', 'id', 'form'], ['TITLE_WORDS', 'bound', 'text'], ['TITLE_HOLDS', 'id', 'name'], ['FIRST_SENTENCE_HOLDS', 'id', 'name'], ['SAY_ONCE', 'first', 'text'],
    ['HEADINGS', 'words', '[phrase]'], ['HEADING_CASE', 'id', 'name'], ['CLOSES_WITHOUT', 'words', '[phrase]'], ['HOLES_CLOSED_AT', 'ids', '[status]'], ['EVIDENCE', 'str', 'text']],
  zone: [['EXEMPT_FROM', 'codes', '[excused]'], ['REASON', 'str', 'text']],
  piece: [['FILE', 'str', 'text'], ['FILES', 'str', 'text'], ['FOLLOWS', 'id', 'style'], ['FORM', 'id', 'form'], ['SUBJECT', 'str', 'text'], ['SUBJECT_FROM', 'id', 'name'],
    ['LANGUAGE', 'id', 'name'], ['READER', 'any', 'text']],
  allow: [['FILE', 'str', 'text'], ['LINE_HOLDS', 'str', 'text'], ['EXCUSES', 'code', 'name'], ['REASON', 'str', 'text']],
  reading: [['ON', 'id', 'form'], ['ASKS', 'str', 'text'], ['RECORDS', 'str', 'text'], ['EVIDENCE', 'str', 'text']],
};
// What a reference seat names, in the words of UNKNOWN_REFERENCE ({kinds}).
const REFERS = { '[rule]': P.RULE_KINDS.join(' or '), '[style]': 'STYLE', style: 'STYLE', '[form]': 'FORM', form: 'FORM' };

// ------------------------------------------------------------------ the table, checked against the reference court
const ids = src => P.parse(src, 'probe.proz', contract).diagnostics;
const REQUIRED = {};
for (const k of KINDS) {
  const K = k.toUpperCase();
  // The court names each required field in MISSING_FIELD on an empty declaration. PIECE's "FILE or FILES" is one of two, declared as a constraint.
  const need = ids(`DEFINE ${K} probe ()`).filter(d => d.code === 'MISSING_FIELD').map(d => (/needs the field ([A-Z_]+)\.$/.exec(d.message) || [])[1]).filter(Boolean);
  REQUIRED[k] = need;
  const mine = TABLE[k].map(r => r[0]);
  for (const f of need) if (!mine.includes(f)) throw new Error(`the court requires ${K}.${f} and the table of gen-prosa-stzu.js does not hold it`);
  for (const f of mine) if (ids(`DEFINE ${K} probe ( ${f} "x" )`).some(d => d.code === 'UNKNOWN_FIELD')) throw new Error(`${K}.${f} stands in the table of gen-prosa-stzu.js and the court does not know it`);
}
{
  const ok = (K, f, w) => !ids(`DEFINE ${K} probe ( ${f} ${w} )`).some(d => d.code === 'BAD_VALUE');
  const closed = [['PATTERN', 'AT', POSITIONS, w => w], ['TERM', 'SEVERITY', SEVERITIES, w => w], ['TERM', 'MENTIONS', MENTION_MODES, w => w], ['TERM', 'IN', ZONES, w => `[${w}]`]];
  for (const [K, f, words, wr] of closed) {
    for (const w of words) if (!ok(K, f, wr(w))) throw new Error(`the court refuses ${f} ${w}, a word of this file's vocabulary`);
    if (ok(K, f, wr('no_such_word'))) throw new Error(`the court accepts any word in ${f}: the vocabulary is not closed`);
  }
}

if (require.main !== module) { module.exports = { TABLE, REQUIRED, KINDS, RULE_KINDS, MEASURES, ZONES, POSITIONS, SEVERITIES, MENTION_MODES }; return; }

// ------------------------------------------------------------------ the writer
const out = [];
const w = (s = '') => out.push(s);
const q = s => { if (s.includes('"')) throw new Error('a text of the Commons holds no double quote: ' + s); return '"' + s + '"'; };
const say = (code, vars) => V[code].summary.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m)).replace(/\.$/, '');
const cites = code => `["rule:${code}"]`;
const levelOf = n => Object.keys(V).filter(c => V[c].level === n);
const CARRIED = new Map(); // code -> how
const carry = (code, how) => CARRIED.set(code, how);

// ---- header
w('-- prosa.stzu -- Prosa, declared as a Haro language');
w('--');
w('-- GENERATED by haro/gen-prosa-stzu.js from Prosa\'s own data: the kinds, the measures and the zones of');
w('-- tools/prosa/prosa.js, the summaries of conformance/violations.json, and a field table the generator keeps and');
w('-- checks against the reference court on every run. Judged by the Haro meta-court and forged into a court:');
w('--     haro haro.haro prosa.stzu             (haro/spike, the meta-court)');
w('--     haro forge.haro prosa.stzu <out dir>  (haro/spike, the forge: prosa_court.haro and prosa.gbnf)');
w('-- The reference court (tools/prosa/prosa.js) is unchanged and is not replaced by this file. This file declares what');
w('-- the meta-language carries of Prosa; the SEAMS below count what it does not carry.');
w('--');
w('-- Words are lower_snake here and UPPER in a .proz file (STYLE, HOLDS): the meta-language reserves UPPER_SNAKE for its');
w('-- own keywords, and Zayn made the same trade. A code a rule names (CODE LACK_LISTED) is a lower_snake name here.');
w('--');
w(`-- SEAMS -- what the meta-language of 2026-11-26 does not carry, counted against violations.json (${Object.keys(V).length} codes):`);
w('--   S1  the text: levels 3, 4 and 5 judge a written text against the declaration (' + levelOf(3).length + ' codes of level 3, ' + levelOf(4).length + ' of level 4,');
w('--       and every code a style declares). A declared language judges declarations, so the text stays with prosa.js.');
w('--   S2  one clause, one value: a clause of the Commons holds one value, and a Prosa field holds a run of values. A bound');
w('--       (DASHES AT_MOST 4 PER_THOUSAND), a budget, FIRST 150 and each entry of REFUSES or MATCHES ("never" WITHIN 3 "run")');
w('--       reach the court as one text, and a phrase list reaches it as a list of texts. The boundary is the judge\'s');
w('--       translator. BAD_VALUE is carried for the four closed vocabularies (zones, positions, severities, mention');
w('--       modes); the inner grammar of a bound and of an entry is not declared here, so DASHES SOMETIMES is judged clean.');
w('--   S3  arithmetic: BOUND_INVERTED compares the two ends of a bound, and the condition language compares a seat with a');
w('--       written number. It is not carried.');
w('--   S4  the rule run on its own example: EXAMPLE_NOT_REFUSED and EXAMPLE_NOT_LAWFUL run a PATTERN on its REFUSED and');
w('--       WRITTEN sentences. A condition is read and is never run, so the self-test stays with prosa.js.');
w('--   S5  a match across declarations: TERM_REFUSED_AND_REQUIRED matches the word a TERM writes against the entries of');
w('--       every other rule its style reaches through HOLDS and ADOPTS, less DECLINES. The condition language joins');
w('--       declarations by name and has no test of a word against an entry.');
w('--   S6  inheritance: EXTENDS holds one name, and the relation cyclic reads a list of references. A cycle of forms is');
w('--       carried to three steps, written out, and PIECE_WITHOUT_SUBJECT reads the form a piece names and the form');
w('--       that one extends, two steps. prosa.js follows EXTENDS to its end. A cycle of styles is carried whole by');
w('--       ADOPTS cyclic.');
w('--   S7  codes: UNKNOWN_FIELD is refused as UNKNOWN_CLAUSE, DUPLICATE_FIELD, UNEXPECTED_TOKEN and UNTERMINATED_STRING');
w('--       as PARSE, and DUPLICATE_DECLARATION as DUPLICATE_NAME. Each is refused; the code spoken is the court\'s own.');
w('--       A value of the wrong shape (a name where a text stands) is refused as PARSE and not as BAD_VALUE.');
w('--   S8  the reader stops: a refusal of the reader of the court (PARSE, UNKNOWN_CLAUSE, UNKNOWN_KIND, DUPLICATE_NAME) ends the');
w('--       judgment at the first one, and prosa.js reports every finding of level 1. The findings of the menus, the');
w('--       constraints and the references are all reported, as prosa.js reports them.');
w('--   S9  RATIONALE: the Commons makes RATIONALE mandatory on every declaration, and a .proz declaration has none. At');
w('--       the boundary a declaration reaches the court with RATIONALE "none given". EVIDENCE is Prosa\'s own reason, and');
w('--       it stays a seat.');
w('--   S10 USE: a .proz file reads other files with USE, and names are global across them. The court judges one');
w('--       sentence; the boundary hands it the files already joined.');
w('--   S11 cites: violations.json binds a code to its invariant and to no rule, article, right or pattern. Each CITES');
w('--       names the diagnostic itself (rule:<CODE>), the form the cite list of the meta-language accepts. The court');
w('--       speaks UNKNOWN_KIND with an empty cite list: the CITES of unknown_declaration reach a NAMED word only.');
w('--   S12 a universal field: EVIDENCE, CODE, SEVERITY, LANGUAGE, ON, IN, MENTIONS, KEEPS and SAYS belong to several');
w('--       kinds, and the meta-language has no seat shared by kinds, so they repeat on each.');
w('--   S13 open words: TITLE_HOLDS, FIRST_SENTENCE_HOLDS, HEADING_CASE and SUBJECT_FROM read one word each in');
w('--       DECLARATIONS.md (subject, sentence, front_matter), and prosa.js reads any name there. They are names here, as');
w('--       in the reference court. The menus kinds and measures record two closed vocabularies that no seat is typed by:');
w('--       a kind is a DECLARATION and a measure is a seat of PROFILE.');
w('--   S14 the decoder grammar: the forge writes HOLDS and DECLINES, two lists of references to a UNION of kinds, as one');
w('--       name in prosa.gbnf. The court reads the list. The grammar holds the shape of every other clause.');
w('--');
w('-- MEASURED 2026-11-26 by haro/judge-prosa-court.js, on the forge of haro commit 989d6e6: the 66 fixtures of');
w('-- conformance/manifest.json, each translated mechanically into the Commons shape and judged at level 2 by the court');
w('-- forged from this file. 56 agree with prosa.js: all 50 declarations that are lawful at level 2 are judged clean, and');
w('-- 6 of the 16 refused ones are refused under the same code (MISSING_FIELD, UNKNOWN_KIND, RULE_WITHOUT_EVIDENCE,');
w('-- UNKNOWN_REFERENCE, ADOPTION_CYCLE, PIECE_WITHOUT_SUBJECT). 10 differ, and each is a named seam with one row in');
w('-- haro/twin-expected.csv, which the judge enforces as a ratchet: 5 are refused under a code of the court (S7), and 5');
w('-- are judged clean: a bound that is not a bound (S2), BOUND_INVERTED (S3), the two examples (S4) and');
w('-- TERM_REFUSED_AND_REQUIRED (S5).');
w('');
w('DEFINE LANGUAGE prosa AS (');
w(`  VERSION ${q(P.VERSION.language)}, GRAMMAR ${q(P.VERSION.language)},`);
w(`  COURT ${q('conformance/manifest.json')},`);
w(`  EXTENSION ${q('.proz')}`);
w(') RATIONALE "What a written text owes its reader, declared before the text is judged: ten declaration kinds, a style and the rules it holds, a form, a piece bound to both, and every excuse with its reason"');
w('');

// ---- menus
w('-- ---- the closed vocabularies -----------------------------------------------------------');
w('');
const menu = (name, words, msg, code, why) => {
  w(`DEFINE MENU ${name} AS (`);
  w(`  WORDS [${words.join(', ')}],`);
  w(`  MESSAGE ${q(msg)},`);
  w(`  CODE ${q(code)},`);
  w(`  CITES ${cites(code)}`);
  w(`) RATIONALE ${q(why)}`);
  w('');
};
menu('kinds', KINDS, 'The kinds are closed: ' + P.KINDS.join(', '), 'UNKNOWN_KIND',
  'STYLE groups rules; TERM, WORDLIST, PATTERN and PROFILE are the four kinds of rule; FORM declares a structure; ZONE and ALLOW excuse; PIECE binds a text; READING names a judgment that stays with a reader');
menu('zones', ZONES, say('BAD_VALUE', { field: 'IN', why: 'zones are ' + ZONES.join(', ') }), 'BAD_VALUE',
  'Where a rule reads in a text; a rule with no IN reads lede, body, list and quote');
menu('positions', POSITIONS, say('BAD_VALUE', { field: 'AT', why: 'one of ' + POSITIONS.join(', ') }), 'BAD_VALUE',
  'Where in a sentence or a paragraph a PATTERN is refused');
menu('severities', SEVERITIES, say('BAD_VALUE', { field: 'SEVERITY', why: 'error or warning is expected' }), 'BAD_VALUE',
  'A finding refuses or warns; TERM and PATTERN default to error, WORDLIST and PROFILE to warning');
menu('measures', MEASURES, 'A measure of a PROFILE is one of: ' + P.MEASURES.join(', '), 'UNKNOWN_FIELD',
  'The eleven measures of a voice; each is a seat of PROFILE and holds a bound');
menu('mention_modes', MENTION_MODES, say('BAD_VALUE', { field: 'MENTIONS', why: 'skipped or judged is expected' }), 'BAD_VALUE',
  'A short quotation is a mention: skipped leaves it out, judged reads it as use');
carry('UNKNOWN_KIND', 'the court refuses a kind it does not declare'); carry('BAD_VALUE', 'the four closed vocabularies (S2)');

// ---- forms
w('-- ---- the forms: what a list holds --------------------------------------------------------');
w('');
for (const [n, t, d] of [
  ['entry', 'text', 'One refused construction of REFUSES or MATCHES, with its WITHIN and its WRITE, as one text (S2)'],
  ['phrase', 'text', 'One word or phrase of KEEPS, HEADINGS or CLOSES_WITHOUT'],
  ['tongue', 'name', 'One language a style is written for: en, fr'],
  ['status', 'name', 'One status of the front matter at which a hole is refused: review, published'],
  ['excused', 'name', 'One code a zone excuses; a code is UPPER_SNAKE in a .proz file and lower_snake here'],
]) {
  w(`DEFINE FORM ${n} AS (`);
  w(`  SEATS [value: ${t}]`);
  w(`) RATIONALE ${q(d)}`);
  w('');
}
w('DEFINE UNION rule AS (');
w(`  OF [${RULE_KINDS.join(', ')}],`);
w(`  MESSAGE ${q(say('UNKNOWN_REFERENCE', { field: 'A rule seat', name: '{value}', kinds: REFERS['[rule]'] }))},`);
w('  CODE "UNKNOWN_REFERENCE",');
w(`  CITES ${cites('UNKNOWN_REFERENCE')}`);
w(') RATIONALE "The four kinds of rule a style holds or declines"');
w('');

// ---- declarations
w('-- ---- the ten kinds ---------------------------------------------------------------------');
w('-- A required seat carries no question mark, and its absence is MISSING_FIELD in the kind\'s own words. A seat typed by');
w('-- a kind is a reference, and a name that resolves to nothing is UNKNOWN_REFERENCE. A seat that is both (FOLLOWS on');
w('-- PIECE, ON on READING) is written optional with the reference\'s code, and a constraint speaks MISSING_FIELD.');
w('');
const kindWhy = {
  style: 'A named set of rules: the voice of a house, or a set a house adopts. Its rules are those it holds, with those of every style it adopts, less those it declines',
  term: 'One thing has one word: the house word, what it means, and the words refused in its place',
  wordlist: 'A list of refused words and phrases, each finding by itself or the whole list under a budget',
  pattern: 'A refused construction, at a position when one is given, with the examples that test it',
  profile: 'The measure of a voice: each measure a bound, silent on a text shorter than MIN_WORDS',
  form: 'The structure of a kind of text: its title, its first sentence, its headings and its close',
  zone: 'A region of a text excused from named codes, with a reason',
  piece: 'One text bound to a style and a form',
  allow: 'One line of one file excused from one code, with a reason',
  reading: 'A judgment that stays with a reader, human or AI model: a question, and where its records stand',
};
const isRef = t => REFERS[t] !== undefined;
const both = (k, f) => { const t = TABLE[k].find(r => r[0] === f)[2]; return (isRef(t) || t[0] === '[') && REQUIRED[k].includes(f); };
for (const k of KINDS) {
  const K = k.toUpperCase();
  const seats = [], msgs = [], codes = [];
  for (const [F, , type] of TABLE[k]) {
    const f = low(F);
    const req = REQUIRED[k].includes(F) && !both(k, F);
    seats.push(`${f}: ${type}${req ? '' : '?'}`);
    if (req) { msgs.push(`${f}: ${q('{name}: ' + say('MISSING_FIELD', { kind: K, field: F }))}`); codes.push(`${f}: "MISSING_FIELD"`); }
    else if (isRef(type)) { msgs.push(`${f}: ${q('{name}: ' + say('UNKNOWN_REFERENCE', { field: F, name: '{value}', kinds: REFERS[type] }))}`); codes.push(`${f}: "UNKNOWN_REFERENCE"`); }
  }
  w(`DEFINE DECLARATION ${k} AS (`);
  w(`  VERB ${q(K)},`);
  w(`  SEATS [${seats.join(', ')}]${msgs.length ? ',' : ''}`);
  if (msgs.length) { w(`  MESSAGES [${msgs.join(', ')}],`); w(`  CODES [${codes.join(', ')}]`); }
  w(`) RATIONALE ${q(kindWhy[k])}`);
  w('');
}
carry('MISSING_FIELD', 'a required seat, and three constraints'); carry('UNKNOWN_REFERENCE', 'a reference seat'); carry('UNKNOWN_FIELD', 'a closed list of seats, spoken as UNKNOWN_CLAUSE (S7)');
carry('DUPLICATE_FIELD', 'spoken as PARSE (S7)'); carry('DUPLICATE_DECLARATION', 'spoken as DUPLICATE_NAME (S7)');
carry('UNEXPECTED_TOKEN', 'spoken as PARSE (S7)'); carry('UNTERMINATED_STRING', 'spoken as PARSE (S7)');

// ---- constraints
w('-- ---- the court: level 1, what a required seat does not say -------------------------------');
w('-- Each constraint states the OFFENCE as its WHEN and speaks the diagnostic code as its CODE. The MESSAGE is the');
w('-- summary of violations.json with its fields filled in; CITES names the diagnostic (S11).');
w('');
let nCons = 0;
const cons = (name, on, when, code, msg, why) => {
  w(`DEFINE CONSTRAINT ${name} AS (`);
  w(`  ON ${on}, WHEN ${q(when)},`);
  w(`  MESSAGE ${q(msg)},`);
  w(`  CODE ${q(code)},`);
  w(`  CITES ${cites(code)}`);
  w(`) RATIONALE ${q(why)}`);
  w('');
  nCons++;
};
for (const k of KINDS) for (const F of REQUIRED[k]) if (both(k, F))
  cons(`missing_${low(F)}_${k}`, k, `${low(F)} absent`, 'MISSING_FIELD', '{name}: ' + say('MISSING_FIELD', { kind: k.toUpperCase(), field: F }),
    `${V.MISSING_FIELD.invariant} ${F} is a ${isRef(TABLE[k].find(r => r[0] === F)[2]) ? 'reference' : 'list'}, so the seat is optional and this constraint asks for it; level 1`);
cons('piece_file_or_files', 'piece', '(file absent and files absent) or (file present and files present)', 'MISSING_FIELD',
  '{name}: ' + say('MISSING_FIELD', { kind: 'PIECE', field: 'FILE or FILES (one of the two)' }), 'A piece declares FILE or FILES, one of the two; level 1');

w('-- ---- the court: level 2, the declaration by itself ----------------------------------------');
w('');
for (const k of [...RULE_KINDS, 'form'])
  cons(`rule_without_evidence_${k}`, k, 'evidence absent', 'RULE_WITHOUT_EVIDENCE', '{name}: ' + say('RULE_WITHOUT_EVIDENCE', { kind: k.toUpperCase() }), V.RULE_WITHOUT_EVIDENCE.invariant + '; level 2');
carry('RULE_WITHOUT_EVIDENCE', 'five constraints');
cons('adoption_cycle_style', 'style', 'adopts cyclic', 'ADOPTION_CYCLE', '{name}: ' + say('ADOPTION_CYCLE', { field: 'ADOPTS' }), V.ADOPTION_CYCLE.invariant + '; level 2');
cons('adoption_cycle_form', 'form', 'extends = self or extends.extends = self or extends.extends.extends = self', 'ADOPTION_CYCLE', '{name}: ' + say('ADOPTION_CYCLE', { field: 'EXTENDS' }), V.ADOPTION_CYCLE.invariant + ' EXTENDS holds one name, and cyclic reads a list, so three steps are written out (S6); level 2');
carry('ADOPTION_CYCLE', 'two constraints');
cons('piece_without_subject', 'piece',
  'form present and subject absent and subject_from absent and (form.title_holds present or form.first_sentence_holds present or form.extends.title_holds present or form.extends.first_sentence_holds present)',
  'PIECE_WITHOUT_SUBJECT', '{name}: ' + say('PIECE_WITHOUT_SUBJECT', { form: '{form}' }), V.PIECE_WITHOUT_SUBJECT.invariant + ' Two steps of EXTENDS are read (S6); level 2');
carry('PIECE_WITHOUT_SUBJECT', 'one constraint, two steps of EXTENDS (S6)');

// ---- refusals
w('-- ---- the refusals ----------------------------------------------------------------------');
w('');
w('DEFINE REFUSAL unknown_verb AS (');
w('  MESSAGE "A Prosa declaration is DEFINE <KIND> <name> ( ... ); nothing else opens a declaration.",');
w('  CODE "UNEXPECTED_TOKEN",');
w(`  CITES ${cites('UNEXPECTED_TOKEN')}`);
w(`) RATIONALE ${q(V.UNEXPECTED_TOKEN.invariant)}`);
w('');
w('DEFINE REFUSAL unknown_declaration AS (');
w(`  MESSAGE ${q(V.UNKNOWN_KIND.invariant)},`);
w('  CODE "UNKNOWN_KIND",');
w(`  CITES ${cites('UNKNOWN_KIND')}`);
w(`) RATIONALE "A kind outside the ten is refused by name: a declared language refuses what it does not know"`);
w('');

const all = Object.keys(V);
const l12 = all.filter(c => V[c].level <= 2);
const text = out.join('\n') + '\n';
fs.writeFileSync(path.join(__dirname, 'prosa.stzu'), text);
console.log('constraints', nCons, 'lines', text.split('\n').length - 1);
console.log('diagnostics', all.length, 'of level 1 and 2:', l12.length, 'carried:', l12.filter(c => CARRIED.has(c)).length);
console.log('level 1 and 2 not carried:', l12.filter(c => !CARRIED.has(c)).join(' '));
console.log('levels 3 and 4, with the text (S1):', all.length - l12.length);
