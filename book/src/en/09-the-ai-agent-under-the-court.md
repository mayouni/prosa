---
id: the-ai-agent-under-the-court
number: 9
title: The AI agent under the court
subject: agent
status: draft
lang: en
stage:
  built: "prosa brief; prosa check --json in the C2 envelope; the hook that runs the court on every write to a governed file; the trial of this book's own draft"
  designed: "the count of the author's remarks on a governed chapter against an ungoverned one"
evidence: ["prosa/book/examples/ch09, run on 2026-11-26", "prosa/tools/prosa/hook.js", "prosa/book/research/trial/first-verdicts.json", "prosa/doc/PROPOSAL.md, section 6 and Sources"]
---

An AI agent is a program that drafts with an AI model and acts on files: it reads them, writes them and runs commands. In this chapter I put one under the court. I show the contract it receives before it writes, the verdict it gets in a form it can parse, and the hook that makes it meet a refusal at the moment of writing. Then I open the record of this book's own draft, which an AI agent wrote under my rules.

## The contract before the draft

Until now the court spoke after the page was written. An agent deserves to know the law before, as a person does. The command `prosa brief` writes the law of one piece as a contract, in plain sentences. Here it is for a small house of four rules, on a piece whose subject is the court.

```text
> prosa brief house.proz --piece court_chapter
# The writing contract of the piece court_chapter

This contract states the declared style house for a text in language `en`. The Prosa court judges the text against it after every write.

## The form: chapter

- The title holds at most 6 words.
- The title names the subject, "court".
- The first sentence names the subject, "court", and says what it is.
- The text closes on something new for the reader; it does not close on: summary, in summary.

## One thing, one word

- Write "programmer" for the person who writes programs (in place of: developer, developers).

## Written forms

- The line lists a lack. State what the thing is and does, at its true size. Written: *The verifier checks the declaration.* Refused: *The project has not yet shown a study.*

## The measure of the voice

- Dashes: at most 4 per thousand words.
- Colons: at least 5 per thousand words.

## The loop

Draft, run `prosa check <file> --json`, and repair each finding by its code until the court is silent. A finding names the rule, the written form and the ruling it comes from.
```

Read the verbs. The title holds, the first sentence names, write this word, state what the thing is. Almost every line says what to write, and the refused form comes second, as an example.

That order is a choice, and chapter 1 gave its reason: a prohibition in a prompt is a weak signal, and on one open model Rana measured that naming a forbidden word can raise its chance of appearing. So each rule of Prosa carries its `WRITTEN` form, and the brief leads with it.

And nobody wrote this contract by hand. It is printed from the same declarations that the court judges with, so the brief and the court cannot disagree.

## A draft, and its verdict

Here is a draft of four lines that came back for that piece. I print it in a block, where the court does not read it.

```markdown
# The court

The court is the program that judges a text against its declaration — it reads the page as a developer reads a diff.

It has not yet met a page it could not read — and it answers in the same words on every machine.
```

The title is lawful, and the first sentence names its subject. The contract was read. Now the verdict.

```text
> prosa check house.proz
court.md:1  warning  OFF_PROFILE  DASHES
    The measure DASHES is 46.5; the profile voice asks at most 4 per thousand words.
    Rule voice · AWF-04: the colon is the book's mark; the em dash is rare

court.md:1  warning  OFF_PROFILE  COLONS
    The measure COLONS is 0; the profile voice asks at least 5 per thousand words.
    Rule voice · AWF-04: the colon is the book's mark; the em dash is rare

court.md:3  error  TERM_SYNONYM  programmer
    "developer" stands for the person who writes programs: the house word is "programmer".
    Rule programmer · FRAMEWORK.md section 4: developer for programmer is a forbidden word

court.md:5  error  LACK_LISTED  lack_listed
    The line lists a lack. State what the thing is and does, at its true size. Written form: The verifier checks the declaration.
    Rule lack_listed · The author, 2026-11-08: Avoid this role of transparency that hurts the project image

2 error(s), 2 warning(s) across 2 file(s) at level 4
```

The form held, and the habits came back: two dashes, the word of the average, a lack. This is the pull of chapter 1, on four lines.

An agent does not read that text as I do. With `--json` the court prints each finding as a record, and here is the third of the four, as printed:

