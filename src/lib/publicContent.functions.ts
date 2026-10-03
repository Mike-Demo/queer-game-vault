import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { sanityPublicClient } from "./sanity/client";
import {
  approvedGamesQuery,
  collectionBySlugQuery,
  constellationGamesQuery,
  contentPageBySlugQuery,
  discoverFacetsQuery,
  featuredCollectionsQuery,
  featuredGamesQuery,
  gameBySlugQuery,
  gameCollectionsBySlugQuery,
  publishedCollectionsQuery,
  relatedGamesQuery,
  searchGamesQuery,
  siteSettingsQuery,
} from "./sanity/queries";
import type { ConstellationCharacterRecord } from "./constellation-model";
import type {
  CollectionDetail,
  CollectionRef,
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

interface ConstellationGameResult {
  gameId: string;
  gameTitle: string;
  gameSlug: string;
  coverUrl: string | null;
  releaseYear: number | null;
  characters: Array<{
    name: string | null;
    identity: string | null;
    identityTags: string[] | null;
    narrativeTropes: string[] | null;
    sourceUrl: string | null;
  }>;
  cast: Array<{ name: string | null; mugshotUrl: string | null }>;
}

const slugInput = z.object({ slug: z.string().min(1).max(200) });

/**
 * Public pages must never 500 because the content service hiccuped. Log the
 * failure server-side and return a fallback so the page renders its empty or
 * "content unavailable" state instead of an error page.
 */
async function safeFetch<T>(label: string, fallback: T, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    console.error(`[publicContent] ${label} failed:`, error);
    return fallback;
  }
}

export const fetchSiteSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<SiteSettings | null> =>
    safeFetch("siteSettings", null, () => sanityPublicClient.fetch<SiteSettings | null>(siteSettingsQuery)),
);

export const fetchFeaturedGames = createServerFn({ method: "GET" }).handler(
  async (): Promise<GameSummary[]> =>
    safeFetch("featuredGames", [], () => sanityPublicClient.fetch<GameSummary[]>(featuredGamesQuery, { limit: 6 })),
);

export const fetchLibraryGames = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z
      .object({ offset: z.number().int().min(0).max(10000), limit: z.number().int().min(1).max(120) })
      .parse(data ?? { offset: 0, limit: 60 }),
  )
  .handler(async ({ data }): Promise<GameSummary[]> =>
    safeFetch("libraryGames", [], () =>
      sanityPublicClient.fetch<GameSummary[]>(approvedGamesQuery, {
        offset: data.offset,
        end: data.offset + data.limit,
      }),
    ),
  );

export const fetchFeaturedCollections = createServerFn({ method: "GET" }).handler(
  async (): Promise<CollectionSummary[]> =>
    safeFetch("featuredCollections", [], () =>
      sanityPublicClient.fetch<CollectionSummary[]>(featuredCollectionsQuery, { limit: 4 }),
    ),
);

export const fetchCollections = createServerFn({ method: "GET" }).handler(
  async (): Promise<CollectionSummary[]> =>
    safeFetch("collections", [], () => sanityPublicClient.fetch<CollectionSummary[]>(publishedCollectionsQuery)),
);

export const fetchCollection = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => slugInput.parse(data))
  .handler(async ({ data }): Promise<CollectionDetail | null> =>
    safeFetch("collection", null, () =>
      sanityPublicClient.fetch<CollectionDetail | null>(collectionBySlugQuery, { slug: data.slug }),
    ),
  );

export const fetchGame = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => slugInput.parse(data))
  .handler(async ({ data }): Promise<GameDetail | null> =>
    safeFetch("game", null, () =>
      sanityPublicClient.fetch<GameDetail | null>(gameBySlugQuery, { slug: data.slug }),
    ),
  );

export const fetchGameCollections = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => slugInput.parse(data))
  .handler(async ({ data }): Promise<CollectionRef[]> =>
    safeFetch("gameCollections", [], () =>
      sanityPublicClient.fetch<CollectionRef[]>(gameCollectionsBySlugQuery, { slug: data.slug }),
    ),
  );

export const fetchContentPage = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => slugInput.parse(data))
  .handler(async ({ data }): Promise<ContentPage | null> =>
    safeFetch("contentPage", null, () =>
      sanityPublicClient.fetch<ContentPage | null>(contentPageBySlugQuery, { slug: data.slug }),
    ),
  );

export const fetchRelatedGames = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().min(1).max(200), genreIds: z.array(z.string().max(200)).max(20) }).parse(data),
  )
  .handler(async ({ data }): Promise<GameSummary[]> => {
    if (data.genreIds.length === 0) return [];
    return safeFetch("relatedGames", [], () =>
      sanityPublicClient.fetch<GameSummary[]>(relatedGamesQuery, {
        id: data.id,
        genreIds: data.genreIds,
        limit: 3,
      }),
    );
  });

export const fetchDiscoverFacets = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicDiscoverFacets> =>
    safeFetch("discoverFacets", { genres: [], platforms: [], themes: [] }, () =>
      sanityPublicClient.fetch<PublicDiscoverFacets>(discoverFacetsQuery),
    ),
);

export const fetchConstellationCharacters = createServerFn({ method: "GET" }).handler(
  async (): Promise<ConstellationCharacterRecord[]> => {
    const games = await safeFetch("constellationGames", [] as ConstellationGameResult[], () =>
      sanityPublicClient.fetch<ConstellationGameResult[]>(constellationGamesQuery),
    );
    return games.flatMap((game) => {
      const portraits = new Map(
        game.cast
          .filter((character): character is { name: string; mugshotUrl: string | null } => Boolean(character.name))
          .map((character) => [character.name.trim().toLocaleLowerCase(), character.mugshotUrl]),
      );
      return game.characters.flatMap((character) => {
        const name = character.name?.trim();
        const identity = character.identity?.trim();
        if (!name || !identity) return [];
        return [{
          gameId: game.gameId,
          gameTitle: game.gameTitle,
          gameSlug: game.gameSlug,
          coverUrl: game.coverUrl,
          releaseYear: game.releaseYear,
          name,
          identity,
          identityTags: character.identityTags ?? [],
          narrativeTropes: character.narrativeTropes ?? [],
          sourceUrl: character.sourceUrl,
          portraitUrl: portraits.get(name.toLocaleLowerCase()) ?? null,
        }];
      });
    });
  },
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
    return safeFetch("searchGames", [], () =>
      sanityPublicClient.fetch<GameSummary[]>(searchGamesQuery, {
        term: term.length > 0 ? `${term}*` : "",
        genre: data.genre,
        platform: data.platform,
        theme: data.theme,
        limit: 48,
      }),
    );
  });
