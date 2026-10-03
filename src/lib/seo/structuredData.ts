/**
 * schema.org JSON-LD builders.
 *
 * Every builder omits empty/unknown values rather than emitting blanks or
 * placeholders, and every URL it produces is absolute.
 */

export const SITE_URL = "https://queercade.mikedemo.dev";
export const SITE_NAME = "QueerCade";
const LOGO_URL = `${SITE_URL}/favicon.png`;

/** Branded share image for pages that have no picture of their own. */
export const DEFAULT_SHARE_IMAGE = `${SITE_URL}/og-image.png`;

export type JsonLd = Record<string, unknown>;

/** Recursively drops undefined, null, empty strings and empty arrays/objects. */
function prune<T>(value: T): T | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return (trimmed.length > 0 ? (trimmed as unknown as T) : undefined);
  }
  if (Array.isArray(value)) {
    const items = value.map((item) => prune(item)).filter((item) => item !== undefined);
    return (items.length > 0 ? (items as unknown as T) : undefined);
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => [key, prune(item)] as const)
      .filter(([, item]) => item !== undefined);
    if (entries.length === 0) return undefined;
    return Object.fromEntries(entries) as T;
  }
  return value;
}

export function absoluteUrl(path: string): string {
  return path.startsWith("http") ? path : `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Wraps one or more entities into a head() script entry. */
export function jsonLdScript(...entities: (JsonLd | undefined)[]): {
  type: "application/ld+json";
  children: string;
} {
  const graph = entities
    .map((entity) => prune(entity))
    .filter((entity): entity is JsonLd => entity !== undefined);
  return {
    type: "application/ld+json",
    children: JSON.stringify({ "@context": "https://schema.org", "@graph": graph }),
  };
}

export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

export function organization(): JsonLd {
  return {
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: SITE_NAME,
    description: "QueerCade is a hand-curated catalog of video games with LGBTQ+ characters and stories — every game reviewed by an editor, with details from IGDB and curated lists written by people.",
    url: `${SITE_URL}/`,
    logo: {
      "@type": "ImageObject",
      url: LOGO_URL,
      width: 64,
      height: 64,
    },
    sameAs: [
      "https://github.com/Mike-Demo/queer-game-vault",
    ],
  };
}

export function website(): JsonLd {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    inLanguage: "en",
    publisher: { "@id": ORGANIZATION_ID },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/discover?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export interface Crumb {
  name: string;
  path: string;
}

export function breadcrumbs(crumbs: Crumb[]): JsonLd | undefined {
  if (crumbs.length === 0) return undefined;
  return {
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

export interface WebPageInput {
  type?: "WebPage" | "CollectionPage" | "AboutPage" | "SearchResultsPage" | "ProfilePage";
  path: string;
  name: string;
  description?: string | null;
  primaryImage?: string | null;
}

export function webPage(input: WebPageInput): JsonLd {
  const url = absoluteUrl(input.path);
  return {
    "@type": input.type ?? "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: input.name,
    description: input.description ?? undefined,
    isPartOf: { "@id": WEBSITE_ID },
    inLanguage: "en",
    primaryImageOfPage: input.primaryImage
      ? { "@type": "ImageObject", url: input.primaryImage }
      : undefined,
  };
}

export interface ItemListEntry {
  name: string;
  path: string | null;
  image?: string | null;
  type?: "VideoGame" | "CollectionPage";
}

export function itemList(name: string, entries: ItemListEntry[]): JsonLd | undefined {
  const items = entries.filter((entry) => entry.path !== null);
  if (items.length === 0) return undefined;
  return {
    "@type": "ItemList",
    name,
    numberOfItems: items.length,
    itemListElement: items.map((entry, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": entry.type ?? "VideoGame",
        name: entry.name,
        url: absoluteUrl(entry.path as string),
        image: entry.image ?? undefined,
      },
    })),
  };
}

export interface VideoGameInput {
  path: string;
  name: string;
  description?: string | null;
  image?: string | null;
  releaseDate?: string | null;
  genres?: string[];
  platforms?: string[];
  gameModes?: string[];
  keywords?: string[];
  developer?: string | null;
  publisher?: string | null;
  franchise?: string | null;
  sameAs?: string[];
  screenshots?: string[];
  rating?: { value: number; count: number } | null;
  contentRating?: string | null;
}

/** IGDB expresses ratings on a 0-100 scale. */
const RATING_BEST = 100;

export function videoGame(input: VideoGameInput): JsonLd {
  const url = absoluteUrl(input.path);
  return {
    "@type": "VideoGame",
    "@id": `${url}#game`,
    url,
    mainEntityOfPage: { "@id": `${url}#webpage` },
    name: input.name,
    description: input.description ?? undefined,
    image: input.image ?? undefined,
    datePublished: isoDate(input.releaseDate),
    genre: input.genres,
    gamePlatform: input.platforms,
    playMode: input.gameModes,
    keywords: input.keywords && input.keywords.length > 0 ? input.keywords.join(", ") : undefined,
    author: input.developer ? { "@type": "Organization", name: input.developer } : undefined,
    publisher: input.publisher ? { "@type": "Organization", name: input.publisher } : undefined,
    isPartOf: input.franchise
      ? { "@type": "CreativeWorkSeries", name: input.franchise }
      : undefined,
    sameAs: input.sameAs,
    screenshot: input.screenshots?.map((src) => ({ "@type": "ImageObject", url: src })),
    contentRating: input.contentRating ?? undefined,
    aggregateRating:
      input.rating && input.rating.count > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: Math.round(input.rating.value * 10) / 10,
            ratingCount: input.rating.count,
            bestRating: RATING_BEST,
            worstRating: 0,
            author: { "@type": "Organization", name: "IGDB" },
          }
        : undefined,
  };
}

/** schema.org date properties want ISO 8601 (YYYY-MM-DD) values. */
function isoDate(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString().slice(0, 10);
}

export function person(input: {
  path: string;
  name: string;
  description?: string | null;
  image?: string | null;
}): JsonLd {
  const url = absoluteUrl(input.path);
  return {
    "@type": "Person",
    "@id": `${url}#person`,
    url,
    name: input.name,
    description: input.description ?? undefined,
    image: input.image ?? undefined,
  };
}
