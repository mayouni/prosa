---
id: the-form-of-a-text
number: 7
title: The form of a text
subject: form
status: draft
lang: en
stage:
  built: "FORM with its nine fields; PIECE with FILE, FILES, SUBJECT and SUBJECT_FROM; the form of this book, in book.proz"
  designed: ""
evidence: ["prosa/book/examples/ch07, run on 2026-11-26", "zayn/doc/design/WRITING.md, rules 1 and 2 and section 2", "ayouni/writing-framework/FRAMEWORK.md C4 and C9", "prosa/book/book.proz"]
---

A form is the declared structure of a kind of text: how long its title may be, what its first sentence must hold, which headings it keeps, how it may close. In this chapter I declare the form of a chapter and bind one page to it. The court refuses the piece first, for a reason that carries the whole design, and then refuses the page seven times. I end on the form that governs the chapter you are reading.

## The subject makes it decidable

On 5 November 2026 I looked at a page of the Zayn site whose title was this sentence: "A map of what a person does, across every channel, with the empty cells left empty." The page was about the grid of Zayn, and the word grid stood neither in its title nor in its first paragraph. My remark of that day is in chapter 1: "you describe the grid without citing it, neither in the titles nor in the text."

Can a program decide that a title names its subject? It cannot, as long as nobody told it what the subject is. That is a judgment about meaning. But the day the page declares its subject in one word, the judgment becomes a test on a string, and a program runs it.

So a piece under such a form has to say what it is about. We try without.

```proz
DEFINE FORM chapter (
  TITLE_HOLDS subject,
  EVIDENCE "zayn/doc/design/WRITING.md rule 1"
)

DEFINE PIECE grid_chapter (
  FILE "grid.md",
  FOLLOWS house,
  FORM chapter
)
```

```text
> prosa check nosubject.proz
nosubject.proz:10  error  PIECE_WITHOUT_SUBJECT  grid_chapter
    The form chapter places the subject, and the piece declares no SUBJECT.

1 error(s), 0 warning(s) across 1 file(s) at level 4
```

The court refuses the piece, and reads no line of the page. A text that does not say what it is about cannot be held to its subject, by a program or by a reader.

## A page refused seven times

Here is the form whole. Each field is one of my rulings, and the evidence names where each is written.

```proz
DEFINE FORM chapter (
  TITLE_WORDS AT_MOST 6,
  TITLE_HOLDS subject,
  FIRST_SENTENCE_HOLDS subject,
  SAY_ONCE FIRST 150,
  HEADINGS ["What I refused", "In your hands"],
  CLOSES_WITHOUT ["summary", "in summary", "to sum up"],
  HOLES_CLOSED_AT [review, published],
  EVIDENCE "zayn/doc/design/WRITING.md rules 1 and 2; AYOUNI Writing Framework C4 and C9"
)

DEFINE PIECE grid_chapter (
  FILE "grid.md",
  FOLLOWS house,
  FORM chapter,
  SUBJECT "grid"
)
```

And here is a small page that breaks every field. The front matter, the lines between the two rules at the top, says that the page is in review.

```markdown
---
status: review
---

# A map of what a person does, with the empty cells left empty

Every channel carries some activities and leaves others out. The empty cells are counted, and the empty cells are listed.

## In your hands

Fill one cell [AUTHOR: the cell you filled first, and the day].

## What I refused

I refused a table drawn by hand.

In summary, the map has rows and columns.
```

