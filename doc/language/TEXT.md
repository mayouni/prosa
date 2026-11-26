# How the court reads a text

The text model of Prosa is the set of definitions that turn a Markdown or HTML file into blocks, zones, sentences, words and
measures. Two implementations that follow this page give the same findings, byte for byte. The definitions of the measures
are those of the AYOUNI house lint (`writing-framework/tools/style_lint.py`), so a profile measured by one is judged by the
other.

## Blocks

A Markdown file is read in this order.

1. **Line ends** are normalized to LF. **Front matter** is read when the file starts with `---`: it runs to the next line
   that starts with `---`, and each `key: value` line is kept, quotes removed.
2. **A code fence** opens on a line that starts with three backticks or three tildes, and closes on the first later line that holds
   only those three characters and spaces. A fence is one `code` block.
3. **A paragraph** is a run of lines with no blank line between them. Its text is the run with outer spaces removed.
4. A paragraph is a **`skip`** block when it starts with `#`, `|`, `<!--`, `![`, `*Figure`, `*Fig`, `<figure`, `<div` or
   `<svg`, or when it is one line in single asterisks of 3 to 120 characters (a caption).
5. A paragraph whose first line starts with four spaces or a tab is a **`code`** block.
6. Every other paragraph is a **`prose`** block. It is a list item when it starts with `-`, `*`, `•` or a number followed by
   `.` or `)`. It is a quotation when it starts with `>`.

**Headings.** In a `skip` block that starts with `#`, each line of one to six `#` followed by a space is a heading of that
level. Its text has its inline marks removed.

**An HTML file** gives the same blocks: `h1` to `h6` are headings, `p` and `blockquote` are prose, and `pre` is code. The
elements `li`, `td`, `th`, `dd`, `dt`, `figcaption` and `summary` are list items. The content of `script`, `style`, `code`,
`template` and `nav` is not read, and a `<meta name="prosa:subject" content="...">` gives the page its subject. Tags are removed and the common entities are decoded.

## Zones

The zone of a prose block is `list` for a list item, `quote` for a quotation, `lede` for the first prose block of the text,
and `body` otherwise. A level-1 heading is in the zone `title`, and every other heading in the zone `heading`. A front-matter
`title` is read as the title when the text has no level-1 heading.

A declared `ZONE` runs from `<!-- prosa:zone name -->` to `<!-- prosa:end -->`, each alone in its paragraph.

## Words and matching

Before a rule reads a block, inline code (`` `…` `` on one line) is blanked: a name in code is not prose. With
`MENTIONS skipped`, a quotation of 1 to 120 characters on one line, between `"…"`, `“…”` or `«…»`, is blanked too.

A **token** is a word, an ellipsis of three full stops, or one other character that is not a space. A **word** is a run of
letters (`A` to `Z`, `a` to `z`, `À` to `ÿ`) and digits, which may hold `'`, `’` or `-` between two such runs:
`decision-maker` and `l'histoire` are one word each. Matching compares tokens in lower case.

Each entry is searched from left to right through the block, and its matches do not overlap each other. A match is excused
when a `KEEPS` phrase overlaps it.

**Positions.** A sentence boundary inside a block is a space that follows `.`, `!`, `?` or `…` and precedes a capital letter,
`«`, `"`, `'`, `(` or `[`. `AT sentence_start` keeps a match that begins a sentence. `AT sentence_end` keeps a match that
ends one, closing punctuation aside. `AT paragraph_start` and `AT paragraph_end` do the same for the block.

**The line** of a finding is the line of the file on which the match starts.

## Sentences

For the measures, a block is first rewritten: each inline code span becomes the word `CODE`, and each link becomes its text.
The block is then cut at every sentence boundary defined above. A piece of one word is dropped. The **length** of a sentence
is its count of runs of characters between spaces.

## Measures

The measures read the prose blocks only, joined by blank lines.

| Measure | Definition |
|---|---|
| words | The runs of letters and apostrophes in the prose |
| `SENTENCE_MEDIAN` | The sentence lengths in order; the value at index `floor(n / 2)` |
| `SENTENCES_OVER N` | Sentences longer than N words, outside list items |
| `SENTENCES_UNDER N` | Sentences shorter than N words |
| `DASHES` | The count of `—`, of `–` and of ` - ` |
| `COLONS`, `QUESTIONS` | The count of `:` and of `?` |
| `EXCLAMATIONS` | The count of `!` |
| `COLD_EXCLAMATIONS` | The `!` of a block that has no code block among the two blocks before it and holds none of the run words below |
| `ELLIPSES` | Prose blocks that end on `...` or `…` |
| `COLON_LEADS` | Prose blocks that end on `:` and are followed by a prose block |
| `ONE_SENTENCE_PARAGRAPHS` | Prose blocks of one sentence and more than three words |

The run words are: prints, printed, gives, returns, answers, complains, says, shows, output, verdict, kept, raised, ran,
run it, execute.

A rate `PER_THOUSAND` is the count times 1000 over the words, rounded to one decimal. A rate `PER_HUNDRED` is the count times
100 over the sentences, or over the prose blocks for `ONE_SENTENCE_PARAGRAPHS`, rounded to one decimal. A corpus is measured
as one pool: every sentence of every page enters one median, and every count is summed before the rate is taken.

## Function words

`SAY_ONCE` and `prosa drift` leave out the function words of the language. The lists for `en` and `fr` are the `STOP` table
of `tools/prosa/prosa.js`, which is part of this specification.
