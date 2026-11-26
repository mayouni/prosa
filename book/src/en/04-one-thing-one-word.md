---
id: one-thing-one-word
number: 4
title: "One thing, one word"
subject: word
status: draft
lang: en
stage:
  built: "TERM and WORDLIST, with MENTIONS, KEEPS, WRITE and the budget AT_MOST; the refusal of a style that contradicts itself"
  designed: ""
evidence: ["prosa/book/examples/ch04, run on 2026-11-26", "prosa/styles/ayouni/ayouni.proz", "ayouni/books/zayn-book/CLAUDE.md, The vocabulary"]
---

A house word is the one word a house writes for one thing, in every chapter and on every page. In this chapter I declare two of mine and a short list of words I refuse. We run them on a note of three lines, and I read what the court refused and what it let pass. Then I show a style that contradicts itself, and I leave you a word that fools my rule.

## Why one word

When the readers of my third book's pilot chapter counted "six words for a finding", they were counting a cost that the reader pays. A reader who meets a finding, then a diagnostic, then a violation, then an error, stops in the middle of the page and asks: are these four things, or one?

A person who writes alone drifts a little, and an AI model drifts more, because it knows every synonym of every word and reaches for them. In a novel the variation may please; in a technical book it is a defect, because the reader takes a new word for a new thing.

My house fixed its words before Prosa existed, and each choice is a ruling kept in my writing framework: I write "programmer" for the person who writes programs, and "crafter" for the person who builds software. The rulings were there. What they lacked was a court.

## Two terms and a list

A `TERM` gives one thing one word: `MEANS` says what the thing is, and `REFUSES` lists the words refused in its place. The house word is the name of the declaration. A `WORDLIST` refuses words that stand for nothing I want to say; `WRITE` gives the word to put instead.

```proz
// words.proz : one thing, one word.

DEFINE STYLE house (
  HOLDS [programmer, crafter, forbidden_words]
)

DEFINE TERM programmer (
  MEANS "the person who writes programs",
  REFUSES [developer, developers],
  MENTIONS skipped,
  EVIDENCE "FRAMEWORK.md section 4: developer for programmer is a forbidden word"
)

DEFINE TERM crafter (
  MEANS "the person who builds software",
  REFUSES [maker, makers],
  KEEPS ["decision maker", "decision makers"],
  MENTIONS skipped,
  EVIDENCE "ayouni/CLAUDE.md: crafter is the person, never maker; FRAMEWORK.md section 4"
)

DEFINE WORDLIST forbidden_words (
  REFUSES [
    substrate,
    leverage WRITE "use",
    [stakeholder, stakeholders] WRITE "the people concerned, by name"
  ],
  CODE FORBIDDEN_WORD, SEVERITY error,
  EVIDENCE "FRAMEWORK.md section 4, the AYOUNI forbidden words"
)

DEFINE PIECE note (
  FILE "note.md",
  FOLLOWS house
)
```

And here is the note, written the way a first draft comes back to me:

```markdown
# A note on the team

A developer writes the rule, and the maker of the product reads the verdict.

The decision maker asked why the house refuses the word "developer".

We leverage the court so that all stakeholders see the same finding.
```

Before you run it, count the words of the note that my declarations name, and write down how many refusals you expect. I count six suspect words on three lines.

```text
> prosa check words.proz
note.md:3  error  TERM_SYNONYM  programmer
    "developer" stands for the person who writes programs: the house word is "programmer".
    Rule programmer · FRAMEWORK.md section 4: developer for programmer is a forbidden word

note.md:3  error  TERM_SYNONYM  crafter
    "maker" stands for the person who builds software: the house word is "crafter".
    Rule crafter · ayouni/CLAUDE.md: crafter is the person, never maker; FRAMEWORK.md section 4

note.md:7  error  FORBIDDEN_WORD  forbidden_words
    "leverage" is on the list forbidden_words. Write "use".
    Rule forbidden_words · FRAMEWORK.md section 4, the AYOUNI forbidden words

note.md:7  error  FORBIDDEN_WORD  forbidden_words
    "stakeholders" is on the list forbidden_words. Write "the people concerned, by name".
    Rule forbidden_words · FRAMEWORK.md section 4, the AYOUNI forbidden words

4 error(s), 0 warning(s) across 2 file(s) at level 4
```

