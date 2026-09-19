import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { sanityPublicClient } from "./sanity/client";
import {
  approvedGamesQuery,
  collectionBySlugQuery,
  contentPageBySlugQuery,
  discoverFacetsQuery,
  featuredCollectionsQuery,
  featuredGamesQuery,
  gameBySlugQuery,
  publishedCollectionsQuery,
  relatedGamesQuery,
  searchGamesQuery,
  siteSettingsQuery,
} from "./sanity/queries";
import type {
  CollectionDetail,
  CollectionSummary,
  ContentPage,
  GameDetail,
  GameSummary,
  SiteSettings,
  TaxonomyRef,
} from "./sanity/types";

/**
 * Public, read-only content reads. These run on the server so the visitor's
 * browser only ever talks to this app's own origin.
 */

export interface PublicDiscoverFacets {
  genres: TaxonomyRef[];
  platforms: TaxonomyRef[];
  themes: (string | null)[] | null;
}

const slugInput = z.object({ slug: z.string().min(1).max(200) });

export const fetchSiteSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<SiteSettings | null> => sanityPublicClient.fetch<SiteSettings | null>(siteSettingsQuery),
);

export const fetchFeaturedGames = createServerFn({ method: "GET" }).handler(
  async (): Promise<GameSummary[]> => sanityPublicClient.fetch<GameSummary[]>(featuredGamesQuery, { limit: 6 }),
);

export const fetchLibraryGames = createServerFn({ method: "GET" }).handler(
  async (): Promise<GameSummary[]> =>
    sanityPublicClient.fetch<GameSummary[]>(approvedGamesQuery, { offset: 0, end: 60 }),
);

export const fetchFeaturedCollections = createServerFn({ method: "GET" }).handler(
  async (): Promise<CollectionSummary[]> =>
    sanityPublicClient.fetch<CollectionSummary[]>(featuredCollectionsQuery, { limit: 4 }),
);

export const fetchCollections = createServerFn({ method: "GET" }).handler(
  async (): Promise<CollectionSummary[]> =>
    sanityPublicClient.fetch<CollectionSummary[]>(publishedCollectionsQuery),
);

export const fetchCollection = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => slugInput.parse(data))
  .handler(async ({ data }): Promise<CollectionDetail | null> =>
    sanityPublicClient.fetch<CollectionDetail | null>(collectionBySlugQuery, { slug: data.slug }),
  );

export const fetchGame = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => slugInput.parse(data))
  .handler(async ({ data }): Promise<GameDetail | null> =>
    sanityPublicClient.fetch<GameDetail | null>(gameBySlugQuery, { slug: data.slug }),
  );

export const fetchContentPage = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => slugInput.parse(data))
  .handler(async ({ data }): Promise<ContentPage | null> =>
    sanityPublicClient.fetch<ContentPage | null>(contentPageBySlugQuery, { slug: data.slug }),
  );

export const fetchRelatedGames = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().min(1).max(200), genreIds: z.array(z.string().max(200)).max(20) }).parse(data),
  )
  .handler(async ({ data }): Promise<GameSummary[]> => {
    if (data.genreIds.length === 0) return [];
    return sanityPublicClient.fetch<GameSummary[]>(relatedGamesQuery, {
      id: data.id,
      genreIds: data.genreIds,
      limit: 3,
    });
  });

export const fetchDiscoverFacets = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicDiscoverFacets> => sanityPublicClient.fetch<PublicDiscoverFacets>(discoverFacetsQuery),
);

export const searchPublicGames = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z
      .object({
        term: z.string().max(120),
        genre: z.string().max(200),
        platform: z.string().max(200),
        theme: z.string().max(200),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<GameSummary[]> => {
    const term = data.term.trim();
    return sanityPublicClient.fetch<GameSummary[]>(searchGamesQuery, {
      term: term.length > 0 ? `${term}*` : "",
      genre: data.genre,
      platform: data.platform,
      theme: data.theme,
      limit: 48,
    });
  });
