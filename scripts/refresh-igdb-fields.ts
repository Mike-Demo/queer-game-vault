/**
 * One-off backfill: refreshes every published game through the existing import
 * pipeline so the IGDB-owned fields pick up the new data sets (popularity
 * primitives, organization-based age ratings, store identifiers, alternative
 * names, game type and characters). Editor-owned fields are untouched by the
 * pipeline. Run with: bun scripts/refresh-igdb-fields.ts
 */
import { getSanityWriteClient } from "../src/lib/sanity/write.server";
import { importOneGame } from "../src/lib/import/import.server";

const client = getSanityWriteClient();
const games = await client.fetch<{ igdbId: number; title: string }[]>(
  `*[_type == "game" && defined(igdbId)]{ igdbId, title } | order(title asc)`,
);

console.log(`Refreshing ${games.length} games`);
let ok = 0;
let failed = 0;

for (const [index, game] of games.entries()) {
  const outcome = await importOneGame(game.igdbId, { updateExisting: true });
  if (outcome.result === "failed") {
    failed += 1;
    console.log(`FAIL ${game.title} (${game.igdbId}): ${outcome.error ?? "unknown"}`);
  } else {
    ok += 1;
  }
  if ((index + 1) % 25 === 0) console.log(`… ${index + 1}/${games.length} (ok ${ok}, failed ${failed})`);
}

console.log(`Done. refreshed=${ok} failed=${failed}`);
