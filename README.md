# Prosa

Prosa is a declarative language that governs written text by compilation: a writing style is declared in `.proz` files, and a
court refuses, by name, every sentence the declaration forbids. It lets a writer who works with AI models make a correction
once.

```
DEFINE TERM programmer (
  MEANS "the person who writes programs",
  REFUSES [developer, developers],
  EVIDENCE "FRAMEWORK.md section 4: developer for programmer is a forbidden word"
)
```

```
src/04-the-court.md:57  error  TERM_SYNONYM  programmer
    "developer" stands for the person who writes programs: the house word is "programmer".
    Rule programmer · FRAMEWORK.md section 4: developer for programmer is a forbidden word
```

## What a style declares

A house writes its voice in ten kinds of declaration.

| Kind | What it declares |
|---|---|
| `STYLE` | The rules a house holds, and the sets it adopts or declines |
| `TERM` | One word for one thing, and the words refused in its place |
| `WORDLIST` | A list of refused words, each with its written form, under an optional budget |
| `PATTERN` | A refused construction, with a refused example and a written one that test the rule |
| `PROFILE` | The measure of a voice: sentence lengths and marks, with upper and lower bounds |
| `FORM` | The structure of a kind of text: title, subject, headings, close |
| `PIECE` | One text, bound to a style, a form and a subject term |
| `ZONE`, `ALLOW` | A region or a line excused from a code, with a reason |
| `READING` | A judgment that stays with a reader, recorded and never counted as a pass |

Every rule carries its `EVIDENCE`: the dated ruling or the measure it comes from. A rule without evidence is refused.

## The commands

The reference court runs on Node 22 with no dependency.

```
node tools/prosa/cli.js check <path>...        judge declarations and the texts they bind
node tools/prosa/cli.js measure <corpus>       take the profile of a voice from approved pages
node tools/prosa/cli.js brief <file.proz>      write the contract an AI agent reads before drafting
node tools/prosa/cli.js drift <drafts> --against <corpus>
node tools/prosa/cli.js readings <path>        list the readings recorded and due
node tools/prosa/cli.js conformance            run every fixture and its lawful twin
node tools/prosa/cli.js pack --check           verify the standard's files and versions
```

`prosa check` exits 0 when no error stands, 1 on an error and 2 on a usage error. `--json` prints the findings in the
Softanza family envelope.

## The repository

| Folder | What it holds |
|---|---|
| `doc/language/` | The specification: grammar, declarations, text model, diagnostics |
| `constitution/` | The reader's rights, the set every house may adopt |
| `styles/` | The houses: `ayouni`, `softanza_site`, `model_drift`, `plain_manual` |
| `conformance/` | The diagnostics as data, and the fixtures with their lawful twins |
| `tools/prosa/` | The reference court, the command, the Claude Code hook and the MCP surface |
| `tools/parity/` | The three harnesses that compare the court with the house's earlier checkers |
| `zig/`, `haro/` | The binary and the Haro declaration of the language |
| `site/`, `book/` | The website and the book |

## Where to read next

- [doc/PROPOSAL.md](doc/PROPOSAL.md) states the philosophy, the prior work and the plan.
- [doc/language/README.md](doc/language/README.md) is the specification of language 0.1.
- [doc/AGENTS.md](doc/AGENTS.md) shows how an AI agent writes under the court.
- [doc/findings/PARITY.md](doc/findings/PARITY.md) gives the measured agreement with the house's three checkers.
- [ROADMAP.md](ROADMAP.md) lists the milestones and their state.

Prosa is part of the Softanza project, beside Zayn, which governs interfaces, and Haro, the language both are declared in.
The license is MIT.
