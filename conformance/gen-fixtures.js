// gen-fixtures.js : writes the conformance fixtures. Each case is a refused declaration or text and its lawful twin.
//   node conformance/gen-fixtures.js      then      node tools/prosa/cli.js conformance --manifest
'use strict';
const fs = require('fs'), path = require('path'); const dir = path.join(__dirname, 'fixtures');
fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
const EV = 'EVIDENCE "The author, 2026-11-26: a ruling written for this fixture"';
const style = (holds, extra) => `DEFINE STYLE house (\n  HOLDS [${holds}]\n)\n${extra || ''}`;
const piece = (file, more) => `DEFINE PIECE the_page (\n  FILE "${file}",\n  FOLLOWS house${more ? ',\n  ' + more : ''}\n)\n`;
let n = 0;
// proz(name, expected, source[, text]) writes name.proz (and name.md when a text is given)
function proz(name, expected, src, text) {
  fs.writeFileSync(path.join(dir, name + '.proz'), `// Expected: ${expected}\n${src}`); n++;
  if (text !== undefined) fs.writeFileSync(path.join(dir, name + '.md'), text);
}
const termRule = `DEFINE TERM programmer (\n  MEANS "the person who writes programs",\n  REFUSES [developer, developers],\n  MENTIONS skipped,\n  ${EV}\n)\n`;
const page = body => `# The court of Prosa\n\n${body}\n`;

// ---- level 1: syntax
proz('unexpected-token', 'UNEXPECTED_TOKEN', `DEFINE STYLE house (\n  HOLDS [a_rule] ;\n)\n`);
proz('unexpected-token-lawful', 'none', `DEFINE STYLE house (\n  LANGUAGES [en]\n)\n`);
proz('unterminated-string', 'UNTERMINATED_STRING', `DEFINE STYLE house (\n  MEASURED_FROM "books/ring\n)\n`);
proz('unterminated-string-lawful', 'none', `DEFINE STYLE house (\n  MEASURED_FROM "books/ring"\n)\n`);
proz('unknown-kind', 'UNKNOWN_KIND', `DEFINE VIBE loud (\n  LANGUAGES [en]\n)\n`);
proz('unknown-kind-lawful', 'none', `DEFINE STYLE loud (\n  LANGUAGES [en]\n)\n`);
proz('unknown-field', 'UNKNOWN_FIELD', `DEFINE STYLE house (\n  COLOUR "blue"\n)\n`);
proz('duplicate-field', 'DUPLICATE_FIELD', `DEFINE STYLE house (\n  LANGUAGES [en],\n  LANGUAGES [fr]\n)\n`);
proz('duplicate-field-lawful', 'none', `DEFINE STYLE house (\n  LANGUAGES [en, fr]\n)\n`);
proz('duplicate-declaration', 'DUPLICATE_DECLARATION', `DEFINE STYLE house (\n  LANGUAGES [en]\n)\nDEFINE STYLE house (\n  LANGUAGES [fr]\n)\n`);
proz('missing-field', 'MISSING_FIELD', `DEFINE ZONE hero (\n  EXEMPT_FROM [SAY_ONCE]\n)\n`);
proz('missing-field-lawful', 'none', `DEFINE ZONE hero (\n  EXEMPT_FROM [SAY_ONCE],\n  REASON "The hero holds the tagline the author ruled"\n)\n`);
proz('bad-value', 'BAD_VALUE', `DEFINE PROFILE voice (\n  DASHES SOMETIMES,\n  ${EV}\n)\n`);
proz('bad-value-lawful', 'none', `DEFINE PROFILE voice (\n  DASHES AT_MOST 4 PER_THOUSAND,\n  ${EV}\n)\n`);

