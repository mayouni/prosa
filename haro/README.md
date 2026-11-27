# Prosa, declared as a Haro language

This folder holds the declaration of Prosa in Haro, the language of languages: `prosa.stzu` states the ten kinds of a `.proz`
file, their fields, their closed vocabularies and the checks a declaration language can carry, and Haro forges a court and a
decoder grammar from it. The reference court stays `tools/prosa/prosa.js`; this folder measures how far a declared court
agrees with it.

| File | What it holds |
|---|---|
| `gen-prosa-stzu.js` | The generator. It writes `prosa.stzu` from `tools/prosa/prosa.js` and `conformance/violations.json`, and checks its own field table against the reference court before it writes |
| `prosa.stzu` | The declaration: one language, six menus, five forms, one union, ten kinds, fifteen constraints and two refusals. Its header lists the seams, S1 to S14 |
| `prosa.gbnf` | The decoder grammar the forge writes from the declaration, for an AI model that writes Prosa under a constrained decoder |
| `judge-prosa-court.js` | The judge. It forges the court, translates each fixture into the form the court reads, and compares the court with `prosa.js` at level 2 |
| `twin-expected.csv` | The ratchet: one row for each fixture on which the two courts differ, with the seam that explains it |

## Commands

The judge needs a built Haro VM and the Haro spike folder. Both have a default path in the judge, and two environment
variables replace them.

```
node haro/gen-prosa-stzu.js                 writes haro/prosa.stzu
node haro/judge-prosa-court.js              forges the court, judges the fixtures, enforces the ratchet
node haro/judge-prosa-court.js --write-gbnf rewrites haro/prosa.gbnf from the forge

HARO=D:/GitHub/haro/vm/zig-out/bin/haro.exe HARO_SPIKE=D:/GitHub/haro/spike node haro/judge-prosa-court.js
```

The judge runs these two commands of Haro, from the spike folder and from a temporary folder:

```
haro forge.haro <path>/prosa.stzu <out dir>     writes prosa_court.haro and prosa.gbnf
haro prosa_court.haro diagnose <file>           prints the diagnostics of one file as JSON
```

`haro haro.haro <path>/prosa.stzu`, run from the spike folder, judges the declaration alone and prints `ok` with its counts.

The judge exits 0 when every difference is a row of `twin-expected.csv`, 1 when a difference is new, changed or gone, and 2
when the court is not forged.

## The measured result

Measured on 2026-11-26, on the forge of Haro commit 989d6e6: the meta-court accepts `prosa.stzu`, and the forged court judges
the 66 fixtures of `conformance/manifest.json` at level 2, the last level that judges a declaration without its text. On
2026-11-27 the suite grew to 73 fixtures, and the same forge agrees on the 7 new ones: 63 of 73 agree, with the same 10
differences.

- **56 of 66 agree with `prosa.js`.** All 50 declarations that are lawful at level 2 are judged clean. Six of the 16 refused
  ones are refused under the same code: `MISSING_FIELD`, `UNKNOWN_KIND`, `RULE_WITHOUT_EVIDENCE`, `UNKNOWN_REFERENCE`,
  `ADOPTION_CYCLE` and `PIECE_WITHOUT_SUBJECT`.
- **5 are refused under a code of the court.** `UNKNOWN_FIELD` is spoken as `UNKNOWN_CLAUSE`, `DUPLICATE_DECLARATION` as
  `DUPLICATE_NAME`, and `DUPLICATE_FIELD`, `UNEXPECTED_TOKEN` and `UNTERMINATED_STRING` as `PARSE`.
- **5 are judged clean.** A bound that is not a bound (`BAD_VALUE`), `BOUND_INVERTED`, `EXAMPLE_NOT_REFUSED`,
  `EXAMPLE_NOT_LAWFUL` and `TERM_REFUSED_AND_REQUIRED` need the inner grammar of a value, arithmetic, a rule run on its own
  example, or a word matched against the entries of another declaration.

Levels 3, 4 and 5 read a written text, and a declared language judges declarations: those levels stay with `prosa.js`.

## The boundary

A clause of a Haro language holds one value, and a Prosa field holds a run of values. The judge translates a `.proz` file
one way, for the court alone: `AS` is added, a `RATIONALE "none given"` closes each declaration, a code is written in
lower case, a bound and each entry become one text, and a phrase list becomes a list of texts. The header of
`judge-prosa-court.js` gives each rule with an example.
