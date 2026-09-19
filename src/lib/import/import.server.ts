import type { SanityClient } from "@sanity/client";

import { getGameById, type NormalizedGame } from "@/lib/igdb/igdb.server";
import { gameByIgdbIdQuery } from "@/lib/sanity/queries";
import { getSanityWriteClient } from "@/lib/sanity/write.server";

export interface ImportOutcome {
  igdbId: number;
  title: string;
  operation: "create" | "update" | "refresh" | "skip";
  result: "success" | "partial" | "skipped" | "failed";
  gameId: string | null;
  slug: string | null;
  fieldsChanged: string[];
  warnings: string[];
  error: string | null;
}

/** Fields IGDB owns. Everything else on a game document belongs to editors. */
const SOURCE_FIELDS = [
  "title",
  "summary",
  "storyline",
  "sourceCoverUrl",
  "screenshots",
  "firstReleaseDate",
  "releaseYear",
  "genres",
  "platforms",
  "gameModes",
  "themes",
  "involvedCompanies",
  "developer",
  "publisher",
  "franchise",
  "igdbCollectionName",
  "gameType",
  "alternativeNames",
  "ageRatings",
  "externalLinks",
  "storeLinks",
  "igdbRating",
  "igdbRatingCount",
  "totalRating",
  "popularity",
  "popularityScores",
  "igdbCharacters",
  "sourceUpdatedAt",
] as const;

function docId(prefix: string, igdbId: number): string {
  return `${prefix}-igdb-${igdbId}`;
}

function reference(id: string) {
  return { _type: "reference" as const, _ref: id };
}

async function upsertTaxonomy(client: SanityClient, game: NormalizedGame): Promise<void> {
  const documents = [
    ...game.genres.map((genre) => ({
      _id: docId("genre", genre.igdbId),
      _type: "genre",
      name: genre.name,
      slug: { _type: "slug", current: genre.slug },
      igdbId: genre.igdbId,
    })),
    ...game.platforms.map((platform) => ({
      _id: docId("platform", platform.igdbId),
      _type: "platform",
      name: platform.name,
      slug: { _type: "slug", current: platform.slug },
      abbreviation: platform.abbreviation,
      igdbId: platform.igdbId,
    })),
    ...game.companies.map((company) => ({
      _id: docId("company", company.igdbId),
      _type: "company",
      name: company.name,
      slug: { _type: "slug", current: company.slug },
      igdbId: company.igdbId,
      description: company.description,
    })),
  ];

  if (documents.length === 0) return;

  // createIfNotExists keeps existing taxonomy documents (and any editor edits
  // to them) intact, so repeated imports never duplicate genres or studios.
  let transaction = client.transaction();
  for (const document of documents) {
    transaction = transaction.createIfNotExists(document);
  }
  await transaction.commit({ visibility: "async" });
}

function sourcePayload(game: NormalizedGame): Record<string, unknown> {
  const developer = game.companies.find((company) => company.isDeveloper);
  const publisher = game.companies.find((company) => company.isPublisher);

  return {
    title: game.title,
    summary: game.summary,
    storyline: game.storyline,
    sourceCoverUrl: game.coverUrl,
    screenshots: game.screenshots.map((shot, index) => ({
      _key: `shot-${index}`,
      _type: "screenshot",
      url: shot.url,
      caption: shot.caption,
    })),
    firstReleaseDate: game.firstReleaseDate,
    releaseYear: game.releaseYear,
    genres: game.genres.map((genre) => ({ _key: `genre-${genre.igdbId}`, ...reference(docId("genre", genre.igdbId)) })),
    platforms: game.platforms.map((platform) => ({
      _key: `platform-${platform.igdbId}`,
      ...reference(docId("platform", platform.igdbId)),
    })),
    gameModes: game.gameModes,
    themes: game.themes,
    involvedCompanies: game.companies.map((company) => ({
      _key: `company-${company.igdbId}`,
      ...reference(docId("company", company.igdbId)),
    })),
    developer: developer ? reference(docId("company", developer.igdbId)) : null,
    publisher: publisher ? reference(docId("company", publisher.igdbId)) : null,
    franchise: game.franchise,
    igdbCollectionName: game.igdbCollectionName,
    gameType: game.gameType,
    alternativeNames: game.alternativeNames,
    ageRatings: game.ageRatings.map((rating, index) => ({
      _key: `rating-${index}`,
      _type: "ageRating",
      category: rating.category,
      rating: rating.rating,
      descriptors: rating.descriptors,
    })),
    externalLinks: game.externalLinks.map((link, index) => ({
      _key: `link-${index}`,
      _type: "externalLink",
      ...link,
    })),
    storeLinks: game.storeLinks.map((link, index) => ({
      _key: `store-${index}`,
      _type: "storeLink",
      store: link.store,
      url: link.url,
    })),
    igdbRating: game.igdbRating,
    igdbRatingCount: game.igdbRatingCount,
    totalRating: game.totalRating,
    popularity: game.popularity,
    popularityScores: game.popularityScores.map((score, index) => ({
      _key: `pop-${index}`,
      _type: "popularityScore",
      type: score.type,
      value: score.value,
    })),
    igdbCharacters: game.characters.map((character) => ({
      _key: `character-${character.igdbId}`,
      _type: "igdbCharacter",
      igdbId: character.igdbId,
      name: character.name,
      description: character.description,
      gender: character.gender,
      species: character.species,
      mugshotUrl: character.mugshotUrl,
      igdbUrl: character.igdbUrl,
    })),
    sourceUpdatedAt: game.sourceUpdatedAt,
  };
}

