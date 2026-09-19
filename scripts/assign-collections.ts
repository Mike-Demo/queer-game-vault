/**
 * One-off: sets the membership of the four curated lists from deliberate
 * editorial choices, judged against the genres and themes IGDB returned.
 */
import { getSanityWriteClient } from "@/lib/sanity/write.server";

const LISTS: Record<string, string[]> = {
  "best-queer-visual-novels": [
    "All the Words She Wrote",
    "Arcade Spirits",
    "Blackberry Honey",
    "Bossgame: The Final Boss is My Heart",
    "Clover Reset",
    "Dating Life: Miley X Emily",
    "Nova Hearts",
    "Perfect Gold: The Alchemy of Happiness",
    "Please Be Happy",
    "SeaBed",
    "Synergia",
    "The Fairy's Song",
  ],
  "best-jrpgs-with-lgbtq-characters": [
    "Bossgame: The Final Boss is My Heart",
    "Miitopia",
    "Nova Hearts",
    "Perfect Gold: The Alchemy of Happiness",
    "Synergia",
  ],
  "best-queer-horror-games": ["SeaBed", "Synergia", "South of Midnight", "Black Lily's Tale"],
  "best-cozy-queer-games": [
    "All the Words She Wrote",
    "Arcade Spirits",
    "Astronomical Club for Queers",
    "Bossgame: The Final Boss is My Heart",
    "Clover Reset",
    "Miitopia",
    "Perfect Gold: The Alchemy of Happiness",
    "Please Be Happy",
    "Sayonara Wild Hearts",
    "The Fairy's Song",
  ],
};

const client = getSanityWriteClient();
const games = await client.fetch<{ _id: string; title: string }[]>(`*[_type == "game"]{_id, title}`);
const byTitle = new Map(games.map((game) => [game.title, game._id]));

for (const [slug, titles] of Object.entries(LISTS)) {
  const collectionId = await client.fetch<string | null>(
    `*[_type == "gameCollection" && slug.current == $slug][0]._id`,
    { slug },
  );
  if (!collectionId) {
    console.log(`MISSING LIST ${slug}`);
    continue;
  }
  const refs: { _key: string; _type: "reference"; _ref: string }[] = [];
  for (const title of titles) {
    const id = byTitle.get(title);
    if (!id) {
      console.log(`  no game document for "${title}"`);
      continue;
    }
    refs.push({ _key: `game-${id}`, _type: "reference", _ref: id });
  }
  await client.patch(collectionId).set({ games: refs }).commit();
  console.log(`${slug}: ${refs.length} games`);
}
