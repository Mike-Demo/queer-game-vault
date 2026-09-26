import { createFileRoute } from "@tanstack/react-router";

import { API_VERSION, checkRateLimit, errorResponse, jsonResponse, optionsResponse } from "@/lib/publicApi";
import { sanityPublicClient } from "@/lib/sanity/client";
import { discoverFacetsQuery } from "@/lib/sanity/queries";

interface FacetRow {
  readonly name: string;
  readonly slug: string | null;
}

interface FacetsResult {
  readonly genres: FacetRow[];
  readonly platforms: FacetRow[];
  readonly themes: (string | null)[];
}

function cleanFacets(rows: FacetRow[]): { name: string; slug: string }[] {
  return rows
    .filter((row): row is { name: string; slug: string } => Boolean(row.slug))
    .map((row) => ({ name: row.name, slug: row.slug }));
}

export const Route = createFileRoute("/api/public/v1/facets")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      OPTIONS: () => optionsResponse(),
      GET: async ({ request }) => {
        const rate = checkRateLimit(request);
        if (rate.limited) return rate.limited;
        try {
          const facets = await sanityPublicClient.fetch<FacetsResult>(discoverFacetsQuery);
          const themes = (facets.themes ?? [])
            .filter((theme): theme is string => Boolean(theme))
            .sort((a, b) => a.localeCompare(b));
          return jsonResponse(
            {
              genres: cleanFacets(facets.genres ?? []),
              platforms: cleanFacets(facets.platforms ?? []),
              themes,
              version: API_VERSION,
            },
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