```text
> prosa check form.proz
grid.md:5  error  TITLE_TOO_LONG  grid_chapter
    The title holds 13 words; the form allows 6.
    Rule chapter · zayn/doc/design/WRITING.md rules 1 and 2; AYOUNI Writing Framework C4 and C9

grid.md:5  error  TITLE_WITHOUT_SUBJECT  grid_chapter
    The title does not name the subject "grid".
    Rule chapter · zayn/doc/design/WRITING.md rules 1 and 2; AYOUNI Writing Framework C4 and C9

grid.md:7  error  LEDE_WITHOUT_SUBJECT  grid_chapter
    The first sentence does not name the subject "grid".
    Rule chapter · zayn/doc/design/WRITING.md rules 1 and 2; AYOUNI Writing Framework C4 and C9

grid.md:7  error  SAY_ONCE  grid_chapter
    "empty cells" stands twice in the first 150 words (first at line 5).
    Rule chapter · zayn/doc/design/WRITING.md rules 1 and 2; AYOUNI Writing Framework C4 and C9

grid.md:9  error  HEADING_OUT_OF_ORDER  grid_chapter
    The heading "In your hands" stands before a heading the form places ahead of it.
    Rule chapter · zayn/doc/design/WRITING.md rules 1 and 2; AYOUNI Writing Framework C4 and C9

grid.md:11  error  HOLE_OPEN  grid_chapter
    A hole is still open at status review: [AUTHOR: the cell you filled first, and the day]
    Rule chapter · zayn/doc/design/WRITING.md rules 1 and 2; AYOUNI Writing Framework C4 and C9

grid.md:17  error  CLOSES_ON_SUMMARY  grid_chapter
    The text closes on "in summary".
    Rule chapter · zayn/doc/design/WRITING.md rules 1 and 2; AYOUNI Writing Framework C4 and C9

7 error(s), 0 warning(s) across 2 file(s) at level 4
```

Seven refusals on one small page! I read them from the top, because each one is a remark I made by hand before it was a code.

**The title.** A title is six words at most and names its subject: lines one and two of the verdict. The subject is found at the start of a word, in any case, so a stem works: the term `compar` is found in "Comparison", and the term `use` is left alone inside "because".

**The first sentence.** It names the subject and says what the thing is. The reader who stops after one sentence leaves with a definition.

**Said once.** `SAY_ONCE FIRST 150` reads the first 150 words a reader meets and refuses two content words in a row that stand twice there. On 14 November 2026 I typed four words about a page that repeated itself: "a lot of suplications!" The spelling is mine.

**The headings.** A form fixes the headings that every text of its kind keeps, in their order. Other headings may stand between them.

**The hole.** A particular that only the author knows is marked `[AUTHOR: …]`, and an agent leaves it open. A hole is lawful in a draft. In a page that claims to be in review it is a debt, and the court counts it.

**The close.** A chapter of mine ends on a bridge, a release, a homework or a coda. The court refuses the phrases that announce a summary.

The repaired page takes the sentence my record gives as the written form: "Zayn is designed around a conceptual grid of what a person does in every channel." Its title is "The grid of Zayn", its status is draft, and its headings stand in order.

```text
> prosa check form-lawful.proz
0 error(s), 0 warning(s) across 2 file(s) at level 4
```

## The form of this book

This book lives under such a form, and the file is short enough to print. `USE` reads my house style; `EXTENDS` takes every field of a form of that style; `FILES` binds every chapter at once; and `SUBJECT_FROM front_matter` reads each chapter's subject from its own first lines.

```proz
USE "../styles/ayouni/ayouni.proz"

DEFINE FORM book_chapter (
  EXTENDS titled_chapter,
  TITLE_HOLDS subject,
  FIRST_SENTENCE_HOLDS subject,
  EVIDENCE "books/zayn-book/CLAUDE.md: a title names its subject; the first sentence under a title says what the thing is"
)

DEFINE PIECE prosa_book (
  FILES "src/en/*.md",
  FOLLOWS ayouni,
  FORM book_chapter,
  SUBJECT_FROM front_matter
)
```

Go back to the top of this chapter. Its subject is `form`, the word stands in its title, and its first sentence begins "A form is". You can check the other chapters the same way, and the court did.

Every chapter of this draft is a draft, so its holes are lawful. The day I move a page to review, the court will list what I still owe that page.

[AUTHOR: how you close holes in practice. Do you fill them in one sitting at the end, or as each chapter comes back? One true sentence.]

## Where it stands

Built: `FORM`, with its nine fields, and `PIECE`, for one file or a set. The reader's rights, the small constitution shipped with Prosa, are written as a form named `governed_text`, which any house may extend.

## In your hands

The test of the subject is a test on a string, and a string can lie. Here is a page that the court accepts for the subject `form`:

```markdown
# Formal dress at the office

Formerly a rule of the house, a tie is now a choice.
```

```text
> prosa check formal.proz
0 error(s), 0 warning(s) across 2 file(s) at level 4
```

The title holds the stem, the first sentence holds it too, and the page is about ties.

What would you change: the term, the page, or the test? Try the longer term `forms` first, and see which honest titles it now refuses.

The court took that page for lawful, and a reader would not. The next chapter is about that difference, and about the instrument that Prosa gives the reader.
