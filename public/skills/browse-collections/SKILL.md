# Browse QueerCade Collections

Browse QueerCade's editorial collections — curated lists of queer games by theme, mood, or genre, assembled by human editors.

## When to use

Use this skill when someone wants a themed list rather than a single search: "best queer horror games", "cozy games with LGBTQ+ characters", "queer visual novels to play this weekend".

## How to browse

### Via MCP

Connect to `https://queercade.mikedemo.dev/api/public/mcp` (Streamable HTTP, no auth).

1. Call `list_collections` to see every published collection with its description and game count.
2. Call `get_collection` with a `slug` for the collection's games in editorial order.

### Via REST

- `GET https://queercade.mikedemo.dev/api/public/v1/collections`
- `GET https://queercade.mikedemo.dev/api/public/v1/collections/{slug}`

No key needed. Rate limit: 120 requests per 60 seconds.

## On the web

Collections are also browsable at `https://queercade.mikedemo.dev/collections`, with each list at `https://queercade.mikedemo.dev/collections/{slug}`.
