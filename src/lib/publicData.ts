import { queryOptions } from "@tanstack/react-query";

import { sanityImageUrl, sanityPublicClient } from "./sanity/client";
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

/** Best available cover art: editor upload first, IGDB source URL as fallback. */
export function coverUrl(game: Pick<GameSummary, "cover" | "sourceCoverUrl">, width = 400): string | null {
  if (game.cover?.asset?._ref) return sanityImageUrl(game.cover, width, Math.round(width * 1.33));
  return game.sourceCoverUrl ?? null;
}

export const siteSettingsQueryOptions = queryOptions({
  queryKey: ["siteSettings"],
  queryFn: () => sanityPublicClient.fetch<SiteSettings | null>(siteSettingsQuery),
  staleTime: 5 * 60 * 1000,
});

export const featuredGamesQueryOptions = queryOptions({
  queryKey: ["games", "featured"],
  queryFn: () => sanityPublicClient.fetch<GameSummary[]>(featuredGamesQuery, { limit: 6 }),
  staleTime: 60 * 1000,
});

export const libraryQueryOptions = queryOptions({
  queryKey: ["games", "library"],
  queryFn: () => sanityPublicClient.fetch<GameSummary[]>(approvedGamesQuery, { offset: 0, end: 60 }),
  staleTime: 60 * 1000,
});

export const featuredCollectionsQueryOptions = queryOptions({
  queryKey: ["collections", "featured"],
  queryFn: () => sanityPublicClient.fetch<CollectionSummary[]>(featuredCollectionsQuery, { limit: 4 }),
  staleTime: 60 * 1000,
});

export const collectionsQueryOptions = queryOptions({
  queryKey: ["collections", "all"],
  queryFn: () => sanityPublicClient.fetch<CollectionSummary[]>(publishedCollectionsQuery),
  staleTime: 60 * 1000,
});

export function collectionQueryOptions(slug: string) {
  return queryOptions({
    queryKey: ["collection", slug],
    queryFn: () => sanityPublicClient.fetch<CollectionDetail | null>(collectionBySlugQuery, { slug }),
    staleTime: 60 * 1000,
  });
}

export function gameQueryOptions(slug: string) {
  return queryOptions({
    queryKey: ["game", slug],
    queryFn: () => sanityPublicClient.fetch<GameDetail | null>(gameBySlugQuery, { slug }),
    staleTime: 60 * 1000,
  });
}

export function contentPageQueryOptions(slug: string) {
  return queryOptions({
    queryKey: ["contentPage", slug],
    queryFn: () => sanityPublicClient.fetch<ContentPage | null>(contentPageBySlugQuery, { slug }),
    staleTime: 5 * 60 * 1000,
  });
}

export function relatedGamesQueryOptions(id: string, genreIds: string[]) {
  return queryOptions({
    queryKey: ["games", "related", id, genreIds],
    queryFn: () =>
      genreIds.length === 0
        ? Promise.resolve([])
        : sanityPublicClient.fetch<GameSummary[]>(relatedGamesQuery, { id, genreIds, limit: 3 }),
    staleTime: 5 * 60 * 1000,
  });
}

export interface DiscoverFilters {
  term: string;
  genre: string;
  platform: string;
  theme: string;
}

export interface DiscoverFacets {
  genres: TaxonomyRef[];
  platforms: TaxonomyRef[];
  themes: (string | null)[] | null;
}

export const discoverFacetsQueryOptions = queryOptions({
  queryKey: ["discoverFacets"],
  queryFn: () => sanityPublicClient.fetch<DiscoverFacets>(discoverFacetsQuery),
  staleTime: 10 * 60 * 1000,
});

export function discoverSearchQueryOptions(filters: DiscoverFilters) {
  const term = filters.term.trim();
  return queryOptions({
    queryKey: ["discoverSearch", filters],
    queryFn: () =>
      sanityPublicClient.fetch<GameSummary[]>(searchGamesQuery, {
        term: term.length > 0 ? `${term}*` : "",
        genre: filters.genre,
        platform: filters.platform,
        theme: filters.theme,
        limit: 48,
      }),
    staleTime: 60 * 1000,
  });
}
