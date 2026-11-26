# How an agent writes under Prosa

An agent that writes under Prosa follows a loop of three steps: it reads the contract, it drafts, and it repairs each finding
of the court by its code. This page gives the loop and the two surfaces that put the court inside an AI agent's work: the
Claude Code hook and the MCP surface. The agent here is an AI agent; a person follows the same loop from a terminal.

## The loop

1. **Read the contract.** `prosa brief <file.proz> --piece <name>` prints what the piece must be: its form, its terms, the
   written forms of its patterns and the measure of its voice. The contract states what to write. It is short enough to
   stand in a prompt.
2. **Draft.** The agent writes the text. A particular only the author knows is marked `[AUTHOR: what is needed]`.
3. **Check and repair.** `prosa check <file.proz> --json` returns the findings. Each one names its code, its line, the rule,
   the written form and the ruling the rule comes from. The agent repairs each finding and checks again, until the court is
   silent.

```
node tools/prosa/cli.js brief book/book.proz --piece prosa_book
node tools/prosa/cli.js check book/book.proz --json
```

A finding is repaired in the text. An agent never edits a rule, an `ALLOW` or a `ZONE` to silence the court: those belong to
the author, and each one carries a reason.

## The Claude Code hook

The hook runs the court on every write to a governed file. `tools/prosa/hook.js` reads the hook's input, finds the `.proz`
files in the folders above the written file, and judges the file when a `PIECE` names it. On an error it exits 2 and Claude
Code hands the findings back to the AI agent, which repairs them in its next step. A file that no piece names is left alone.

The hook is registered in `.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      { "matcher": "Write|Edit",
        "hooks": [ { "type": "command", "command": "node \"$CLAUDE_PROJECT_DIR/tools/prosa/hook.js\"" } ] }
    ]
  }
}
```

The same file judges one text from a terminal: `node tools/prosa/hook.js path/to/text.md`.

## The MCP surface

The MCP surface serves the court to AI tools as three tools over stdio.

| Tool | What it returns |
|---|---|
| `prosa_check` | The findings on a declaration, a text or a folder |
| `prosa_brief` | The writing contract of a piece or a style |
| `prosa_measure` | The profile of a text or a corpus, as a `PROFILE` declaration |

```
claude mcp add prosa -- node D:/GitHub/prosa/tools/prosa/mcp.js
```

## From a remark to a rule

A remark of the author becomes a rule in four moves, and the agent makes the first three.

1. The agent quotes the remark, with its date, as the `EVIDENCE` of a new `TERM`, `WORDLIST` or `PATTERN`.
2. The agent sets the faulty sentence as `REFUSED` and the corrected one as `WRITTEN`. The court tests both at level 2.
3. The agent adds the rule to the `HOLDS` of the style and runs `prosa check` on every governed text.
4. The author rules on the declaration. From that commit the court raises the correction, and the author does not.

## What stays with a reader

The court decides words, patterns, positions and counts. A `READING` names what it leaves to a reader: whether a sentence
teases, whether a paragraph is in the author's voice. `prosa readings` lists each reading as recorded or due, and the record
is a file a person or an AI model writes under the declared question.
