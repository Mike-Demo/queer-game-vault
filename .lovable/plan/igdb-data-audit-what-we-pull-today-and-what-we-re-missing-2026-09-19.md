# IGDB data audit: what we pull today, and what we're missing

## What the app uses today

QueerCade talks to IGDB through a single place on the server, and it uses exactly **one** of IGDB's 83 endpoints:

- `games` — twice: a title search for the import tool, and a fetch-by-id used by the import pipeline.

Everything else we store (cover, screenshots, genres, platforms, themes, modes, companies, franchise, series, age ratings, store/social links, ratings) is pulled in as nested fields of that one `games` call. That is the right technique — but it means several useful data sets are simply never requested, and two of the values we do request are on IGDB's deprecated list.

## Two things to correct in what we already pull

1. **Popularity.** We store IGDB `follows`, falling back to `hypes`. IGDB has moved popularity to a dedicated data set (`popularity_primitives` + `popularity_types`), which is why 400+ of our games have no popularity value at all. Switching gives every game a real, comparable score — and makes a "trending" or "most followed" sort possible.
2. **Age ratings and link labels.** We translate IGDB's numeric codes with hardcoded tables in our own code. IGDB has replaced those codes with proper data sets (`age_rating_categories`, `age_rating_organizations`, `website_types`), plus content descriptors (e.g. "sexual themes", "language"). Reading the real tables removes our guesswork, keeps labels correct as IGDB adds new stores, and lets us show content descriptors.

## Missing data worth adding, highest value first

**Tier 1 — directly serves what QueerCade is about**

- `characters` (+ `character_genders`, `character_species`, `character_mug_shots`) — IGDB has a character database with names, descriptions, gender and portraits. Our LGBTQ+ character lists are hand-curated from Wikipedia and articles; this gives us portraits, verified spellings and a way to attach our editorial "identity" note to a real character record.
- `external_games` (+ `external_game_sources`) — the actual store identifiers (Steam app id, GOG, Epic, itch.io, Humble where present). Turns today's "Find on Humble Bundle" style search links into verified, direct store links.
- `alternative_names` — regional and alternate titles. This is what caused the handful of import misses (Corpse Party: Blood Covered, Pokémon X and Y, Rainbow Six Siege): matching on alternate names would have found them.
- `game_types` — marks a record as main game, DLC, expansion, remake, bundle, episode. Prevents the wrong-edition matches we had to fix by hand, and lets Discover hide DLC.

**Tier 2 — richer game pages**

- `game_videos` — official trailers, embedded on the game page.
- `artworks` (+ `artwork_types`) — proper key art, better than a screenshot for page banners and link previews.
- `release_dates` (+ `release_date_regions`, `release_date_statuses`, `date_formats`) — per-platform and per-region dates, and honest "TBA / Q3 2026" handling instead of a single date.
- `game_time_to_beat` — typical completion time, a standard tracker feature and a natural fit next to Playing/Completed.
- `multiplayer_modes`, `player_perspectives`, `game_engines` — co-op/online detail, viewpoint, engine.
- `language_supports` (+ `languages`, `language_support_types`) — audio/subtitle/interface languages.
- `keywords` — far more granular tags than genres; good for related-game suggestions.

**Tier 3 — structure and studio pages**

- `collections` / `collection_memberships` / `collection_relations` — IGDB's real series structure (we only store the series *name* as text today), so we could link every game in a series.
- `companies` (+ `company_logos`, `company_websites`, `company_statuses`) — studio pages with logo, country, founding date and site, instead of just a name.
- `platforms` / `platform_logos` / `platform_families` — platform icons in place of text chips.
- `events` — industry showcases; only relevant if we ever cover announcements.

**Tier 4 — infrastructure, not content**

- `multiquery` — up to 10 queries in one request. Our bulk imports currently pace one game at a time with a delay; this cuts import time and rate-limit risk substantially.
- `webhooks` — IGDB pushes us a notification when a game we track changes, so refreshes happen automatically instead of an editor pressing refresh.
- `search` — one search across games, characters, companies and collections at once, instead of games only.
- `dumps` — full daily data dumps (partner access), only relevant at a much larger scale.

**Not relevant to us:** `reports`, `report_types`, `entity_types`, `image_types`, `game_versions` and version features, `platform_versions` and their sub-sets, `event_logos` / `event_networks`, `network_types`, `regions`, `company_sizes`, `company_type_histories`, `game_release_formats`, `game_statuses`, `game_localizations`.

## Suggested first slice, if you want work done

A focused batch that fixes the two deprecations and adds the four Tier 1 sets, because they each change something visible:

1. Fix popularity, age-rating labels and link labels to read IGDB's real tables.
2. Add store identifiers, so store links are verified rather than searched.
3. Add game type + alternative names to the import matcher, so future batches match more titles and never pick a DLC or wrong edition.
4. Add IGDB characters with portraits, joined to our curated LGBTQ+ character notes.

Then a second slice for trailers, artwork, per-region release dates and time-to-beat on the game page.

## Technical notes

- All IGDB access stays in `src/lib/igdb/igdb.server.ts` behind the existing `igdbRequest` helper, which already handles the Twitch token, retries and stable error codes; new endpoints are new functions there, not new HTTP plumbing.
- New game data means additive fields on the Sanity `game` document plus additions to `GAME_FIELDS` / `sourcePayload` / `SOURCE_FIELDS` in `src/lib/import/import.server.ts`, so a refresh keeps overwriting IGDB-owned fields while editor fields stay untouched.
- Characters need a decision the audit cannot make for us: IGDB characters are their own documents. Either store a compact copy on the game (simplest, matches the current `lgbtqCharacters` field) or create a Sanity `character` type with references (better for a future character browser).
- `multiquery` and `webhooks` both change how imports run rather than what they store, so they belong in their own stage after the data work.
- Anything read from IGDB stays server-side; the browser continues to talk only to this app's own origin.
