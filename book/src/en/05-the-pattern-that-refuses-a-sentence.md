---
id: the-pattern-that-refuses-a-sentence
number: 5
title: The pattern that refuses a sentence
subject: pattern
status: draft
lang: en
stage:
  built: "PATTERN with entries over words, WITHIN, groups, the four positions, and the self-test of REFUSED and WRITTEN"
  designed: ""
evidence: ["prosa/book/examples/ch05, run on 2026-11-26", "zayn/doc/design/WRITING.md, rule 4 and section 4", "ayouni/writing-framework/checklists/noise.md", "prosa/doc/language/GRAMMAR.md, Entry"]
---

A pattern is a construction that a style refuses: several words, in an order, sometimes at a fixed place in the sentence. In this chapter I repair the defect I left you in chapter 3. I show how a pattern is written over words, and how the court tests a rule against its own examples before the rule judges any text. Then we run three patterns on a page of four lines, and I leave you a rule of mine that refuses too much.

## A pattern is written over words

In chapter 3 my rule caught `not yet` and let "has never been run" pass. I could add that phrase. Then "never once been run", then "never even run": the list grows, and it is always one sentence behind the writer.

The rule of my house says it better, in plain words. The check of the Zayn site refuses, as its page of rules puts it, "*never* followed within three words by *run*". That is a pattern, and Prosa writes it almost word for word:

```proz
MATCHES ["never" WITHIN 3 "run"]
```

An entry of `MATCHES` is a row of elements. A word in quotes matches itself, in any case. `WITHIN 3` lets up to three words stand between two elements, and the gap never crosses a punctuation mark. A group in brackets, `[run, measured, shown]`, matches any one of its words.

Who can read such a line? A writer can. That was the point: in the linters of chapter 2 this rule is a regular expression, and the person whose rule it is cannot read it.

## The rule tests itself

Let us write the rule too narrowly, on purpose, and give it the two examples that every pattern may carry.

```proz
DEFINE PATTERN never_run (
  MATCHES ["never run"],
  CODE LACK_LISTED,
  REFUSED "The audit was never once run.",
  WRITTEN "The audit runs on the painted page.",
  EVIDENCE "zayn/doc/design/WRITING.md section 4: never followed within three words by run"
)
```

```text
> prosa check never.proz
never.proz:4  error  EXAMPLE_NOT_REFUSED  never_run
    The REFUSED example is not refused by its own pattern: "The audit was never once run.".

1 error(s), 0 warning(s) across 1 file(s) at level 4
```

The court ran my pattern on my own refused sentence, and the sentence passed! So the rule is wrong, and the court says so on line 4, before the rule meets a page.

The proposal for Prosa counts this pair among the four choices that carry the design. `REFUSED` and `WRITTEN` are three things at once: the test of the rule, the example the finding shows, and the pair an AI agent learns the replacement from. A programmer will recognise a unit test, a small program that proves one behaviour of another. Here the writer wrote it, by quoting the sentence that annoyed him.

We replace `"never run"` with `"never" WITHIN 3 "run"`, and the court is silent on the declaration. Now it may judge.

## Three patterns on one page

Here are three patterns of my house in one file. The second comes from my remark of 5 November 2026 on the narrative register, and its phrases are the ones my rule lists. The third has a position.

```proz
// patterns.proz : three refused constructions.

DEFINE STYLE house (
  HOLDS [never_run, narrative, colon_lead]
)

DEFINE PATTERN never_run (
  MATCHES ["never" WITHIN 3 "run"],
  CODE LACK_LISTED,
  REFUSED "The audit was never once run.",
  WRITTEN "The audit runs on the painted page.",
  EVIDENCE "zayn/doc/design/WRITING.md section 4: never followed within three words by run"
)

DEFINE PATTERN narrative (
  MATCHES ["we found", "the story of", "so it was measured"],
  CODE NARRATIVE_REGISTER,
  REFUSED "So it was measured, and we found the gap.",
  WRITTEN "The grid has 35 empty cells.",
  EVIDENCE "zayn/doc/design/WRITING.md rule 4; the author, 2026-11-05: avoid the narrative, succinct, non declarative style of writing"
)

DEFINE PATTERN colon_lead (
  MATCHES ["like this:", "Result:"],
  AT paragraph_end,
  CODE COLON_LEAD, SEVERITY warning,
  SAYS "Name what the colon introduces.",
  EVIDENCE "writing-framework/checklists/noise.md: colon lead-ins that end a paragraph"
)

DEFINE PIECE grid (
  FILE "grid.md",
  FOLLOWS house
)
```

