# The ten kinds of declaration

A declaration of Prosa is one `DEFINE KIND name ( fields )` block; this page lists them with their fields and what each
means to the court. A field marked *required* is refused as `MISSING_FIELD` when absent.

## STYLE

A `STYLE` is a named set of rules: a house's voice, or a set a house may adopt.

| Field | Shape | Meaning |
|---|---|---|
| `HOLDS` | names | The `TERM`, `WORDLIST`, `PATTERN` and `PROFILE` rules of this style |
| `ADOPTS` | names | Other styles whose rules this style takes |
| `DECLINES` | names | Rules of an adopted style that this style leaves out |
| `LANGUAGES` | names | The languages the style is written for: `en`, `fr` |
| `MEASURED_FROM` | string | The corpus the style's measures come from |

The rules of a style are those it holds, with those of every style it adopts, less those it declines. A rule binds a text
only through a style: a rule no style holds judges nothing.

## The fields every rule shares

| Field | Shape | Meaning |
|---|---|---|
| `EVIDENCE` | string | The dated ruling or the measure the rule comes from. Its absence is `RULE_WITHOUT_EVIDENCE` |
| `CODE` | code | The diagnostic code. Required on `WORDLIST` and `PATTERN`; `TERM` defaults to `TERM_SYNONYM`, `PROFILE` to `OFF_PROFILE` |
| `SEVERITY` | `error` or `warning` | Defaults: `TERM` and `PATTERN` error, `WORDLIST` and `PROFILE` warning |
| `LANGUAGE` | name | The rule judges only texts in this language. Without it the rule judges every language |
| `ON` | names | The rule judges only pieces of these forms, or of forms that extend them |
| `IN` | names | The zones the rule reads: `title`, `heading`, `lede`, `body`, `list`, `quote`. Default: `lede`, `body`, `list`, `quote` |
| `MENTIONS` | `skipped` or `judged` | With `skipped`, a short quotation is a mention and is not judged. Default: `judged` |
| `KEEPS` | words | Phrases that excuse a match they overlap: `KEEPS ["decision maker"]` |
| `SAYS` | string | The sentence the diagnostic adds or shows |

## TERM

A `TERM` gives one thing one word: it names the house word and refuses the others.

| Field | Shape | Meaning |
|---|---|---|
| `MEANS` | string, *required* | What the term stands for |
| `REFUSES` | entries, *required* | The words refused in its place |
| `WRITES` | string | The house word. Default: the declaration's name, with spaces for underscores |

The message reads: `"developer" stands for the person who writes programs: the house word is "programmer".` A style that
refuses, in another `TERM` or `WORDLIST`, the word a term asks for is refused as `TERM_REFUSED_AND_REQUIRED`.

## WORDLIST

A `WORDLIST` refuses a list of words or phrases.

| Field | Shape | Meaning |
|---|---|---|
| `REFUSES` | entries, *required* | The entries, each with an optional `WRITE` |
| `AT_MOST` | `N PER_THOUSAND` | A budget: the list is judged as one measure at level 4 |

Without a budget, each occurrence is a finding at level 3. With a budget, the court counts the occurrences in the piece and
raises one finding, at level 4, when the rate per thousand prose words is over the budget.

## PATTERN

A `PATTERN` refuses a construction, at a position when one is given.

| Field | Shape | Meaning |
|---|---|---|
| `MATCHES` | entries, *required* | The refused constructions |
| `AT` | name | `sentence_start`, `sentence_end`, `paragraph_start` or `paragraph_end` |
| `REFUSED` | string | A sentence the pattern must refuse |
| `WRITTEN` | string | The lawful sentence the diagnostic shows |
| `AT_MOST` | `N PER_THOUSAND` | A budget, as for a word list |

`REFUSED` and `WRITTEN` are the rule's own test. A `REFUSED` example the pattern accepts is `EXAMPLE_NOT_REFUSED`, and a
`WRITTEN` example the pattern refuses is `EXAMPLE_NOT_LAWFUL`: a rule that cannot pass its own examples never reaches a text.

## PROFILE

A `PROFILE` holds a text to the measure of a voice.

| Field | Shape | Meaning |
|---|---|---|
| `SENTENCE_MEDIAN` | bound | The median sentence length, in words |
| `SENTENCES_OVER` | threshold and bound | Sentences longer than the threshold; list items are left out |
| `SENTENCES_UNDER` | threshold and bound | Sentences shorter than the threshold |
| `DASHES`, `COLONS`, `EXCLAMATIONS`, `QUESTIONS` | bound | Marks in the prose |
| `COLD_EXCLAMATIONS` | bound | Exclamations in a paragraph that follows no run and names no result |
| `ELLIPSES` | bound | Paragraphs that end on an ellipsis |
| `COLON_LEADS` | bound | Paragraphs that end on a colon and are followed by prose |
| `ONE_SENTENCE_PARAGRAPHS` | bound | Paragraphs of one sentence and more than three words |
| `MIN_WORDS` | number | Below this count of prose words the profile is silent. Default: 300 |

