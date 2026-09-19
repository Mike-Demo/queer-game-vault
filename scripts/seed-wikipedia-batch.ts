/**
 * One-off: merge the Wikipedia LGBTQ+ game extracts, match each title against
 * IGDB, import anything missing, and store each game's character list.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { searchGames, type NormalizedGame } from "../src/lib/igdb/igdb.server";
import { importOneGame } from "../src/lib/import/import.server";
import { gamesByIgdbIdsQuery } from "../src/lib/sanity/queries";
import { getSanityWriteClient } from "../src/lib/sanity/write.server";

interface CharacterEntry {
  name: string;
  identity: string | null;
  sourceUrl: string | null;
}

const UPLOAD_DIR = "/mnt/user-uploads";

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else quoted = false;
      } else field += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") field += char;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const NOISE = new Set(["all", "year", "title", "n/a", "none", "various", "unknown", "tbd"]);

function isPlausibleTitle(title: string): boolean {
  const value = title.trim();
  if (value.length < 3) return false;
  if (/^\d+$/.test(value)) return false;
  if (NOISE.has(value.toLowerCase())) return false;
  if (value.split(/\s+/).length > 12) return false;
  return true;
}

function normalizeTitle(value: string): string {
  return value
    .replace(/\([^)]*\)/g, " ")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .replace(/[–—:]/g, " ")
    .replace(/\band\b/gi, "&")
    .toLowerCase()
    .replace(/[^a-z0-9&]+/g, "")
    .trim();
}

function readCharacters(raw: string): CharacterEntry[] {
  if (!raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as {
      name?: string;
      identity?: string;
      identity_citation?: string;
      name_citation?: string;
    }[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry) => typeof entry?.name === "string" && entry.name.trim().length > 0)
      .map((entry) => ({
        name: entry.name!.trim().slice(0, 120),
        identity: entry.identity?.trim().slice(0, 400) || null,
        sourceUrl: entry.identity_citation ?? entry.name_citation ?? null,
      }));
  } catch {
    return [];
  }
}

interface SourceRow {
  title: string;
  characters: CharacterEntry[];
}

function loadRows(): Map<string, SourceRow> {
  const merged = new Map<string, SourceRow>();
  const files = readdirSync(UPLOAD_DIR).filter((name) => name.endsWith(".csv"));
  for (const file of files) {
    const rows = parseCsv(readFileSync(path.join(UPLOAD_DIR, file), "utf8"));
    const header = rows.shift();
    if (!header) continue;
    const titleIndex = header.indexOf("title");
    const charIndex = header.indexOf("lgbt_characters");
    for (const row of rows) {
      const title = (row[titleIndex] ?? "").trim();
      if (!isPlausibleTitle(title)) continue;
      const key = normalizeTitle(title);
      if (!key) continue;
      const entry = merged.get(key) ?? { title, characters: [] };
      for (const character of readCharacters(row[charIndex] ?? "")) {
        if (!entry.characters.some((existing) => existing.name.toLowerCase() === character.name.toLowerCase())) {
          entry.characters.push(character);
        }
      }
      merged.set(key, entry);
    }
  }
  return merged;
}

function score(candidate: NormalizedGame): number {
  return (candidate.popularity ?? 0) * 10 + (candidate.igdbRatingCount ?? 0) + (candidate.igdbRating ?? 0);
}

async function matchTitle(title: string): Promise<NormalizedGame | null> {
  const wanted = normalizeTitle(title);
  let candidates: NormalizedGame[] = [];
  try {
    candidates = await searchGames(title.replace(/\([^)]*\)/g, " ").trim(), 25, 0);
  } catch (error) {
    console.error(`search failed for ${title}: ${error instanceof Error ? error.message : "unknown"}`);
    return null;
  }
  const exact = candidates.filter(
    (candidate) =>
      normalizeTitle(candidate.title) === wanted && Boolean(candidate.coverUrl) && Boolean(candidate.firstReleaseDate),
  );
  if (exact.length === 0) return null;
  return exact.sort((a, b) => score(b) - score(a))[0]!;
}

async function main(): Promise<void> {
  const rows = loadRows();
  console.log(`clean titles: ${rows.size}`);

  const matched = new Map<number, { game: NormalizedGame; characters: CharacterEntry[]; titles: string[] }>();
  const skipped: string[] = [];

  let index = 0;
  for (const row of rows.values()) {
    index += 1;
    if (index > 1) await new Promise((resolve) => setTimeout(resolve, 260));
    const game = await matchTitle(row.title);
    if (!game) {
      skipped.push(row.title);
      continue;
    }
    const entry = matched.get(game.igdbId) ?? { game, characters: [], titles: [] };
    entry.titles.push(row.title);
    for (const character of row.characters) {
      if (!entry.characters.some((existing) => existing.name.toLowerCase() === character.name.toLowerCase())) {
        entry.characters.push(character);
      }
    }
    matched.set(game.igdbId, entry);
    if (index % 25 === 0) console.log(`matched ${matched.size} of ${index} processed`);
  }

  console.log(`matched games: ${matched.size}, skipped: ${skipped.length}`);

  const client = getSanityWriteClient();
  const igdbIds = [...matched.keys()];
  const existing = new Map<number, string>();
  for (let start = 0; start < igdbIds.length; start += 200) {
    const slice = igdbIds.slice(start, start + 200);
    const found = await client.fetch<{ _id: string; igdbId: number }[]>(gamesByIgdbIdsQuery, { igdbIds: slice });
    for (const doc of found) existing.set(doc.igdbId, doc._id);
  }
  console.log(`already in library: ${existing.size}`);

  let created = 0;
  let failed = 0;
  const failures: string[] = [];

  for (const [igdbId, entry] of matched) {
    let documentId = existing.get(igdbId) ?? null;
    if (!documentId) {
      const outcome = await importOneGame(igdbId, { updateExisting: false });
      if (outcome.result === "failed" || !outcome.gameId) {
        failed += 1;
        failures.push(`${entry.game.title}: ${outcome.error ?? "unknown"}`);
        continue;
      }
      documentId = outcome.gameId;
      created += 1;
      await client.patch(documentId).set({ editorialStatus: "approved" }).commit();
    }

    if (entry.characters.length > 0) {
      const current = await client.fetch<CharacterEntry[] | null>(
        `*[_id == $id][0].lgbtqCharacters[]{ name, identity, sourceUrl }`,
        { id: documentId },
      );
      const list = [...(current ?? [])];
      for (const character of entry.characters) {
        if (!list.some((item) => (item.name ?? "").toLowerCase() === character.name.toLowerCase())) {
          list.push(character);
        }
      }
      await client
        .patch(documentId)
        .set({
          lgbtqCharacters: list.map((character, position) => ({
            _key: `character-${position}`,
            _type: "lgbtqCharacter",
            name: character.name,
            identity: character.identity,
            sourceUrl: character.sourceUrl,
          })),
        })
        .commit();
    }
    await new Promise((resolve) => setTimeout(resolve, 120));
  }

  console.log("=== RESULT ===");
  console.log(JSON.stringify({ created, alreadyPresent: existing.size, failed, skipped: skipped.length }, null, 2));
  console.log("FAILURES:", failures.join(" | ") || "none");
  console.log("SKIPPED:", skipped.join(" | "));
}

await main();
