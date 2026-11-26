# Parity with the house checkers

The parity of Prosa is its measured agreement with the three checkers the house wrote before it: `style_lint.py`,
`check_public.py voice` and `zayn site shell`. This page gives the counts of 2026-11-26 and names every difference. Each
count comes from a harness in `tools/parity/` that anyone can run again.

## The house lint: style_lint.py

`node tools/parity/lint-parity.js <folder> [--lang fr]` runs `style_lint.py` and the court, under
`styles/ayouni/ayouni.proz`, on each page and compares eighteen counts.

| Corpus | Pages | The twelve measures | The six rule counts |
|---|---|---|---|
| Softanza book, English | 42 | equal on 42 | equal on 42 |
| Zayn book, English | 23 | equal on 23 | equal on 23 |
| Refinement book, English | 16 | equal on 16 | equal on 16 |
| Softanza book, French | 42 | equal on 42 | equal on 42 |

The twelve measures are words, sentences, median, long sentences, exclamations, questions, colons, dashes, trailing ellipses,
colon lead-ins, one-sentence paragraphs and paragraphs. The six rule counts are calques, intensifiers, hedges, superlatives,
forbidden words and emoji.

**One difference by design.** The lint counts "absolutes" (always, never, everyone) as words to look at, without a
threshold. The court declares no rule for them: a count with no verdict is a reading.

## The public gate: check_public.py voice

`python tools/parity/voice-parity.py <folder>...` counts, file by file, the gate's phrase matches and the court's
`LACK_LISTED` findings.

| Corpus | Files | Agree | Gate total | Court total |
|---|---|---|---|---|
| The Zayn site (HTML) | 41 | 41 | 5 | 5 |
| The AYOUNI Press site sources | 5 | 5 | 0 | 0 |
| Zayn book and Softanza book, English and French (Markdown) | 107 | 105 | 2 | 0 |

**The two files that differ** are the English and French pages of Softanza chapter 31. The gate matches "is not ... yet"
inside an inline code span that quotes a program's message (`Sing is not available YET`). The court does not read inline
code: a name or a message in code is not the author's prose.

## The site shell: zayn site shell

`node tools/parity/site-parity.js` judges 39 pages of the Zayn site under `styles/softanza_site/site.proz`, each with the
subject term the site shell declares for it.

| Check | The court | The site shell |
|---|---|---|
| The subject term in the title and the first sentence | 2 findings | passes on every page |
| Titles over six words | 32 pages, with the same word counts | 37 pages owed, over 45 pages |
| Say it once, in the first 150 words | 44 findings on 25 pages | 33 pages owed |

- **The two subject findings** are the two exceptions `WRITING.md` itself grants: the front page, whose hero is judged on its
  kicker, and the Reader, whose lede is a `span`. A `ZONE` declares each one.
- **The six pages of difference on titles** are pages whose term stands on another line of the shell's table than the one the
  harness reads; the word counts agree on every page both read.
- **Say it once** differs in its definition of a content word. The court's list of function words is in the specification;
  the site shell keeps its own. The two agree on the rule and differ on eight pages.

The site shell also checks what belongs to a site and not to its prose: the menu, the shell's markup, the arrows of links.
Those checks stay with Zayn, which declares the menu in `.zayn`.

## The Ring profile

`prosa measure` on chapters 1 to 9 of the Ring book gives the profile below, beside the figures published in
`books/ring-book/style/metrics.md`.

| Measure | prosa measure | Published |
|---|---|---|
| Prose words | 72,604 | 72,915 |
| Sentences | 4,117 | 4,112 |
| Median sentence | 16 words | 16 words |
| Sentences over 40 words | 3.5 % | 3.3 % |
| Colons per thousand words | 15.2 | 15.2 |
| Exclamations per thousand words | 2.4 | 2.4 |
| Questions per thousand words | 3.3 | 3.3 |
| Dashes per thousand words | 0.2 | 0.5 |
| Paragraphs of one sentence | 46.2 % | 45 % |

The court's definitions are those of `style_lint.py`, and the published figures come from an earlier script with its own
sentence splitter and its own count of dashes. Five figures are equal and four are within their rounding or their definition.

## What the drift run shows

`prosa drift` compares the two books drafted with AI agents in 2026 (Zayn and Refinement, 78,488 words) with the Ring
manuscript (91,918 words).

| Mark, per thousand words | The 2026 drafts | The Ring book |
|---|---|---|
| Colons | 36.5 | 15.1 |
| Exclamations | 0.6 | 2.3 |
| Questions | 0.9 | 3.3 |
| Dashes | 0.1 | 0.3 |

The drafts hold the dash under its bound and carry more than twice the author's colons, a quarter of his exclamations and a
quarter of his questions. This is the measured form of the verdict in `STYLE-ANALYSIS.md`: "more disciplined and colder". An
upper bound on colons and lower bounds on questions and exclamations are candidates for the author's ruling; the profile
`ring_presence` in `styles/ayouni/ayouni.proz` proposes the first lower bounds.
