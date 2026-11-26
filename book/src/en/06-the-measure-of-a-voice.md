---
id: the-measure-of-a-voice
number: 6
title: The measure of a voice
subject: measure
status: draft
lang: en
stage:
  built: "prosa measure; PROFILE with bounds in both directions; the house profiles ring_voice and ring_presence"
  designed: "the room of each bound of ring_presence, proposed and awaiting the author's ruling"
evidence: ["prosa/book/examples/ch06, run on 2026-11-26", "ayouni/books/ring-book/manuscript/text, chapters 1 to 9", "ayouni/books/ring-book/style/STYLE-ANALYSIS.md, section 6", "ayouni/writing-framework/DECISIONS.md AWF-04", "prosa/doc/language/TEXT.md, Measures"]
---

A measure is a count taken on a text and turned into a rate: the median length of its sentences, its colons in a thousand words, its share of short sentences. In this chapter I take the measure of the one book I wrote alone, and I declare it as a profile. We run the profile on a draft written with an AI agent. Then I show the half of a profile that asks instead of refusing, and I say why a court for prose needs it.

## The book I wrote alone

*Beginning Ring Programming* came out in 2020, and it is the only book I wrote alone: nine chapters and an annex, written with no AI model. My last Word text of the nine chapters is in my repository, and it is the sample of my voice that I measure everything else against.

We ask the court to measure it.

```text
> prosa measure ayouni/books/ring-book/manuscript/text/ch0*.md --as ring_book
// Measured by prosa measure on 9 page(s), 72604 prose words, 4117 sentences.
// median 16 (quartiles 10 and 24) | over 40 words 3.5 % | under 10 words 23.7 %
// per thousand words: colons 15.2, dashes 0.2, exclamations 2.4, questions 3.3
// paragraphs of one sentence 46.2 %

DEFINE PROFILE ring_book (
  SENTENCE_MEDIAN 16 WITHIN 4,
  SENTENCES_OVER 40 AT_MOST 7 PER_HUNDRED,
  SENTENCES_UNDER 10 AT_LEAST 11 PER_HUNDRED,
  DASHES AT_MOST 1 PER_THOUSAND,
  COLONS AT_LEAST 7 PER_THOUSAND,
  EXCLAMATIONS AT_MOST 5 PER_THOUSAND,
  MIN_WORDS 300,
  EVIDENCE "Measured on ayouni/books/ring-book/manuscript/text (9 pages): 72604 words"
)
```

So that is me, in four comment lines. My median sentence has 16 words, almost a quarter of my sentences have fewer than 10, and almost half of my paragraphs are made of one sentence. I write fifteen colons in a thousand words and one dash in five thousand, an exclamation every four hundred words and a question every three hundred.

I chose none of these numbers. I wrote, and they were there.

Under the comments, the court proposes a declaration. A `PROFILE` holds a text to bounds, and this one writes its own evidence, which is the corpus it was measured on and the size of that corpus. The room around each number, `WITHIN 4` or `AT_LEAST 7`, is a proposal of the tool, and the author rules on it.

[AUTHOR: what you saw when you first read your own numbers. Did one of them surprise you?]

## The same measure on a draft

Now a draft. The first chapter of the manuscript of my second AYOUNI book was written with an AI agent in 2026, in five small files, and we measure them with the same command.

```text
> prosa measure ayouni/books/refinement-book/manuscript/01-what-broke --as refine_draft
// Measured by prosa measure on 5 page(s), 1291 prose words, 83 sentences.
// median 13 (quartiles 9 and 22) | over 40 words 3.6 % | under 10 words 32.5 %
// per thousand words: colons 3.1, dashes 14.7, exclamations 0, questions 0.8
// paragraphs of one sentence 26.7 %
```

Put the third lines of the two runs side by side: my colons are at 15.2 and the draft's at 3.1, my dashes at 0.2 and the draft's at 14.7. The two marks changed places!

A decision of my framework had named the cause on 11 October 2026: "the dash was the Refine agent's habit". The measure gives the size of the habit, and it gives something more, which is the zero: there is no exclamation in 1,291 words, where my own rate would put three.

## A profile has two directions

A bound is the limit a profile sets on one measure. `AT_MOST` refuses noise: too many dashes, too many long sentences. `AT_LEAST` asks for presence: enough colons, enough short sentences. Here is a profile with both, cut in two rules so that each direction has its own code and its own gravity.

