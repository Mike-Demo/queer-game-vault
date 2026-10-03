# Search Queer Games

Search QueerCade's hand-curated catalog of video games with LGBTQ+ characters and stories. Every game is reviewed by an editor.

## When to use

Use this skill when someone asks for game recommendations involving queer characters, themes, or stories — e.g. "queer horror games", "games with trans protagonists", "cozy LGBTQ+ visual novels".

## How to search

### Via MCP (preferred for agents)

Connect to `https://queercade.mikedemo.dev/api/public/mcp` (Streamable HTTP, no auth).

1. Call `list_facets` first to learn the valid genre slugs, platform slugs, and theme names.
2. Call `search_games` with `query` (title or character name), plus optional `genre`, `platform`, `theme`, `year`, `limit`, `offset`.
3. Call `get_game` with a `slug` for full details: description, platforms, characters, ratings, store links.

### Via REST

- `GET https://queercade.mikedemo.dev/api/public/v1/games?q=&genre=&platform=&theme=&year=&limit=&offset=`
- `GET https://queercade.mikedemo.dev/api/public/v1/games/{slug}`

No key needed. Rate limit: 120 requests per 60 seconds.

## Citing results

Link game pages by canonical URL (`https://queercade.mikedemo.dev/games/{slug}`) and credit "QueerCade". Character information is editorially curated — cite the source noted on the game page for individual claims.
