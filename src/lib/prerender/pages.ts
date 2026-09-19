/**
 * Build-time page list for static prerendering. Runs inside the Vite config,
 * so it uses plain fetch against the public (read-only) content API.
 */

export const STATIC_PUBLIC_PATHS = ["/", "/library", "/collections", "/discover", "/about", "/licenses"] as const;

/** Safety valve: publishing rejects builds over 50,000 files. */
export const MAX_PRERENDER_PAGES = 4000;

const PROJECT_ID = "tzh8tziu";
const DATASET = "production";
const API_VERSION = "2024-10-01";

async function fetchSlugs(query: string): Promise<string[]> {
  const url = `https://${PROJECT_ID}.apicdn.sanity.io/v${API_VERSION}/data/query/${DATASET}?query=${encodeURIComponent(query)}&perspective=published`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Sanity slug query failed: ${response.status}`);
  const body = (await response.json()) as { result?: { slug?: string | null }[] };
  return (body.result ?? []).map((row) => row.slug).filter((slug): slug is string => Boolean(slug));
}

const GAME_SLUGS = `*[_type == "game" && editorialStatus in ["approved", "featured"] && defined(slug.current)]
  | order(_id asc){ "slug": slug.current }`;

const COLLECTION_SLUGS = `*[_type == "gameCollection" && status == "published" && defined(slug.current)]
  | order(_id asc){ "slug": slug.current }`;

/** Every public path to render to a static file at build time. */
export async function collectPrerenderPaths(): Promise<string[]> {
  const [games, collections] = await Promise.all([fetchSlugs(GAME_SLUGS), fetchSlugs(COLLECTION_SLUGS)]);
  const paths = [
    ...STATIC_PUBLIC_PATHS,
    ...collections.map((slug) => `/collections/${slug}`),
    ...games.map((slug) => `/games/${slug}`),
  ];
  return paths.slice(0, MAX_PRERENDER_PAGES);
}
