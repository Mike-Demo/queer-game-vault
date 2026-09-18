import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface IgdbSearchResult {
  igdbId: number;
  title: string;
  releaseYear: number | null;
  summary: string | null;
  coverUrl: string | null;
  genres: string[];
  platforms: string[];
  libraryStatus: string | null;
}

export interface IgdbSearchResponse {
  results: IgdbSearchResult[];
  hasMore: boolean;
  error: string | null;
}

/** Editor-only IGDB search. Credentials stay on the server. */
export const searchIgdbGames = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { term: string; offset?: number }) => ({
    term: String(input.term ?? ""),
    offset: Math.max(0, Math.trunc(Number(input.offset ?? 0))),
  }))
  .handler(async ({ data, context }): Promise<IgdbSearchResponse> => {
    const { assertEditor, authErrorMessage } = await import("@/lib/auth/roles.server");
    const { searchGames, sanitizeSearchTerm, igdbErrorMessage } = await import("@/lib/igdb/igdb.server");
    const { sanityFreshClient } = await import("@/lib/sanity/client");
    const { gamesByIgdbIdsQuery } = await import("@/lib/sanity/queries");

    try {
      await assertEditor(context.supabase, context.userId);
    } catch (error) {
      return { results: [], hasMore: false, error: authErrorMessage(String(error)) };
    }

    const term = sanitizeSearchTerm(data.term);
    if (term.length < 3) {
      return { results: [], hasMore: false, error: null };
    }

    const pageSize = 12;
    try {
      const games = await searchGames(term, pageSize + 1, data.offset);
      const page = games.slice(0, pageSize);

      let statusByIgdbId = new Map<number, string>();
      if (page.length > 0) {
        const existing = await sanityFreshClient.fetch<{ igdbId: number; editorialStatus: string }[]>(
          gamesByIgdbIdsQuery,
          { igdbIds: page.map((game) => game.igdbId) },
        );
        statusByIgdbId = new Map(existing.map((row) => [row.igdbId, row.editorialStatus]));
      }

      return {
        results: page.map((game) => ({
          igdbId: game.igdbId,
          title: game.title,
          releaseYear: game.releaseYear,
          summary: game.summary,
          coverUrl: game.coverUrl,
          genres: game.genres.map((genre) => genre.name),
          platforms: game.platforms.map((platform) => platform.abbreviation ?? platform.name),
          libraryStatus: statusByIgdbId.get(game.igdbId) ?? null,
        })),
        hasMore: games.length > pageSize,
        error: null,
      };
    } catch (error) {
      const code = error instanceof Error ? error.message : "IGDB_UNAVAILABLE";
      console.error("IGDB search failed", code);
      return { results: [], hasMore: false, error: igdbErrorMessage(code) };
    }
  });

export interface IgdbGameDetailsResponse {
  game: {
    igdbId: number;
    title: string;
    summary: string | null;
    storyline: string | null;
    coverUrl: string | null;
    screenshots: string[];
    firstReleaseDate: string | null;
    releaseYear: number | null;
    genres: string[];
    platforms: string[];
    themes: string[];
    gameModes: string[];
    developerName: string | null;
    publisherName: string | null;
    franchise: string | null;
    igdbCollectionName: string | null;
    ageRatings: { category: string; rating: string }[];
    externalLinks: { label: string; url: string }[];
    igdbRating: number | null;
    igdbRatingCount: number | null;
    totalRating: number | null;
  } | null;
  existing: {
    _id: string;
    title: string;
    slug: string | null;
    editorialStatus: string;
    lastSyncedAt: string | null;
  } | null;
  error: string | null;
}

/** Editor-only full IGDB record for the preview panel. */
export const getIgdbGameDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { igdbId: number }) => ({ igdbId: Math.trunc(Number(input.igdbId)) }))
  .handler(async ({ data, context }): Promise<IgdbGameDetailsResponse> => {
    const { assertEditor, authErrorMessage } = await import("@/lib/auth/roles.server");
    const { getGameById, igdbErrorMessage } = await import("@/lib/igdb/igdb.server");
    const { sanityFreshClient } = await import("@/lib/sanity/client");
    const { gameByIgdbIdQuery } = await import("@/lib/sanity/queries");

    try {
      await assertEditor(context.supabase, context.userId);
    } catch (error) {
      return { game: null, existing: null, error: authErrorMessage(String(error)) };
    }

    if (!Number.isFinite(data.igdbId) || data.igdbId <= 0) {
      return { game: null, existing: null, error: "That IGDB reference is not valid." };
    }

    try {
      const [game, existing] = await Promise.all([
        getGameById(data.igdbId),
        sanityFreshClient.fetch<IgdbGameDetailsResponse["existing"]>(gameByIgdbIdQuery, {
          igdbId: data.igdbId,
        }),
      ]);

      return {
        game: {
          igdbId: game.igdbId,
          title: game.title,
          summary: game.summary,
          storyline: game.storyline,
          coverUrl: game.coverUrl,
          screenshots: game.screenshots.map((shot) => shot.url),
          firstReleaseDate: game.firstReleaseDate,
          releaseYear: game.releaseYear,
          genres: game.genres.map((genre) => genre.name),
          platforms: game.platforms.map((platform) => platform.name),
          themes: game.themes,
          gameModes: game.gameModes,
          developerName: game.developerName,
          publisherName: game.publisherName,
          franchise: game.franchise,
          igdbCollectionName: game.igdbCollectionName,
          ageRatings: game.ageRatings,
          externalLinks: game.externalLinks,
          igdbRating: game.igdbRating,
          igdbRatingCount: game.igdbRatingCount,
          totalRating: game.totalRating,
        },
        existing: existing ?? null,
        error: null,
      };
    } catch (error) {
      const code = error instanceof Error ? error.message : "IGDB_UNAVAILABLE";
      console.error("IGDB details failed", code);
      return { game: null, existing: null, error: igdbErrorMessage(code) };
    }
  });

/** Whether the signed-in account may use the management screens. */
export const getMyEditorAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ role: string | null }> => {
    const { assertEditor } = await import("@/lib/auth/roles.server");
    try {
      const { role } = await assertEditor(context.supabase, context.userId);
      return { role };
    } catch {
      return { role: null };
    }
  });
