# Prose Under Law (working title)

**Subtitle (proposed):** Writing governance for people and AI agents, using the Prosa language.
**Author:** Mansour Ayouni · **Imprint:** AYOUNI Press · sibling of *Interfaces Under Law* (the Zayn book).

This folder holds the first full draft of a short book about Prosa: a preface and ten chapters. It was drafted for the
author, in his voice, under the AYOUNI Writing Framework v0.6, by an AI agent on 2026-11-26.

**Everything here is a proposal for the author's ruling:** the title, the subtitle, the outline, every chapter title, the
subject term of each chapter, the fixed headings, and every sentence. Every page is `status: draft`; only the author moves a page.

## What is in the folder

| Path | What it holds |
|---|---|
| `book.proz` | The declaration that governs the book: the form `book_chapter`, the piece `prosa_book`, and the excuses (`ALLOW`), each with its reason |
| `src/structure.yaml` | The contents as data: title block, chapters, subject terms |
| `src/en/NN-slug.md` | The pages. Front matter: `id`, `number`, `title`, `subject`, `status`, `lang`, `stage`, `evidence` |
| `examples/chNN/` | Every `.proz` file and text the chapters run, as they were run |
| `research/trial/` | The first verdict of the court on each chapter, kept before any repair, and the table of the trial |
| `research/voice/self-reading.md` | The drafter's own reading: per chapter, the passage judged most his and the one least his |

## The shape of a page

An opening in the first person that says what the chapter does, whose first sentence says what the subject is; sections
titled in six words at most; `## Where it stands` (Built, Designed) from chapter 3 on; `## In your hands`, a real defect or a
homework; a closing bridge, never a summary. Code is in fences: `proz` for declarations, `text` for terminals, `markdown` for
the texts the court judges. `[AUTHOR: …]` marks a particular only the author knows.

## How the terminals were produced

Every `text` block is pasted from a run of the reference court 0.1.0 on 2026-11-26. Where a page shows `prosa`, the command
was `node tools/prosa/cli.js`. The blocks of chapters 3, 4, 5, 7, 8, 9 and 10 were run from inside `examples/chNN/`
(for example `cd book/examples/ch03 && node ../../../tools/prosa/cli.js check first.proz`); the blocks of chapter 6 from
`D:\GitHub`; the parity run of chapter 2 and the version and conformance runs of chapter 3 from the repository root. In chapter 9
the JSON block is one entry of four, cut from the run of `check house.proz --json`.

## The court governs the book

From the repository root:

```
node tools/prosa/cli.js check book/book.proz
```

The procedure followed for each chapter: write it from the rules, without the court; run the court once and record that first
verdict (`node book/research/trial/record.js first NN-slug.md`); repair to silence, counting the rounds. A false positive is
recorded as one and excused by an `ALLOW` with its reason; the prose is left as written.

## Rulings asked of the author

1. The title, the subtitle and the ten chapter titles.
2. The fixed headings of a chapter (`Where it stands`, `In your hands`), and whether the sister book's fuller shape applies.
3. The eight `ALLOW` excuses of `book.proz`, and whether the calque rule on `hole` and the hedge `kind of` should be narrowed in the house style.
4. The `[AUTHOR: …]` holes, page by page.
5. The passages listed as least his in `research/voice/self-reading.md`.
