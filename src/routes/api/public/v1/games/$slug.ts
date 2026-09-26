import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import {
  checkRateLimit,
  errorResponse,
  jsonResponse,
  optionsResponse,
  toPublicGameDetail,
} from "@/lib/publicApi";
import { sanityPublicClient } from "@/lib/sanity/client";
import { gameBySlugQuery } from "@/lib/sanity/queries";
import type { GameDetail } from "@/lib/sanity/types";

const SlugSchema = z.string().regex(/^[a-z0-9-]{1,120}$/);

export const Route = createFileRoute("/api/public/v1/games/$slug")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      OPTIONS: () => optionsResponse(),
      GET: async ({ params, request }) => {
        const rate = checkRateLimit(request);
        if (rate.limited) return rate.limited;

        const slug = SlugSchema.safeParse(params.slug);
        if (!slug.success) return errorResponse(404, "not_found", "Game not found.", rate.headers);
        try {
          const game = await sanityPublicClient.fetch<GameDetail | null>(gameBySlugQuery, { slug: slug.data });
          const body = game ? toPublicGameDetail(game) : null;
          return body
            ? jsonResponse(body, 200, rate.headers)
            : errorResponse(404, "not_found", "Game not found.", rate.headers);
        } catch {
          return errorResponse(503, "service_unavailable", "Catalog temporarily unavailable.", rate.headers);
        }
      },
    },
  },
});
