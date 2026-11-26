# The trial: what the court found in a draft written with the rules in the prompt

The trial of this book is a count: for each chapter, the findings of the court's first verdict, taken before any repair, and the rounds of repair to silence. It was run on 2026-11-26 with the reference court 0.1.0 (`node tools/prosa/cli.js check book/book.proz --json`), on a draft that an AI agent wrote with the author's rules in its prompt: the AYOUNI Writing Framework 0.6, the study of the Ring book, the sister book's brief, and a list of the corrections he has repeated.

**The procedure, per chapter.** The chapter was written without running the court. The court was then run once, and its findings for that chapter were appended to `first-verdicts.json` as returned (`record.js first`). The chapter was repaired until the court printed no error and no warning for it; each repair followed by a run is one round (`record.js round`). A finding judged a false positive was recorded under `false_positives`, the prose was left as written, and the line was excused by an `ALLOW` in `book.proz`.

## The table

| Page | Prose words at first verdict | Findings | HEDGE | CALQUE | VOICE_ABSENT | TERM_SYNONYM | False positives | Rounds to silence |
|---|---|---|---|---|---|---|---|---|
| `00-preface.md` | 540 | 2 | 1 | 1 | 0 | 0 | 2 | 1 |
| `01-a-style-held-by-a-promise.md` | 1016 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `02-what-the-field-already-built.md` | 1067 | 1 | 1 | 0 | 0 | 0 | 1 | 1 |
| `03-a-correction-made-once.md` | 870 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `04-one-thing-one-word.md` | 708 | 1 | 0 | 0 | 1 | 0 | 0 | 1 |
| `05-the-pattern-that-refuses-a-sentence.md` | 859 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `06-the-measure-of-a-voice.md` | 885 | 1 | 0 | 0 | 1 | 0 | 0 | 1 |
| `07-the-form-of-a-text.md` | 896 | 3 | 1 | 2 | 0 | 0 | 3 | 1 |
| `08-the-reading-beside-the-court.md` | 1057 | 3 | 0 | 3 | 0 | 0 | 3 | 1 |
| `09-the-ai-agent-under-the-court.md` | 966 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `10-a-house-writes-its-law.md` | 1036 | 3 | 1 | 1 | 0 | 1 | 2 | 1 |
| **Total, 11 pages** | **9900** | **14** | **4** | **7** | **2** | **1** | **11** | **7** |

Four pages were silent at their first verdict and took no round: chapters 1, 3, 5 and 9. No page took more than one round.

## The findings, read

**Three findings are true.**

- `VOICE_ABSENT`, twice (chapters 4 and 6): a median sentence of 10 words, where the profile `ring_presence` asks 16 within 5. The draft kept the short verdicts and wrote too few long sentences. The repair lengthened the explanations; the medians at silence, by the house lint, are 17 and 15.
- `TERM_SYNONYM`, once (chapter 10, line 30): the word `developers` used as a mention without quotation marks. The repair put the word in quotation marks.

**Eleven findings are false positives**, of two kinds, each excused by an `ALLOW` with its reason.

- `CALQUE`, seven times (preface, chapters 7, 8 and 10): the list `calques` refuses `hole` after an article or before `program`, and the framework's own term for an `[AUTHOR: …]` marker is "a hole". Three of the seven stand on one line of chapter 8 that quotes the calque of 2020.
- `HEDGE`, four times (preface, chapters 2, 7 and 10): the list `hedges` refuses `kind of`, and the pages write "one kind of declaration", "a kind of text", "what kind of pages".

**What the first verdicts did not hold.** No dash, no forbidden word, no intensifier over its budget, no superlative, no title over six words, no title or first sentence without its subject term, no closing summary, no placeholder.

## What the trial measures, and its size

The trial counts what the court decides: words, patterns, positions and measures, at levels 3 and 4. It is one draft, by one AI agent, in one session, and the agent knew that the court would run. The drafter also edited each chapter by its own re-reading between the first verdict and the end (composed particulars, claims larger than their source); those edits are not findings of the court and are not counted here. What a reading decides is in `../voice/self-reading.md`, and the author's own remarks on the draft are the count that completes this table.

## Court behaviour noted during the trial

- `prosa brief styles/ayouni/ayouni.proz --style ayouni --form chapter` prints `where "undefined" would come` for every word-list entry that is a group or a sequence (for example the `utilize` group of `forbidden_words`, and nine entries of `calques`).
- Two matches of one `PATTERN` on one line give one finding when the pattern has `SAYS`: the message does not quote the matched words, so the two findings are identical and one is dropped (seen in `examples/ch05`, before `SAYS` was removed from the pattern `narrative`).
- When two pieces bind the same file, the text report merges their findings and does not name the piece or the style that raised each.
- One `ALLOW` excuses every finding of its code on the line it names (chapter 7, line 136: two `CALQUE` findings; chapter 8: three).
- `prosa pack --check` exits 2: `no protocol/MANIFEST.json`.
- `tools/prosa/hook.js` names `doc/AGENTS.md`, which is not in the repository.
- The list `calques` has no `MENTIONS skipped`, so a quoted calque is refused; the list `hedges` reads `kind of` whatever stands before it.
