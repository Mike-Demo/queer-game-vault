import { getSanityWriteClient } from "../src/lib/sanity/write.server";

const titles = [
  "Fire Emblem: The Blazing Blade",
  "Corpse Party: Blood Covered",
  "999: Nine Hours, Nine Persons, Nine Doors",
  "Grand Theft Auto: The Ballad of Gay Tony",
  "Fire Emblem Fates",
  "Trails Through Daybreak II",
  "Pokémon X and Y",
  "Tom Clancy's Rainbow Six Siege",
  "Misericorde: Volume Two",
  "No Body",
  "Overwatch",
];

const client = getSanityWriteClient();
for (const title of titles) {
  const found = await client.fetch<string[]>(`*[_type == "game" && title match $q].title`, { q: `${title.split(":")[0]}*` });
  console.log(`${title} -> ${found.length > 0 ? found.slice(0, 4).join(" / ") : "MISSING"}`);
}
const total = await client.fetch<number>(`count(*[_type == "game"])`);
console.log("total games:", total);
