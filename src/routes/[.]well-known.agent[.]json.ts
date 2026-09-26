import { createFileRoute } from "@tanstack/react-router";

import { API_BASE_PATH, jsonResponse } from "@/lib/publicApi";
import { SITE_URL } from "@/lib/seo/structuredData";

export const Route = createFileRoute("/.well-known/agent.json")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      GET: () =>
        jsonResponse({
          name: "QueerCade",
          description:
            "A curated catalog of video games with LGBTQ+ characters and stories. Read-only search and lookup of games and collections.",
          url: SITE_URL,
          version: "1.0.0",
          documentationUrl: `${SITE_URL}/developers`,
          llmsTxt: `${SITE_URL}/llms.txt`,
          api: { type: "openapi", url: `${SITE_URL}/openapi.json`, baseUrl: `${SITE_URL}${API_BASE_PATH}` },
          authentication: { type: "none" },
          capabilities: ["search_games", "get_game", "list_collections", "get_collection"],
          provider: { organization: "MikeDemo", url: SITE_URL },
        }),
    },
  },
});
