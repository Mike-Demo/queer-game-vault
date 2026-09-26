import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import {
  API_DEFAULT_LIMIT,
  API_MAX_LIMIT,
  API_MAX_OFFSET,
  API_VERSION,
  checkRateLimit,
  errorResponse,
  jsonResponse,
  optionsResponse,
  toPublicGame,
} from "@/lib/publicApi";
import { sanityPublicClient } from "@/lib/sanity/client";
import { publicApiGamesQuery } from "@/lib/sanity/queries";
import type { GameSummary } from "@/lib/sanity/types";

const slugFilter = z
  .string()
  .trim()
  .max(60)
  .regex(/^[a-z0-9-]*$/)
  .default("");

const QuerySchema = z.object({
  q: z.string().trim().max(100).default(""),
  genre: slugFilter,
  platform: slugFilter,
  theme: z.string().trim().max(60).default(""),
  year: z.coerce.number().int().min(1970).max(2100).optional(),
  limit: z.coerce.number().int().min(1).max(API_MAX_LIMIT).default(API_DEFAULT_LIMIT),
  offset: z.coerce.number().int().min(0).max(API_MAX_OFFSET).default(0),
});

interface GamesResult {
  readonly total: number;
  readonly games: GameSummary[];
}

export const Route = createFileRoute("/api/public/v1/games/")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      OPTIONS: () => optionsResponse(),
      GET: async ({ request }) => {
        const rate = checkRateLimit(request);
        if (rate.limited) return rate.limited;

        const params = Object.fromEntries(new URL(request.url).searchParams);
        const parsed = QuerySchema.safeParse(params);
        if (!parsed.success) {
          return errorResponse(
            400,
            "invalid_request",
            "Invalid query parameters. See /openapi.json for accepted values.",
            rate.headers,
          );
        }
        const { q, genre, platform, theme, year, limit, offset } = parsed.data;
        const term = q.replace(/[*"\\]/g, "");
        try {
          const result = await sanityPublicClient.fetch<GamesResult>(publicApiGamesQuery, {
            term: term.length > 0 ? `${term}*` : "",
            genre,
            platform,
            theme,
            year: year ?? 0,
            offset,
            end: offset + limit,
          });
          const games = result.games.map(toPublicGame).filter((game) => game !== null);
          const nextOffset = offset + limit < result.total ? offset + limit : null;
          return jsonResponse(
            { games, total: result.total, limit, offset, nextOffset, version: API_VERSION },
            200,
            rate.headers,
          );
        } catch {
          return errorResponse(503, "service_unavailable", "Catalog temporarily unavailable.", rate.headers);
        }
      },
    },
  },
});
