# Queer Character Constellation

## Goal

Create a new public `/constellation` page where every documented LGBTQ+ character becomes a star in an explorable 8-bit sky. Visitors can pan, zoom, search, and reveal connections across franchises by shared identity, release era, and verified narrative trope.

The current published catalog contains **1,281 character entries across 342 games**, and every entry has identity text. Identity wording is free-form rather than a controlled taxonomy, and narrative tropes are not currently stored, so the data needs a careful normalization layer before those relationships can be drawn accurately.

## Experience

- Present the constellation as the primary, full-width experience rather than a dashboard of cards.
- Render all character entries as crisp pixel stars, grouped into a stable, repeatable layout so returning visitors see the same sky.
- Draw stepped, glowing pixel lines for the active relationship types:
  - **Identity** — characters sharing a normalized identity tag.
  - **Release era** — characters from games released in the same decade.
  - **Narrative trope** — characters sharing an editor-verified trope.
- Keep the default view legible by emphasizing local connections around the selected or hovered star. Optional toggles can reveal broader layers without drawing every possible line simultaneously.
- Add search by character or game, relationship toggles, a small legend, reset-view control, and zoom controls using the existing NES controls.
- Selecting a star opens a side panel while preserving the sky. It shows character name, identity, game title and cover, release year, matched relationships, source link, and a router link to the game page.
- On small screens, the side panel becomes a dismissible lower sheet and controls remain touch-friendly.
- Respect reduced-motion and high-contrast settings. Provide a keyboard-navigable character results/list view as the accessible equivalent to the visual canvas.

## Data and editorial integrity

1. Add controlled arrays to each curated character entry in Sanity:
   - `identityTags`
   - `narrativeTropes`
2. Define a compact shared vocabulary for identities and tropes. Keep the existing `identity` text unchanged as the human-readable/source-faithful wording.
3. Backfill identity tags with deterministic mappings for clear values such as lesbian, gay, bisexual, pansexual, non-binary, transgender, genderqueer, and queer. Flag ambiguous or malformed records for editorial review rather than guessing.
4. Add trope tags only where existing sourced material supports them. The first release may have trope links for a verified subset; unverified characters remain visible without trope links.
5. De-duplicate obvious repeated character entries within the same game while preserving genuinely recurring characters across sequels as separate stars connected to their respective games.
6. Extend the public character projection with game ID, title, slug, cover, release year, character identity/trope tags, source URL, and a matching portrait when the curated name safely matches that game’s IGDB cast.
7. Continue exposing only approved/featured games. Drafts, archived games, editor notes, import records, and member data never enter the constellation payload.

## Graph behavior and performance

- Use a proven force-layout engine for positioning and a Canvas renderer for the roughly 1,281 stars; keep the page server-renderable with a meaningful loading/fallback state.
- Calculate a deterministic initial layout from stable IDs, then settle the graph before display to avoid a chaotic first load.
- Avoid an unreadable all-to-all mesh: within each shared group, generate a deterministic sparse connection network that keeps every member connected without creating every possible pair.
- Use spatial indexing for pointer hit-testing and render only visible labels and active edges at each zoom level.
- Keep graph data in a dedicated, cacheable public server read and pre-render the route shell. Do not ship Sanity credentials or direct editorial access to the browser.
- Dynamically load the interactive graph so the rest of the site and its existing static pages do not inherit the graph engine’s cost.

## Site integration

- Add “Constellation” to the public navigation and footer.
- Add unique metadata, canonical URL, social metadata, breadcrumb structured data, and an accessible page description for `/constellation`.
- Include the route in static pre-rendering and the sitemap.
- Add a contextual link from each game’s LGBTQ+ character section that opens the constellation focused on that character/game.
- Preserve the existing NES design system: pixel typography, hard edges, token-based colors, crisp rendering, and no gradients or rounded modern graph styling.

## Technical structure

- Keep graph data shaping separate from rendering: Sanity query/types → normalization and sparse-edge builder → interactive canvas.
- Store controlled taxonomy values in a shared typed module used by both data validation and the filter legend.
- Implement the canvas as a client-only, dynamically loaded component; use TanStack Query for the public data read and TanStack Router search parameters for shareable focused views and filters.
- Record the graph/layout and taxonomy decisions in `AGENTS.md` during implementation.

## Verification

- Add tests for identity normalization, de-duplication, stable node IDs, decade grouping, sparse relationship edges, and exclusion of non-public games.
- Verify all 1,281 current entries can load without freezing, with usable pan/zoom/search and no label or panel overlap.
- Browser-check desktop and phone layouts, keyboard traversal, side-panel behavior, deep links, dark/light modes, high contrast, and reduced motion.
- Confirm a character can be followed from the constellation to its game page and back to a focused constellation view.
- Confirm source links and game covers resolve, malformed entries fail safely, and no private/editorial fields appear in the browser payload.
- Run the project checks and inspect the final build and runtime logs before publishing.

## Delivery boundary

This version is an exploratory public visualization, not a social network or character database editor. It does not add user-created links, comments, saved constellations, or inferred relationship claims. Narrative trope coverage expands only as sourced tags are reviewed.
