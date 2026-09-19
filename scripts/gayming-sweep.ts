/**
 * One-off sweep: catalog every game Gayming Magazine writes about.
 *
 * Phases:
 *   bun scripts/gayming-sweep.ts candidates  -> tags + Firecrawl article titles
 *   bun scripts/gayming-sweep.ts match       -> validate candidates against IGDB
 *   bun scripts/gayming-sweep.ts import      -> import matches, record source links
 */

import { writeFileSync, readFileSync, existsSync } from "node:fs";

const OUT = "/tmp/fc";
const CANDIDATES = `${OUT}/candidates.json`;
const MATCHES = `${OUT}/matches.json`;
const REPORT = `${OUT}/report.json`;
const PAGES = `${OUT}/pages.json`;
const CHECKED = `${OUT}/checked.json`;

const GATEWAY = "https://connector-gateway.lovable.dev/firecrawl/v2";

const LISTING_CATEGORIES: { path: string; maxPages: number }[] = [
  { path: "reviews", maxPages: 40 },
  { path: "previews", maxPages: 15 },
  { path: "features", maxPages: 30 },
  { path: "guides", maxPages: 10 },
  { path: "features/gayme-of-the-week", maxPages: 15 },
  { path: "features/indie-gayming", maxPages: 15 },
  { path: "features/indie-way", maxPages: 10 },
  { path: "features/kitty-reviews", maxPages: 5 },
  { path: "features/retro-gayming", maxPages: 5 },
  { path: "mobile-gayming", maxPages: 5 },
];

const TAG_SITEMAPS = [
  "https://gaymingmag.com/post_tag-sitemap.xml",
  "https://gaymingmag.com/post_tag-sitemap2.xml",
];

/** Words that are never game titles on this site. */
const STOPWORDS = new Set([
  "news", "movies", "film", "tv", "anime", "comics", "cosplay", "esports", "interview",
  "interviews", "opinion", "guides", "reviews", "review", "preview", "previews", "features",
  "feature", "lgbtq", "lgbt", "lgbtqia", "pride", "queer", "gay", "lesbian", "bisexual",
  "transgender", "trans", "nonbinary", "drag", "podcast", "podcasts", "music", "streamers",
  "streamer", "twitch", "youtube", "tiktok", "kickstarter", "steam", "epic games", "xbox",
  "playstation", "nintendo", "nintendo switch", "pc", "ps5", "ps4", "mobile", "tabletop",
  "dnd", "mtg", "modding", "mods", "multiplayer", "indie", "indie games", "sale", "sales",
  "charity", "events", "competitions", "quiz", "shopping", "lifestyle", "community",
  "representation", "diversity", "accessibility", "gaming", "games", "video games",
  "gayming awards", "gayming magazine", "gayming live", "digipride",
]);

interface Candidate {
  /** Candidate game title. */
  name: string;
  sources: { title: string; url: string }[];
}

function normalizeTitle(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u2018\u2019\u201c\u201d]/g, "")
    .replace(/&amp;/g, "&")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(the|a|an)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, { headers: { "user-agent": "QueerCade catalog bot" } });
  if (!response.ok) throw new Error(`${url} -> ${response.status}`);
  return response.text();
}

function sitemapLocations(xml: string): string[] {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]!);
}

function titleFromTagSlug(url: string): string {
  const slug = url.replace(/\/$/, "").split("/").pop() ?? "";
  return slug.replace(/-/g, " ").trim();
}

async function firecrawlScrape(url: string): Promise<string> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connectionKey = process.env["FIRECRAWL_API_KEY"];
  if (!lovableKey || !connectionKey) throw new Error("Firecrawl credentials missing");

  for (let attempt = 0; ; attempt += 1) {
  const response = await fetch(`${GATEWAY}/scrape`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": connectionKey,
    },
    body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
  });
  const body = (await response.json()) as { data?: { markdown?: string }; markdown?: string; error?: string };
  if (response.status === 429 && attempt < 8) {
    await new Promise((resolve) => setTimeout(resolve, 8000));
    continue;
  }
  if (!response.ok) throw new Error(`Firecrawl ${response.status}: ${body.error ?? "failed"}`);
  return body.data?.markdown ?? body.markdown ?? "";
  }
}

