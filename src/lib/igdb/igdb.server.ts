/**
 * Server-only IGDB v4 access. Twitch credentials are read from Lovable Cloud
 * secrets at call time and never leave the server. All errors thrown here use
 * stable codes so callers can map them to safe, user-facing messages.
 */

export type IgdbErrorCode =
  | "IGDB_CREDENTIALS_MISSING"
  | "IGDB_AUTH_FAILED"
  | "IGDB_RATE_LIMITED"
  | "IGDB_UNAVAILABLE"
  | "IGDB_NOT_FOUND";

export class IgdbError extends Error {
  constructor(public code: IgdbErrorCode, message?: string) {
    super(message ?? code);
    this.name = "IgdbError";
  }
}

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

let cachedToken: CachedToken | null = null;

async function getAccessToken(): Promise<string> {
  const clientId = process.env["TWITCH_CLIENT_ID"];
  const clientSecret = process.env["TWITCH_CLIENT_SECRET"];
  if (!clientId || !clientSecret) {
    throw new IgdbError("IGDB_CREDENTIALS_MISSING");
  }

  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.accessToken;
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials",
  });

  const response = await fetch(`https://id.twitch.tv/oauth2/token?${params.toString()}`, {
    method: "POST",
  });

  if (!response.ok) {
    console.error(`IGDB token request failed [${response.status}]`);
    throw new IgdbError("IGDB_AUTH_FAILED");
  }

  const payload = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!payload.access_token) {
    throw new IgdbError("IGDB_AUTH_FAILED");
  }

  cachedToken = {
    accessToken: payload.access_token,
    expiresAt: Date.now() + (payload.expires_in ?? 3600) * 1000,
  };
  return cachedToken.accessToken;
}

const MAX_ATTEMPTS = 3;

async function igdbRequest<T>(endpoint: string, body: string): Promise<T> {
  const clientId = process.env["TWITCH_CLIENT_ID"];
  if (!clientId) throw new IgdbError("IGDB_CREDENTIALS_MISSING");

  let lastError: IgdbError = new IgdbError("IGDB_UNAVAILABLE");

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, 400 * 2 ** (attempt - 1)));
    }

    let response: Response;
    try {
      const token = await getAccessToken();
      response = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
        method: "POST",
        headers: {
          "Client-ID": clientId,
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body,
      });
    } catch (error) {
      console.error("IGDB network failure", error instanceof Error ? error.message : "unknown");
      lastError = new IgdbError("IGDB_UNAVAILABLE");
      continue;
    }

    if (response.ok) {
      return (await response.json()) as T;
    }

    if (response.status === 401 || response.status === 403) {
      cachedToken = null;
      lastError = new IgdbError("IGDB_AUTH_FAILED");
      continue;
    }

    if (response.status === 429) {
      lastError = new IgdbError("IGDB_RATE_LIMITED");
      continue;
    }

    if (response.status >= 500) {
      lastError = new IgdbError("IGDB_UNAVAILABLE");
      continue;
    }

    console.error(`IGDB request rejected [${response.status}] on ${endpoint}`);
    throw new IgdbError("IGDB_UNAVAILABLE");
  }

  throw lastError;
}

export interface IgdbRawCompany {
  company?: { id?: number; name?: string; description?: string };
  developer?: boolean;
  publisher?: boolean;
}

interface IgdbRawGame {
  id: number;
  name?: string;
  slug?: string;
  summary?: string;
  storyline?: string;
  first_release_date?: number;
  updated_at?: number;
  rating?: number;
  rating_count?: number;
  total_rating?: number;
  cover?: { image_id?: string };
  screenshots?: { image_id?: string }[];
  genres?: { id: number; name?: string; slug?: string }[];
  platforms?: { id: number; name?: string; abbreviation?: string; slug?: string }[];
  themes?: { name?: string }[];
  game_modes?: { name?: string }[];
  involved_companies?: IgdbRawCompany[];
  franchise?: { name?: string };
  collection?: { name?: string };
  game_type?: { type?: string };
  alternative_names?: { name?: string }[];
  /** v4 replaced the numeric category/rating enums with these lookup tables. */
  age_ratings?: {
    organization?: { name?: string };
    rating_category?: { rating?: string };
    rating_content_descriptions?: { description?: string }[];
  }[];
  websites?: { type?: { type?: string }; url?: string }[];
  external_games?: {
    uid?: string;
    url?: string;
    external_game_source?: { id?: number; name?: string };
  }[];
}

