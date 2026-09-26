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

## Optional

- [Full catalog](${SITE_URL}/llms-full.txt): Every collection and game with links.
- [Sitemap](${SITE_URL}/sitemap.xml): All public pages.
- [Open source and credits](${SITE_URL}/licenses): Licenses and data sources.
`;
}
