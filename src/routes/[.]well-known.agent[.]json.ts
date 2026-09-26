import { createFileRoute } from "@tanstack/react-router";

import {
  API_BASE_PATH,
  API_MAX_LIMIT,
  API_VERSION,
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_SECONDS,
  jsonResponse,
} from "@/lib/publicApi";
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
          version: API_VERSION,
          documentationUrl: `${SITE_URL}/developers`,
          llmsTxt: `${SITE_URL}/llms.txt`,
          api: {
            type: "openapi",
            url: `${SITE_URL}/openapi.json`,
            baseUrl: `${SITE_URL}${API_BASE_PATH}`,
            readOnly: true,
            maxPageSize: API_MAX_LIMIT,
          },
          mcp: {
            type: "http",
            url: `${SITE_URL}/api/public/mcp`,
            protocolVersion: "2025-06-18",
            tools: ["search_games", "get_game", "list_collections", "get_collection", "list_facets"],
          },
          authentication: { type: "none" },
          rateLimit: {
            requests: RATE_LIMIT_MAX,
            windowSeconds: RATE_LIMIT_WINDOW_SECONDS,
            retryAfterHeader: true,
            note: "Best effort per server instance. Cache responses instead of re-polling.",
          },
          errors: {
            shape: "{ error: { code, message, status } }",
            codes: ["invalid_request", "not_found", "rate_limited", "service_unavailable"],
          },
          capabilities: ["search_games", "get_game", "list_collections", "get_collection", "list_facets"],
          provider: { organization: "MikeDemo", url: SITE_URL },
        }),
    },
  },
});
