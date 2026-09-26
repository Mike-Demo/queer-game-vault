import { createFileRoute } from "@tanstack/react-router";

import {
  API_VERSION,
  checkRateLimit,
  errorResponse,
  jsonResponse,
  optionsResponse,
  toPublicCollection,
} from "@/lib/publicApi";
import { sanityPublicClient } from "@/lib/sanity/client";
import { publishedCollectionsQuery } from "@/lib/sanity/queries";
import type { CollectionSummary } from "@/lib/sanity/types";

export const Route = createFileRoute("/api/public/v1/collections/")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      OPTIONS: () => optionsResponse(),
      GET: async ({ request }) => {
        const rate = checkRateLimit(request);
        if (rate.limited) return rate.limited;
        try {
          const rows = await sanityPublicClient.fetch<CollectionSummary[]>(publishedCollectionsQuery);
          const collections = rows.map(toPublicCollection).filter((row) => row !== null);
          return jsonResponse(
            { collections, total: collections.length, version: API_VERSION },
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
