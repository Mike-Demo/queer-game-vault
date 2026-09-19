import { createFileRoute } from "@tanstack/react-router";
import { getRouterInstance } from "@tanstack/react-start";

import { sanityPublicClient } from "@/lib/sanity/client";
import { sitemapCollectionSlugsQuery, sitemapGameSlugsQuery } from "@/lib/sanity/queries";
import {
  isSitemapRouteIncluded,
  sitemapPathForLocation,
  sitemapStaticPaths,
  sitemapXML,
  type SitemapEntry,
} from "@/lib/sitemap";

const BASE_URL = "https://queercade.mikedemo.dev";

const PAGE_SIZE = 200;

type SlugRow = { slug: string | null };

async function collectSlugPaths(
  router: Awaited<ReturnType<typeof getRouterInstance>>,
  routeId: "/games/$slug" | "/collections/$slug",
  query: string,
): Promise<SitemapEntry[]> {
  const entries: SitemapEntry[] = [];
  if (!isSitemapRouteIncluded(router.routesById[routeId])) return entries;

  for (let start = 0; ; ) {
    const rows = await sanityPublicClient.fetch<SlugRow[]>(query, { start, end: start + PAGE_SIZE });
    if (rows.length === 0) break;
    for (const row of rows) {
      if (!row.slug) continue;
      const location = router.buildLocation({
        to: routeId,
        params: { slug: row.slug },
        search: () => ({}),
        hash: "",
      });
      const path = sitemapPathForLocation(router, location, routeId);
      if (path) entries.push({ path });
    }
    start += rows.length;
  }
  return entries;
}

export const Route = createFileRoute("/sitemap.xml")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      GET: async () => {
        const router = await getRouterInstance();
        const entries: SitemapEntry[] = sitemapStaticPaths(router).map((path) => ({ path }));
        entries.push(...(await collectSlugPaths(router, "/games/$slug", sitemapGameSlugsQuery)));
        entries.push(...(await collectSlugPaths(router, "/collections/$slug", sitemapCollectionSlugsQuery)));

        if (entries.length === 0) {
          return new Response(
            'No pages are included in this sitemap. Check route decisions and ancestor exclusions. Setting "exclude-subtree" on the root excludes the entire site.',
            { status: 404, headers: { "Cache-Control": "no-store" } },
          );
        }
        return new Response(sitemapXML(BASE_URL, entries), {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
