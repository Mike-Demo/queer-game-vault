/**
 * Read-only public API: response shaping, caching headers, rate limiting and
 * the OpenAPI description. Only approved/featured games and published
 * collections are ever returned; editor-only fields are stripped here.
 */
import { coverUrl } from "./publicData";
import { SITE_URL } from "./seo/structuredData";
import type { CollectionSummary, GameDetail, GameSummary } from "./sanity/types";

export const API_BASE_PATH = "/api/public/v1";
export const API_VERSION = "1.0.0";
export const API_MAX_LIMIT = 48;
export const API_DEFAULT_LIMIT = 24;
export const API_MAX_OFFSET = 10000;

/** Requests allowed per client per window. Best effort, per server instance. */
export const RATE_LIMIT_MAX = 120;
export const RATE_LIMIT_WINDOW_SECONDS = 60;

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

export type ApiErrorCode =
  | "invalid_request"
  | "not_found"
  | "rate_limited"
  | "service_unavailable";

export function jsonResponse(
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
): Response {
  return Response.json(body, {
    status,
    headers: {
      ...CORS_HEADERS,
      "X-Api-Version": API_VERSION,
      "Cache-Control": status === 200 ? "public, max-age=300, s-maxage=3600" : "no-store",
      ...extraHeaders,
    },
  });
}