Each measure outside its bound is one finding at level 4, on line 1, with the measure as its subject. A bound has two
directions: `AT_MOST` refuses noise, and `AT_LEAST` asks for what makes the voice present. A bound whose lower end stands
above its upper end is `BOUND_INVERTED`.

## FORM

A `FORM` declares the structure of a kind of text: a chapter, a page, a post.

| Field | Shape | Finding |
|---|---|---|
| `EXTENDS` | name | The form takes every field of the named form that it does not declare itself |
| `TITLE_WORDS` | `AT_MOST N` | `TITLE_TOO_LONG` |
| `TITLE_HOLDS` | `subject` | `TITLE_WITHOUT_SUBJECT`, `TITLE_MISSING` |
| `FIRST_SENTENCE_HOLDS` | `subject` | `LEDE_WITHOUT_SUBJECT` |
| `SAY_ONCE` | `FIRST N` | `SAY_ONCE` |
| `HEADINGS` | words | `HEADING_MISSING`, `HEADING_OUT_OF_ORDER` |
| `HEADING_CASE` | `sentence` | `HEADING_NOT_SENTENCE_CASE` |
| `CLOSES_WITHOUT` | words | `CLOSES_ON_SUMMARY` |
| `HOLES_CLOSED_AT` | names | `HOLE_OPEN` |
| `EVIDENCE` | string | Its absence is `RULE_WITHOUT_EVIDENCE` |

- **The title** is the first level-1 heading, or the `title` of the front matter.
- **The subject is held** when the subject term stands at the start of a word, ignoring case: the term `use` is not found
  inside `because`, and the stem `compar` is found in `Comparison`.
- **The first sentence** is the first sentence of the first prose paragraph.
- **`SAY_ONCE FIRST 150`** reads the first 150 words a reader meets, in order: the title, the headings and the prose. It
  refuses two content words in a row that stand twice there. A content word has three letters or more and is not on the
  language's list of function words. A pair that holds a word of the subject term, or its plural, is left out: the subject
  `commitment` leaves out `five commitments`, and the subject `entries` leaves out `entry list`. A plural adds `s` or `es`,
  or turns a closing `y` into `ies`.
- **`HEADINGS`** lists the level-2 headings the form fixes, in their order. Other headings may stand between them. One bare
  heading, `HEADINGS "In your hands"`, is a list of one.
- **`HEADING_CASE sentence`** refuses a heading of three long words or more in which every long word is capitalized.
- **`CLOSES_WITHOUT`** refuses a last level-2 heading that holds one of the phrases, and a last paragraph that opens on one.
- **`HOLES_CLOSED_AT [review, published]`** refuses an open `[AUTHOR: …]` hole when the front matter's `status` is on the list.

## ZONE

A `ZONE` excuses a region of a text from named codes, with a reason.

| Field | Shape | Meaning |
|---|---|---|
| `EXEMPT_FROM` | codes, *required* | The codes the zone excuses |
| `REASON` | string, *required* | Why the region is excused |

A zone opens in the text at `<!-- prosa:zone name -->` and closes at `<!-- prosa:end -->`.

## PIECE

A `PIECE` binds a text to a style and a form.

| Field | Shape | Meaning |
|---|---|---|
| `FILE` | string | One text, relative to the `.proz` file |
| `FILES` | string | A set of texts: `*` within a name, `**/` across folders |
| `FOLLOWS` | name, *required* | The style |
| `FORM` | name | The form |
| `SUBJECT` | string | The subject term |
| `SUBJECT_FROM` | `front_matter` | The subject is the `subject` of each page's front matter |
| `LANGUAGE` | name | Default: the `lang` of the front matter, then `en` |
| `READER` | name or string | Who the text is written for; shown in the brief |

A piece declares `FILE` or `FILES`, one of the two. A piece whose form places the subject declares `SUBJECT` or
`SUBJECT_FROM`, or is refused as `PIECE_WITHOUT_SUBJECT`. A named file that does not exist is `PIECE_FILE_NOT_FOUND`.

## ALLOW

An `ALLOW` excuses one line of one file from one code, with a reason.

| Field | Shape | Meaning |
|---|---|---|
| `FILE` | string, *required* | The text, relative to the `.proz` file |
| `LINE_HOLDS` | string, *required* | A phrase that identifies the line |
| `EXCUSES` | code, *required* | The code excused |
| `REASON` | string, *required* | Why the line is excused |

An `ALLOW` that excuses nothing is refused as `ALLOW_STALE`: an excuse lives as long as the line it excuses.

## READING

A `READING` names a judgment that stays with a reader, human or AI model.

| Field | Shape | Meaning |
|---|---|---|
| `ON` | name, *required* | The form whose pieces are read |
| `ASKS` | string, *required* | The question put to the reader |
| `RECORDS` | string, *required* | The folder of records, relative to the `.proz` file |

The record of a reading is the file `<RECORDS>/<text name>.<reading name>.md`. `prosa readings` and level 5 list each
reading as `recorded` or `due`. A reading carries no code and never changes the court's exit code.
