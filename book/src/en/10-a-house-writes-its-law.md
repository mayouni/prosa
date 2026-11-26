---
id: a-house-writes-its-law
number: 10
title: A house writes its law
subject: house
status: draft
lang: en
stage:
  built: "STYLE with HOLDS, ADOPTS and DECLINES; the reader's rights as a constitution; AYOUNI Press as the first house"
  designed: "a house outside Softanza that governs a text with its own .proz file; the adoptable set of the habits of AI models"
evidence: ["prosa/book/examples/ch10, run on 2026-11-26", "prosa/constitution/reader_rights.proz", "prosa/styles/ayouni/ayouni.proz", "prosa/doc/PROPOSAL.md, sections 2, 4.1, 6 and 7", "ayouni/writing-framework/FRAMEWORK.md, section 3"]
---

A house is whoever answers for a body of writing: a press, a documentation team, a brand, an author alone with his books. In this chapter I say how a rule enters the law of my house, and who may excuse a line. Then a second house takes my law, keeps most of it and declines two rules, and the court gives one sentence two opposite verdicts. I end on what every house owes its reader, and on a file for you to write.

## How a rule enters my house

Chapter 9 left you a question: who signs, when the one who is judged can write to the law? In my house the answer is older than Prosa, and it is in my writing framework: an agent proposes, and I rule.

The loop of a rule has four steps. I read a draft and make a remark. The AI agent writes the remark as a rule: my words as `EVIDENCE`, the faulty sentence as `REFUSED`, the corrected one as `WRITTEN`. I rule on it. From that commit the court enforces it, on every book and every site that a style of mine binds.

An excuse goes the same way. The framework asks an agent to log every choice it takes on my delegation, with its reason, and I overrule by editing. An `ALLOW` is such a choice: it stands in the file with its reason, and I read the file.

So the law of my house has one legislator, and the court serves him. A house of forty writers will want more: a review of each change to the `.proz` file, as for any change to a program. The file is text in a repository, and every tool that guards a program guards it too.

[AUTHOR: the first rule you ruled on in Prosa itself, on which remark, on which day. The record I drafted from holds your rulings on the proposal, of 26 November 2026, and no rule after them.]

## A second house adopts the first

Now let a second house arrive. It likes my law: the affirmative page, the title of six words, the list of calques. It has one disagreement, and it is about a word. Its people call themselves "developers".

A style can take another with `ADOPTS`, and add its own rules with `HOLDS`. We write it the direct way.

```proz
USE "../../../styles/ayouni/ayouni.proz"

DEFINE STYLE second_house (
  ADOPTS [ayouni],
  HOLDS [developer]
)

DEFINE TERM developer (
  MEANS "the person who writes programs",
  REFUSES [programmer, programmers, coder, coders],
  MENTIONS skipped,
  EVIDENCE "A ruling written for this example, in the name of the second house"
)
```

```text
> prosa check undeclined.proz
undeclined.proz:8  error  TERM_REFUSED_AND_REQUIRED  developer
    The style second_house asks for "developer" and refuses it in programmer.

../../../styles/ayouni/ayouni.proz:30  error  TERM_REFUSED_AND_REQUIRED  programmer
    The style second_house asks for "programmer" and refuses it in developer.

2 error(s), 0 warning(s) across 3 file(s) at level 4
```

Two refusals, and they mirror each other. The second house adopted my term and declared its own, and each term refuses the word the other asks for. No writer could satisfy that style. You saw this code in chapter 4, inside one house; here it guards the border between two.

The repair is one field. `DECLINES` names the rules of an adopted style that this style leaves out. The second house declines my term, and my profile of presence as well, since my colons are no part of its voice.

```proz
DEFINE STYLE second_house (
  ADOPTS [ayouni],
  DECLINES [programmer, ring_presence],
  HOLDS [developer]
)
```

## One sentence, two verdicts

Here is a notice of two sentences, and each house judges it in turn.

```markdown
# A notice to the team

Every developer runs the court before a commit. A programmer who meets a refusal reads its rule first.
```

```text
> prosa check second.proz
notice.md:3  error  TERM_SYNONYM  developer
    "programmer" stands for the person who writes programs: the house word is "developer".
    Rule developer · A ruling written for this example, in the name of the second house

1 error(s), 0 warning(s) across 4 file(s) at level 4
```

```text
> prosa check first.proz
notice.md:3  error  TERM_SYNONYM  programmer
    "developer" stands for the person who writes programs: the house word is "programmer".
    Rule programmer · FRAMEWORK.md section 4: developer for programmer is a forbidden word

1 error(s), 0 warning(s) across 4 file(s) at level 4
```

The same line, the same court, and two verdicts that contradict each other word for word! Both are right. Each one cites the ruling of the house that asked.

This is the third commitment of Prosa, and I state it plainly: the court holds a style to itself and brings no taste of its own. It has no opinion on the word. It has no list of good English. A rule binds a text only when a style adopts it, so what is noise in one house is voice in the other.

Think again of the Indian writers of chapter 1, moved toward a style that was not theirs by a tool that suggested the average. A court that shipped with one taste would do the same thing with more authority. This one ships with a way to write yours down.

[AUTHOR: the stake of the book, in your words. You wrote a programming book from Tunisia, with Hausa and Arabic words in its examples. What does a writer far from the average gain from a court of his own?]

## What every house owes a reader

One layer stands under every house. Prosa ships with a small constitution, the reader's rights, written in its own language. A house adopts it as it adopts any style.

There are four rights, and each one is on my record: in the rules of the Zayn site, or in my writing framework.

1. **The subject.** The title names the subject, and the first sentence says what it is.
2. **Once.** A statement is made once per screen.
3. **The hole.** A particular that only the author knows is marked, and the author closes it before review.
4. **The source.** A placeholder left where a fact belongs is refused wherever it stands.

These are the three layers of Prosa, and you have now met each one: the rights of the reader, the style of a house, and the piece that binds one text.

## Where it stands

Built: `STYLE`, with `HOLDS`, `ADOPTS` and `DECLINES`. AYOUNI Press is the first house, and its style holds the rules of my writing framework in English and in French.

Designed: a house outside Softanza that governs a text with its own `.proz` file, which is the last milestone of the plan. Designed too: a set of the habits of AI models, built from the catalogues of chapter 2, that a house adopts, amends or declines like any other style.

## In your hands

Write the law of your house. You have the material: the first pile of chapter 1, the remarks you made twice that a program can decide.

Start with three rules, and give each its four parts. Take the measure of ten pages you wrote alone, and read your numbers before you read mine again. Bind one text, run the court, and repair the text or the rule.

One thing is unfinished in what I gave you, and I name it. The second house of this chapter declined my measure of presence and declared none of its own. Its court refuses, and asks for nothing. You know from chapter 6 what kind of pages that makes.

So measure your own voice before you forbid anything.

[AUTHOR: the coda. Where this book leaves you, and what you will write next under the court.]

Then close this book. The next remark you make to an AI model, make it once.