Four, and line 5 is silent!

## What the court let pass

Line 5 holds two of the refused words, and both pass. Each has its reason, and each reason is a field of the declaration.

**The decision maker.** `KEEPS` lists the phrases that excuse a match they overlap. A decision maker is the person who commissions software and answers for it, which is another thing than a crafter, so the phrase keeps its word.

**The word in quotation marks.** With `MENTIONS skipped`, a short quotation is a mention: the line talks about the word and does not use it. A book about the words of a house has to be able to name the words that the house refuses, and this one does so in every chapter.

Now read the two kinds of message side by side. A `TERM` says what the refused word stood for: "stands for the person who writes programs: the house word is". A `WORDLIST` has no meaning to give, so it gives the replacement that `WRITE` declared, and for the last word of the note the replacement is an instruction: "the people concerned, by name".

Both messages teach the house to whoever reads them. A new collaborator, a person or an AI agent, learns my vocabulary from its refusals, one word at a time, at the moment when each word is needed.

## A budget for small words

Some words are noise in number, and harmless alone. My intensifiers are of that sort. The house style gives the list a budget:

```proz
DEFINE WORDLIST intensifiers (
  REFUSES [very, really, simply, obviously, obvious, "dead simple", "as simple as that", "so easy", "pretty much",
           basically, literally, extremely, incredibly],
  AT_MOST 4 PER_THOUSAND,
  LANGUAGE en,
  CODE INTENSIFIER, SEVERITY warning,
  SAYS "The sentence stands without it.",
  EVIDENCE "FRAMEWORK.md section 4, intensifiers and reassurance; the Ring profile with room"
)
```

With `AT_MOST`, the court counts the words of the list over the whole text and raises one finding when their rate passes the budget, here four in a thousand words. `LANGUAGE en` keeps the rule to English texts: the French edition of a book has its own lists in the same file, with `programmeur` and `artisan du logiciel` as its house words.

The budget comes from a record too. The copyedit of my book of 2020 cut such words, and the study of that book counts them: 58 times the first word of the list, 31 times the third.

[AUTHOR: the copyedit of 2020, if you want it here as a memory: what you thought when the first corrected chapter came back.]

## A style that contradicts itself

One more run. Suppose a second writer of the house adds a list of job titles to refuse, and puts my own word on it.

```proz
DEFINE STYLE house (
  HOLDS [programmer, plain_words]
)

DEFINE TERM programmer (
  MEANS "the person who writes programs",
  REFUSES [developer, developers],
  EVIDENCE "FRAMEWORK.md section 4: developer for programmer is a forbidden word"
)

DEFINE WORDLIST plain_words (
  REFUSES [coder, programmer, engineer],
  CODE JOB_TITLE,
  EVIDENCE "A ruling written for this exercise"
)
```

```text
> prosa check conflict.proz
conflict.proz:5  error  TERM_REFUSED_AND_REQUIRED  programmer
    The style house asks for "programmer" and refuses it in plain_words.

1 error(s), 0 warning(s) across 1 file(s) at level 4
```

The style asks for a word and refuses it. No text can satisfy such a style, so the court refuses the style itself, before it reads any text. A law is checked the way a program is checked: for contradiction first, and only then against the world.

## Where it stands

Built: `TERM` and `WORDLIST` with every field of this chapter, in English and in French. My house style holds two terms and five lists for English, and two terms and four lists for French.

## In your hands

My rule on "programmer" has a defect. Here is a sentence about my office:

```markdown
The property developer who built our office is no programmer.
```

```text
> prosa check words-land.proz
land.md:3  error  TERM_SYNONYM  programmer
    "developer" stands for the person who writes programs: the house word is "programmer".
    Rule programmer · FRAMEWORK.md section 4: developer for programmer is a forbidden word

1 error(s), 0 warning(s) across 2 file(s) at level 4
```

The court reads words. It does not know that this one builds houses.

Repair my rule, and leave the sentence alone. One field is enough, and you met it in this chapter.

A word is the smallest thing a style refuses. The next chapter refuses a construction: several words, in an order, at a place in the sentence.
