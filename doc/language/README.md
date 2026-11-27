# The Prosa language

Prosa is a declarative language that governs written text: a `.proz` file declares a writing style and the texts that follow
it, and a court judges each text against the declaration. This folder is the specification of language 0.1.

| Page | What it holds |
|---|---|
| [GRAMMAR.md](GRAMMAR.md) | The lexical rules and the EBNF of a `.proz` file |
| [DECLARATIONS.md](DECLARATIONS.md) | The ten kinds of declaration, their fields and their meaning |
| [TEXT.md](TEXT.md) | How the court reads a text: blocks, zones, sentences, words and measures |
| [VIOLATIONS.md](VIOLATIONS.md) | Every diagnostic the court raises by itself, with its level and its invariant |

## The model in one page

**Three layers.** The reader's rights are the constitution shipped with Prosa (`constitution/reader_rights.proz`). A house
style is a `STYLE` with the rules it holds. A piece is one text bound to a style and a form. Lower layers constrain upper
layers: a style adopts the rights, and a piece follows a style.

**Ten kinds.** `STYLE` groups rules. `TERM`, `WORDLIST`, `PATTERN` and `PROFILE` are the four kinds of rule. `FORM` declares
the structure of a kind of text. `ZONE` and `ALLOW` excuse, with a reason. `PIECE` binds a text. `READING` names a judgment
that stays with a reader.

**Five levels.** The levels run in order, and the run stops at the level asked with `--level`:

| Level | What is judged | The court needs |
|---|---|---|
| 1 Syntax | The `.proz` file parses and each field has its shape | The file |
| 2 Declaration | The style and the piece are lawful by themselves | Every file reached through `USE` |
| 3 Text | Words, terms, patterns and positions | The text of each piece |
| 4 Measure | The profile, and the budget of a word list, over a whole piece | The text of each piece |
| 5 Reading | A declared question, listed as recorded or due | The folder of records |

An error at level 1 stops level 2, and an error at level 2 stops level 3: a text is judged only against a lawful declaration.

**Undecidable is silence.** The court raises a finding only where the specification makes the answer the same on every
machine. A profile stays silent on a text shorter than its `MIN_WORDS`. A reading is listed and never counted as a pass.

**Evidence.** A `TERM`, `WORDLIST`, `PATTERN`, `PROFILE` or `FORM` without `EVIDENCE` is refused at level 2. The evidence is
one sentence that names a dated ruling of the author or a measure on a named corpus.

## The diagnostic

A finding has six parts, in the Softanza family envelope C2: `code`, `severity`, `message`, `span` (file and line), `cites`
and `language`. The Prosa court adds `level` and `subject`. Findings are always wrapped in `{"diagnostics": [...]}`.
On a file that two pieces bind, the court judges the file once per piece, and each finding also holds `piece` and `style`:
the report prints them on a line `Piece <name> · style <name>` under the rule. Two matches of one rule on one line are two
findings, even when their messages are the same.

```
src/04-the-court.md:57  error  TERM_SYNONYM  programmer
    "developer" stands for the person who writes programs: the house word is "programmer".
    Rule programmer · FRAMEWORK.md section 4: developer for programmer is a forbidden word

1 error(s), 0 warning(s) across 3 file(s) at level 4
```

A code is a stable UPPER_SNAKE name and is never reused. The codes of the court are listed in VIOLATIONS.md. The codes of
`TERM`, `WORDLIST`, `PATTERN` and `PROFILE` rules belong to the style that declares them. `cites` holds `rule:<name>` and
`evidence:<the rule's evidence>`.

Exit codes: 0 when no error stands (warnings are allowed), 1 on an error, 2 on a usage or read error.

## Versions

The language is 0.1, the contract of diagnostics is 0.1, and the reference court is 0.1.1. The three are printed by
`prosa version` and cross-checked by `prosa pack --check` against `protocol/MANIFEST.json`. A change that makes a lawful
declaration unlawful, or a silent text refused, raises the language's minor version.

**Lineage.** Language 0.1 was founded on 2026-11-26 from the proposal in `doc/PROPOSAL.md`, after the three rulings the
author gave that day: the law is written in `.proz`, the reference court is written in JavaScript, and AYOUNI Press is the
first house.
