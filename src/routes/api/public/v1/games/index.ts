import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { API_MAX_LIMIT, errorResponse, jsonResponse, optionsResponse, toPublicGame } from "@/lib/publicApi";
import { sanityPublicClient } from "@/lib/sanity/client";
import { publicApiGamesQuery } from "@/lib/sanity/queries";
import type { GameSummary } from "@/lib/sanity/types";

const QuerySchema = z.object({
  q: z.string().trim().max(100).default(""),
  limit: z.coerce.number().int().min(1).max(API_MAX_LIMIT).default(24),
  offset: z.coerce.number().int().min(0).max(10000).default(0),
});

export const Route = createFileRoute("/api/public/v1/games/")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      OPTIONS: () => optionsResponse(),
      GET: async ({ request }) => {
        const params = Object.fromEntries(new URL(request.url).searchParams);
        const parsed = QuerySchema.safeParse(params);
        if (!parsed.success) return errorResponse(400, "Invalid query parameters.");
        const { q, limit, offset } = parsed.data;
        const term = q.replace(/[*"\\]/g, "");
        try {
          const rows = await sanityPublicClient.fetch<GameSummary[]>(publicApiGamesQuery, {
            term: term.length > 0 ? `${term}*` : "",
            offset,
            end: offset + limit,
          });
          const games = rows.map(toPublicGame).filter((game) => game !== null);
          return jsonResponse({ games, limit, offset });
        } catch {
          return errorResponse(503, "Catalog temporarily unavailable.");
        }
      },
    },
  },
});
