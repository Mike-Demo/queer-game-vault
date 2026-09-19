# Expose remaining game fields on the detail page

Add the last unexposed game data to `/games/:slug`: curated collection membership, IGDB popularity + source-updated date, and editor-only workflow status.

## Changes

### 1. "In our collections" section (public)

Collections a game belongs to live on `gameCollection` documents (references to games), so a game page can't see them today.

- New GROQ query in `src/lib/sanity/queries.ts`: published collections (`gameCollection`) that reference the game's `_id`, projecting title + slug.
- New server function in `src/lib/publicContent.functions.ts` (unauthenticated, read-only, same pattern as existing public reads) and matching query options in `src/lib/publicData.ts`.
- Render on `src/routes/games.$slug.tsx`: an "In our collections" Surface listing each collection name linking to `/collections/:slug`. Hidden when the game is in no collections.
- Included in the statically prerendered game pages like the rest of the page.

### 2. Popularity + IGDB record-updated date (public)

- Add `popularity` and `sourceUpdatedAt` to `GAME_DETAIL_PROJECTION` and the `GameDetail` type (`src/lib/sanity/types.ts`).
- New metadata rows: "Popularity" (raw IGDB score, only when present) and "IGDB record updated" (formatted date) alongside the existing Imported / Last synced line.

### 3. Editorial + import status (editors/admins only)

- Show the game's `editorialStatus` and `importStatus` as a small status line visible only to signed-in editors/admins, using the existing role check — never rendered into the public static HTML.

## Verification

- `bunx tsgo --noEmit`, build passes.
- Browser pass signed out and signed in as an editor on a game that belongs to collections (e.g. one in best-queer-horror-games): collection links render and navigate, new metadata rows appear, status line shows for editors only, no page errors.
- Prerendered static HTML for a game page contains the collection links.

## Out of scope

- No schema changes (all fields already exist).
- No changes to the import pipeline or editor fields.
