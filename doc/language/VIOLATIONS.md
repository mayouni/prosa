# The diagnostics of the court

The diagnostics of Prosa are the findings the court raises by itself, without a rule of a style; this page lists the 31 codes of contract 0.1. It is written from `conformance/violations.json` by `node tools/prosa/gen-violations.js`, so the page and the court cannot disagree.

## Level 1: syntax

| Code | Severity | What the court says | The invariant |
|---|---|---|---|
| `UNEXPECTED_TOKEN` | error | Unexpected {token}. | A .proz file is a sequence of USE lines and DEFINE declarations. |
| `UNTERMINATED_STRING` | error | A quoted string is not closed on its line. | A string opens and closes on one line. |
| `UNKNOWN_KIND` | error | {kind} is not a kind of declaration. | The kinds are closed: STYLE, TERM, WORDLIST, PATTERN, PROFILE, FORM, ZONE, PIECE, ALLOW, READING. |
| `UNKNOWN_FIELD` | error | {field} is not a field of {kind}. | Each kind has a closed list of fields. |
| `DUPLICATE_FIELD` | error | The field {field} stands twice. | A field stands once in a declaration. |
| `DUPLICATE_DECLARATION` | error | The name {name} is already declared at line {first}. | A name is declared once across all kinds. |
| `MISSING_FIELD` | error | {kind} needs the field {field}. | A declaration carries its required fields. |
| `BAD_VALUE` | error | The value of {field} is not lawful: {why}. | A field's value has the shape its kind declares. |

## Level 2: the declaration

| Code | Severity | What the court says | The invariant |
|---|---|---|---|
| `RULE_WITHOUT_EVIDENCE` | error | This {kind} carries no EVIDENCE: a rule enters on a dated ruling or a measure. | Every rule cites the ruling or the measure it comes from. |
| `UNKNOWN_REFERENCE` | error | {field} names {name}, which is not a declared {kinds}. | A reference names a declaration of the right kind. |
| `ADOPTION_CYCLE` | error | {field} leads back to this declaration. | Adoption and extension form no cycle. |
| `TERM_REFUSED_AND_REQUIRED` | error | The style {style} asks for "{word}" and refuses it in {rule}. | A style never refuses the word it asks for. |
| `EXAMPLE_NOT_REFUSED` | error | The REFUSED example is not refused by its own pattern: "{text}". | A pattern refuses its own refused example. |
| `EXAMPLE_NOT_LAWFUL` | error | The WRITTEN example is refused by its own pattern: "{text}". | A pattern accepts its own written example. |
| `PIECE_WITHOUT_SUBJECT` | error | The form {form} places the subject, and the piece declares no SUBJECT. | A piece whose form places the subject declares it. |
| `BOUND_INVERTED` | error | The bound of {field} has its lower end above its upper end. | A bound's lower end is at most its upper end. |

## Level 3: the text

| Code | Severity | What the court says | The invariant |
|---|---|---|---|
| `TITLE_TOO_LONG` | error | The title holds {n} words; the form allows {max}. | A title names its subject in few words. |
| `TITLE_MISSING` | error | The piece has no title. | A governed text has a title. |
| `TITLE_WITHOUT_SUBJECT` | error | The title does not name the subject "{subject}". | A title names its subject. |
| `LEDE_WITHOUT_SUBJECT` | error | The first sentence does not name the subject "{subject}". | The first sentence names the subject and says what it is. |
| `SUBJECT_NOT_FOUND` | error | The piece takes its subject from the front matter, and the page declares none. | A page declares its subject. |
| `SAY_ONCE` | error | "{pair}" stands twice in the first {limit} words (first at line {first}). | A statement is made once per screen. |
| `HEADING_MISSING` | error | The form's heading "{heading}" is missing. | A form's fixed headings are all present. |
| `HEADING_OUT_OF_ORDER` | error | The heading "{heading}" stands before a heading the form places ahead of it. | A form's fixed headings keep their order. |
| `HEADING_NOT_SENTENCE_CASE` | warning | The heading "{heading}" capitalizes every word. | A heading is written in sentence case. |
| `CLOSES_ON_SUMMARY` | error | The text closes on "{phrase}". | A text closes on something new for its reader. |
| `HOLE_OPEN` | error | A hole is still open at status {status}: {hole} | A hole is closed by the author before the text is reviewed. |
| `ALLOW_STALE` | error | This ALLOW excuses {code} on a line holding "{holds}", and no such finding stands. | An excuse lives as long as the line it excuses. |
| `PIECE_FILE_NOT_FOUND` | error | The piece names {path}, and no such file stands. | A piece names a text that exists. |
| `TERM_SYNONYM` | error | A refused word stands for a declared term. | One thing has one word. |

## Level 4: the measure

| Code | Severity | What the court says | The invariant |
|---|---|---|---|
| `OFF_PROFILE` | warning | A measure of the text stands outside the declared profile. | A text keeps the measure of its voice. |

## The codes of a style

A `TERM`, `WORDLIST`, `PATTERN` or `PROFILE` raises the code its declaration names. `TERM_SYNONYM` and `OFF_PROFILE` are the defaults of `TERM` and `PROFILE`. A reading of level 5 carries no code.
