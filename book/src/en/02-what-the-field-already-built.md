---
id: what-the-field-already-built
number: 2
title: What the field already built
subject: field
status: draft
lang: en
stage:
  built: "the parity of the court's twelve measures with the house lint, run on 81 English pages and 42 French pages of three AYOUNI books"
  designed: "the retirement of the house's three checkers in favour of one declaration"
evidence: ["prosa/doc/PROPOSAL.md, section 3 and Sources", "prosa/tools/parity/lint-parity.js, run on 2026-11-26", "ayouni/writing-framework/tools/style_lint.py"]
---

The field of prose governance is everything people built to hold a text to rules: linters, controlled languages, the measures of style, the catalogues of what AI models overuse. In this chapter I read it family by family and say what each one gives. I add the three checkers my own house wrote, and I run one of them beside the court. Then I say where the field leads, and what I kept from it.

A word on my sources. I cite each work by its title and year, and the list is the one my proposal for Prosa was written from, in `doc/PROPOSAL.md`.

## The linters

A linter is a program that reads a text against rules and reports each breach with its line. Programmers know linters for code. For prose the field has three that I name: Vale, textlint and proselint.

What they give is large. The rules are files, kept in the repository beside the text. The linter knows the markup, so it reads the sentence and skips the code sample. And it runs in CI, the checks that a repository runs on every change. The Thoughtworks Technology Radar lists Vale among its tools, and the handbook of PostHog has a page named "Vale and prose linting".

A rule of Vale is a small YAML file with a regular expression in it: a formula of characters that matches text. A programmer reads it. A writer asks a programmer.

## The controlled languages

A controlled language is a natural language cut down on purpose: a fixed lexicon, and one meaning for each word. ASD-STE100, Simplified Technical English, is an industry's standard for its technical manuals. Kuhn surveyed one hundred such languages ("A Survey and Classification of Controlled Natural Languages", Computational Linguistics, 2014).

They prove one thing at the scale of an industry: one thing, one word works.

The price is the language itself. The standard chooses the lexicon, for everyone.

## The measures of style

Stylometry is the measure of a style by counting small features: the length of sentences, the rate of a function word, the share of a mark. Mosteller and Wallace, Burrows, and Biber with his set of features showed that a voice is measurable, as a distribution of such features.

Their question was: who wrote this? Mine is the next one. If a voice can be measured, can a draft be held to the measure?

## The catalogues of AI habits

The newest family lists what AI models write too often. Wikipedia's editors keep a guide named "Signs of AI writing", which TechCrunch reported on 20 November 2025. The studies of excess vocabulary, which chapter 1 cited, give such lists with their counts. And Antislop goes to the source: a sampler, the part of the runtime that picks each next word of an AI model, which steps back when a banned phrase appears, and a profiler that finds the patterns a model overuses against a human baseline (Paech and co-authors, "Antislop: A Comprehensive Framework for Identifying and Eliminating Repetitive Patterns in Language Models", ICLR 2026).

Two more works join a linter to a model. LintMe detects with deterministic checks and repairs with an AI model ("Linting Style and Substance in READMEs", CHI 2026), and PostHog's handbook describes the same division of work.

These catalogues are true of the average. Are they true of me?

In the first chapter of my first AYOUNI book I wrote: "The bottleneck of our age is not writing. It is admission." A general list of AI habits would refuse that sentence, for its "not this, but that". It is mine, and I keep it. The same pattern is noise in one house and voice in another.

## The moves of a genre

One more family reads a text by its structure. Swales's move analysis holds that a genre is a fixed sequence of rhetorical moves. RAAMove is a corpus annotated after him.

A chapter of mine has such moves too: an opening that says what it will do, a close that is a bridge. Chapter 7 declares them.

## Three checkers of my own

My house is part of the field. Before Prosa it had written three checkers, each for one kind of text: `style_lint.py` for the books, `check_public.py voice` for the public pages, and `zayn site shell` for the Zayn site. They carried my rules, in three programs, in two programming languages.

So the first thing I asked of the court was modest: give the same numbers as the lint I already trust. Here is the run on the third book.

```text
> node tools/parity/lint-parity.js D:/GitHub/ayouni/books/zayn-book/src/en
parity with style_lint.py on 23 page(s) of D:/GitHub/ayouni/books/zayn-book/src/en (en)
  words                 23 of 23
  sentences             23 of 23
  median                23 of 23
  long                  23 of 23
  excl                  23 of 23
  questions             23 of 23
  colon_per_k           23 of 23
  dash_per_k            23 of 23
  ellipses              23 of 23
  colon_leads           23 of 23
  one_sentence_paras    23 of 23
  paragraphs            23 of 23
  calques               23 of 23
  intensifiers          23 of 23
  hedges                23 of 23
  superlatives          23 of 23
  forbidden             23 of 23
  emoji                 23 of 23
```

Every line agrees! The first twelve are the measures: words, sentences, the median, the long sentences, the marks, the paragraphs. The last six are word lists. I ran the same command on the two other books and on the French edition of the first, on 26 November 2026: the twelve measures are equal on each of 81 English pages and 42 French pages.

Two programs, written apart, one answer. That is what a definition buys when it is written down to the word.

## Where the field leads

The field leads on adoption. Vale stands on the Thoughtworks Technology Radar and in PostHog's handbook, and Simplified Technical English is an industry's standard. Prosa is at version 0.1, with one house.

The field leads at the sampler. Antislop acts while the AI model writes, word by word. The court of Prosa reads the page after it is written.

And the field leads on the science of style: the work of Mosteller and Wallace, of Burrows and of Biber stands behind a measure that I apply.

## What I kept

From the linters, the rule as a file in the repository. From the controlled languages, one thing, one word, with the lexicon chosen by the house. From stylometry, the voice as a measure, turned into a contract. From the catalogues, a set of AI habits that a house may adopt or decline. From the genre analysts, the form. From my three checkers, every rule they carried.

[AUTHOR: a tool of this field that you used yourself before Prosa, if there is one, and what you remember of it.]

## In your hands

Open the configuration of a prose linter, yours or a public one. Pick three rules. For each, look for the answer to one question: who asked for this rule, and on what day?

Write down what you find. Chapter 3 starts from that question, and from a remark I made once too often.