export function optionsResponse(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * Structured error body shared by every endpoint:
 * `{ error: { code, message, status } }`, plus a flat `message` for
 * convenience. `error.code` is stable; `message` is human-readable.
 */
export function errorResponse(
  status: number,
  code: ApiErrorCode,
  message: string,
  extraHeaders: Record<string, string> = {},
): Response {
  return jsonResponse({ error: { code, message, status }, message }, status, extraHeaders);
}

interface RateBucket {
  count: number;
  resetAt: number;
}

const rateBuckets = new Map<string, RateBucket>();

function clientKey(request: Request): string {
  const headers = request.headers;
  return (
    headers.get("cf-connecting-ip") ??
    headers.get("x-real-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

export interface RateLimitResult {
  readonly limited: Response | null;
  readonly headers: Record<string, string>;
}

/**
 * Fixed-window limiter kept in memory. Serverless instances are ephemeral and
 * not shared, so this is a courtesy guard against runaway clients rather than
 * a strict quota — the documented policy says as much.
 */
export function checkRateLimit(request: Request): RateLimitResult {
  const now = Date.now();
  const windowMs = RATE_LIMIT_WINDOW_SECONDS * 1000;
  const key = clientKey(request);

  if (rateBuckets.size > 5000) rateBuckets.clear();

  const existing = rateBuckets.get(key);
  const bucket = existing && existing.resetAt > now ? existing : { count: 0, resetAt: now + windowMs };
  bucket.count += 1;
  rateBuckets.set(key, bucket);

  const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
  const resetSeconds = Math.ceil(bucket.resetAt / 1000);
  const remaining = Math.max(0, RATE_LIMIT_MAX - bucket.count);
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(RATE_LIMIT_MAX),
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(resetSeconds),
    // RFC 9652 / draft-ietf-httpapi-ratelimit-headers aliases for the same
    // real limits, so agents reading either convention can self-throttle.
    "RateLimit-Limit": String(RATE_LIMIT_MAX),
    "RateLimit-Remaining": String(remaining),
    "RateLimit-Reset": String(retryAfter),
  };

  if (bucket.count > RATE_LIMIT_MAX) {
    return {
      headers,
      limited: errorResponse(
        429,
        "rate_limited",
        `Too many requests. Limit is ${RATE_LIMIT_MAX} per ${RATE_LIMIT_WINDOW_SECONDS} seconds.`,
        { ...headers, "Retry-After": String(retryAfter) },
      ),
    };
  }

  return { limited: null, headers };
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

const errorResponses = {
  "400": {
    description: "Invalid query parameters.",
    content: { "application/json": { schema: errorRef, example: { error: { code: "invalid_request", message: "Invalid query parameters.", status: 400 } } } },
  },
  "404": {
    description: "No such record.",
    content: { "application/json": { schema: errorRef, example: { error: { code: "not_found", message: "Game not found.", status: 404 } } } },
  },
  "429": {
    description: `Rate limited. Retry after the number of seconds in the Retry-After header. Limit: ${RATE_LIMIT_MAX} requests per ${RATE_LIMIT_WINDOW_SECONDS} seconds.`,
    headers: {
      "Retry-After": { schema: { type: "integer" }, description: "Seconds to wait before retrying." },
      "X-RateLimit-Limit": { schema: { type: "integer" } },
      "X-RateLimit-Remaining": { schema: { type: "integer" } },
      "X-RateLimit-Reset": { schema: { type: "integer" }, description: "Unix seconds when the window resets." },
      "RateLimit-Limit": { schema: { type: "integer" }, description: "RFC 9652 alias of X-RateLimit-Limit." },
      "RateLimit-Remaining": { schema: { type: "integer" }, description: "RFC 9652 alias of X-RateLimit-Remaining." },
      "RateLimit-Reset": { schema: { type: "integer" }, description: "Seconds until the window resets." },
    },
    content: { "application/json": { schema: errorRef } },
  },
  "503": {
    description: "Catalog temporarily unavailable.",
    content: { "application/json": { schema: errorRef } },
  },
} as const;

export const OPENAPI_DOCUMENT = {
  openapi: "3.1.0",
  info: {
    title: "QueerCade Public API",
    version: API_VERSION,
    description: [
      "Read-only access to QueerCade's curated catalog of video games with LGBTQ+ characters and stories.",
      "",
      "Only publicly visible, editor-approved content is returned. Editorial notes, review-queue data, import history and member data are never exposed.",
      "",
      `Authentication: none required. Every endpoint is GET only.`,
      `Paging: offset/limit, maximum ${API_MAX_LIMIT} items per request, maximum offset ${API_MAX_OFFSET}. List responses include total and nextOffset (null on the last page).`,
      `Rate limit: approximately ${RATE_LIMIT_MAX} requests per ${RATE_LIMIT_WINDOW_SECONDS} seconds per client, enforced per server instance. Exceeding it returns 429 with Retry-After.`,
      "Caching: successful responses are cacheable for 5 minutes by clients and 1 hour by shared caches. Please cache rather than re-poll.",
      "Errors: every failure returns { error: { code, message, status } } with a stable code.",
      "CORS: all origins allowed.",
    ].join("\n"),
    contact: { url: `${SITE_URL}/developers` },
    license: { name: "Catalog data from IGDB; editorial content by QueerCade", url: `${SITE_URL}/licenses` },
  },
  servers: [{ url: `${SITE_URL}${API_BASE_PATH}` }],
  paths: {
    "/games": {
      get: {
        operationId: "searchGames",
        summary: "Search or list games",
        description:
          "Matches game titles and LGBTQ+ character names. Without q, lists games alphabetically. Filters combine with AND.",
        parameters: [
          { name: "q", in: "query", description: "Title or character name prefix search.", schema: { type: "string", maxLength: 100 }, example: "chloe" },
          { name: "genre", in: "query", description: "Genre slug, as returned by /facets.", schema: { type: "string", pattern: "^[a-z0-9-]{0,60}$" }, example: "role-playing-rpg" },
          { name: "platform", in: "query", description: "Platform slug, as returned by /facets.", schema: { type: "string", pattern: "^[a-z0-9-]{0,60}$" }, example: "nintendo-switch" },
          { name: "theme", in: "query", description: "Theme name, as returned by /facets.", schema: { type: "string", maxLength: 60 } },
          { name: "year", in: "query", description: "Exact release year.", schema: { type: "integer", minimum: 1970, maximum: 2100 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: API_MAX_LIMIT, default: API_DEFAULT_LIMIT } },
          { name: "offset", in: "query", schema: { type: "integer", minimum: 0, maximum: API_MAX_OFFSET, default: 0 } },
        ],
        responses: {
          "200": {
            description: "Matching games.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/GameList" } } },
          },
          "400": errorResponses["400"],
          "429": errorResponses["429"],
          "503": errorResponses["503"],
        },
      },
    },
    "/games/{slug}": {
      get: {
        operationId: "getGame",
        summary: "Get one game with its full public metadata",
        parameters: [slugParam],
        responses: {
          "200": {
            description: "Game.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/GameDetail" } } },
          },
          "404": errorResponses["404"],
          "429": errorResponses["429"],
          "503": errorResponses["503"],
        },
      },
    },
    "/collections": {
      get: {
        operationId: "listCollections",
        summary: "List curated collections",
        responses: {
          "200": {
            description: "Collections.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/CollectionList" } } },
          },
          "429": errorResponses["429"],
          "503": errorResponses["503"],
        },
      },
    },
    "/collections/{slug}": {
      get: {
        operationId: "getCollection",
        summary: "Get one collection and its games in editorial order",
        parameters: [slugParam],
        responses: {
          "200": {
            description: "Collection with its games.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/CollectionDetail" } } },
          },
          "404": errorResponses["404"],
          "429": errorResponses["429"],
          "503": errorResponses["503"],
        },
      },
    },
    "/facets": {
      get: {
        operationId: "listFacets",
        summary: "List the genre, platform and theme values that filters accept",
        responses: {
          "200": {
            description: "Available filter values.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Facets" } } },
          },
          "429": errorResponses["429"],
          "503": errorResponses["503"],
        },
      },
    },
  },
  components: {
    schemas: {
      Error: {
        type: "object",
        required: ["error"],
        properties: {
          error: {
            type: "object",
            required: ["code", "message", "status"],
            properties: {
              code: {
                type: "string",
                enum: ["invalid_request", "not_found", "rate_limited", "service_unavailable"],
              },
              message: { type: "string" },
              status: { type: "integer" },
            },
          },
          message: { type: "string", description: "Same human-readable message, flattened." },
        },
      },
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
      GameDetail: {
        allOf: [
          { $ref: "#/components/schemas/GameSummary" },
          {
            type: "object",
            properties: {
              firstReleaseDate: { type: ["string", "null"] },
              summary: { type: ["string", "null"] },
              storyline: { type: ["string", "null"] },
              themes: { type: "array", items: { type: "string" } },
              gameModes: { type: "array", items: { type: "string" } },
              developer: { type: ["string", "null"] },
              publisher: { type: ["string", "null"] },
              franchise: { type: ["string", "null"] },
              series: { type: ["string", "null"] },
              igdbRating: { type: ["number", "null"] },
              igdbRatingCount: { type: ["integer", "null"] },
              ageRatings: { type: "array", items: { type: "object" } },
              externalLinks: { type: "array", items: { type: "object" } },
              storeLinks: { type: "array", items: { type: "object" } },
              screenshots: { type: "array", items: { type: "string", format: "uri" } },
              alternativeNames: { type: "array", items: { type: "string" } },
              lgbtqCharacters: { type: "array", items: { type: "object" } },
            },
          },
        ],
      },
      GameList: {
        type: "object",
        required: ["games", "total", "limit", "offset", "nextOffset"],
        properties: {
          games: { type: "array", items: { $ref: "#/components/schemas/GameSummary" } },
          total: { type: "integer", description: "Total matches across all pages." },
          limit: { type: "integer" },
          offset: { type: "integer" },
          nextOffset: { type: ["integer", "null"], description: "Offset of the next page, or null on the last page." },
          version: { type: "string" },
        },
      },
      CollectionSummary: {
        type: "object",
        properties: {
          slug: { type: "string" },
          title: { type: "string" },
          url: { type: "string", format: "uri" },
          description: { type: ["string", "null"] },
          featured: { type: ["boolean", "null"] },
          gameCount: { type: "integer" },
        },
      },
      CollectionList: {
        type: "object",
        required: ["collections", "total"],
        properties: {
          collections: { type: "array", items: { $ref: "#/components/schemas/CollectionSummary" } },
          total: { type: "integer" },
          version: { type: "string" },
        },
      },
      CollectionDetail: {
        allOf: [
          { $ref: "#/components/schemas/CollectionSummary" },
          {
            type: "object",
            properties: { games: { type: "array", items: { $ref: "#/components/schemas/GameSummary" } } },
          },
        ],
      },
      Facets: {
        type: "object",
        properties: {
          genres: { type: "array", items: { type: "object", properties: { name: { type: "string" }, slug: { type: "string" } } } },
          platforms: { type: "array", items: { type: "object", properties: { name: { type: "string" }, slug: { type: "string" } } } },
          themes: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
} as const;
