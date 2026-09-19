# Add the Wikipedia LGBTQ+ games batch

The five spreadsheets are overlapping extracts of the same Wikipedia list: 445 distinct
title values across them, many of which are character names that landed in the title
column by mistake. Plan: fold them into one clean list, import the real games that
aren't already in the library, and also record each game's LGBTQ+ characters.

## What happens

1. **Merge and clean** — combine all five files into one list keyed by title, merging the
   character entries for the same game. Rows whose title is empty, a year, or an obvious
   fragment ("All", "Year", "2025") are dropped up front.
2. **Match against IGDB** — each title is matched by exact normalised title, preferring
   the most popular result, and must have cover art and a release date. Anything that
   doesn't match cleanly (character names such as "Carlus" or "Venom") is skipped; I
   report the full skipped list in chat so you can review it.
3. **Skip duplicates** — a game already in the library (same IGDB id) is left untouched
   apart from gaining its character list; nothing is re-imported or overwritten.
4. **Import the rest** through the existing import pipeline, set to approved, exactly as
   the earlier batches were.
5. **Store the characters** — each game gets a list of character name, identity, and the
   source link they came from.
6. **Show them on the game page** — a new "LGBTQ+ characters" section on
   `/games/:slug` listing each name with its identity, plus the source link. Public,
   using existing design-system components and tokens.
7. **Verify** — type check, build, and a browser pass over a few affected game pages.
   Then a summary: created, already present, skipped (with reasons).

Editor-written fields (your descriptions, notes, featured flags, collection membership)
are never touched.

## Technical notes

- New `lgbtqCharacters` array field on the Sanity `game` type (objects with `name`,
  `identity`, `sourceUrl`), deployed to project `tzh8tziu`, dataset `production`.
  Additive only — no existing field changes.
- Character data is written by a one-off script through the existing server-side write
  client, and is preserved on IGDB refresh (it is editor-side data, not IGDB data).
- The import itself reuses `importOneGame` so duplicate protection by `igdbId` and
  `importRecord` creation stay identical to previous batches.
- Game page reads the new field through the existing public GROQ query and server
  function, so the browser still never talks to the content service directly and static
  pages keep working.
- The merge/import script is a one-off under `scripts/`, deleted after it runs.

## Expected scale

445 raw titles, roughly 250-330 real games after cleaning; most will already be in the
535-game library, so the number of genuinely new imports is likely modest. Exact counts
come with the report.
