# Search by game title or character

## Goal

Make the existing public Discover page (`/discover`) find games when a visitor
types either a game title **or** an LGBTQ+ character's name, showing matching
games as cover cards. No new page is needed — Discover is already the search
page, with debounced typing, a results count, and game cards with covers; it
currently matches titles only.

## Changes

1. **Search query** (`src/lib/sanity/queries.ts`): extend `searchGamesQuery`
   so `$term` also matches `lgbtqCharacters[].name`. Games without a character
   list behave exactly as before (title match only).
2. **Character data coverage**: only games imported via the Wikipedia batch
   carry `lgbtqCharacters` (a few hundred). Character search works for those
   games; everything else still matches by title. No re-import in this step.
3. **Discover page** (`src/routes/discover.tsx`):
   - Update the search box placeholder and page copy to say visitors can
     search "a game or a character".
   - When a result matched via a character (term doesn't appear in the
     title), show a small "Character: <name>" line on the result — reuse the
     existing `GameCard` where possible, otherwise a thin wrapper listing the
     matched character names under the card.
4. **Result ordering**: keep the current title-ascending order; no ranking
   changes.
5. **Head metadata**: description for `/discover` updated to mention
   character search.

## Verification

- Type check and build pass.
- Browser check on the preview: typing a known character name (e.g. one from
  an existing game's character list) returns that game with its cover;
  typing a title still works; filters still work; no console errors; check at
  phone width too.

## Technical details

- The search still runs through the existing `searchPublicGames` server
  function and the static/prerender setup is untouched.
- GROQ change is additive: `($term == "" || title match $term || $term in lgbtqCharacters[].name)` —
  no schema migration, no stored-field changes.
- Character names shown on results come from the search response; the summary
  projection gains the `lgbtqCharacters` names only (small payload).
