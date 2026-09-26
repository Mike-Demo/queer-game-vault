import { createFileRoute } from "@tanstack/react-router";

import { errorResponse, jsonResponse, optionsResponse, toPublicCollection } from "@/lib/publicApi";
import { sanityPublicClient } from "@/lib/sanity/client";
import { publishedCollectionsQuery } from "@/lib/sanity/queries";
import type { CollectionSummary } from "@/lib/sanity/types";

export const Route = createFileRoute("/api/public/v1/collections/")({
  server: {
    handlers: {
      OPTIONS: () => optionsResponse(),
      GET: async () => {
        try {
          const rows = await sanityPublicClient.fetch<CollectionSummary[]>(publishedCollectionsQuery);
          const collections = rows.map(toPublicCollection).filter((row) => row !== null);
          return jsonResponse({ collections });
        } catch {
          return errorResponse(503, "Catalog temporarily unavailable.");
        }
      },
    },
  },
});
