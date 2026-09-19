# Fix broken page links, then make pages load instantly

## What's wrong

Confirmed by loading the live site in a browser: the first page a visitor lands on is
built by your server and looks fine, but as soon as they click a link, the page tries to
fetch its content **from the visitor's own browser** straight to the content service —
and the content service refuses requests coming from `queercade.mikedemo.dev`. Every
request fails, so the page shows "This collection could not be loaded" / "Something went
wrong". This affects collection pages, game pages, library and discover equally.

## The fix

1. **Allow your web addresses in the content service** — the live address, the
   `.lovable.app` address, the editor preview address, and local development. This alone
   makes the links work again.
2. **Stop the browser fetching content directly at all** — move every public content read
   to your own server, so the browser only ever talks to `queercade.mikedemo.dev`. This
   removes the whole class of failure (it also survives ad-blockers, VPNs and corporate
   networks, which can block third-party requests) and lets pages be cached.

## Faster loading: static pages

With reads on the server, pages can be produced once at build time and served as plain
files:

- Home, Library, Collections, Discover, About, and each of the 4 collection pages.
- All game pages, saved as static pages (your choice) — roughly 540 files in total, well
  inside the publishing limits.

Trade-off to be aware of: a static game page changes only when you publish again. So
after importing games or editing text in the studio, the public site catches up on your
next publish. Signed-in areas (My library, Settings, Review, Import) stay dynamic and are
never made static.

## Technical notes

- Reproduction: browser console on the live collection page shows repeated
  `Access to fetch at 'https://tzh8tziu.apicdn.sanity.io/...' ... net::ERR_FAILED` —
  a CORS rejection; server-rendered HTML is correct, client re-fetch fails after hydration.
- Step 1: add CORS origins via the Sanity MCP `add_cors_origin` (no credentials,
  `allowCredentials: false`) for `https://queercade.mikedemo.dev`,
  `https://queer-game-vault.lovable.app`, the preview host, and `http://localhost:8080`.
- Step 2: introduce `src/lib/publicContent.functions.ts` — `createServerFn` wrappers
  (no auth middleware, read-only) around the existing GROQ queries in
  `src/lib/sanity/queries.ts`. `src/lib/publicData.ts` query options keep their keys and
  types but call the server functions instead of `sanityPublicClient` in the browser.
  Sanity image URLs (`cdn.sanity.io`) stay direct — images are not CORS-restricted.
- Step 3: prerender in `vite.config.ts` via
  `tanstackStart({ pages: [...], prerender: { enabled: true, autoStaticPathsDiscovery: false } })`.
  The page list is generated from Sanity at config time (game and collection slugs), with
  a hard cap constant as a safety valve. `sitemap.xml`, `/auth`, and everything under
  `_authenticated` are excluded. Watch for the known "prerender writes every file then the
  build never exits" case: install the unref'd TanStack Query timeout provider guarded by
  `TSS_PRERENDERING`.
- Verification after each step: type check, build, and a browser pass over the live-style
  routes checking for zero console errors and real content after client-side navigation
  (the exact thing that is broken today).
