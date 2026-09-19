# Catalog games from Gayming Magazine

Use Firecrawl to sweep Gayming Magazine, pull out every game it writes about, match each
one against IGDB, and add the new ones to your library — never duplicating a game you
already have.

## What gets swept

1. **The site's game tags** (~1,700 tag pages from the two tag sitemaps). Tags are mostly
   game names, but also people, studios, and topics — so every candidate is checked against
   IGDB and only real game matches are kept.
2. **Reviews and features.** The article sitemaps are filtered to review/feature URLs, and
   Firecrawl reads each one to pull the game titles it discusses, plus the article title and
   link.

Everything else on the site (shop products, authors, events, opinion columns) is skipped.

## How a game is added

- Each candidate title is matched against IGDB; the best match supplies all details
  (cover, year, platforms, studio, summary, genres, themes).
- Anything IGDB can't match is reported back by name, never invented.
- Duplicates are impossible: a game is keyed to its IGDB entry, so titles already in the
  library are skipped (only their source links are added).
- New games are set to **approved**, so they appear publicly right away.
- Existing editor work — your descriptions, notes, featured flags, list membership — is
  untouched.

## Source links

Each game gains a small list of where it was found: the Gayming Magazine article or tag
page title and URL, with the date it was captured. Shown on the game page for editors only,
and in the studio.

## Report at the end

A summary listing how many games were added, how many already existed, which titles IGDB
couldn't match, and the new library total.

## Technical notes

- Firecrawl connection is gateway-backed (`uses_connector_gateway: true`): link it to the
  project, then call `https://connector-gateway.lovable.dev/firecrawl/v2/...` from server
  code with `Authorization: Bearer $LOVABLE_API_KEY` and
  `X-Connection-Api-Key: $FIRECRAWL_API_KEY`. Credentials stay server-side; never in
  browser code.
- Sitemap parsing and Firecrawl scraping run in a one-off script under `scripts/`, executed
  with bun, deleted afterwards — same pattern as the earlier seed batches.
- Article extraction uses Firecrawl's JSON format with a schema (`games: string[]`,
  `articleTitle`) plus `onlyMainContent`, batched with a concurrency cap to control credits.
- Imports go through the existing editor-only pipeline (`importOneGame` in
  `src/lib/import/import.server.ts`), so IGDB access, Sanity writes, duplicate protection by
  `igdbId`, and preservation of editor-owned fields all stay as they are.
- Schema change is additive: a `sources` array field (`title`, `url`, `capturedAt`) on the
  `game` type, added to the deployed studio schema and to `src/lib/sanity/types.ts`, with the
  game detail page rendering it in the editor-only section.
- Finish with type check, build, a browser pass over `/`, `/library`, `/discover`, and a
  publish.
