---
id: a-correction-made-once
number: 3
title: A correction made once
subject: correction
status: draft
lang: en
stage:
  built: "the reference court at version 0.1.0, for language 0.1; 66 of 66 conformance fixtures pass"
  designed: "the court as one executable, written in Zig"
evidence: ["prosa/book/examples/ch03, run on 2026-11-26", "zayn/doc/design/WRITING.md, section 4", "prosa/doc/language/DECLARATIONS.md"]
---

A correction is a remark an author makes on a page so that the page changes: this word, never that one; say what it is, never what it lacks. In this chapter I turn one correction of mine into a rule that a program enforces. I write the rule badly first, and let the program refuse it. Then I write it well, run it on the page that earned the remark, and repair the page.

One file, three runs. You can type along.

## From a remark to a rule

On 8 November 2026 I was looking at a tour of the Zayn site, scene 7 of 8. The scene read: "The project has not yet shown a study, a user or a foreign application. ... Nobody has perceived any channel to check the grid." My remark is in chapter 1, and I had raised the matter before.

What does a remark like this hold? Four things, when I look at it closely.

1. **A name.** The defect needs one, so that everyone points at the same thing: here, a line that lists a lack.
2. **The refused sentence.** The one on the screen, as it stood.
3. **The written sentence.** What I wanted to read in its place.
4. **The evidence.** My own words, with their date.

A rule of Prosa is those four things in one declaration: a code, a refused example, a written example and the evidence. I call them the four parts of a rule, and the rest of the book uses that name.

## The court, term by term

I use one metaphor in this book, and I map it here, once.

The **law** is what a house declares in its `.proz` files. The **court** is the program that reads a text against the law: its command is `prosa`. A **finding** is one entry of the court's report. A **refusal** is a finding that is an error. The **verdict** is the whole report of one run. And a **ruling** is a decision of the author, with its date: the court applies rulings, and only a person makes one.

In this draft the command `prosa` is typed `node tools/prosa/cli.js`, from the root of the Prosa repository.

## A rule refused

Let us write the rule the quick way. A `PATTERN` is a rule that refuses a construction; `MATCHES` lists the constructions, and `CODE` gives the name.

```proz
DEFINE PATTERN lack_listed (
  MATCHES ["not yet", "nobody has"],
  CODE LACK_LISTED
)
```

We save it as `remark.proz` and ask the court.

```text
> prosa check remark.proz
remark.proz:1  error  RULE_WITHOUT_EVIDENCE  lack_listed
    This PATTERN carries no EVIDENCE: a rule enters on a dated ruling or a measure.

1 error(s), 0 warning(s) across 1 file(s) at level 4
```

Refused! And the court read no line of prose: it refused the rule itself.

Read the message again: "a rule enters on a dated ruling or a measure." It is the right demand. A rule with no evidence is a taste. Six months later nobody knows who wanted it, or why, and the first writer who dislikes it deletes it.

So the court asks before it serves.

## The rule, with its four parts

Here is the same rule, complete, in a file named `first.proz`. A `STYLE` is a named set of rules: a rule judges nothing until a style holds it. A `PIECE` binds one text to a style.

```proz
// first.proz : one correction, made once.

DEFINE STYLE house (
  HOLDS [lack_listed]
)

DEFINE PATTERN lack_listed (
  MATCHES ["not yet", "nobody has"],
  CODE LACK_LISTED,
  REFUSED "The project has not yet shown a study, a user or a foreign application.",
  WRITTEN "The verifier checks the declaration.",
  EVIDENCE "The author, 2026-11-08: Avoid this role of transparency that hurts the project image"
)

DEFINE PIECE tour (
  FILE "tour.md",
  FOLLOWS house
)
```

The four parts are there: `CODE`, `REFUSED`, `WRITTEN`, `EVIDENCE`. The text, `tour.md`, is the scene as it stood on my screen:

```markdown
# The tour, scene 7

The grid has one cell for each activity in each channel.

The project has not yet shown a study, a user or a foreign application. Nobody has perceived any channel to check the grid.
```

We run it.

```text
> prosa check first.proz
tour.md:5  error  LACK_LISTED  lack_listed
    The text matches the refused pattern lack_listed ("not yet"). Written form: The verifier checks the declaration.
    Rule lack_listed · The author, 2026-11-08: Avoid this role of transparency that hurts the project image

tour.md:5  error  LACK_LISTED  lack_listed
    The text matches the refused pattern lack_listed ("Nobody has"). Written form: The verifier checks the declaration.
    Rule lack_listed · The author, 2026-11-08: Avoid this role of transparency that hurts the project image

2 error(s), 0 warning(s) across 2 file(s) at level 4
```

Two refusals, on line 5. Each has three lines, and each line does one job. The first says where, how grave, and under which code. The second quotes the words that matched and shows the written form. The third names the rule and prints my remark of 8 November.

That third line carries the argument of this book. The page was refused by me, on a date, in my words: the court only carried the message.

## The page, repaired

The written form tells the writer what to do: say what the thing is and does. We rewrite line 5.

```markdown
The verifier checks the declaration, and the audit measures the painted page.
```

```text
> prosa check first-repaired.proz
0 error(s), 0 warning(s) across 2 file(s) at level 4
```

Silence. The exit code, the number a command returns to the program that called it, is 0 here and was 1 on the refusal: a build can stop on it.

The correction is now made once. I do not type that remark again. The court does, on every page that a style of mine binds, for a person and for an AI agent alike.

[AUTHOR: what you felt, or did, the first time the court raised one of your own corrections in your place. One or two sentences, if it is true.]

## Where it stands

Built: the reference court, written in JavaScript, at version 0.1.0, for version 0.1 of the language.

```text
> prosa version
prosa 0.1.0 (language 0.1, contract 0.1)
> prosa conformance
66 of 66 fixtures pass
```

A fixture is a small declaration kept with the answer it must get. Each refused one has a lawful twin, so the suite proves both that the court refuses and that it lets pass.

Designed: the same court as one executable, written in Zig, for Windows and Linux.

## In your hands

My rule has a defect, and I leave it to you. Change line 5 of `tour.md` to this sentence:

```markdown
The audit has never been run on a foreign application.
```

Run the court. It answers with silence: the line lists a lack, and my two phrases do not catch it.

How would you catch it? Adding the phrase `never been run` is one answer. Then try "never once been run", and "never even run". A list of phrases grows with every sentence that slips through it.

Chapter 5 gives the instrument for this. Before it, chapter 4 takes the simplest rule there is: one thing, one word.
