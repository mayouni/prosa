# Prosa: the founding proposal

Prosa is a declarative language that governs written text by compilation: a writing style is declared in `.proz` files, and a
court refuses every sentence the declaration forbids, by name, before the text reaches a reader. It lets a correction be made
once. This document states Prosa's philosophy, its design, its value for writers who work with AI models, its practical use and
its implementation plan. The author ruled on it on 2026-11-26, and `ROADMAP.md` gives the state of each milestone.

## 1. The problem Prosa answers

A style that lives in a promise drifts back. The house already wrote this sentence about itself, in
`zayn/doc/design/WRITING.md`: *"It drifted back each time because it lived only in a promise."* The record in the AYOUNI Press
repository shows the same remark made several times on four subjects:

| The correction | Where it is recorded | How often |
|---|---|---|
| A page lists what the project lacks | AWF-14, HOUSE-21, ZANE-AFFIRM-01 | "I raised this before but you seem to persist on it" |
| Narrative, teasing or aphoristic register | `site-writing-declarative.md`, WRITING.md rule 4 | "drifted back after being asked for several times" |
| The em dash where the author writes a colon | AWF-04 | found as "the Refine agent's habit" |
| Several words for one thing | `zayn-book/CLAUDE.md` | "six words for a finding" |

The cause is known and measured. An AI model writes toward the average of what it read, and an instruction in a prompt is one
weak signal against that average:

- **The pull is statistical.** Instruction-tuned models use present participial clauses two to five times more often than people
  do, and nominalizations one and a half to two times more often (Reinhart et al., PNAS 2025). The share of biomedical abstracts
  carrying the excess vocabulary of AI models reached at least 13.5 % in 2024 (Kobak et al., Science Advances 2025).
- **The pull flattens voices.** Essays written with an instruction-tuned model are closer to each other than essays written
  alone (Padmakumar and He, ICLR 2024), and AI suggestions move Indian writers toward Western styles (Agarwal et al., CHI 2025).
- **A prohibition in a prompt is unreliable.** Naming a forbidden word can raise its chance of appearing (Rana, 2026, on one
  open model), and negated instructions have been a known weakness since 2022.

Softanza already owns the remedy for interfaces. Zayn moved the law out of the prompt and into a court that sits outside the
model, so the defect is refused instead of regretted. Prosa does the same for prose.

## 2. The philosophy in five commitments

1. **A correction is made once.** Each remark of the author becomes a rule with a stable code, a refused example, a written
   example and the remark itself as evidence. From that day the court raises it, and the author does not.
2. **A voice is a measure, taken from the author's own pages.** The Ring book gives a profile: a median sentence of 16 words,
   15 colons and 0.5 dashes per thousand words. Prosa holds a text to that distribution in both directions. It refuses noise, and
   it also asks for what makes the voice present: the short verdict, the earned exclamation, the colon. The 2026 books were found
   "more disciplined and colder"; a court that only forbids produces that result.
3. **Prosa holds a style to itself and brings no taste of its own.** The author writes "The bottleneck of our age is not writing.
   It is admission." A generic list of AI habits would refuse that sentence. In Prosa a rule binds a text only when the style
   adopts it, so the same pattern is noise in one house and voice in another.
4. **A rule enters on evidence.** Evidence is a dated ruling of the author or a measure on a named corpus. A rule without it is
   itself refused (`RULE_WITHOUT_EVIDENCE`). This is Zayn's Article VII applied to writing: never fashion.
5. **Undecidable is silence, never a pass.** The court decides words, patterns, positions and counts. Whether a sentence is a
   riddle or a paragraph is "his" belongs to a reading, by the author or by an AI model under a declared brief. Prosa names the
   reading, records its answer, and keeps it apart from the court's verdict.

## 3. What exists, and what Prosa adds