```proz
// voice.proz : the measure of a voice, in both directions.

DEFINE STYLE house (
  HOLDS [ring_noise, ring_presence]
)

DEFINE PROFILE ring_noise (
  SENTENCES_OVER 40 AT_MOST 6 PER_HUNDRED,
  EXCLAMATIONS AT_MOST 4 PER_THOUSAND,
  DASHES AT_MOST 4 PER_THOUSAND,
  CODE OFF_PROFILE, SEVERITY error,
  EVIDENCE "AWF-04, the colon is the book's mark and the dash is rare; measured on the Ring book, chapters 1 to 9"
)

DEFINE PROFILE ring_presence (
  SENTENCE_MEDIAN 16 WITHIN 5,
  SENTENCES_UNDER 10 AT_LEAST 12 PER_HUNDRED,
  COLONS AT_LEAST 5 PER_THOUSAND,
  CODE VOICE_ABSENT, SEVERITY warning,
  EVIDENCE "Measured on the Ring book, chapters 1 to 9: median 16, colons 15.2 per thousand words"
)
```

We run it on the five files of the draft.

```text
> prosa check ayouni/books/refinement-book/manuscript/01-what-broke --proz prosa/book/examples/ch06/voice.proz --style house
ayouni/books/refinement-book/manuscript/01-what-broke/01-q3-letter.md:1  error  OFF_PROFILE  DASHES
    The measure DASHES is 18.8; the profile ring_noise asks at most 4 per thousand words.
    Rule ring_noise · AWF-04, the colon is the book's mark and the dash is rare; measured on the Ring book, chapters 1 to 9

ayouni/books/refinement-book/manuscript/01-what-broke/03-symmetry-broke.md:1  error  OFF_PROFILE  DASHES
    The measure DASHES is 8.9; the profile ring_noise asks at most 4 per thousand words.
    Rule ring_noise · AWF-04, the colon is the book's mark and the dash is rare; measured on the Ring book, chapters 1 to 9

ayouni/books/refinement-book/manuscript/01-what-broke/03-symmetry-broke.md:1  warning  VOICE_ABSENT  COLONS
    The measure COLONS is 0; the profile ring_presence asks at least 5 per thousand words.
    Rule ring_presence · Measured on the Ring book, chapters 1 to 9: median 16, colons 15.2 per thousand words

2 error(s), 1 warning(s) across 6 file(s) at level 4
```

Two refusals and one warning, and the warning is the new thing. Its code is `VOICE_ABSENT`: the page has no colon at all, where my voice puts one every sixty-six words. Nothing in that finding is forbidden. Something is missing.

Three of the five files are silent, and for a reason that the court holds to on every text: they have fewer than 300 words, the default of `MIN_WORDS`, and a median taken on ten sentences is an accident. Below the threshold the profile says nothing, and its silence is no pass.

## Why the court asks

The study of my writing, made in October 2026, compared the two books of that year with the one of 2020. Its sentence is hard on us, the agents and me: "Both books are more disciplined than the Ring book and both are colder."

The rules of those two books are on record, and most of them forbid: no intensifier, no superlative, one exclamation per chapter at most in the first book, no exclamation outside speech in the second. A writer who is only forbidden things writes less and less of anything, and what remains is correct, and cold.

A court that only forbids produces that result, so this one also asks: for the short verdict after the long sentence, and for the colon. It can even tell an earned exclamation from a cold one, because the measure `COLD_EXCLAMATIONS` counts those that follow no run and name no result.

This is my view, and I mark it as one: a voice is what a writer does, far more than what he avoids. A measure can hold both.

[AUTHOR: confirm or rewrite the three sentences above. The stake of this chapter is yours, and the diagnosis of the cold books is one only you can sign.]

## Where it stands

Built: `prosa measure` and `PROFILE`, with eleven measures and bounds in both directions. My house style holds two profiles: `ring_voice` refuses, with errors, and `ring_presence` asks, with warnings, on texts of 600 words and more.

Designed: the room of each bound of `ring_presence`. The numbers are mine; how far a chapter may stand from them is proposed in the file, and I rule on it.

## In your hands

Here is a defect of every profile, mine included. Write one page, of 600 words or more, that passes both of my profiles and that I would not have written. Give it a median of 16, a colon in every paragraph and a short sentence after each long one, and let it say nothing.

It takes ten minutes, and it is worth doing once. A profile is necessary for a voice. Is it enough?

Keep your page. Chapter 8 names the instrument that reads it. Before that, chapter 7 declares what a text is about, and where its parts stand.
