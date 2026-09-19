# Speed and search-visibility tune-up

The public pages are already pre-built as static files, so this round is about making each page paint faster, shift less while loading, ship less JavaScript, and give search engines cleaner signals.

## Faster loading and painting

- **Pixel font**: it is fetched from Google's font service on every visit, and nothing renders text in the right face until it arrives. Self-host the one font file the design system already ships with, declare it locally with `font-display: swap`, preload it, and drop the two Google connections. One fewer third party, faster first text.
- **Cover images**: cards ask for a 400px-wide cover no matter the screen and give the browser no dimensions, so the layout jumps as images land. Add explicit width/height ratio boxes, request modern formats at a sensible quality, and serve a small set of widths so phones download phone-sized art.
- **Above-the-fold art**: the first row of covers on the home page, a collection page and the big cover on a game page currently load lazily, which delays the main image. Mark those eager with high fetch priority and lazy-load only what is further down.
- **Image host**: preconnect to the image service so the first cover does not wait on a fresh connection.
- **Less JavaScript on public pages**: the "track this game" control mounts on every card even for signed-out visitors and pulls in the accounts layer. Render a plain sign-in link for visitors and only load the interactive control once someone is signed in.
- **Caching headers**: static pages and the sitemap get explicit cache rules so repeat visits and the CDN serve instantly.

## Search visibility

- **Sitemap quality**: add last-modified dates (from each game's and collection's own update time) plus sensible priorities, so crawlers re-check changed pages instead of re-crawling everything.
- **Per-page social image**: pages without a picked image currently fall back to nothing. Home, Discover, Collections index, About and Licenses get a shared branded share image so links preview properly.
- **Image alt text and captions**: covers say "<title> cover art" already; screenshots and the logo get the same treatment where missing.
- **Headings and internal links**: confirm each public page has exactly one main heading in order, and that game pages link back to collections and related games (already true) while collection pages link onward to every game.
- **Crawl rules**: keep sign-in-only areas (library, settings, review, import, profiles) out of the sitemap and marked not-indexable, and let the crawl file point at both the sitemap and the disallowed private paths.
- **Re-run the site review** at the end and fix whatever it flags.

## Verification

Type check, production build (should still emit ~545 static pages), and a browser pass at desktop and phone widths checking: no console errors, text visible immediately, covers not jumping, and a Lighthouse-style measurement of the home page and a game page before/after so the gain is visible rather than claimed.

## Technical notes

- Self-hosted font: copy the Press Start 2P woff2 into `public/fonts/`, add `@font-face` in `src/styles.css` (project layer, not the vendored design-system file), preload it from `src/routes/__root.tsx`, remove the Google `preconnect`/stylesheet links.
- `coverUrl` in `src/lib/publicData.ts` gains width variants and `.format("webp").quality(75)`; `GameCard`/`EntryCard`/game page pass `width`/`height`/`sizes`/`srcSet`; `.cover` CSS uses an aspect-ratio box with existing tokens.
- `TrackControl` split: card renders a `Link to="/auth"` when `useSession()` has no session; the interactive body moves behind `React.lazy` so the signed-out static HTML ships without it.
- Cache headers via the Cloudflare worker response for static assets and `sitemap.xml` (`Cache-Control: public, max-age=…, s-maxage=…`).
- Sitemap: extend `sitemapGameSlugsQuery`/`sitemapCollectionSlugsQuery` to project `_updatedAt`, and `sitemapXML` to emit `<lastmod>`/`<priority>`.
- Default `og:image`/`twitter:image` constant in `src/lib/seo/structuredData.ts`, applied in the leaf `head()` of pages with no page-specific image (absolute https URL only).
- Measurements run with the already-installed Playwright/Chromium against the production build, not the dev server.
