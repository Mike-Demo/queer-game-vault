import { API_BASE_PATH, API_MAX_LIMIT, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_SECONDS } from "./publicApi";
import { SITE_URL } from "./seo/structuredData";

export function buildLlmsTxt(): string {
  return `# QueerCade

> A hand-curated catalog of video games with LGBTQ+ characters and stories, with game details from IGDB and curated lists written by people.

Every listed game has been reviewed by an editor. Game pages include release details, platforms, developers, store links and, where known, the LGBTQ+ characters in the game with a source for each.

## Pages

- [Home](${SITE_URL}/): Featured games and collections.
- [Discover](${SITE_URL}/discover): Search by game title or LGBTQ+ character name, and filter by genre, platform or theme.
- [Library](${SITE_URL}/library): Every approved game, A to Z.
- [Collections](${SITE_URL}/collections): Curated lists such as queer visual novels and cozy queer games.
- [Example game](${SITE_URL}/games/sayonara-wild-hearts): A typical game page.
- [About](${SITE_URL}/about): What QueerCade is and how games are chosen.

## Docs

- [Developers](${SITE_URL}/developers): How to use the free, read-only public API.
- [OpenAPI description](${SITE_URL}/openapi.json): Machine-readable API description.
- [Agent card](${SITE_URL}/.well-known/agent.json): Summary for AI agents.
- [MCP server](${SITE_URL}/api/public/mcp): Read-only Model Context Protocol endpoint (JSON-RPC 2.0 over HTTP POST).

## API

Base URL: ${SITE_URL}${API_BASE_PATH} — no key or sign-in needed, GET only, all origins allowed.

- \`GET /games?q=&genre=&platform=&theme=&year=&limit=&offset=\`: Search by title or LGBTQ+ character name. Returns \`{ games, total, limit, offset, nextOffset }\`.
- \`GET /games/{slug}\`: Full public details for one game.
- \`GET /collections\`: Every published collection.
- \`GET /collections/{slug}\`: One collection with its games in editorial order.
- \`GET /facets\`: The genre slugs, platform slugs and theme names the filters accept.

Paging: maximum ${API_MAX_LIMIT} items per request; follow \`nextOffset\` until it is null.
Rate limit: about ${RATE_LIMIT_MAX} requests per ${RATE_LIMIT_WINDOW_SECONDS} seconds; a 429 response includes \`Retry-After\`.
Caching: successful responses may be cached for 5 minutes. Please cache rather than re-poll.
Errors: every failure returns \`{ error: { code, message, status } }\` with a stable code (\`invalid_request\`, \`not_found\`, \`rate_limited\`, \`service_unavailable\`).
Scope: only editor-approved, publicly visible content is returned. There are no write endpoints and no member data.

## Optional

- [Full catalog](${SITE_URL}/llms-full.txt): Every collection and game with links.
- [Sitemap](${SITE_URL}/sitemap.xml): All public pages.
- [Open source and credits](${SITE_URL}/licenses): Licenses and data sources.
`;
}
