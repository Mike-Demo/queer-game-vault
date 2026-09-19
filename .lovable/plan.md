# Site footer + open-source credits page

## Goal

Give QueerCade the same pixel footer used on your other sites (from AI Project
Showcase), and add a public "Open Source & Credits" page at /licenses.

## Changes

1. **Footer** (`src/components/AppShell.tsx`, new `src/components/SiteFooter.tsx`,
   `src/styles.css`)
   - Port `PixelSiteFooter` from AI Project Showcase, adapted to QueerCade:
     - "Made by MikeDemo" + copyright year (resolved after hydration, so
       prerendered pages never mismatch)
     - "Open Source" link to `/licenses` with the NES coin icon
     - Social links: LinkedIn, X, tweet.app, Threads (same URLs as your other
       sites), each with its NES pixel icon and an accessible label
   - Keep the existing editor-controlled footer line (siteSettings
     `footerContent`, or the "game data from IGDB" default) above the new row —
     it stays editable from Studio.
   - Footer styles use QueerCade's own tokens (`--app-space-*`, existing
     `.app-footer` colours); layout classes ported from the showcase footer,
     re-tokenised. NES pixel borders and icons come from the design system as
     before.
   - The footer is part of the app shell, so it appears on every page.

2. **Credits page** (`src/routes/licenses.tsx` → `/licenses`)
   - Grouped credits using the existing `NesContainer` cards, written for
     QueerCade's real stack — no invented entries:
     - **Typeface**: Press Start 2P (CodeMan38, SIL OFL 1.1)
     - **Design system**: NES.css (MIT)
     - **Framework & tooling**: React, TanStack Start/Router, TanStack Query,
       Vite, TypeScript, Zod, Tailwind CSS, Cloudflare Vite plugin
     - **Platform**: Sanity (content store), Supabase (accounts & tracking)
     - **Game data & artwork**: IGDB (game metadata, covers, screenshots),
       Gayming Magazine (source articles), cover art rights remain with their
       owners
     - **Site artwork**: QueerCade logo/favicon created for this site
   - Each card: name, author, license, short note, "License source" link.
   - `head()` with title "Open Source & Credits — QueerCade", description,
     canonical `https://queercade.mikedemo.dev/licenses`, and breadcrumb
     JSON-LD via the existing `src/lib/seo/structuredData.ts` helpers.
   - Add `/licenses` to `STATIC_PUBLIC_PATHS` in `src/lib/prerender/pages.ts`
     so it's prerendered and lands in `sitemap.xml`.

3. **Navigation**: the only new public link is the footer's "Open Source" one;
   the main nav is unchanged.

## Verification

- `bunx tsgo --noEmit` passes; build passes and `/licenses` appears in the
  prerendered page list and sitemap.
- Browser check signed out: footer renders on home and a game page (year,
  Open Source link, four social links), `/licenses` renders with all groups,
  links open in new tabs, no page errors, works in dark mode and at mobile
  width.
- Publish so the footer and page reach the live site.
