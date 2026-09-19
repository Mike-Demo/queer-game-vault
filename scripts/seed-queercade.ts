/**
 * One-off seeding script. Run with bun from the project root.
 * Titles come from the editor's source lists; every game detail is pulled live
 * from IGDB through the existing import pipeline.
 */
import { searchGames, type NormalizedGame } from "@/lib/igdb/igdb.server";
import { importOneGame } from "@/lib/import/import.server";
import { getSanityWriteClient } from "@/lib/sanity/write.server";

interface SeedTitle {
  title: string;
  /** Collection slugs this game belongs to, decided from IGDB data at runtime. */
  hints: string[];
}

const SEED_TITLES: SeedTitle[] = [
  { title: "BOSSGAME: The Final Boss Is My Heart", hints: [] },
  { title: "Miitopia", hints: [] },
  { title: "Perfect Gold", hints: [] },
  { title: "Dating Life: Miley X Emily", hints: [] },
  { title: "Astronomical Club For Queers", hints: [] },
  { title: "SeaBed", hints: [] },
  { title: "The Fairy's Song", hints: [] },
  { title: "Clover Reset", hints: [] },
  { title: "Synergia", hints: [] },
  { title: "Arcade Spirits", hints: [] },
  { title: "Please Be Happy", hints: [] },
  { title: "Nova Hearts", hints: [] },
  { title: "Blackberry Honey", hints: [] },
  { title: "Sayonara Wild Hearts", hints: [] },
  { title: "Bayonetta 3", hints: [] },
  { title: "Black Lily's Tale", hints: [] },
  { title: "All The Words She Wrote", hints: [] },
  { title: "South of Midnight", hints: [] },
];

const COLLECTIONS = [
  {
    slug: "best-jrpgs-with-lgbtq-characters",
    title: "Best JRPGs with LGBTQ+ characters",
    description: "Role-playing adventures where queer characters get real arcs, not footnotes.",
  },
  {
    slug: "best-cozy-queer-games",
    title: "Best cozy queer games",
    description: "Soft, low-stakes games to sink into when the world is loud.",
  },
  {
    slug: "best-queer-visual-novels",
    title: "Best queer visual novels",
    description: "Story-first games about falling in love, coming out, and choosing yourself.",
  },
  {
    slug: "best-queer-horror-games",
    title: "Best queer horror games",
    description: "Dread, monsters, and queer protagonists who survive on their own terms.",
  },
];

const FEATURED_TITLES = new Set([
  "Sayonara Wild Hearts",
  "Arcade Spirits",
  "Perfect Gold",
  "BOSSGAME: The Final Boss Is My Heart",
]);

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Best name match: exact first, then prefix, then the most-followed result. */
function pickMatch(term: string, results: NormalizedGame[]): NormalizedGame | null {
  if (results.length === 0) return null;
  const wanted = normalize(term);
  const exact = results.find((game) => normalize(game.title) === wanted);
  if (exact) return exact;
  const starts = results.filter((game) => normalize(game.title).startsWith(wanted));
  const pool = starts.length > 0 ? starts : results;
  return (
    [...pool].sort((a, b) => {
      const scoreA = (a.coverUrl ? 2 : 0) + (a.popularity ?? 0) / 1000;
      const scoreB = (b.coverUrl ? 2 : 0) + (b.popularity ?? 0) / 1000;
      return scoreB - scoreA;
    })[0] ?? null
  );
}

function collectionsFor(game: NormalizedGame): string[] {
  const genres = game.genres.map((genre) => normalize(genre.name));
  const themes = game.themes.map((theme) => normalize(theme));
  const modes = game.gameModes.map((mode) => normalize(mode));
  const haystack = [...genres, ...themes, ...modes].join(" ");
  const slugs: string[] = [];

  const isVisualNovel = haystack.includes("visual novel") || haystack.includes("adventure") && haystack.includes("romance");
  if (haystack.includes("visual novel")) slugs.push("best-queer-visual-novels");
  else if (isVisualNovel && genres.length === 0) slugs.push("best-queer-visual-novels");

  if (haystack.includes("role playing") || haystack.includes("rpg") || haystack.includes("turn based")) {
    slugs.push("best-jrpgs-with-lgbtq-characters");
  }
  if (haystack.includes("horror") || haystack.includes("survival") || haystack.includes("mystery")) {
    slugs.push("best-queer-horror-games");
  }
  if (
    haystack.includes("romance") ||
    haystack.includes("simulator") ||
    haystack.includes("life") ||
    haystack.includes("music") ||
    haystack.includes("puzzle") ||
    haystack.includes("comedy") ||
    haystack.includes("indie")
  ) {
    slugs.push("best-cozy-queer-games");
  }
  return [...new Set(slugs)];
}

