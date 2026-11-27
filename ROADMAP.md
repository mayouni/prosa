# The Prosa roadmap

The roadmap of Prosa is the list of its nine milestones, each with its state on 2026-11-27 and the work that remains. Every
figure on this page comes from a command anyone can run again.

## The state of each milestone

| Milestone | State | Measured |
|---|---|---|
| M1. Language 0.1 and the reference court | Built | Court 0.1.1: 73 of 73 fixtures pass; 31 diagnostic codes in contract 0.1 |
| M2. The AYOUNI house as the first style | Built | Lint parity on 123 pages; voice gate parity on 151 of 153 files |
| M3. The agent loop: hook, MCP server, brief | Built | The hook and the three MCP tools ran on test input |
| M4. A book chapter under the court | Open for the author | First verdicts recorded: 14 findings, 3 true |
| M5. The Haro twin and the Zig binary | Built | Zig: 206 of 206 cases identical. Twin: 63 of 73 fixtures, 10 named seams |
| M6. The drift measure | Built | 36.5 colons per thousand words in the 2026 drafts, 15.1 in the Ring book |
| M7. A second house | Example only | `styles/plain_manual` passes on 4 files |
| M8. The website | Built | 12 pages in the Docket theme, set in IBM Plex, 0 findings across 15 files; Zayn's UI audit passes K01 to K37 at six widths, by Day and by Night |
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

Court 0.1.1 closes the six gaps the trial found. Each has a fixture, and the Zig binary judges each one as the reference
court does.

- `SAY_ONCE` excuses the subject's plural as it excuses the subject: "five commitments" stands twice under the subject
  "commitment".
- Two matches of one `PATTERN` with `SAYS` on one line are two findings.
- A file that two pieces bind is judged once per piece, and each finding names its piece and its style.
- A `HEADINGS` field with one bare heading is a list of one. Court 0.1.0 stopped on it.
- A declaration named `constructor` is a name like any other: the maps of names have no prototype.
- `readHtml` reads the 3 MB page of the Zayn book in about 1 second, against 126 seconds before, with the same model on 48
  pages and on 20,000 generated pages of unclosed tags.

**For the Zig binary.**

- It carries `check`, `measure`, `conformance` and `version`. The commands `brief`, `drift`, `readings` and `pack` stay with
  the JavaScript court, as does the readings block of level 5.
- The WebAssembly build (193 KB) gives the expected codes on 70 of 73 fixtures. The three others need a file system.

**For the Haro twin.**

- The ten seams are listed in `haro/twin-expected.csv`. The ratchet lets the list shrink and refuses its growth.

**For the site and the repository.**

- The site is published at <https://mayouni.github.io/prosa/> by a workflow of GitHub Pages on every push that touches
  `site/`.
- The Docket theme sets the site on a paper ground with black ink, a blue link and a yellow signal. It holds two themes, Day
  and Night, and "System" follows the reader's system. The front page carries a docket: the first finding of five real runs
  of the court on fixtures of the suite.
- IBM Plex Sans and IBM Plex Mono are carried in `site/fonts/` under the SIL Open Font License, in four Latin1 files of 79
  KB in all. Each page preloads them, and a face that arrives late is left for the next page: nothing moves once painted
  (K22).
- Zayn's UI audit raises one finding per page on the trail: it takes the root of the Zayn repository as the site's root. The
  trail of each page starts at the Prosa front page.
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
