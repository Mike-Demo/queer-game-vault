# Seed QueerCade from the attached lists

The attachments give a starting point, not the content itself: one file is a set of 25 web links about queer Nintendo Switch games, and four files are list names ("Best JRPGs with LGBTQ+ characters", "Best cozy queer games", "Best queer visual novels", "Best queer horror games"). Game titles come from those links; every detail — cover art, release year, genres, platforms, studio, summary — is fetched live from IGDB, exactly like a normal import.

## What gets seeded

Game titles derived from the links (duplicates and article-only links dropped), roughly:

BOSSGAME: The Final Boss Is My Heart, Miitopia, Perfect Gold, Dating Life: Miley X Emily, Astronomical Club For Queers, SeaBed, The Fairy's Song, Clover Reset, Synergia, Arcade Spirits, Please Be Happy, Nova Hearts, Blackberry Honey, Sayonara Wild Hearts, Bayonetta 3, Black Lily's Tale, All The Words She Wrote, South of Midnight.

Each title is looked up on IGDB by name. Where IGDB has no match (very small indie releases sometimes aren't listed), the title is reported back to you as "not found on IGDB" rather than invented — no fabricated entries.

## The four lists

Created as real collections with titles, slugs and short editorial descriptions, then filled: each seeded game is placed into the list that fits, judged from the IGDB genres, themes and keywords the import brings back. A game can sit in more than one list. Anything that doesn't clearly fit stays out of the lists but still lands in the library.

## Status

Seeded games are set to approved, so they appear in the library and on their own pages immediately. Three to four of the strongest fits become featured for the home page spotlight. The Chrono Trigger sample is removed once real games are in.

## Steps

1. Extract the title list from the attachments and match each against IGDB.
2. Import the matches through the existing import path — same IGDB fields, same duplicate protection by IGDB id, same import history record.
3. Set statuses: approved for all, featured for a handful.
4. Create the four collections and assign members.
5. Remove the Chrono Trigger sample.
6. Check every public page and the editor screens, then publish.

## Technical notes

- Seeding runs through the existing editor-only import server functions, so IGDB credentials and the Sanity write token stay server-side and no new secret paths appear.
- Matching uses the existing IGDB search function; the best name match with a cover and release date wins, and results are logged for your review.
- Import stays idempotent: a game already present by `igdbId` is updated, never duplicated, and editor-owned fields (custom description, notes, featured, status, list membership) are preserved.
- Collections are new `gameCollection` documents; no schema changes, so nothing existing breaks.
- A short report at the end lists what was imported, what was featured, what went into each list, and any title IGDB could not match.