async function ensureCollections(): Promise<Record<string, string>> {
  const client = getSanityWriteClient();
  const ids: Record<string, string> = {};
  for (const collection of COLLECTIONS) {
    const existing = await client.fetch<string | null>(
      `*[_type == "gameCollection" && slug.current == $slug][0]._id`,
      { slug: collection.slug },
    );
    const id = existing ?? `collection-${collection.slug}`;
    if (!existing) {
      await client.createIfNotExists({
        _id: id,
        _type: "gameCollection",
        title: collection.title,
        slug: { _type: "slug", current: collection.slug },
        description: collection.description,
        status: "published",
        featured: true,
        publishedAt: new Date().toISOString(),
        games: [],
      });
    }
    ids[collection.slug] = id;
  }
  return ids;
}

async function main(): Promise<void> {
  const client = getSanityWriteClient();
  const collectionIds = await ensureCollections();
  const membership: Record<string, string[]> = {};
  const notFound: string[] = [];
  const imported: { title: string; slug: string | null; lists: string[]; featured: boolean }[] = [];

  for (const seed of SEED_TITLES) {
    let results: NormalizedGame[] = [];
    try {
      results = await searchGames(seed.title, 10, 0);
    } catch (error) {
      console.error(`search failed: ${seed.title}`, error instanceof Error ? error.message : "unknown");
    }
    const match = pickMatch(seed.title, results);
    if (!match) {
      notFound.push(seed.title);
      console.log(`NO MATCH  ${seed.title}`);
      continue;
    }

    const outcome = await importOneGame(match.igdbId, { updateExisting: true });
    if (!outcome.gameId) {
      notFound.push(`${seed.title} (import failed: ${outcome.error ?? "unknown"})`);
      console.log(`FAILED    ${seed.title} -> ${outcome.error}`);
      continue;
    }

    const featured = FEATURED_TITLES.has(seed.title);
    await client
      .patch(outcome.gameId)
      .set({
        editorialStatus: featured ? "featured" : "approved",
        featured,
        reviewedAt: new Date().toISOString(),
      })
      .commit();

    const lists = seed.hints.length > 0 ? seed.hints : collectionsFor(match);
    for (const slug of lists) {
      membership[slug] = [...(membership[slug] ?? []), outcome.gameId];
    }
    imported.push({ title: match.title, slug: outcome.slug, lists, featured });
    console.log(`${outcome.operation.toUpperCase().padEnd(8)} ${match.title} (igdb ${match.igdbId}) lists=${lists.join(",") || "-"}`);
  }

  for (const [slug, gameIds] of Object.entries(membership)) {
    const collectionId = collectionIds[slug];
    if (!collectionId) continue;
    await client
      .patch(collectionId)
      .set({
        games: gameIds.map((gameId) => ({ _key: `game-${gameId}`, _type: "reference", _ref: gameId })),
      })
      .commit();
  }

  // Remove the Chrono Trigger placeholder once real games are in place.
  const sample = await client.fetch<string | null>(`*[_type == "game" && igdbId == 206320][0]._id`);
  if (sample && imported.length > 0) {
    await client.delete({ query: `*[_type == "importRecord" && game._ref == $id]`, params: { id: sample } });
    await client.delete(sample);
    console.log("REMOVED   Chrono Trigger sample");
  }

  console.log("\n--- SUMMARY ---");
  console.log(`imported: ${imported.length}`);
  for (const entry of imported) {
    console.log(`  ${entry.featured ? "*" : " "} ${entry.title} /games/${entry.slug} [${entry.lists.join(", ")}]`);
  }
  console.log(`not matched: ${notFound.length}`);
  for (const title of notFound) console.log(`  ${title}`);
}

await main();
