import { createFileRoute } from "@tanstack/react-router";

import { buildLlmsTxt } from "@/lib/llmsTxt";
import { sanityPublicClient } from "@/lib/sanity/client";
import { llmsGamesQuery, publishedCollectionsQuery } from "@/lib/sanity/queries";
import type { CollectionSummary } from "@/lib/sanity/types";
import { SITE_URL } from "@/lib/seo/structuredData";

interface GameRow {
  readonly title: string;
  readonly slug: string;
  readonly releaseYear: number | null;
}

export const Route = createFileRoute("/llms-full.txt")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      GET: async () => {
        const [collections, games] = await Promise.all([
          sanityPublicClient.fetch<CollectionSummary[]>(publishedCollectionsQuery),
          sanityPublicClient.fetch<GameRow[]>(llmsGamesQuery),
        ]);
        const lines = [
          buildLlmsTxt().trimEnd(),
          "",
          "## Collections",
          "",
          ...collections
            .filter((collection) => collection.slug)
            .map(
              (collection) =>
                `- [${collection.title}](${SITE_URL}/collections/${collection.slug})${collection.description ? `: ${collection.description.replace(/\s+/g, " ")}` : ""}`,
            ),
          "",
          "## Games",
          "",
          ...games.map(
            (game) => `- [${game.title}](${SITE_URL}/games/${game.slug})${game.releaseYear ? ` (${game.releaseYear})` : ""}`,
          ),
          "",
        ];
        return new Response(lines.join("\n"), {
          headers: { "Content-Type": "text/markdown; charset=utf-8", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
