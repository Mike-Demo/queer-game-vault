import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { errorResponse, jsonResponse, optionsResponse, toPublicCollection, toPublicGame } from "@/lib/publicApi";
import { sanityPublicClient } from "@/lib/sanity/client";
import { collectionBySlugQuery } from "@/lib/sanity/queries";
import type { CollectionDetail } from "@/lib/sanity/types";

const SlugSchema = z.string().regex(/^[a-z0-9-]{1,120}$/);

export const Route = createFileRoute("/api/public/v1/collections/$slug")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      OPTIONS: () => optionsResponse(),
      GET: async ({ params }) => {
        const slug = SlugSchema.safeParse(params.slug);
        if (!slug.success) return errorResponse(404, "Collection not found.");
        try {
          const collection = await sanityPublicClient.fetch<CollectionDetail | null>(collectionBySlugQuery, {
            slug: slug.data,
          });
          const summary = collection ? toPublicCollection(collection) : null;
          if (!collection || !summary) return errorResponse(404, "Collection not found.");
          const games = collection.games.map(toPublicGame).filter((game) => game !== null);
          return jsonResponse({ ...summary, games });
        } catch {
          return errorResponse(503, "Catalog temporarily unavailable.");
        }
      },
    },
  },
});