// ---- level 2: the declaration by itself
proz('rule-without-evidence', 'RULE_WITHOUT_EVIDENCE', `DEFINE TERM programmer (\n  MEANS "the person who writes programs",\n  REFUSES [developer]\n)\n`);
proz('rule-without-evidence-lawful', 'none', termRule);
proz('unknown-reference', 'UNKNOWN_REFERENCE', style('programmer'));
proz('unknown-reference-lawful', 'none', style('programmer', termRule));
proz('adoption-cycle', 'ADOPTION_CYCLE', `DEFINE STYLE house (\n  ADOPTS [press]\n)\nDEFINE STYLE press (\n  ADOPTS [house]\n)\n`);
proz('adoption-cycle-lawful', 'none', `DEFINE STYLE house (\n  ADOPTS [press]\n)\nDEFINE STYLE press (\n  LANGUAGES [en]\n)\n`);
proz('term-refused-and-required', 'TERM_REFUSED_AND_REQUIRED', style('programmer, plain_words', termRule + `DEFINE WORDLIST plain_words (\n  REFUSES [programmer, coder],\n  CODE PLAIN_WORD,\n  ${EV}\n)\n`));
proz('term-refused-and-required-lawful', 'none', style('programmer, plain_words', termRule + `DEFINE WORDLIST plain_words (\n  REFUSES [coder],\n  CODE PLAIN_WORD,\n  ${EV}\n)\n`));
const pat = (refused, written) => `DEFINE PATTERN lack_listed (\n  MATCHES ["not yet", "never" WITHIN 3 "run"],\n  CODE LACK_LISTED,\n  REFUSED "${refused}",\n  WRITTEN "${written}",\n  ${EV}\n)\n`;
proz('example-not-refused', 'EXAMPLE_NOT_REFUSED', pat('The verifier checks the declaration.', 'The verifier checks the declaration.'));
proz('example-not-lawful', 'EXAMPLE_NOT_LAWFUL', pat('The audit was never once run.', 'The audit is not yet written.'));
proz('example-lawful', 'none', pat('The audit was never once run.', 'The verifier checks the declaration.'));
const form = fields => `DEFINE FORM page (\n  ${fields},\n  ${EV}\n)\n`;
proz('piece-without-subject', 'PIECE_WITHOUT_SUBJECT', style('') + form('TITLE_HOLDS subject') + piece('piece-with-subject-lawful.md', 'FORM page'));
proz('piece-with-subject-lawful', 'none', style('') + form('TITLE_HOLDS subject') + piece('piece-with-subject-lawful.md', 'FORM page,\n  SUBJECT "court"'), page('The court of Prosa judges a text against its declared style.'));
proz('bound-inverted', 'BOUND_INVERTED', `DEFINE PROFILE voice (\n  EXCLAMATIONS BETWEEN 4 AND 1 PER_THOUSAND,\n  ${EV}\n)\n`);
proz('bound-inverted-lawful', 'none', `DEFINE PROFILE voice (\n  EXCLAMATIONS BETWEEN 1 AND 4 PER_THOUSAND,\n  ${EV}\n)\n`);