```text
  {
   "code": "TERM_SYNONYM",
   "severity": "error",
   "message": "\"developer\" stands for the person who writes programs: the house word is \"programmer\".",
   "span": {
    "file": "court.md",
    "line": 3
   },
   "cites": [
    "rule:programmer",
    "evidence:FRAMEWORK.md section 4: developer for programmer is a forbidden word"
   ],
   "language": "prosa",
   "level": 3,
   "subject": "programmer"
  },
```

A code that never changes, a file, a line, the rule and its evidence. An agent repairs by code: it finds line 3, reads the house word in the message, and writes it. The envelope is the one that the tools of the Softanza family share, so an agent that knows one court of the family reads this one.

## The hook

One step remains, and it removes me from the loop. A hook is a command that the agent's own tool runs after each of its actions. The hook of Prosa runs the court on every write to a file that a `PIECE` names.

```text
> echo '{"tool_name":"Write","tool_input":{"file_path":"court.md"}}' | node tools/prosa/hook.js
The Prosa court judged court.md:

court.md:1  warning  OFF_PROFILE  DASHES
    The measure DASHES is 46.5; the profile voice asks at most 4 per thousand words.
    Rule voice · AWF-04: the colon is the book's mark; the em dash is rare

court.md:1  warning  OFF_PROFILE  COLONS
    The measure COLONS is 0; the profile voice asks at least 5 per thousand words.
    Rule voice · AWF-04: the colon is the book's mark; the em dash is rare

court.md:3  error  TERM_SYNONYM  programmer
    "developer" stands for the person who writes programs: the house word is "programmer".
    Rule programmer · FRAMEWORK.md section 4: developer for programmer is a forbidden word

court.md:5  error  LACK_LISTED  lack_listed
    The line lists a lack. State what the thing is and does, at its true size. Written form: The verifier checks the declaration.
    Rule lack_listed · The author, 2026-11-08: Avoid this role of transparency that hurts the project image

2 error(s), 2 warning(s) across 1 file(s) at level 4

Repair each finding by its code. A finding names the rule, the written form and the ruling it comes from.
```

The hook exits with the code 2, and Claude Code, the agent tool I work with, hands that text back to the AI agent as the answer to its own write. The agent writes a dash, and in the same turn it is told, with my ruling under the finding. I am not in the room.

That is the whole loop: the brief before, the verdict after every write, the repair by code, until the court is silent. The reading of chapter 8 comes last, on a text already clean of what a machine can decide.

## The record of this book

This book is a case of the loop, and I kept its record. An AI agent drafted every chapter with my rules in its prompt: the framework, the study of my voice, the rulings of chapter 1. It wrote each chapter without the court, then ran the court once, and that first verdict was saved before any repair.

On the first nine pages, the preface and chapters 1 to 8, the first verdicts hold eleven findings. Nine are false positives of the sort chapter 8 showed: three times a hedge that was the noun `kind`, six times the calque on `hole`. Two are true, and they are the same finding in chapters 4 and 6: `VOICE_ABSENT`, with a median sentence of 10 words where my profile asks for 16 within 5.

Read what is absent from that list. No dash, no forbidden word, no title over six words, no first sentence without its subject. The rules in the prompt held for everything a rule can name. What drifted was the measure. My reading is this: told to follow a long sentence with a short verdict, the agent wrote the verdicts and shortened the rest.

No instruction of mine caught that. A count did.

The table of the whole draft, page by page, is in `research/trial/README.md`, with the rounds of repair that each one took.

[AUTHOR: your reading of that table. Does a median of 10 match what you hear when an agent imitates you: the short verdict overdone?]

## Where it stands

Built: `prosa brief`, the verdict as records, the hook, and the trial of this draft.

Designed: the experiment that carries the proof of the whole proposal. One chapter is drafted with the court and one without, and the remarks I make on each are counted.

## In your hands

Here is a defect of the loop, and it is in this book. The file `book.proz` holds the law of the book and also its excuses, and the AI agent that drafted the chapters wrote each `ALLOW` in it, with a reason.

Each of those reasons is true, as far as I can read. But see what the loop allows: an agent that can write to the law can excuse itself from it.

Where would you keep the law so that the one who is judged cannot amend it? And who signs an excuse? Write your answer as a rule of your own house, with its evidence.

Mine is in the next chapter, which is about houses: how one writes its law, and how a second one takes it, or declines it.
