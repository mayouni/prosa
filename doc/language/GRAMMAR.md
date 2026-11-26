# The grammar of a .proz file

The grammar of Prosa is the form of a `.proz` file: `USE` lines and `DEFINE` declarations, in the surface Zayn uses. This
page gives its tokens and its EBNF, for language 0.1.

## Lexical rules

- **Encoding.** A file is UTF-8. A byte order mark at the start is skipped. Line ends are LF or CRLF.
- **Comment.** `//` starts a comment that runs to the end of the line.
- **Keyword.** A keyword is UPPER_SNAKE: `[A-Z][A-Z0-9_]*`. Keywords are case-sensitive. Kinds, fields, modifiers and
  diagnostic codes are keywords.
- **Name.** A name is lower_snake: `[a-z][a-z0-9_]*`. Declarations, zones, languages and enumerated values are names.
- **Number.** A number is `[0-9]+` with an optional `.[0-9]+`.
- **String.** A string stands between two `"` on one line. `\"` writes a quote and `\\` writes a backslash.
- **Punctuation.** `(`, `)`, `[`, `]` and `,`. A trailing comma is lawful in a field list and in a list.

Any other run of characters is refused as `UNEXPECTED_TOKEN`. A string left open at the end of its line is refused as
`UNTERMINATED_STRING`.

## EBNF

```
file         = { use | declaration } ;
use          = "USE" string ;
declaration  = "DEFINE" kind name "(" [ field { "," field } [ "," ] ] ")" ;
kind         = "STYLE" | "TERM" | "WORDLIST" | "PATTERN" | "PROFILE"
             | "FORM" | "ZONE" | "PIECE" | "ALLOW" | "READING" ;
field        = keyword { value } ;
value        = string | number | name | keyword | list ;
list         = "[" [ item { "," item } [ "," ] ] "]" ;
item         = value { value } ;
```

A field is a keyword followed by its values up to the next comma or the closing parenthesis. The shape of the values depends
on the field and is given in [DECLARATIONS.md](DECLARATIONS.md); a wrong shape is refused as `BAD_VALUE`.

## The shapes of values

| Shape | Written as | Example |
|---|---|---|
| string | one string | `MEANS "the person who writes programs"` |
| name | one name | `FOLLOWS ayouni` |
| code | one keyword | `CODE LACK_LISTED` |
| number | one number | `MIN_WORDS 300` |
| names | a list of names, or one name | `HOLDS [crafter, programmer]` |
| words | a list of names or strings | `KEEPS ["decision maker"]` |
| codes | a list of keywords | `EXEMPT_FROM [SAY_ONCE]` |
| entries | a list of entries | see below |
| bound | a bound | see below |

**Entry.** An entry is a sequence of elements that must stand in a row in the text:

```
entry    = element { [ "WITHIN" number ] element } [ "WRITE" string ] ;
element  = word | "[" word { "," word } "]" | "EMOJI" | "ANY" ;
word     = name | string ;
```

- A word matches one token or, when it holds spaces, a row of tokens: `"in order to"`. Matching ignores case. A name is read
  with its underscores as spaces.
- A word that ends in `*` is a stem: `"utili*"` matches every word that starts with `utili`.
- A group in brackets matches any one of its words.
- `EMOJI` matches one emoji. `ANY` matches one word.
- `A WITHIN 3 B` matches when B starts at most three tokens after A ends, and every token between them is a word: a gap
  never crosses punctuation.
- `WRITE "x"` gives the written form the diagnostic shows.

**Bound.** A bound limits a measure:

```
bound  = [ number ] ( number "WITHIN" number
                    | "AT_MOST" number
                    | "AT_LEAST" number
                    | "BETWEEN" number "AND" number ) [ "PER_THOUSAND" | "PER_HUNDRED" ] ;
```

The leading number is the threshold of `SENTENCES_OVER` and `SENTENCES_UNDER`. `PER_THOUSAND` counts per thousand prose
words. `PER_HUNDRED` counts per hundred sentences, or per hundred paragraphs for `ONE_SENTENCE_PARAGRAPHS`.

## USE

`USE "path.proz"` reads another file, relative to the file that names it. `USE "prosa:reader_rights"` reads the constitution
shipped with Prosa. A file is read once, whatever the number of `USE` lines that reach it. Names are global: a name is
declared once across all the files read together.
