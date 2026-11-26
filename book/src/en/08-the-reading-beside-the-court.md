---
id: the-reading-beside-the-court
number: 8
title: The reading beside the court
subject: reading
status: draft
lang: en
stage:
  built: "the five levels and --level; ZONE; ALLOW and its refusal when stale; READING, listed as recorded or due by prosa readings"
  designed: "the recorded reading as part of a standard that a second house can follow"
evidence: ["prosa/book/examples/ch08, run on 2026-11-26", "zayn/doc/design/WRITING.md, section 3 and section 4", "prosa/doc/language/README.md, Five levels", "prosa/book/book.proz, the excuses"]
---

A reading is a judgment that stays with a reader, a person or an AI model, and that the court names without ever making it. In this chapter I say where the court stops, in five levels. We run one page on which four sentences meet four different fates. Then I show the two ways a house excuses a line, and the declaration that hands the rest of the page to a reader.

## The five levels

The court judges in five levels, in order, and each level needs the one before it.

1. **Syntax.** The `.proz` file parses, and each field has its shape.
2. **Declaration.** The style and the piece are lawful by themselves: every rule has its evidence, every pattern passes its own examples.
3. **Text.** Words, terms, patterns and positions.
4. **Measure.** The profile, over a whole piece.
5. **Reading.** A declared question, listed as recorded or due.

An error at one level stops the next, so a text is judged only against a lawful declaration. You met levels 1 to 4 in the last five chapters. They share one property, and the specification states it as the condition of every finding: the answer is the same on every machine. No AI model sits in them.

Level 5 is of another nature, and it is the subject here.

## One page, four fates

Here is a short page for a release. Read it as an editor would, and mark the sentences that list a lack.

```markdown
# The release of November

<!-- prosa:zone hero -->

Not yet a standard. Already a court.

<!-- prosa:end -->

The release note says of the Linux binary: not yet signed.

The court judges words, and nobody has to remember the rule.

A page is a promise kept in silence.
```

The declaration holds the rule of chapter 3, with its two phrases, and three declarations that are new: a `ZONE`, an `ALLOW` and a `READING`.

```proz
DEFINE ZONE hero (
  EXEMPT_FROM [LACK_LISTED],
  REASON "An example written for this chapter: a tagline is the author's call"
)

DEFINE ALLOW quoted_record (
  FILE "release.md",
  LINE_HOLDS "not yet signed",
  EXCUSES LACK_LISTED,
  REASON "The line quotes the release note"
)

DEFINE READING riddle_reader (
  ON page,
  ASKS "Is any sentence a riddle, a teaser or an aphorism?",
  RECORDS "readings"
)
```

```text
> prosa check release.proz
release.md:11  error  LACK_LISTED  lack_listed
    The text matches the refused pattern lack_listed ("nobody has"). Written form: The verifier checks the declaration.
    Rule lack_listed · The author, 2026-11-08: Avoid this role of transparency that hurts the project image

1 error(s), 0 warning(s) across 2 file(s) at level 4
```

One refusal, where the page holds the refused phrases three times. Let us take the four sentences one by one.

**The tagline is excused by its zone.** A `ZONE` excuses a region of a text from named codes, between two comments in the page. My rule on the hero of a site is of that sort, and I asked for it on 5 November 2026 in these words: "don't apply the strict sentence style to the hero zones".

**The quotation is excused by its line.** An `ALLOW` excuses one line of one file from one code, and gives its reason. The page quotes a record, and a record is quoted as it stands.

**The third sentence is refused, and the court is wrong.** "Nobody has to remember the rule" states what the court does for a writer. The pattern saw two words in a row and could not see the third. This is a false positive: a finding on a sentence that a reader accepts.

**The last sentence passes, and it should worry me.** "A page is a promise kept in silence" is an aphorism, and my rule of 5 November refuses aphorisms by name. The court holds no rule that catches it, and it says nothing.

Four sentences: two excused with a reason, one refused wrongly, one let through wrongly. Such a page teaches more than a clean verdict does.

## Silence is no pass

What should the court have said of the last sentence? Nothing, and that is a commitment of the language: undecidable is silence, never a pass.

My own record drew the line before Prosa did. The page of rules of the Zayn site ends its section on the check with this: "The check cannot judge narrative, teasing, fragments or aphorisms." And it adds that those points "are kept by reading the page, and the check does not replace that reading."

A court that guessed at aphorisms would be right often, and each wrong guess would cost me a sentence I meant. So the court keeps to what it can decide, and it names the rest. The name is the reading.

```text
> prosa readings release.proz
due       riddle_reader  release.md
    asks: Is any sentence a riddle, a teaser or an aphorism?
    record: readings/release.riddle_reader.md
0 recorded, 1 due
```

The reading is due. It has a question, a text and a place for its record. The reader may be me, an editor, or an AI model that received the question as its brief. When the answer is written in that file, the line says recorded.

At level 5 the court prints the list under its verdict, with a heading that I quote as it prints it: "Readings (a reading is a record, never a pass)". A reading carries no code. It changes no exit code. It is a debt the house can see.

My house style declares one reading for every chapter, and its question comes from the brief I give a fresh reader: "Which three passages are most him, and which one is least him?" For the draft of this book, that reading is in `research/voice/`.

[AUTHOR: a reading that changed a chapter of yours. Who read, what the reader said, and what you did with it.]

## The excuses of this book

The third sentence is the honest case, and this book met it. The calques of my house style refuse `hole` after an article, because in 2020 I wrote "the hole program" where I meant the whole one. Now I write a book in which a hole is a term. The court refused it in the preface, in chapter 7, and in the paragraph you are reading.

I did not bend the sentence. Each such line has an `ALLOW` in `book.proz`, with its reason, and the first verdict that refused it is kept in the trial's record.

An excuse of this sort has a rule of its own, which my house had already found for its sites: an entry of the allow list fails when it no longer matches a line. Prosa keeps that rule.

## Where it stands

Built: the five levels, `ZONE`, `ALLOW` and `READING`, and the command `prosa readings`.

Designed: the recorded reading as part of a standard, so that a second house can state who read a text, under which question, and what was answered.

## In your hands

The release is signed at last. Change line 9 of the page to say so:

```markdown
The release note says of the Linux binary: signed on 26 November.
```

Before you run the court, say what you expect. The page is better than it was, and the verdict is worse by one finding.

Read the code of the new finding, then answer in one sentence: why did I want an excuse to die with the line it excuses?

And there is the false positive on line 11, which I left standing. You have two repairs, an `ALLOW` or a narrower pattern. Choose one, and defend it against the other.

A court, its excuses and its readings: the law is whole. The next chapter puts its first subject under it, the AI agent that drafts my pages.
