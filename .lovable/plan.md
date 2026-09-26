# Silicon Friendly: fix the report findings

## What the report got right and wrong
- **Out of date:** it says meta tags and schema.org markup are missing. Every public page already has a description, share tags and schema.org markup, including VideoGame on game pages. Most likely the report scanned an old copy of the site. It also counted about 300 games in the sitemap, and the library now has 748. Nothing to build here. We re-check the live site at the end.
- **Right:** there is no llms.txt, no public API description, no docs and no agent card.

## Stage 1: llms.txt (reaches L2)
- Serve `/llms.txt`: a short markdown summary of QueerCade with links to the key pages (Discover, Library, Collections, About, Licenses), the sitemap and the new docs.
- Serve `/llms-full.txt`: the same summary plus every published collection and game (title and link), built from the live content.

## Stage 2: a read-only public API with docs (works toward L3)
- Read-only endpoints under `/api/public/v1/` that return only approved or featured content:
  - `games?q=&limit=&offset=` searches by title or character and pages through results
  - `games/{slug}` returns one game
  - `collections` and `collections/{slug}`
- Import and review stay editor-only and are left out of the API on purpose. Opening them up would let anyone write to your content.
- `/openapi.json` describes these endpoints.
- A new `/developers` docs page explains the API and links to the OpenAPI file. It gets added to the sitemap and the footer.
- `/.well-known/agent.json` gives the name, description, API link and docs link.

## Stage 3: check the results
- Run the type check and build, and call each new address.
- Confirm the live pages' tags and markup are still in place, then publish.

## Out of scope
- Autonomous agent actions and an MCP endpoint (L4–L5). Each would need its own security design.

## Technical details
- The new addresses are TanStack server routes that reuse the existing public queries and read client. Input is checked with zod, limits are capped (at most 48 results per request), and responses are cached.
- Only `/api/public/*` skips sign-in, and it has no write paths.
- The dotted file names use the existing `sitemap[.]xml.ts` naming pattern.
- Roll back by deleting the new route files. No data or schema changes.
