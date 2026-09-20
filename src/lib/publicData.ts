import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

import {
  fetchCollection,
  fetchCollections,
  fetchContentPage,
  fetchDiscoverFacets,
  fetchFeaturedCollections,
  fetchFeaturedGames,
  fetchGame,
  fetchGameCollections,
  fetchLibraryGames,
  fetchRelatedGames,
  fetchSiteSettings,
  searchPublicGames,
} from "./publicContent.functions";
import { sanityImageUrl } from "./sanity/client";
import type { GameSummary, TaxonomyRef } from "./sanity/types";

/** Best available cover art: editor upload first, IGDB source URL as fallback. */
export function coverUrl(game: Pick<GameSummary, "cover" | "sourceCoverUrl">, width = 400): string | null {
  if (game.cover?.asset?._ref) return sanityImageUrl(game.cover, width, Math.round(width * 1.33));
  return game.sourceCoverUrl ?? null;
}

/**
 * Candidate widths for a cover so phones download phone-sized art. Only editor
 * uploads can be resized; IGDB source URLs are one fixed size, so they get no
 * srcset at all rather than a set of identical entries.
 */
export function coverSrcSet(
  game: Pick<GameSummary, "cover" | "sourceCoverUrl">,
  widths: number[] = [200, 320, 400, 640],
): string | undefined {
  if (!game.cover?.asset?._ref) return undefined;
  return widths
    .map((width) => `${sanityImageUrl(game.cover!, width, Math.round(width * 1.33))} ${width}w`)
    .join(", ");
}

export const siteSettingsQueryOptions = queryOptions({
  queryKey: ["siteSettings"],
  queryFn: () => fetchSiteSettings(),
  staleTime: 5 * 60 * 1000,
});

export const featuredGamesQueryOptions = queryOptions({
  queryKey: ["games", "featured"],
  queryFn: () => fetchFeaturedGames(),
  staleTime: 60 * 1000,
});

/** Games per page on the library screen. */
export const LIBRARY_PAGE_SIZE = 60;

export const libraryInfiniteQueryOptions = infiniteQueryOptions({
  queryKey: ["games", "library", "paged"],
  queryFn: ({ pageParam }) => fetchLibraryGames({ data: { offset: pageParam, limit: LIBRARY_PAGE_SIZE } }),
  initialPageParam: 0,
  getNextPageParam: (lastPage, allPages) =>
    lastPage.length < LIBRARY_PAGE_SIZE ? undefined : allPages.length * LIBRARY_PAGE_SIZE,
  staleTime: 60 * 1000,
});

export const featuredCollectionsQueryOptions = queryOptions({
  queryKey: ["collections", "featured"],
  queryFn: () => fetchFeaturedCollections(),
  staleTime: 60 * 1000,
});

export const collectionsQueryOptions = queryOptions({
  queryKey: ["collections", "all"],
  queryFn: () => fetchCollections(),
  staleTime: 60 * 1000,
});

export function collectionQueryOptions(slug: string) {
  return queryOptions({
    queryKey: ["collection", slug],
    queryFn: () => fetchCollection({ data: { slug } }),
    staleTime: 60 * 1000,
  });
}

export function gameQueryOptions(slug: string) {
  return queryOptions({
    queryKey: ["game", slug],
    queryFn: () => fetchGame({ data: { slug } }),
    staleTime: 60 * 1000,
  });
}

export function gameCollectionsQueryOptions(slug: string) {
  return queryOptions({
    queryKey: ["game", slug, "collections"],
    queryFn: () => fetchGameCollections({ data: { slug } }),
    staleTime: 60 * 1000,
  });
}

export function contentPageQueryOptions(slug: string) {
  return queryOptions({
    queryKey: ["contentPage", slug],
    queryFn: () => fetchContentPage({ data: { slug } }),
    staleTime: 5 * 60 * 1000,
  });
}

export function relatedGamesQueryOptions(id: string, genreIds: string[]) {
  return queryOptions({
    queryKey: ["games", "related", id, genreIds],
    queryFn: () => fetchRelatedGames({ data: { id, genreIds } }),
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
  queryFn: () => fetchDiscoverFacets(),
  staleTime: 10 * 60 * 1000,
});

export function discoverSearchQueryOptions(filters: DiscoverFilters) {
  return queryOptions({
    queryKey: ["discoverSearch", filters],
    queryFn: () => searchPublicGames({ data: filters }),
    staleTime: 60 * 1000,
  });
}