And the page, `grid.md`:

```markdown
# The grid

This is the story of a grid. We found 35 empty cells, and the audit was never even run on them.

The cells are listed like this:

Result: the grid is a table, and a table like this: one row for each activity.
```

Look at the last two paragraphs before you run. The phrase "like this:" stands twice, and "Result:" once. How many warnings?

```text
> prosa check patterns.proz
grid.md:3  error  LACK_LISTED  never_run
    The text matches the refused pattern never_run ("never even run"). Written form: The audit runs on the painted page.
    Rule never_run · zayn/doc/design/WRITING.md section 4: never followed within three words by run

grid.md:3  error  NARRATIVE_REGISTER  narrative
    The text matches the refused pattern narrative ("the story of"). Written form: The grid has 35 empty cells.
    Rule narrative · zayn/doc/design/WRITING.md rule 4; the author, 2026-11-05: avoid the narrative, succinct, non declarative style of writing

grid.md:3  error  NARRATIVE_REGISTER  narrative
    The text matches the refused pattern narrative ("We found"). Written form: The grid has 35 empty cells.
    Rule narrative · zayn/doc/design/WRITING.md rule 4; the author, 2026-11-05: avoid the narrative, succinct, non declarative style of writing

grid.md:5  warning  COLON_LEAD  colon_lead
    Name what the colon introduces.
    Rule colon_lead · writing-framework/checklists/noise.md: colon lead-ins that end a paragraph

3 error(s), 1 warning(s) across 2 file(s) at level 4
```

One warning, on line 5. On line 7 the same phrase stands in the middle of the paragraph, where the colon does its honest work, and "Result:" opens the paragraph instead of ending it. `AT paragraph_end` kept only the match that ends its paragraph.

There are four positions: `sentence_start`, `sentence_end`, `paragraph_start` and `paragraph_end`. They turn a habit of placement into a rule. "And" may open a sentence in my house; a house that refuses it writes one line, with `AT sentence_start`.

Line 3 earned three refusals for one sentence and a half. The written forms say what to do: state the count, state what the audit does.

## What a pattern decides

A pattern decides words, their order and their place. That is a great deal, and I state its size with care, because my own record does.

The page that holds my rule on the narrative register says of its check: "A sentence can contain the word *grid* and still be a riddle." A pattern catches "the story of". It stays silent on a story that avoids those three words. So the rule on narrative is kept in two places: the phrases by the court, and the rest by a reading, which is the subject of chapter 8.

The court is built to say less and to be right each time. A finding that is wrong teaches a writer to stop reading findings.

[AUTHOR: the sentence of an AI agent that annoyed you most, the one you would quote as a REFUSED example if you had to choose one. It would open this chapter well.]

## Where it stands

Built: `PATTERN`, with its entries, its four positions and its self-test. The court runs the self-test at level 2, on the declaration alone, so a rule that fails its own examples never reaches a text.

## In your hands

My pattern on "never" and "run" refuses too much, and the court can prove it to you. Put a sentence I would gladly write in the place of the written example:

```proz
  WRITTEN "The court never needs to run twice.",
```

```text
> prosa check lawful.proz
lawful.proz:5  error  EXAMPLE_NOT_LAWFUL  never_run
    The WRITTEN example is refused by its own pattern: "The court never needs to run twice.".

1 error(s), 0 warning(s) across 1 file(s) at level 4
```

The sentence states what the court does, and my rule calls it a lack.

Narrow the pattern until both examples pass their test. My house took one way out, and you can read it in `styles/ayouni/ayouni.proz`, under `lack_listed`. Find another.

Words and patterns refuse what should be absent. The next chapter asks the opposite question: what must be present for a page to sound like its author?
