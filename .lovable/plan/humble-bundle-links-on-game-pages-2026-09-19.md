# Humble Bundle links on game pages

## Goal

Every game detail page gets a "Find on Humble Bundle" link that opens the
Humble store search with the game's title filled in.

## Why a search link

IGDB (the game's data source) records store links for Steam, GOG and Epic but
has no Humble Bundle category, so there is no reliable direct store-page URL
to import. A prefilled store search always works, needs no API key, and never
goes stale.

## Changes

1. **Game detail page** (`src/routes/games.$slug.tsx`)
   - In the existing external-links section, add one more entry:
     `https://www.humblebundle.com/store/search?search=<game title>`
     (title URL-encoded), labelled "Find on Humble Bundle", opening in a new
     tab like the other store links.
   - Skip it in the rare case an imported external link already points at
     humblebundle.com, so the page never shows two Humble links.
   - Pure display-time link, built from the title already on the page — no
     database fields, no import-pipeline changes, nothing stored.

2. **Consistency check** — confirm no other page lists per-game store links
   (game cards elsewhere show cover + title only), so the detail page is the
   only place this belongs.

## Verification

- `bunx tsgo --noEmit` passes; build passes.
- Browser check signed out on a game page: the link renders, points at the
  encoded Humble store search URL, and static (prerendered) pages include it.

## Notes

- This is a search-results link, not a confirmed store page — it does not
  claim the game is sold on Humble. The label says "Find on" to make that
  honest.
- The link is computed at render time, so it appears on existing prerendered
  pages after the next publish.