// ---- level 3: the text against the rules
const withTerm = file => style('programmer', termRule) + piece(file);
proz('term-synonym', 'TERM_SYNONYM', withTerm('term-synonym.md'), page('A developer writes the rule once.'));
proz('term-synonym-lawful', 'none', withTerm('term-synonym-lawful.md'), page('A programmer writes the rule once. The word "developer" is only mentioned here, and `developer` is a name in code.'));
const withList = file => style('forbidden_words', `DEFINE WORDLIST forbidden_words (\n  REFUSES [leverage WRITE "use", "in order to" WRITE "to", "utili*" WRITE "use"],\n  CODE FORBIDDEN_WORD, SEVERITY error,\n  ${EV}\n)\n`) + piece(file);
proz('wordlist', 'FORBIDDEN_WORD', withList('wordlist.md'), page('The court utilizes the declaration in order to judge.'));
proz('wordlist-lawful', 'none', withList('wordlist-lawful.md'), page('The court uses the declaration to judge.'));
const withPattern = file => style('lack_listed', pat('The audit was never once run.', 'The verifier checks the declaration.')) + piece(file);
proz('pattern', 'LACK_LISTED', withPattern('pattern.md'), page('The audit is not yet written.'));
proz('pattern-lawful', 'none', withPattern('pattern-lawful.md'), page('The audit reads the page. It never stops. A run takes one second.'));
const withStart = file => style('opens_on_and', `DEFINE PATTERN opens_on_and (\n  MATCHES ["However"],\n  AT sentence_start,\n  CODE OPENS_ON_HOWEVER,\n  ${EV}\n)\n`) + piece(file);
proz('pattern-position', 'OPENS_ON_HOWEVER', withStart('pattern-position.md'), page('The court reads the page. However, it skips the code.'));
proz('pattern-position-lawful', 'none', withStart('pattern-position-lawful.md'), page('The court reads the page. It skips the code, however long the code is.'));
const withForm = (file, fields, more) => style('') + form(fields) + piece(file, 'FORM page' + (more ? ',\n  ' + more : ''));
proz('title-too-long', 'TITLE_TOO_LONG', withForm('title-too-long.md', 'TITLE_WORDS AT_MOST 6'), '# A map of what a person writes across every page\n\nThe map lists the pages.\n');
proz('title-too-long-lawful', 'none', withForm('title-too-long-lawful.md', 'TITLE_WORDS AT_MOST 6'), page('The court judges a text.'));
proz('title-without-subject', 'TITLE_WITHOUT_SUBJECT', withForm('title-without-subject.md', 'TITLE_HOLDS subject', 'SUBJECT "court"'), '# Where the law sits\n\nThe court judges a text.\n');
proz('title-with-subject-lawful', 'none', withForm('title-with-subject-lawful.md', 'TITLE_HOLDS subject', 'SUBJECT "court"'), page('The court judges a text.'));
proz('lede-without-subject', 'LEDE_WITHOUT_SUBJECT', withForm('lede-without-subject.md', 'FIRST_SENTENCE_HOLDS subject', 'SUBJECT "court"'), page('Every text meets a judge. The court is that judge.'));
proz('lede-with-subject-lawful', 'none', withForm('lede-with-subject-lawful.md', 'FIRST_SENTENCE_HOLDS subject', 'SUBJECT "court"'), page('The court judges a text against its declared style.'));
proz('subject-not-found', 'SUBJECT_NOT_FOUND', withForm('subject-not-found.md', 'TITLE_HOLDS subject', 'SUBJECT_FROM front_matter'), '---\ntitle: The court of Prosa\n---\n\nThe court judges a text.\n');
proz('subject-found-lawful', 'none', withForm('subject-found-lawful.md', 'TITLE_HOLDS subject', 'SUBJECT_FROM front_matter'), '---\ntitle: The court of Prosa\nsubject: court\n---\n\nThe court judges a text.\n');
proz('say-once', 'SAY_ONCE', withForm('say-once.md', 'SAY_ONCE FIRST 150', 'SUBJECT "court"'), page('The court refuses every forbidden sentence by name.\n\n## What the court refuses\n\nThe court names every forbidden sentence it refuses.'));
proz('say-once-lawful', 'none', withForm('say-once-lawful.md', 'SAY_ONCE FIRST 150', 'SUBJECT "court"'), page('The court refuses every forbidden sentence by name.\n\n## The five levels\n\nEach level judges one layer of a text.'));
const H = 'HEADINGS ["The field", "The principle", "In your hands"]';
proz('heading-missing', 'HEADING_MISSING', withForm('heading-missing.md', H), page('The court judges.\n\n## The field\n\nOne.\n\n## In your hands\n\nTwo.'));
proz('heading-out-of-order', 'HEADING_OUT_OF_ORDER', withForm('heading-out-of-order.md', H), page('The court judges.\n\n## The principle\n\nOne.\n\n## The field\n\nTwo.\n\n## In your hands\n\nThree.'));
proz('headings-lawful', 'none', withForm('headings-lawful.md', H), page('The court judges.\n\n## The field\n\nOne.\n\n## The principle\n\nTwo.\n\n## In your hands\n\nThree.'));
proz('heading-case', 'HEADING_NOT_SENTENCE_CASE', withForm('heading-case.md', 'HEADING_CASE sentence'), page('The court judges.\n\n## What The Court Refuses Today\n\nOne.'));
proz('heading-case-lawful', 'none', withForm('heading-case-lawful.md', 'HEADING_CASE sentence'), page('The court judges.\n\n## What the court refuses today\n\nOne.'));
const C = 'CLOSES_WITHOUT ["summary", "in conclusion"]';
proz('closes-on-summary', 'CLOSES_ON_SUMMARY', withForm('closes-on-summary.md', C), page('The court judges.\n\n## Summary\n\nThe court judged.'));
proz('closes-lawful', 'none', withForm('closes-lawful.md', C), page('The court judges.\n\n## Where the next chapter goes\n\nThe next chapter measures a voice.'));
const HO = 'HOLES_CLOSED_AT [review, published]';
proz('hole-open', 'HOLE_OPEN', withForm('hole-open.md', HO), '---\ntitle: The court of Prosa\nstatus: review\n---\n\nThe court judged [AUTHOR: number of pages] pages.\n');
proz('hole-draft-lawful', 'none', withForm('hole-draft-lawful.md', HO), '---\ntitle: The court of Prosa\nstatus: draft\n---\n\nThe court judged [AUTHOR: number of pages] pages.\n');
const allow = (file, holds) => withPattern(file) + `DEFINE ALLOW quoted_record (\n  FILE "${file}",\n  LINE_HOLDS "${holds}",\n  EXCUSES LACK_LISTED,\n  REASON "The line quotes the record"\n)\n`;
proz('allow-stale', 'ALLOW_STALE', allow('allow-stale.md', 'not yet signed'), page('The release is signed.'));
proz('allow-lawful', 'none', allow('allow-lawful.md', 'not yet signed'), page('The record of that day reads: the release is not yet signed.'));
const zone = file => withPattern(file) + `DEFINE ZONE record (\n  EXEMPT_FROM [LACK_LISTED],\n  REASON "A zone that quotes the project record"\n)\n`;
proz('zone-lawful', 'none', zone('zone-lawful.md'), page('The court judges.\n\n<!-- prosa:zone record -->\n\nThe audit is not yet written.\n\n<!-- prosa:end -->\n\nThe court judges again.'));
proz('zone-ended', 'LACK_LISTED', zone('zone-ended.md'), page('The court judges.\n\n<!-- prosa:zone record -->\n\nThe audit reads the page.\n\n<!-- prosa:end -->\n\nThe audit is not yet written.'));
proz('piece-file-not-found', 'PIECE_FILE_NOT_FOUND', style('') + piece('no-such-page.md'));