/** Pulls article title/url pairs out of a category listing page's markdown. */
function articlesFromListing(markdown: string): { title: string; url: string }[] {
  const found = new Map<string, string>();
  for (const match of markdown.matchAll(/\[([^\]]+)\]\((https:\/\/gaymingmag\.com\/\d{4}\/\d{2}\/[^)\s"]+)/g)) {
    const title = match[1]!.trim();
    const url = match[2]!;
    if (!title || title.startsWith("!") || /^read more$/i.test(title)) continue;
    if (!found.has(url)) found.set(url, title);
  }
  return [...found].map(([url, title]) => ({ title, url }));
}

/** Derives plausible game titles from an article headline. */
function gameNamesFromHeadline(headline: string): string[] {
  const cleaned = headline
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\s+/g, " ")
    .trim();

  const parts: string[] = [];
  // Drop a column prefix: "Confetti's Cozy Corner: Coffee Talk Tokyo Review"
  const colonIndex = cleaned.indexOf(":");
  if (colonIndex > 0 && colonIndex < cleaned.length - 3) parts.push(cleaned.slice(colonIndex + 1).trim());
  parts.push(cleaned);

  const results: string[] = [];
  for (const part of parts) {
    let name = part
      .replace(/\s*[-–—]\s*(review|preview|hands[- ]on|impressions|interview).*$/i, "")
      .replace(/\b(review|preview|hands[- ]on|impressions|early access impressions)\b\s*$/i, "")
      .replace(/^(review|preview|hands[- ]on)\s*[:-]?\s*/i, "")
      .replace(/^(is|why|how|what|the best|our|we|i)\b.*/i, "")
      .replace(/["']/g, "")
      .trim();
    name = name.replace(/\s*\((?:[^)]*)\)\s*$/, "").trim();
    if (name.length >= 3 && name.split(" ").length <= 9) results.push(name);
  }
  return results;
}

function addCandidate(
  map: Map<string, Candidate>,
  name: string,
  source: { title: string; url: string },
): void {
  const key = normalizeTitle(name);
  if (!key || key.length < 3) return;
  if (STOPWORDS.has(key)) return;
  if (/^\d{4}$/.test(key)) return;
  const existing = map.get(key);
  if (existing) {
    if (!existing.sources.some((item) => item.url === source.url)) existing.sources.push(source);
    return;
  }
  map.set(key, { name, sources: [source] });
}

async function collectCandidates(): Promise<void> {
  const candidates = new Map<string, Candidate>();
  const seenPages = new Set<string>(
    existsSync(PAGES) ? (JSON.parse(readFileSync(PAGES, "utf8")) as string[]) : [],
  );
  if (existsSync(CANDIDATES)) {
    for (const item of JSON.parse(readFileSync(CANDIDATES, "utf8")) as Candidate[]) {
      candidates.set(normalizeTitle(item.name), item);
    }
  }

  for (const sitemap of TAG_SITEMAPS) {
    const urls = sitemapLocations(await fetchText(sitemap));
    for (const url of urls) {
      addCandidate(candidates, titleFromTagSlug(url), { title: `Tag: ${titleFromTagSlug(url)}`, url });
    }
    console.log(`tags from ${sitemap}: ${urls.length}`);
  }

  for (const category of LISTING_CATEGORIES) {
    let page = 1;
    let empty = 0;
    while (page <= category.maxPages) {
      const url =
        page === 1
          ? `https://gaymingmag.com/category/${category.path}/`
          : `https://gaymingmag.com/category/${category.path}/page/${page}/`;
      if (seenPages.has(url)) {
        page += 1;
        continue;
      }
      let markdown = "";
      try {
        markdown = await firecrawlScrape(url);
      } catch (error) {
        console.log(`  ${url} failed: ${error instanceof Error ? error.message : "unknown"}`);
        break;
      }
      const articles = articlesFromListing(markdown);
      if (articles.length === 0) {
        empty += 1;
        if (empty >= 1) break;
      }
      for (const article of articles) {
        for (const name of gameNamesFromHeadline(article.title)) addCandidate(candidates, name, article);
      }
      console.log(`  ${url}: ${articles.length} articles (candidates ${candidates.size})`);
      writeFileSync(CANDIDATES, JSON.stringify([...candidates.values()], null, 2));
      seenPages.add(url);
      writeFileSync(PAGES, JSON.stringify([...seenPages], null, 2));
      page += 1;
    }
  }

  writeFileSync(CANDIDATES, JSON.stringify([...candidates.values()], null, 2));
  console.log(`candidates: ${candidates.size} -> ${CANDIDATES}`);
}

interface Match extends Candidate {
  igdbId: number;
  igdbTitle: string;
}

async function matchCandidates(): Promise<void> {
  const { searchGames } = await import("../src/lib/igdb/igdb.server");
  const candidates = JSON.parse(readFileSync(CANDIDATES, "utf8")) as Candidate[];
  const done: Match[] = existsSync(MATCHES) ? (JSON.parse(readFileSync(MATCHES, "utf8")) as Match[]) : [];
  const seen = new Set<string>(
    existsSync(CHECKED) ? (JSON.parse(readFileSync(CHECKED, "utf8")) as string[]) : [],
  );
  for (const item of done) seen.add(normalizeTitle(item.name));
  const unmatched: string[] = existsSync(`${OUT}/unmatched.json`)
    ? (JSON.parse(readFileSync(`${OUT}/unmatched.json`, "utf8")) as string[])
    : [];

  let index = 0;
  for (const candidate of candidates) {
    index += 1;
    if (seen.has(normalizeTitle(candidate.name))) continue;
    try {
      const results = await searchGames(candidate.name, 12, 0);
      const wanted = normalizeTitle(candidate.name);
      const exact = results.filter((game) => normalizeTitle(game.title) === wanted);
      const best = exact.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))[0];
      if (best) {
        done.push({ ...candidate, igdbId: best.igdbId, igdbTitle: best.title });
      } else {
        unmatched.push(candidate.name);
      }
    } catch (error) {
      console.log(`search failed for ${candidate.name}: ${error instanceof Error ? error.message : "unknown"}`);
      unmatched.push(candidate.name);
    }
    seen.add(normalizeTitle(candidate.name));
    if (index % 50 === 0) {
      writeFileSync(MATCHES, JSON.stringify(done, null, 2));
      writeFileSync(CHECKED, JSON.stringify([...seen], null, 2));
      writeFileSync(`${OUT}/unmatched.json`, JSON.stringify(unmatched, null, 2));
      console.log(`${index}/${candidates.length} checked, ${done.length} matched`);
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  writeFileSync(MATCHES, JSON.stringify(done, null, 2));
  writeFileSync(CHECKED, JSON.stringify([...seen], null, 2));
  writeFileSync(`${OUT}/unmatched.json`, JSON.stringify(unmatched, null, 2));
  console.log(`matched ${done.length}, unmatched ${unmatched.length}`);
}


/** Extra terms that IGDB happens to have as titles but the site uses as topics. */
const GENERIC_TERMS = new Set([
  "books", "cozy", "guide", "list", "map", "sports", "sci fi", "fandom", "event", "icon",
  "glitch", "russia", "black friday", "battle royale", "android", "vinyl", "winter", "detox",
  "daddy", "patron", "storm", "dawn", "brat", "amazon", "epic", "unity", "capcom", "blizzard",
  "gust", "ace", "clue", "eco", "karma", "panic", "moto", "roblox", "avatar last airbender",
  "barbie", "bleach", "akira", "loki", "venom", "black panther", "shrek", "yuri", "domina",
]);

/** Keeps only matches that look like real, released games with artwork. */
async function filterMatches(): Promise<void> {
  const { getGameById } = await import("../src/lib/igdb/igdb.server");
  const matches = JSON.parse(readFileSync(MATCHES, "utf8")) as Match[];
  const keptPath = `${OUT}/kept.json`;
  const kept: Match[] = existsSync(keptPath) ? (JSON.parse(readFileSync(keptPath, "utf8")) as Match[]) : [];
  const droppedPath = `${OUT}/dropped.json`;
  const dropped: string[] = existsSync(droppedPath)
    ? (JSON.parse(readFileSync(droppedPath, "utf8")) as string[])
    : [];
  const handled = new Set([...kept.map((item) => item.igdbId)]);
  const droppedNames = new Set(dropped);

  for (const match of matches) {
    if (handled.has(match.igdbId)) continue;
    if (GENERIC_TERMS.has(normalizeTitle(match.name))) {
      droppedNames.add(`${match.name} (generic term)`);
      handled.add(match.igdbId);
      continue;
    }
    try {
      const game = await getGameById(match.igdbId);
      const solid = Boolean(game.coverUrl) && Boolean(game.firstReleaseDate);
      if (solid) kept.push(match);
      else droppedNames.add(`${match.name} (no cover or release date)`);
    } catch {
      droppedNames.add(`${match.name} (IGDB lookup failed)`);
    }
    handled.add(match.igdbId);
    if (handled.size % 50 === 0) {
      writeFileSync(keptPath, JSON.stringify(kept, null, 2));
      writeFileSync(droppedPath, JSON.stringify([...droppedNames], null, 2));
      console.log(`${handled.size}/${matches.length} vetted, kept ${kept.length}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  writeFileSync(keptPath, JSON.stringify(kept, null, 2));
  writeFileSync(droppedPath, JSON.stringify([...droppedNames], null, 2));
  console.log(`kept ${kept.length}, dropped ${droppedNames.size}`);
}

async function importMatches(): Promise<void> {
  const { importOneGame } = await import("../src/lib/import/import.server");
  const { getSanityWriteClient } = await import("../src/lib/sanity/write.server");
  const client = getSanityWriteClient();

  const matches = JSON.parse(readFileSync(`${OUT}/kept.json`, "utf8")) as Match[];
  // Several candidates can resolve to the same IGDB game; merge their sources.
  const byIgdbId = new Map<number, Match>();
  for (const match of matches) {
    const existing = byIgdbId.get(match.igdbId);
    if (!existing) {
      byIgdbId.set(match.igdbId, { ...match, sources: [...match.sources] });
      continue;
    }
    for (const source of match.sources) {
      if (!existing.sources.some((item) => item.url === source.url)) existing.sources.push(source);
    }
  }

  const existingIds = new Set(
    await client.fetch<number[]>(`*[_type == "game" && defined(igdbId)].igdbId`),
  );

  const created: string[] = [];
  const alreadyPresent: string[] = [];
  const failed: { title: string; error: string }[] = [];
  const capturedAt = new Date().toISOString();

  let index = 0;
  for (const match of byIgdbId.values()) {
    index += 1;
    const isNew = !existingIds.has(match.igdbId);
    let gameId: string | null = `game-igdb-${match.igdbId}`;

    if (isNew) {
      const outcome = await importOneGame(match.igdbId, { updateExisting: false });
      if (outcome.result === "failed") {
        failed.push({ title: match.igdbTitle, error: outcome.error ?? "unknown" });
        continue;
      }
      gameId = outcome.gameId;
      if (gameId) {
        await client.patch(gameId).set({ editorialStatus: "approved" }).commit({ visibility: "async" });
      }
      created.push(match.igdbTitle);
    } else {
      alreadyPresent.push(match.igdbTitle);
    }

    if (gameId) {
      const current = await client.fetch<{ sources?: { url?: string }[] } | null>(
        `*[_id == $id][0]{ sources }`,
        { id: gameId },
      );
      const known = new Set((current?.sources ?? []).map((item) => item.url));
      const additions = match.sources
        .filter((source) => !known.has(source.url))
        .slice(0, 6)
        .map((source, position) => ({
          _key: `src-${match.igdbId}-${known.size + position}`,
          _type: "gameSource",
          publication: "Gayming Magazine",
          title: source.title,
          url: source.url,
          capturedAt,
        }));
      if (additions.length > 0) {
        await client
          .patch(gameId)
          .setIfMissing({ sources: [] })
          .append("sources", additions)
          .commit({ visibility: "async" });
      }
    }

    if (index % 20 === 0) console.log(`${index}/${byIgdbId.size} processed (new ${created.length})`);
  }

  const total = await client.fetch<number>(`count(*[_type == "game"])`);
  const report = { created, alreadyPresent, failed, total };
  writeFileSync(REPORT, JSON.stringify(report, null, 2));
  console.log(
    `created ${created.length}, already present ${alreadyPresent.length}, failed ${failed.length}, library total ${total}`,
  );
}

const phase = process.argv[2];
if (phase === "candidates") await collectCandidates();
else if (phase === "match") await matchCandidates();
else if (phase === "filter") await filterMatches();
else if (phase === "import") await importMatches();
else throw new Error("usage: candidates | match | filter | import");