| Prior work | What it gives | What Prosa adds |
|---|---|---|
| Vale, textlint, proselint | Rules as files in the repository, markup-aware matching, checks in CI | A typed language in place of YAML and regular expressions; the piece's own declaration; measures; evidence |
| ASD-STE100, and the 100 controlled languages surveyed by Kuhn (2014) | Proof that a restricted lexicon with one meaning per word works at industrial scale | The house chooses its own lexicon, and the natural language stays whole |
| Stylometry (Mosteller and Wallace, Burrows, Biber's feature set) | A voice is measurable as a distribution of small features | The measure becomes a contract a draft must meet |
| Wikipedia's "Signs of AI writing", the excess-vocabulary studies | A catalogue of what AI models overuse | An adoptable set, `model_drift`, that each style takes, amends or declines |
| Antislop (Paech et al., ICLR 2026) | A sampler that backtracks on banned phrases, and a profiler that finds over-used patterns against a human baseline | The same profiling against the author's corpus, proposing rules for the author to rule on |
| LintMe (CHI 2026), PostHog's handbook | Deterministic checks joined to AI model judgment: detect with a linter, repair with a model | The split is part of the language, as enforcement classes |
| Swales's move analysis | A genre is a fixed sequence of rhetorical moves | The `FORM` declaration: fixed headings, the opening and the close of a chapter |
| `style_lint.py`, `check_public.py voice`, `zayn site shell` | The house's own three checkers, already carrying its rules | One law in one language, read by one court |

The gap none of these fills is the one this house met: no existing tool binds a rule to the ruling that created it, measures
a draft against its author's own profile, and declares what a given text is about so that position rules become decidable.

## 4. The design

### 4.1 Three layers, as in Zayn

Lower layers constrain upper layers.

1. **The reader's rights** are a small constitution shipped with Prosa and true of any governed text: a title names its
   subject, a thing has one word, a statement is made once per screen, a missing particular is marked as a hole and never filled
   by an agent, a count comes from a source.
2. **The house style** is the declared voice: terms, word lists, patterns, profile, forms. AYOUNI Press is the first house.
3. **The piece** is the declaration of one text: its file, its style, its form, its subject term, its reader.

The prose stays in Markdown. A `.proz` file stands beside it and declares what the Markdown must be.

### 4.2 The surface follows Zayn's grammar

`DEFINE KIND name ( FIELD value, ... )`, UPPER_SNAKE keywords, lower_snake names, `//` comments, closed enumerations. The
example below shows the ten kinds in language 0.1, as specified in `doc/language/`.

```
USE "prosa:reader_rights"

DEFINE STYLE ayouni (
  LANGUAGES [en, fr],
  ADOPTS [reader_rights],
  HOLDS [programmer, intensifiers, lack_listed, ring_voice],
  MEASURED_FROM "ayouni/books/ring-book"
)

DEFINE TERM programmer (
  MEANS "the person who writes programs",
  REFUSES [developer, developers],
  MENTIONS skipped,
  EVIDENCE "FRAMEWORK.md section 4"
)

DEFINE WORDLIST intensifiers (
  REFUSES [very, really, simply, "dead simple"],
  AT_MOST 4 PER_THOUSAND,
  CODE INTENSIFIER, SEVERITY warning,
  EVIDENCE "FRAMEWORK.md section 4"
)

DEFINE PATTERN lack_listed (
  MATCHES ["not yet", "nobody has", "never" WITHIN 3 "run"],
  ON [page],
  CODE LACK_LISTED, SEVERITY error,
  REFUSED "This was not yet measured.",
  WRITTEN "The verifier checks the declaration.",
  EVIDENCE "The author, 2026-11-08: Avoid this role of transparency that hurts the project image"
)

DEFINE PROFILE ring_voice (
  SENTENCE_MEDIAN 16 WITHIN 5,
  SENTENCES_OVER 40 AT_MOST 6 PER_HUNDRED,
  DASHES AT_MOST 4 PER_THOUSAND,
  COLONS AT_LEAST 5 PER_THOUSAND,
  EVIDENCE "Measured on the Ring book; AWF-04"
)

DEFINE FORM page (
  TITLE_WORDS AT_MOST 6,
  TITLE_HOLDS subject,
  FIRST_SENTENCE_HOLDS subject,
  SAY_ONCE FIRST 150,
  HOLES_CLOSED_AT [review, published],
  EVIDENCE "zayn/doc/design/WRITING.md rules 1 and 2"
)

DEFINE ZONE hero (
  EXEMPT_FROM [SAY_ONCE],
  REASON "The hero holds the tagline the author ruled"
)

DEFINE PIECE the_court (
  FILE "site/court.html",
  FOLLOWS ayouni, FORM page,
  SUBJECT "court", READER programmer
)

DEFINE ALLOW release_note_17 (
  FILE "site/releases.md", LINE_HOLDS "not yet signed",
  EXCUSES LACK_LISTED, REASON "Quoted from the record"
)

DEFINE READING voice_reader (
  ON page,
  ASKS "Which three passages are most him, and which one is least him?",
  RECORDS "research/voice"
)
```

Four choices in this example carry the design:

- **`REFUSED` and `WRITTEN` are part of a rule.** The pair is the rule's conformance fixture, the example shown in the
  diagnostic, and the material an AI agent learns the replacement from. A rule states what to write, which is the form AI models
  follow best.
- **`PIECE ... SUBJECT` makes position rules decidable.** "The title names its subject" is a judgment until the subject term is
  declared; then it is a string test, as `zayn site shell` already proves.
- **`ALLOW` excuses one line with a reason and fails when it no longer matches.** This is the house's `AFFIRM_ALLOWED`, kept.
- **Patterns are written over words, with `WITHIN`, `THEN` and positions.** A writer reads them; nobody maintains a regular
  expression.

### 4.3 The court judges at five levels

| Level | What is judged | Example code |
|---|---|---|
| 1 Syntax | The `.proz` file parses | `DUPLICATE_FIELD` |
| 2 Declaration | The style and the piece are lawful by themselves | `RULE_WITHOUT_EVIDENCE`, `TERM_REFUSED_AND_REQUIRED`, `PIECE_WITHOUT_SUBJECT` |
| 3 Text | Words, terms, patterns and positions, zone by zone | `TERM_SYNONYM`, `LACK_LISTED`, `TITLE_TOO_LONG`, `SAY_ONCE`, `HOLE_OPEN` |
| 4 Measure | The profile, over a whole piece | `OFF_PROFILE` |
| 5 Reading | A declared question, answered by a reader and recorded | no code: a reading is a record |

The court reads Markdown into a tree of zones: title, lede, section, paragraph, sentence, word, and the zones it skips (code,
quoted record, front matter). Sentence and word boundaries are defined in the specification, so two implementations agree byte
for byte. Levels 1 to 4 use no AI model and no language toolkit: the same text gives the same verdict on every machine.

Diagnostics keep Zayn's text form and the Softanza family envelope C2 (`code, severity, message, span, cites, language`):

```
src/04-the-court.md:57  error  LACK_LISTED  the_court
    The line lists a lack ("not yet"). Written form: state what the thing is and does.
    Rule lack_listed · HOUSE-21 · ruled by the author, 2026-11-08

1 error(s), 0 warning(s) across 1 file(s) at level 3
```

### 4.4 Haro declares the language

Prosa is declared in Haro's meta-language (`haro/prosa.stzu`), as Zayn is. Haro's forge produces the second court for `.proz`
declarations and the decoder grammar that holds an AI model to the shape of a `.proz` file. The Zayn ruling applies unchanged:
a grammar at the sampler buys shape, the court refuses meaning.

## 5. The value for writers

**Prosa gives a writer who works with AI models the one thing a prompt cannot give: a style that stays.** Five effects follow.

- **The author stops repeating himself.** A remark costs one rule. The four corrections of section 1 become four codes.
- **The voice stays the author's.** The measure comes from his pages, so a draft is pulled toward him and away from the average.
- **A style becomes an asset.** It is versioned, tested by fixtures, reviewed in a pull request, shared between books, sites and
  posts, and carried into French with its own lexicon.
- **Every refusal explains itself.** It names the rule, shows the written form and cites the ruling. A new collaborator or a new
  AI agent learns the house from its diagnostics.
- **The house can state its style to others.** A publisher, a documentation team or a brand writes its own `.proz` and holds
  every contributor, human or AI agent, to the same law.

## 6. Practical use

The commands mirror Zayn's, with exit codes 0, 1 and 2.

| Command | What it does |
|---|---|
| `prosa check <file>` | Judges a `.proz` file or a Markdown piece, with `--level N` and `--json` |
| `prosa measure <corpus>` | Takes a profile from approved pages and writes it as a `PROFILE` |
| `prosa brief <piece>` | Writes the contract an AI agent receives before drafting: the terms, the form, the written examples |
| `prosa drift <drafts> --against <corpus>` | Lists what the drafts over-use against the author's pages, as candidate rules |
| `prosa conformance` | Runs every fixture and its lawful twin |
| `prosa pack --check` | Verifies the standard's files and versions |

**The author's loop.** The author reads a draft and makes a remark. The AI agent writes the remark as a rule: the quote as
`EVIDENCE`, the faulty sentence as `REFUSED`, the corrected one as `WRITTEN`. The author rules on it. The court enforces it on
every book and every site from that commit.

**The AI agent's loop.** The agent receives `prosa brief`, drafts, runs `prosa check --json`, and repairs each finding by code
until the court is silent. A Claude Code hook runs the check on every write to a governed file, so the agent meets the refusal
at the moment of writing. The reading of level 5 comes last, on a text already clean of what a machine can decide.

**The ratchet.** A manuscript's count of findings is stored and may only go down, so an old book joins the law chapter by
chapter.

## 7. The implementation plan

Each milestone ships complete or not at all.

| Milestone | Content | Done when |
|---|---|---|
| **M1 The language** | Specification v0.1, EBNF grammar, the ten kinds, `haro/prosa.stzu`, a JavaScript reference parser, fixtures for levels 1 and 2 | `prosa check ayouni.proz` judges a declaration, and every fixture has a lawful twin |
| **M2 The text court** | Zone tree, level 3; the AYOUNI style and the Softanza site style written in `.proz` | The court gives the same findings as `style_lint.py`, `check_public.py voice` and `zayn site shell` on the three books and the Zayn site; the three checkers retire |
| **M3 The measure** | Level 4, `prosa measure` | The Ring profile is reproduced from the Ring book to the published figures |
| **M4 The agent loop** | `prosa brief`, the C2 envelope, the Claude Code hook, an MCP surface | One chapter is drafted with the court and one without, and the author's remarks on each are counted |
| **M5 The binary** | Zig verifier and WASM build, byte parity with the reference, a site with a live court | `prosa` runs as one executable on Windows and Linux |
| **M6 Drift and French** | `prosa drift`, the `model_drift` set, French lexicons, parity of code and counts between editions | A drift run on the agents' drafts proposes rules the author accepts or declines |
| **M7 The standard** | Recorded readings, the protocol pack, a second house's style | A house outside Softanza governs a text with its own `.proz` |
| **M8 The website** | A static site in the house's writing law, with a live court that runs the reference in the browser | Every page passes `prosa check site/site.proz` |
| **M9 The book** | *Prose Under Law*, a draft for the author's ruling, each chapter written under the court | Every chapter passes `prosa check book/book.proz`, and the first verdict of each is kept as the trial's record |

M4 carries the proof of the whole proposal: the number of remarks the author makes on a governed chapter against an ungoverned
one. It is the figure the site and the book can state.

The repository copies Zayn's layout: `README.md`, `ROADMAP.md`, `doc/language/` (README, GRAMMAR, DECLARATIONS, VIOLATIONS),
`doc/decisions/`, `constitution/` (the reader's rights as data), `conformance/fixtures/` with `// Expected: CODE` and lawful
twins, `tools/prosa/` (the reference), `zig/src/`, `haro/`, `styles/` (the houses), `site/`.

## 8. The three rulings of 2026-11-26

1. **The law is written in `.proz` and compiled to a JSON pack.** Zayn keeps its law in JSON because one constitution serves
   everyone. A writing style belongs to each house and is written by writers, so the language itself must carry it.
   Ruled: yes.
2. **The reference court is written in JavaScript first, and the Zig binary follows at M5.** This is Zayn's own path; the
   reference runs in the site and in the hook from M1. Ruled: yes.
3. **AYOUNI Press is the first house, and its three existing checkers are the parity target.** The rules, their evidence and
   their fixtures already exist there; M2 moves them and proves the court on real pages. Ruled: yes.

## Sources

- Reinhart et al., "Do LLMs write like humans? Variation in grammatical and rhetorical styles", PNAS 2025: https://arxiv.org/abs/2410.16107
- Kobak et al., "Delving into LLM-assisted writing in biomedical publications through excess vocabulary", Science Advances 2025: https://arxiv.org/abs/2406.07016
- Padmakumar and He, "Does Writing with Language Models Reduce Content Diversity?", ICLR 2024: https://arxiv.org/abs/2309.05196
- Agarwal, Naaman and Vashistha, "AI Suggestions Homogenize Writing Toward Western Styles", CHI 2025: https://arxiv.org/abs/2409.11360
- Rana, "Semantic Gravity Wells: Why Negative Constraints Backfire", 2026 preprint: https://arxiv.org/abs/2601.08070
- Jang et al., "Can Large Language Models Truly Understand Prompts? A Case Study with Negated Prompts", 2022: https://arxiv.org/abs/2209.12711
- Paech et al., "Antislop: A Comprehensive Framework for Identifying and Eliminating Repetitive Patterns in Language Models", ICLR 2026: https://arxiv.org/abs/2510.15061
- Kuhn, "A Survey and Classification of Controlled Natural Languages", Computational Linguistics 2014: https://arxiv.org/abs/1507.01701
- ASD-STE100 Simplified Technical English: https://asd-ste100.org/about_STE.html
- Vale, styles and rules: https://vale.sh/docs/styles
- Thoughtworks Technology Radar, Vale: https://www.thoughtworks.com/radar/tools/vale
- PostHog handbook, "Vale and prose linting": https://posthog.com/handbook/docs-and-wizard/vale
- "Linting Style and Substance in READMEs" (LintMe), CHI 2026: https://arxiv.org/abs/2603.00331
- Wikipedia's "Signs of AI writing", as reported by TechCrunch: https://techcrunch.com/2025/11/20/the-best-guide-to-spotting-ai-writing-comes-from-wikipedia/
- RAAMove, a corpus of rhetorical moves after Swales: https://arxiv.org/abs/2403.15872
- House record: `ayouni/writing-framework/FRAMEWORK.md` and `DECISIONS.md`, `ayouni/writing-framework/tools/style_lint.py`,
  `ayouni/tools/check_public.py`, `zayn/doc/design/WRITING.md`, `zayn/README.md`