// ---- level 4: the measure
const long = 'The court reads the page and then it reads the page again and then it reads every other page of the book and then it reads the site and the posts and the letters and the notes and every line that a reader may one day meet in print. ';
const short = 'The court reads. It judges. It names the rule. ';
const prof = file => style('voice', `DEFINE PROFILE voice (\n  SENTENCES_OVER 40 AT_MOST 10 PER_HUNDRED,\n  DASHES AT_MOST 4 PER_THOUSAND,\n  SENTENCE_MEDIAN 6 WITHIN 4,\n  MIN_WORDS 50,\n  ${EV}\n)\n`) + piece(file);
proz('off-profile', 'OFF_PROFILE', prof('off-profile.md'), page((long + long + short).trim() + '\n\n' + 'The court — the judge — reads — and names — the rule — every time.'));
proz('on-profile-lawful', 'none', prof('on-profile-lawful.md'), page((short.repeat(8) + long).trim()));
proz('profile-silent-lawful', 'none', prof('profile-silent-lawful.md'), page('The court — the judge — reads.'));
const budget = file => style('intensifiers', `DEFINE WORDLIST intensifiers (\n  REFUSES [very, really, simply],\n  AT_MOST 4 PER_THOUSAND,\n  CODE INTENSIFIER,\n  ${EV}\n)\n`) + piece(file);
proz('budget-over', 'INTENSIFIER', budget('budget-over.md'), page('The court is very strict and really simply fair.'));
proz('budget-under-lawful', 'none', budget('budget-under-lawful.md'), page(short.repeat(90) + 'The court is very strict.'));
console.log('wrote ' + n + ' fixtures to conformance/fixtures');