interface IgdbRawPopularity {
  value?: number;
  popularity_type?: { id?: number; name?: string };
}

interface IgdbRawCharacter {
  id: number;
  name?: string;
  description?: string;
  url?: string;
  mug_shot?: { image_id?: string };
  character_gender?: { name?: string };
  character_species?: { name?: string };
}

export interface NormalizedTaxonomy {
  igdbId: number;
  name: string;
  slug: string;
  abbreviation?: string;
}

export interface NormalizedCompany {
  igdbId: number;
  name: string;
  slug: string;
  description?: string;
  isDeveloper: boolean;
  isPublisher: boolean;
}

export interface NormalizedGame {
  igdbId: number;
  title: string;
  slug: string;
  summary: string | null;
  storyline: string | null;
  coverUrl: string | null;
  screenshots: { url: string; caption: string | null }[];
  firstReleaseDate: string | null;
  releaseYear: number | null;
  genres: NormalizedTaxonomy[];
  platforms: NormalizedTaxonomy[];
  themes: string[];
  gameModes: string[];
  companies: NormalizedCompany[];
  developerName: string | null;
  publisherName: string | null;
  franchise: string | null;
  igdbCollectionName: string | null;
  ageRatings: { category: string; rating: string; descriptors: string[] }[];
  externalLinks: { label: string; url: string }[];
  /** Verified store pages, from IGDB's external game identifiers. */
  storeLinks: { store: string; url: string }[];
  gameType: string | null;
  alternativeNames: string[];
  igdbRating: number | null;
  igdbRatingCount: number | null;
  totalRating: number | null;
  /** Primary popularity signal (IGDB "Visits"), normalized 0-1 by IGDB. */
  popularity: number | null;
  popularityScores: { type: string; value: number }[];
  characters: NormalizedCharacter[];
  sourceUpdatedAt: string | null;
}

export interface NormalizedCharacter {
  igdbId: number;
  name: string;
  description: string | null;
  gender: string | null;
  species: string | null;
  mugshotUrl: string | null;
  igdbUrl: string | null;
}

/**
 * IGDB external game source ids we surface as buyable store pages, with a URL
 * builder where IGDB stores only an identifier (verified against
 * /v4/external_game_sources).
 */
const STORE_SOURCES: Record<number, { label: string; url?: (uid: string) => string }> = {
  1: { label: "Steam", url: (uid) => `https://store.steampowered.com/app/${uid}` },
  5: { label: "GOG" },
  11: { label: "Microsoft Store" },
  26: { label: "Epic Games Store" },
  30: { label: "itch.io" },
  31: { label: "Xbox Marketplace" },
  36: { label: "PlayStation Store" },
  55: { label: "Game Jolt" },
};

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function imageUrl(imageId: string | undefined, size: "cover_big" | "screenshot_huge"): string | null {
  if (!imageId) return null;
  return `https://images.igdb.com/igdb/image/upload/t_${size}/${imageId}.jpg`;
}

const GAME_FIELDS = [
  "id",
  "name",
  "slug",
  "summary",
  "storyline",
  "first_release_date",
  "updated_at",
  "rating",
  "rating_count",
  "total_rating",
  "cover.image_id",
  "screenshots.image_id",
  "genres.id",
  "genres.name",
  "genres.slug",
  "platforms.id",
  "platforms.name",
  "platforms.abbreviation",
  "platforms.slug",
  "themes.name",
  "game_modes.name",
  "involved_companies.developer",
  "involved_companies.publisher",
  "involved_companies.company.id",
  "involved_companies.company.name",
  "involved_companies.company.description",
  "franchise.name",
  "collection.name",
  "game_type.type",
  "alternative_names.name",
  "age_ratings.organization.name",
  "age_ratings.rating_category.rating",
  "age_ratings.rating_content_descriptions.description",
  "websites.type.type",
  "websites.url",
  "external_games.uid",
  "external_games.url",
  "external_games.external_game_source.id",
  "external_games.external_game_source.name",
].join(",");

function storeLinks(raw: IgdbRawGame): { store: string; url: string }[] {
  const seen = new Map<string, string>();
  for (const entry of raw.external_games ?? []) {
    const sourceId = entry.external_game_source?.id;
    if (sourceId === undefined) continue;
    const source = STORE_SOURCES[sourceId];
    if (!source) continue;
    const url = entry.url ?? (entry.uid && source.url ? source.url(entry.uid) : null);
    if (!url || seen.has(source.label)) continue;
    seen.set(source.label, url);
  }
  return [...seen.entries()].map(([store, url]) => ({ store, url }));
}

