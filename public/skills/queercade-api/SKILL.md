# QueerCade API

Use QueerCade's free, read-only public API to query the curated catalog of LGBTQ+ video games programmatically.

## When to use

Use this skill when building an integration, script, or dataset over QueerCade's catalog — searching games, resolving slugs, listing collections, or discovering filter values.

## Endpoints

Base: `https://queercade.mikedemo.dev/api/public/v1`. No key, no sign-in, GET only, all origins allowed.

- `GET /games?q=&genre=&platform=&theme=&year=&limit=&offset=` — search; returns `{ games, total, limit, offset, nextOffset }`
- `GET /games/{slug}` — full public details for one game
- `GET /collections` — every published collection
- `GET /collections/{slug}` — one collection with games in editorial order
- `GET /facets` — genre slugs, platform slugs, theme names the filters accept

Machine-readable spec: `https://queercade.mikedemo.dev/openapi.json`

## Rules

- Paging: max 48 items per request (default 24); follow `nextOffset` until null.
- Rate limit: 120 requests per 60 seconds; a 429 includes `Retry-After`. Cache instead of re-polling.
- Errors: `{ error: { code, message, status } }` with stable codes (`invalid_request`, `not_found`, `rate_limited`, `service_unavailable`).
- Versioning: the current version is v1. Breaking changes ship as a new versioned path; v1 keeps working.

## MCP alternative

The same catalog is exposed as MCP tools at `https://queercade.mikedemo.dev/api/public/mcp`: `search_games`, `get_game`, `list_collections`, `get_collection`, `list_facets`.
