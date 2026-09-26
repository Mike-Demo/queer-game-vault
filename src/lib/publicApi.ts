/**
 * Read-only public API: response shaping, caching headers and the OpenAPI
 * description. Only approved/featured games and published collections are
 * ever returned; editor-only fields are stripped here.
 */
import { coverUrl } from "./publicData";
import { SITE_URL } from "./seo/structuredData";
import type { CollectionSummary, GameDetail, GameSummary } from "./sanity/types";

export const API_BASE_PATH = "/api/public/v1";
export const API_MAX_LIMIT = 48;

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      ...CORS_HEADERS,
      "Cache-Control": status === 200 ? "public, max-age=300, s-maxage=3600" : "no-store",
    },
  });
}

export function optionsResponse(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export function errorResponse(status: number, message: string): Response {
  return jsonResponse({ error: message }, status);
}

export interface PublicGameSummary {
  readonly slug: string;
  readonly title: string;
  readonly url: string;
  readonly igdbId: number;
  readonly releaseYear: number | null;
  readonly description: string | null;
  readonly coverUrl: string | null;
  readonly genres: readonly string[];
  readonly platforms: readonly string[];
  readonly lgbtqCharacters: readonly string[];
}

export function toPublicGame(game: GameSummary): PublicGameSummary | null {
  if (!game.slug) return null;
  return {
    slug: game.slug,
    title: game.title,
    url: `${SITE_URL}/games/${game.slug}`,
    igdbId: game.igdbId,
    releaseYear: game.releaseYear,
    description: game.customDescription ?? game.summary,
    coverUrl: coverUrl(game, 600),
    genres: game.genres.map((genre) => genre.name),
    platforms: game.platforms.map((platform) => platform.name),
    lgbtqCharacters: game.lgbtqCharacterNames.filter((name): name is string => Boolean(name)),
  };
}

export function toPublicGameDetail(game: GameDetail): Record<string, unknown> | null {
  if (!game.slug) return null;
  return {
    slug: game.slug,
    title: game.title,
    url: `${SITE_URL}/games/${game.slug}`,
    igdbId: game.igdbId,
    releaseYear: game.releaseYear,
    firstReleaseDate: game.firstReleaseDate,
    description: game.customDescription ?? game.summary,
    summary: game.summary,
    storyline: game.storyline,
    coverUrl: coverUrl(game, 600),
    genres: game.genres.map((genre) => genre.name),
    platforms: game.platforms.map((platform) => platform.name),
    themes: game.themes,
    gameModes: game.gameModes,
    developer: game.developer?.name ?? null,
    publisher: game.publisher?.name ?? null,
    franchise: game.franchise,
    series: game.igdbCollectionName,
    igdbRating: game.igdbRating,
    igdbRatingCount: game.igdbRatingCount,
    ageRatings: game.ageRatings,
    externalLinks: game.externalLinks,
    storeLinks: game.storeLinks,
    screenshots: game.screenshots.map((shot) => shot.url).filter(Boolean),
    alternativeNames: game.alternativeNames,
    lgbtqCharacters: game.lgbtqCharacters,
  };
}

export function toPublicCollection(collection: CollectionSummary): Record<string, unknown> | null {
  if (!collection.slug) return null;
  return {
    slug: collection.slug,
    title: collection.title,
    url: `${SITE_URL}/collections/${collection.slug}`,
    description: collection.description,
    featured: collection.featured,
    gameCount: collection.gameCount,
  };
}

const slugParam = {
  name: "slug",
  in: "path",
  required: true,
  schema: { type: "string", pattern: "^[a-z0-9-]{1,120}$" },
};

const errorRef = { $ref: "#/components/schemas/Error" };

export const OPENAPI_DOCUMENT = {
  openapi: "3.1.0",
  info: {
    title: "QueerCade Public API",
    version: "1.0.0",
    description:
      "Read-only access to QueerCade's curated catalog of video games with LGBTQ+ characters and stories. Returns only publicly visible, editor-approved content. No authentication required.",
    contact: { url: `${SITE_URL}/developers` },
  },
  servers: [{ url: `${SITE_URL}${API_BASE_PATH}` }],
  paths: {
    "/games": {
      get: {
        operationId: "searchGames",
        summary: "Search or list games",
        description: "Matches game titles and LGBTQ+ character names. Without q, lists games alphabetically.",
        parameters: [
          { name: "q", in: "query", schema: { type: "string", maxLength: 100 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: API_MAX_LIMIT, default: 24 } },
          { name: "offset", in: "query", schema: { type: "integer", minimum: 0, maximum: 10000, default: 0 } },
        ],
        responses: {
          "200": {
            description: "Games",
            content: { "application/json": { schema: { $ref: "#/components/schemas/GameList" } } },
          },
          "400": { description: "Invalid query", content: { "application/json": { schema: errorRef } } },
        },
      },
    },
    "/games/{slug}": {
      get: {
        operationId: "getGame",
        summary: "Get one game with its full public metadata",
        parameters: [slugParam],
        responses: {
          "200": { description: "Game", content: { "application/json": { schema: { type: "object" } } } },
          "404": { description: "Not found", content: { "application/json": { schema: errorRef } } },
        },
      },
    },
    "/collections": {
      get: {
        operationId: "listCollections",
        summary: "List curated collections",
        responses: { "200": { description: "Collections", content: { "application/json": { schema: { type: "object" } } } } },
      },
    },
    "/collections/{slug}": {
      get: {
        operationId: "getCollection",
        summary: "Get one collection and its games in editorial order",
        parameters: [slugParam],
        responses: {
          "200": { description: "Collection", content: { "application/json": { schema: { type: "object" } } } },
          "404": { description: "Not found", content: { "application/json": { schema: errorRef } } },
        },
      },
    },
  },
  components: {
    schemas: {
      Error: { type: "object", properties: { error: { type: "string" } }, required: ["error"] },
      GameSummary: {
        type: "object",
        properties: {
          slug: { type: "string" },
          title: { type: "string" },
          url: { type: "string", format: "uri" },
          igdbId: { type: "integer" },
          releaseYear: { type: ["integer", "null"] },
          description: { type: ["string", "null"] },
          coverUrl: { type: ["string", "null"], format: "uri" },
          genres: { type: "array", items: { type: "string" } },
          platforms: { type: "array", items: { type: "string" } },
          lgbtqCharacters: { type: "array", items: { type: "string" } },
        },
      },
      GameList: {
        type: "object",
        properties: {
          games: { type: "array", items: { $ref: "#/components/schemas/GameSummary" } },
          limit: { type: "integer" },
          offset: { type: "integer" },
        },
      },
    },
  },
} as const;
