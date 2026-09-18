# QueerCade — IGDB to Sanity editorial platform

A retro-arcade styled app (using the attached NES design system) where editors search IGDB for games, preview them, import them into Sanity, and curate them into published collections and pages.

## What I found before planning

- The codebase is an empty starter: one placeholder home page, no pages, no content code, no markdown or hardcoded editorial copy to migrate yet. So step 9 of your brief (content migration) becomes "author the initial site copy directly in Sanity" — there is nothing existing to preserve.
- Your Sanity account has two projects both named QueerCade, both empty apart from system records. You chose the second one (created 21:50), dataset `production`, which is publicly readable — good for fast public reads.
- No IGDB MCP server is connected here, only Sanity, Balsamiq and Rezi. So IGDB runs on the official API with your Twitch credentials, kept server-side. This is also the only option that works on the published site.
- Sign-in and editor/admin roles do not exist yet, so I will turn on Lovable Cloud for accounts, roles, secrets and logs. Sanity stays the single source of truth for all games, collections, pages and settings.

## Stages

Each stage ends with a working, checkable app and a short report from me.

**Stage 1 — Foundations**
Turn on Lovable Cloud (accounts + editor/admin roles). Collect the Twitch credentials and a Sanity write token securely. Allow the preview and published addresses in Sanity. Build the site shell: navigation, footer, sign-in, and the arcade look.

**Stage 2 — Content model and Studio**
Create all nine content types (game, genre, platform, company, gameCollection, siteSettings, contentPage, importRecord) with grouped fields, validation, unique IGDB IDs, and game previews showing cover, title, year and status. Set up the Studio structure (Review Queue, Games, Featured, Collections, taxonomies, Pages, Settings, Import History) and deploy the hosted Studio. Seed the initial site name, homepage copy, empty-state wording, footer, SEO defaults and the About page as real Sanity documents.

**Stage 3 — IGDB search and preview**
Secure server-side search and game-details endpoints with token reuse, rate-limit handling, retries and safe error messages. Discover page: debounced search, minimum length, load-more, result cards with cover/year/platforms/genres/summary and an "already in library" badge. Full preview panel with screenshots, storyline, companies, franchise, ratings, age ratings and links, labelled as IGDB source data.

**Stage 4 — Import and sync**
Server-side import that is restricted to editors and admins, reuses genres/platforms/companies by IGDB ID, never duplicates a game, preserves editor-owned fields on refresh, logs every operation as an import record, and returns a per-game summary. Single import, multi-select bulk import with per-game progress, existing-game choices (cancel / refresh / open in Studio), and a field-level diff before overwriting.

**Stage 5 — Public site and editorial workflow**
Home, library, collections, collection detail, game detail, about — all reading approved or featured Sanity content only, archived content never public. Review queue for editors with custom description, editor notes, status changes, featured toggle, collection assignment, "Open in Studio" and "Refresh from IGDB". Import history page. Full loading / empty / partial-success / error states, mobile and desktop.

**Stage 6 — Verification and handoff**
End-to-end checks of sign-in, permissions, duplicate handling, refresh-preserves-edits, publishing visibility and responsive behaviour, then the implementation report and acceptance-criteria checklist.

## Technical notes

- This project runs on TanStack Start, so all server-side work uses server functions (the equivalent of edge functions here), with actions `igdb-search`, `igdb-game-details` and `sanity-import-game`. Every one of these authorizes the caller server-side via a role check, not hidden UI.
- Secrets held server-side only: `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, `SANITY_API_WRITE_TOKEN`. Project ID and dataset are public read values and may be used client-side.
- Reads: public pages use the unauthenticated CDN client with caching; review queue, drafts and mutations go through authenticated server-side requests with no caching.
- GROQ queries live in one module: featured games, approved library, game by slug, featured collections, collection by slug with games, review queue, site settings, navigation, page by slug, game by IGDB ID, import history.
- Imports are idempotent and keyed on `igdbId`; taxonomy upserts are keyed on their IGDB IDs. Concurrency is capped and only temporary failures retry with bounded backoff.
- Studio config lives in the repo and is deployed to a Sanity-hosted address.

## Credit estimate

Rough, based on scope per stage. Actual usage depends on iterations and debugging.

| Stage | Estimate |
| --- | --- |
| 1 Foundations | 15–25 |
| 2 Content model + Studio | 25–40 |
| 3 IGDB search + preview | 25–40 |
| 4 Import + sync | 30–50 |
| 5 Public site + workflow | 40–60 |
| 6 Verification + report | 10–20 |
| **Total** | **≈145–235 credits** |

Expect the upper end if IGDB rate limits, Studio deployment or CORS need several rounds of debugging.

## Open items I will need from you

- Twitch client ID and secret, and a Sanity write token (I will open a secure form for these at the start of Stage 1).
- Your own sign-in will be created first and promoted to admin so you can use the editor tools.
