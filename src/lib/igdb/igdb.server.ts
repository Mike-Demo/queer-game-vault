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
  follows?: number;
  hypes?: number;
  cover?: { image_id?: string };
  screenshots?: { image_id?: string }[];
  genres?: { id: number; name?: string; slug?: string }[];
  platforms?: { id: number; name?: string; abbreviation?: string; slug?: string }[];
  themes?: { name?: string }[];
  game_modes?: { name?: string }[];
  involved_companies?: IgdbRawCompany[];
  franchise?: { name?: string };
  collection?: { name?: string };
  age_ratings?: { category?: number; rating?: number; rating_cover_url?: string }[];
  websites?: { category?: number; url?: string }[];
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
  ageRatings: { category: string; rating: string }[];
  externalLinks: { label: string; url: string }[];
  igdbRating: number | null;
  igdbRatingCount: number | null;
  totalRating: number | null;
  popularity: number | null;
  sourceUpdatedAt: string | null;
}

const AGE_RATING_CATEGORIES: Record<number, string> = {
  1: "ESRB",
  2: "PEGI",
  3: "CERO",
  4: "USK",
  5: "GRAC",
  6: "CLASS_IND",
  7: "ACB",
};

const WEBSITE_CATEGORIES: Record<number, string> = {
  1: "Official site",
  2: "Wikia",
  3: "Wikipedia",
  4: "Facebook",
  5: "Twitter",
  6: "Twitch",
  8: "Instagram",
  9: "YouTube",
  13: "Steam",
  14: "Reddit",
  16: "Epic Games",
  17: "GOG",
  18: "Discord",
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
  "follows",
  "hypes",
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
  "age_ratings.category",
  "age_ratings.rating",
  "websites.category",
  "websites.url",
].join(",");

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
      .filter((entry) => entry.category !== undefined && entry.rating !== undefined)
      .map((entry) => ({
        category: AGE_RATING_CATEGORIES[entry.category!] ?? `Category ${entry.category}`,
        rating: String(entry.rating),
      })),
    externalLinks: (raw.websites ?? [])
      .filter((site) => site.url)
      .map((site) => ({
        label: WEBSITE_CATEGORIES[site.category ?? 0] ?? "Link",
        url: site.url!,
      })),
    igdbRating: raw.rating ?? null,
    igdbRatingCount: raw.rating_count ?? null,
    totalRating: raw.total_rating ?? null,
    popularity: raw.follows ?? raw.hypes ?? null,
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

export async function getGameById(igdbId: number): Promise<NormalizedGame> {
  const body = `fields ${GAME_FIELDS}; where id = ${Math.trunc(igdbId)}; limit 1;`;
  const raw = await igdbRequest<IgdbRawGame[]>("games", body);
  const game = raw[0];
  if (!game) throw new IgdbError("IGDB_NOT_FOUND");
  return normalize(game);
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