/**
 * IGDB retired the `follows`/`hypes` popularity fields in favour of the
 * popularity_primitives data set, so popularity needs its own request.
 */
async function fetchPopularity(igdbId: number): Promise<{ type: string; value: number }[]> {
  const body = `fields value,popularity_type.name; where game_id = ${Math.trunc(igdbId)}; limit 30;`;
  const raw = await igdbRequest<IgdbRawPopularity[]>("popularity_primitives", body);
  return raw
    .filter((entry) => typeof entry.value === "number" && entry.popularity_type?.name)
    .map((entry) => ({ type: entry.popularity_type!.name!, value: entry.value! }))
    .sort((a, b) => b.value - a.value);
}

/** IGDB's own character records for a game, including portraits. */
async function fetchCharacters(igdbId: number): Promise<NormalizedCharacter[]> {
  const body =
    `fields name,description,url,mug_shot.image_id,character_gender.name,character_species.name; ` +
    `where games = (${Math.trunc(igdbId)}); limit 50;`;
  const raw = await igdbRequest<IgdbRawCharacter[]>("characters", body);
  return raw
    .filter((entry) => entry.name?.trim())
    .map((entry) => ({
      igdbId: entry.id,
      name: entry.name!.trim(),
      description: entry.description?.trim() || null,
      gender: entry.character_gender?.name ?? null,
      species: entry.character_species?.name ?? null,
      mugshotUrl: entry.mug_shot?.image_id
        ? `https://images.igdb.com/igdb/image/upload/t_thumb/${entry.mug_shot.image_id}.jpg`
        : null,
      igdbUrl: entry.url ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function normalize(raw: IgdbRawGame): NormalizedGame {
  const title = raw.name?.trim() || `IGDB game ${raw.id}`;
  const releaseIso = raw.first_release_date ? new Date(raw.first_release_date * 1000).toISOString() : null;

  const companies: NormalizedCompany[] = (raw.involved_companies ?? [])
    .filter((entry) => entry.company?.id && entry.company?.name)
    .map((entry) => ({
      igdbId: entry.company!.id!,
      name: entry.company!.name!,
      slug: slugify(entry.company!.name!),
      description: entry.company!.description,
      isDeveloper: Boolean(entry.developer),
      isPublisher: Boolean(entry.publisher),
    }));

  return {
    igdbId: raw.id,
    title,
    slug: slugify(raw.slug ?? title) || `igdb-${raw.id}`,
    summary: raw.summary ?? null,
    storyline: raw.storyline ?? null,
    coverUrl: imageUrl(raw.cover?.image_id, "cover_big"),
    screenshots: (raw.screenshots ?? [])
      .map((shot) => imageUrl(shot.image_id, "screenshot_huge"))
      .filter((url): url is string => Boolean(url))
      .slice(0, 8)
      .map((url) => ({ url, caption: null })),
    firstReleaseDate: releaseIso,
    releaseYear: releaseIso ? new Date(releaseIso).getUTCFullYear() : null,
    genres: (raw.genres ?? [])
      .filter((genre) => genre.name)
      .map((genre) => ({ igdbId: genre.id, name: genre.name!, slug: slugify(genre.slug ?? genre.name!) })),
    platforms: (raw.platforms ?? [])
      .filter((platform) => platform.name)
      .map((platform) => ({
        igdbId: platform.id,
        name: platform.name!,
        slug: slugify(platform.slug ?? platform.name!),
        abbreviation: platform.abbreviation,
      })),
    themes: (raw.themes ?? []).map((theme) => theme.name).filter((name): name is string => Boolean(name)),
    gameModes: (raw.game_modes ?? []).map((mode) => mode.name).filter((name): name is string => Boolean(name)),
    companies,
    developerName: companies.find((company) => company.isDeveloper)?.name ?? null,
    publisherName: companies.find((company) => company.isPublisher)?.name ?? null,
    franchise: raw.franchise?.name ?? null,
    igdbCollectionName: raw.collection?.name ?? null,
    ageRatings: (raw.age_ratings ?? [])
      .filter((entry) => entry.organization?.name && entry.rating_category?.rating)
      .map((entry) => ({
        category: entry.organization!.name!,
        rating: entry.rating_category!.rating!,
        descriptors: (entry.rating_content_descriptions ?? [])
          .map((descriptor) => descriptor.description)
          .filter((description): description is string => Boolean(description)),
      })),
    externalLinks: (raw.websites ?? [])
      .filter((site) => site.url)
      .map((site) => ({
        label: site.type?.type ?? "Link",
        url: site.url!,
      })),
    storeLinks: storeLinks(raw),
    gameType: raw.game_type?.type ?? null,
    alternativeNames: [
      ...new Set(
        (raw.alternative_names ?? [])
          .map((entry) => entry.name?.trim())
          .filter((name): name is string => Boolean(name)),
      ),
    ].slice(0, 12),
    igdbRating: raw.rating ?? null,
    igdbRatingCount: raw.rating_count ?? null,
    totalRating: raw.total_rating ?? null,
    popularity: null,
    popularityScores: [],
    characters: [],
    sourceUpdatedAt: raw.updated_at ? new Date(raw.updated_at * 1000).toISOString() : null,
  };
}

/** Escapes a user search term for the Apicalypse query language. */
export function sanitizeSearchTerm(term: string): string {
  return term.replace(/[\\"]/g, " ").replace(/\s+/g, " ").trim().slice(0, 100);
}

export async function searchGames(term: string, limit: number, offset: number): Promise<NormalizedGame[]> {
  const safeTerm = sanitizeSearchTerm(term);
  if (safeTerm.length < 2) return [];

  const body = `search "${safeTerm}"; fields ${GAME_FIELDS}; limit ${limit}; offset ${offset};`;
  const raw = await igdbRequest<IgdbRawGame[]>("games", body);
  return raw.map(normalize);
}

/**
 * Full record for one game: the base document plus the data sets IGDB keeps in
 * separate endpoints (popularity signals and character records). A failure in
 * either extra set is non-fatal — the game still imports without it.
 */
export async function getGameById(igdbId: number): Promise<NormalizedGame> {
  const body = `fields ${GAME_FIELDS}; where id = ${Math.trunc(igdbId)}; limit 1;`;
  const raw = await igdbRequest<IgdbRawGame[]>("games", body);
  const game = raw[0];
  if (!game) throw new IgdbError("IGDB_NOT_FOUND");
  const normalized = normalize(game);

  const [popularity, characters] = await Promise.all([
    fetchPopularity(normalized.igdbId).catch(() => [] as { type: string; value: number }[]),
    fetchCharacters(normalized.igdbId).catch(() => [] as NormalizedCharacter[]),
  ]);

  normalized.popularityScores = popularity;
  normalized.popularity = popularity.find((entry) => entry.type === "Visits")?.value ?? popularity[0]?.value ?? null;
  normalized.characters = characters;
  return normalized;
}

/**
 * Title lookup for bulk imports: exact name match first, then IGDB's
 * alternative names, so regional and abbreviated titles still resolve. Only
 * main games are considered, which keeps DLC and bundles out of the library.
 */
export async function findMainGamesByTitle(title: string, limit = 5): Promise<NormalizedGame[]> {
  const safeTitle = sanitizeSearchTerm(title);
  if (safeTitle.length < 2) return [];

  const mainGameOnly = `(game_type = null | game_type = 0)`;
  const byName = await igdbRequest<IgdbRawGame[]>(
    "games",
    `fields ${GAME_FIELDS}; where name ~ "${safeTitle}" & ${mainGameOnly}; limit ${limit};`,
  );
  if (byName.length > 0) return byName.map(normalize);

  const byAlias = await igdbRequest<IgdbRawGame[]>(
    "games",
    `fields ${GAME_FIELDS}; where alternative_names.name ~ "${safeTitle}" & ${mainGameOnly}; limit ${limit};`,
  );
  return byAlias.map(normalize);
}

/** Maps internal error codes to messages that are safe to show a user. */
export function igdbErrorMessage(code: string): string {
  switch (code) {
    case "IGDB_CREDENTIALS_MISSING":
    case "IGDB_AUTH_FAILED":
      return "IGDB authentication failed. Check the configured Lovable Cloud secrets.";
    case "IGDB_RATE_LIMITED":
      return "IGDB is rate limiting requests right now. Wait a moment and try again.";
    case "IGDB_NOT_FOUND":
      return "That game could not be found on IGDB.";
    case "SANITY_WRITE_TOKEN_MISSING":
      return "The Sanity write token is not configured. Add it to the Lovable Cloud secrets.";
    default:
      return "IGDB could not be reached. Please try again.";
  }
}