async function uniqueSlug(client: SanityClient, game: NormalizedGame, gameId: string): Promise<string> {
  const taken = await client.fetch<string | null>(
    `*[_type == "game" && slug.current == $slug && _id != $id][0]._id`,
    { slug: game.slug, id: gameId },
  );
  return taken ? `${game.slug}-${game.igdbId}` : game.slug;
}

// Sanity adds `_key` to array items and may reorder object keys, so compare a
// normalized form to avoid reporting unchanged fields as updated.
function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    const source = value as Record<string, unknown>;
    return Object.keys(source)
      .filter((key) => key !== "_key")
      .sort()
      .reduce<Record<string, unknown>>((accumulator, key) => {
        accumulator[key] = stableValue(source[key]);
        return accumulator;
      }, {});
  }
  return value ?? null;
}

function diffFields(existing: Record<string, unknown>, next: Record<string, unknown>): string[] {
  return SOURCE_FIELDS.filter((field) => {
    const before = JSON.stringify(stableValue(existing[field] ?? null));
    const after = JSON.stringify(stableValue(next[field] ?? null));
    return before !== after;
  });
}


async function logImportRecord(
  client: SanityClient,
  outcome: ImportOutcome,
  requestedAt: string,
): Promise<void> {
  try {
    await client.create({
      _type: "importRecord",
      igdbId: outcome.igdbId,
      gameTitle: outcome.title,
      game: outcome.gameId ? reference(outcome.gameId) : undefined,
      requestedAt,
      completedAt: new Date().toISOString(),
      operation: outcome.operation,
      result: outcome.result,
      fieldsChanged: outcome.fieldsChanged,
      warningMessages: outcome.warnings,
      errorMessage: outcome.error,
    });
  } catch (error) {
    console.error("Import record could not be written", error instanceof Error ? error.message : "unknown");
  }
}

export interface ImportOptions {
  /** When false, an existing game is left untouched and reported as skipped. */
  updateExisting: boolean;
}

/** Imports or refreshes one IGDB game. Idempotent on the IGDB id. */
export async function importOneGame(igdbId: number, options: ImportOptions): Promise<ImportOutcome> {
  const requestedAt = new Date().toISOString();
  const client = getSanityWriteClient();
  const outcome: ImportOutcome = {
    igdbId,
    title: `IGDB game ${igdbId}`,
    operation: "create",
    result: "failed",
    gameId: null,
    slug: null,
    fieldsChanged: [],
    warnings: [],
    error: null,
  };

  try {
    const game = await getGameById(igdbId);
    outcome.title = game.title;
    if (!game.coverUrl) outcome.warnings.push("IGDB has no cover image for this game.");
    if (!game.summary) outcome.warnings.push("IGDB has no summary for this game.");

    const existing = await client.fetch<{ _id: string; editorialStatus?: string } | null>(gameByIgdbIdQuery, {
      igdbId,
    });

    if (existing && !options.updateExisting) {
      outcome.operation = "skip";
      outcome.result = "skipped";
      outcome.gameId = existing._id;
      outcome.error = "This game is already in your Sanity library.";
      await logImportRecord(client, outcome, requestedAt);
      return outcome;
    }

    await upsertTaxonomy(client, game);
    const payload = sourcePayload(game);
    const now = new Date().toISOString();

    if (existing) {
      const current = await client.getDocument(existing._id);
      outcome.operation = "refresh";
      outcome.gameId = existing._id;
      outcome.fieldsChanged = diffFields((current ?? {}) as Record<string, unknown>, payload);
      // Editorial fields are deliberately absent from this patch.
      const patched = await client
        .patch(existing._id)
        .set({ ...payload, igdbId, lastSyncedAt: now, importStatus: "complete" })
        .commit();
      outcome.slug = (patched as { slug?: { current?: string } }).slug?.current ?? null;
    } else {
      const gameId = docId("game", igdbId);
      const slug = await uniqueSlug(client, game, gameId);
      await client.createIfNotExists({
        _id: gameId,
        _type: "game",
        igdbId,
        title: game.title,
        slug: { _type: "slug", current: slug },
        editorialStatus: "imported",
        featured: false,
        importStatus: "complete",
        importedAt: now,
        lastSyncedAt: now,
      });
      await client.patch(gameId).set(payload).commit();
      outcome.operation = "create";
      outcome.gameId = gameId;
      outcome.slug = slug;
      outcome.fieldsChanged = [...SOURCE_FIELDS];
    }

    outcome.result = outcome.warnings.length > 0 ? "partial" : "success";
    await logImportRecord(client, outcome, requestedAt);
    return outcome;
  } catch (error) {
    const code = error instanceof Error ? error.message : "IMPORT_FAILED";
    console.error(`Import failed for IGDB ${igdbId}`, code);
    const { igdbErrorMessage } = await import("@/lib/igdb/igdb.server");
    outcome.result = "failed";
    outcome.error = igdbErrorMessage(code);
    try {
      await logImportRecord(client, outcome, requestedAt);
    } catch {
      // logging is best effort
    }
    return outcome;
  }
}

/** Sequential bulk import: conservative on IGDB rate limits, fault tolerant. */
export async function importManyGames(igdbIds: number[], options: ImportOptions): Promise<ImportOutcome[]> {
  const outcomes: ImportOutcome[] = [];
  for (const [index, igdbId] of igdbIds.entries()) {
    if (index > 0) await new Promise((resolve) => setTimeout(resolve, 260));
    outcomes.push(await importOneGame(igdbId, options));
  }
  return outcomes;
}
