// samples.js : written by build.js. The contract of diagnostics, the constitution and the examples of the live court.
window.PROSA_SITE = {
 "contract": {
  "contract": "0.1",
  "language": "prosa",
  "note": "Every diagnostic the court can raise by itself. A code is never reused. The codes of TERM, WORDLIST, PATTERN and PROFILE rules belong to the style that declares them.",
  "violations": {
   "UNEXPECTED_TOKEN": {
    "severity": "error",
    "level": 1,
    "summary": "Unexpected {token}.",
    "invariant": "A .proz file is a sequence of USE lines and DEFINE declarations."
   },
   "UNTERMINATED_STRING": {
    "severity": "error",
    "level": 1,
    "summary": "A quoted string is not closed on its line.",
    "invariant": "A string opens and closes on one line."
   },
   "UNKNOWN_KIND": {
    "severity": "error",
    "level": 1,
    "summary": "{kind} is not a kind of declaration.",
    "invariant": "The kinds are closed: STYLE, TERM, WORDLIST, PATTERN, PROFILE, FORM, ZONE, PIECE, ALLOW, READING."
   },
   "UNKNOWN_FIELD": {
    "severity": "error",
    "level": 1,
    "summary": "{field} is not a field of {kind}.",
    "invariant": "Each kind has a closed list of fields."
   },
   "DUPLICATE_FIELD": {
    "severity": "error",
    "level": 1,
    "summary": "The field {field} stands twice.",
    "invariant": "A field stands once in a declaration."
   },
   "DUPLICATE_DECLARATION": {
    "severity": "error",
    "level": 1,
    "summary": "The name {name} is already declared at line {first}.",
    "invariant": "A name is declared once across all kinds."
   },
   "MISSING_FIELD": {
    "severity": "error",
    "level": 1,
    "summary": "{kind} needs the field {field}.",
    "invariant": "A declaration carries its required fields."
   },
   "BAD_VALUE": {
    "severity": "error",
    "level": 1,
    "summary": "The value of {field} is not lawful: {why}.",
    "invariant": "A field's value has the shape its kind declares."
   },
   "RULE_WITHOUT_EVIDENCE": {
    "severity": "error",
    "level": 2,
    "summary": "This {kind} carries no EVIDENCE: a rule enters on a dated ruling or a measure.",
    "invariant": "Every rule cites the ruling or the measure it comes from."
   },
   "UNKNOWN_REFERENCE": {
    "severity": "error",
    "level": 2,
    "summary": "{field} names {name}, which is not a declared {kinds}.",
    "invariant": "A reference names a declaration of the right kind."
   },
   "ADOPTION_CYCLE": {
    "severity": "error",
    "level": 2,
    "summary": "{field} leads back to this declaration.",
    "invariant": "Adoption and extension form no cycle."
   },
   "TERM_REFUSED_AND_REQUIRED": {
    "severity": "error",
    "level": 2,
    "summary": "The style {style} asks for \"{word}\" and refuses it in {rule}.",
    "invariant": "A style never refuses the word it asks for."
   },
   "EXAMPLE_NOT_REFUSED": {
    "severity": "error",
    "level": 2,
    "summary": "The REFUSED example is not refused by its own pattern: \"{text}\".",
    "invariant": "A pattern refuses its own refused example."
   },
   "EXAMPLE_NOT_LAWFUL": {
    "severity": "error",
    "level": 2,
    "summary": "The WRITTEN example is refused by its own pattern: \"{text}\".",
    "invariant": "A pattern accepts its own written example."
   },
   "PIECE_WITHOUT_SUBJECT": {
    "severity": "error",
    "level": 2,
    "summary": "The form {form} places the subject, and the piece declares no SUBJECT.",
    "invariant": "A piece whose form places the subject declares it."
   },
   "BOUND_INVERTED": {
    "severity": "error",
    "level": 2,
    "summary": "The bound of {field} has its lower end above its upper end.",
    "invariant": "A bound's lower end is at most its upper end."
   },
   "TITLE_TOO_LONG": {
    "severity": "error",
    "level": 3,
    "summary": "The title holds {n} words; the form allows {max}.",
    "invariant": "A title names its subject in few words."
   },
   "TITLE_MISSING": {
    "severity": "error",
    "level": 3,
    "summary": "The piece has no title.",
    "invariant": "A governed text has a title."
   },
   "TITLE_WITHOUT_SUBJECT": {
    "severity": "error",
    "level": 3,
    "summary": "The title does not name the subject \"{subject}\".",
    "invariant": "A title names its subject."
   },
   "LEDE_WITHOUT_SUBJECT": {
    "severity": "error",
    "level": 3,
    "summary": "The first sentence does not name the subject \"{subject}\".",
    "invariant": "The first sentence names the subject and says what it is."
   },
   "SUBJECT_NOT_FOUND": {
    "severity": "error",
    "level": 3,
    "summary": "The piece takes its subject from the front matter, and the page declares none.",
    "invariant": "A page declares its subject."
   },
   "SAY_ONCE": {
    "severity": "error",
    "level": 3,
    "summary": "\"{pair}\" stands twice in the first {limit} words (first at line {first}).",
    "invariant": "A statement is made once per screen."
   },
   "HEADING_MISSING": {
    "severity": "error",
    "level": 3,
    "summary": "The form's heading \"{heading}\" is missing.",
    "invariant": "A form's fixed headings are all present."
   },
   "HEADING_OUT_OF_ORDER": {
    "severity": "error",
    "level": 3,
    "summary": "The heading \"{heading}\" stands before a heading the form places ahead of it.",
    "invariant": "A form's fixed headings keep their order."
   },
   "HEADING_NOT_SENTENCE_CASE": {
    "severity": "warning",
    "level": 3,
    "summary": "The heading \"{heading}\" capitalizes every word.",
    "invariant": "A heading is written in sentence case."
   },
   "CLOSES_ON_SUMMARY": {
    "severity": "error",
    "level": 3,
    "summary": "The text closes on \"{phrase}\".",
    "invariant": "A text closes on something new for its reader."
   },
   "HOLE_OPEN": {
    "severity": "error",
    "level": 3,
    "summary": "A hole is still open at status {status}: {hole}",
    "invariant": "A hole is closed by the author before the text is reviewed."
   },
   "ALLOW_STALE": {
    "severity": "error",
    "level": 3,
    "summary": "This ALLOW excuses {code} on a line holding \"{holds}\", and no such finding stands.",
    "invariant": "An excuse lives as long as the line it excuses."
   },
   "PIECE_FILE_NOT_FOUND": {
    "severity": "error",
    "level": 3,
    "summary": "The piece names {path}, and no such file stands.",
    "invariant": "A piece names a text that exists."
   },
   "TERM_SYNONYM": {
    "severity": "error",
    "level": 3,
    "summary": "A refused word stands for a declared term.",
    "invariant": "One thing has one word."
   },
   "OFF_PROFILE": {
    "severity": "warning",
    "level": 4,
    "summary": "A measure of the text stands outside the declared profile.",
    "invariant": "A text keeps the measure of its voice."
   }
  }
 },
 "constitution": {
  "prosa:reader_rights": "// reader_rights.proz : the constitution of Prosa. It states what a reader is owed by any governed text.\n// A house style adopts it with ADOPTS [reader_rights]; a form takes its structure with EXTENDS governed_text.\n\nDEFINE STYLE reader_rights (\n  HOLDS [typed_hole_filler]\n)\n\n// Right 1, the subject: the title names the subject and the first sentence says what it is.\n// Right 2, once: a statement is made once per screen.\n// Right 3, the hole: a particular only the author knows is marked, and the author closes it before review.\nDEFINE FORM governed_text (\n  TITLE_HOLDS subject,\n  FIRST_SENTENCE_HOLDS subject,\n  SAY_ONCE FIRST 150,\n  HOLES_CLOSED_AT [review, published],\n  EVIDENCE \"zayn/doc/design/WRITING.md rules 1 and 2 (the author, 2026-11-05 and 2026-11-14); AYOUNI Writing Framework C4\"\n)\n\n// Right 4, the source: a placeholder an agent left in place of a fact is refused wherever it stands.\nDEFINE PATTERN typed_hole_filler (\n  MATCHES [\"lorem ipsum\", \"TODO\", \"TBD\", \"XXX\", \"insert\" WITHIN 3 \"here\"],\n  IN [title, heading, lede, body, list],\n  CODE PLACEHOLDER_LEFT, SEVERITY error,\n  SAYS \"A placeholder stands where a fact belongs. Mark it [AUTHOR: what is needed] or state the fact.\",\n  REFUSED \"The study covered TBD participants.\",\n  WRITTEN \"The study covered [AUTHOR: number of participants] participants.\",\n  EVIDENCE \"AYOUNI Writing Framework C4: a hole is marked, it is never filled by an agent with a plausible particular\"\n)\n"
 },
 "samples": [
  {
   "id": "term",
   "label": "A term: one thing, one word",
   "proz": "// A term gives one thing one word.\n// Change \"developer\" to \"programmer\" in the text, and the court is silent.\n\nDEFINE STYLE small_house (\n  HOLDS [programmer]\n)\n\nDEFINE TERM programmer (\n  MEANS \"the person who writes programs\",\n  REFUSES [developer, developers],\n  MENTIONS skipped,\n  EVIDENCE \"The house, 2026-11-26: an example written for the live court\"\n)\n\nDEFINE PIECE note (\n  FILE \"term.md\",\n  FOLLOWS small_house\n)\n",
   "text": "# The court of Prosa\n\nA developer writes the rule once.\n\nThe court then raises it on every text.\n",
   "file": "term.md"
  },
  {
   "id": "affirmative",
   "label": "The affirmative rule of a public page",
   "proz": "// The affirmative rule: a public page states what a thing is and does.\n// The style adopts the reader's rights, and the form asks for the subject\n// in the title and in the first sentence.\n\nUSE \"prosa:reader_rights\"\n\nDEFINE STYLE public_house (\n  ADOPTS [reader_rights],\n  HOLDS [lack_listed]\n)\n\nDEFINE PATTERN lack_listed (\n  MATCHES [\"not yet\", \"nobody has\", \"never been\" [run, measured, shown, tested]],\n  IN [title, heading, lede, body, list],\n  CODE LACK_LISTED, SEVERITY error,\n  SAYS \"The line lists a lack. State what the thing is and does, at its true size.\",\n  REFUSED \"This was not yet measured.\",\n  WRITTEN \"The verifier checks the declaration.\",\n  EVIDENCE \"The house, 2026-11-26: an example written for the live court\"\n)\n\nDEFINE FORM page (\n  EXTENDS governed_text,\n  TITLE_WORDS AT_MOST 6,\n  EVIDENCE \"The house, 2026-11-26: an example written for the live court\"\n)\n\nDEFINE PIECE court_page (\n  FILE \"affirmative.md\",\n  FOLLOWS public_house,\n  FORM page,\n  SUBJECT \"court\"\n)\n",
   "text": "# The court of Prosa\n\nThe court is the program that judges a text against its declaration.\n\nIt reads the title, the first sentence and every paragraph.\n\nThe perception of a reader is not yet measured.\n",
   "file": "affirmative.md"
  },
  {
   "id": "profile",
   "label": "A profile: the measure of a voice",
   "proz": "// A profile holds a text to the measure of a voice, in both directions:\n// AT_MOST refuses the long sentence, and AT_LEAST asks for the colon.\n\nDEFINE STYLE voiced_house (\n  HOLDS [short_and_marked]\n)\n\nDEFINE PROFILE short_and_marked (\n  SENTENCES_OVER 25 AT_MOST 10 PER_HUNDRED,\n  COLONS AT_LEAST 8 PER_THOUSAND,\n  MIN_WORDS 40,\n  EVIDENCE \"The house, 2026-11-26: an example written for the live court\"\n)\n\nDEFINE PIECE letter (\n  FILE \"profile.md\",\n  FOLLOWS voiced_house\n)\n",
   "text": "# A letter to a new writer\n\nThe house asks each writer to read the style before the first draft and to keep the declaration open beside the text while the draft grows from a plan into pages that a reader can follow.\n\nThe court reads the draft. It measures every sentence. It names the bound a measure leaves.\n\nA short sentence carries a verdict.\n",
   "file": "profile.md"
  }
 ]
};
