# The Prosa roadmap

The roadmap of Prosa is the list of its nine milestones, each with its state on 2026-11-26 and the work that remains. Every
figure on this page comes from a command anyone can run again.

## The state of each milestone

| Milestone | State | Measured |
|---|---|---|
| M1. Language 0.1 and the reference court | Built | 66 of 66 fixtures pass; 31 diagnostic codes in contract 0.1 |
| M2. The AYOUNI house as the first style | Built | Lint parity on 123 pages; voice gate parity on 151 of 153 files |
| M3. The agent loop: hook, MCP server, brief | Built | The hook and the three MCP tools ran on test input |
| M4. A book chapter under the court | Open for the author | First verdicts recorded: 14 findings, 3 true |
| M5. The Haro twin and the Zig binary | Built | Zig: 185 of 185 cases identical. Twin: 56 of 66 fixtures, 10 named seams |
| M6. The drift measure | Built | 36.5 colons per thousand words in the 2026 drafts, 15.1 in the Ring book |
| M7. A second house | Example only | `styles/plain_manual` passes on 4 files |
| M8. The website | Built, open for review | 12 pages, 0 findings across 15 files |
| M9. The book | Draft | 11 chapters, about 10,000 words, 0 findings across 14 files |

## What remains

**For the author.**

- M4 asks for the author's remarks on one governed chapter and one free chapter, counted side by side. The count is his.
- The book holds about twenty `[AUTHOR: ...]` holes and eight `ALLOW` declarations in `book/book.proz`. Each waits for a ruling.
- Two style rules gave false findings in the trial: `calques` on the word "hole", the framework's own term, and `hedges` on "kind of"
  as a noun. The author rules on each.
- The drift run proposes an upper bound on colons and lower bounds on questions and exclamations.
- Chapter 6 of the book says the Refinement manuscript was written with an AI agent. The claim is inferred and waits for
  confirmation.

**For the court.**

- `SAY_ONCE` excuses the exact subject word. Its inflections ("commitments" for "commitment") come next.
- Two matches of one `PATTERN` with `SAYS` on one line give one finding. Two findings come next.
- Two pieces on one file give one merged report.
- A `HEADINGS` field with one bare word passes level 2 and then stops the court. A level 2 diagnostic comes next.
- Declarations named `constructor` or `toString` meet the objects of JavaScript. A map with no prototype comes next.
- `readHtml` takes about 68 seconds on the Zayn book's HTML because of unclosed tags.

**For the Zig binary.**

- It carries `check`, `measure`, `conformance` and `version`. The commands `brief`, `drift`, `readings` and `pack` stay with
  the JavaScript court, as does the readings block of level 5.
- The WebAssembly build (191 KB) gives the expected codes on 63 of 66 fixtures. The three others need a file system.

**For the Haro twin.**

- The ten seams are listed in `haro/twin-expected.csv`. The ratchet lets the list shrink and refuses its growth.

**For the site and the repository.**

- The site waits for a visual review in a browser, dark theme included.
- The folder is a plain folder. `git init` and the first commit wait for the author's word.
- The three house checkers stay in service in their own repositories. Their retirement is the author's decision.
- M7 becomes real when a house outside Softanza writes its own `.proz`.

## The commands behind the figures

```
node tools/prosa/cli.js conformance
node tools/prosa/cli.js check prosa.proz
node tools/prosa/cli.js check site/site.proz
node tools/prosa/cli.js check book/book.proz
node tools/prosa/cli.js pack --check
node tools/prosa/parity.js
node haro/judge-prosa-court.js
node tools/parity/lint-parity.js <folder>
```
