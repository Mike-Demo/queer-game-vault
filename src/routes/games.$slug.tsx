import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import { GameCard } from "@/components/GameCard";
import { EmptyState, ErrorState, LoadingState } from "@/components/StateViews";
import { TrackControl } from "@/components/TrackControl";
import {
  NesBadge,
  NesText,
} from "@/design-system/nes-229931";
import { Surface } from "@/components/Surface";
import { coverUrl, gameCollectionsQueryOptions, gameQueryOptions, relatedGamesQueryOptions } from "@/lib/publicData";
import {
  breadcrumbs,
  jsonLdScript,
  organization,
  videoGame,
  webPage,
  website,
} from "@/lib/seo/structuredData";
import { useEditorAccess, useSession } from "@/hooks/useAuth";


export const Route = createFileRoute("/games/$slug")({
  staticData: { sitemap: true },
  loader: async ({ context, params }) => {
    const game = await context.queryClient.ensureQueryData(gameQueryOptions(params.slug));
    await context.queryClient.ensureQueryData(gameCollectionsQueryOptions(params.slug));
    return game;
  },
  head: ({ loaderData, params }) => {
    const game = loaderData ?? null;
    const title = game ? `${game.title} — QueerCade` : `${params.slug} — QueerCade`;
    const description =
      game?.customDescription?.slice(0, 160) ??
      game?.summary?.slice(0, 160) ??
      "A curated game page: editorial writing alongside metadata sourced from IGDB.";
    const image = game ? coverUrl(game, 640) : null;
    const path = `/games/${params.slug}`;
    const url = `https://queercade.mikedemo.dev${path}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
        ...(image
          ? [
              { property: "og:image", content: image },
              { name: "twitter:image", content: image },
            ]
          : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        jsonLdScript(
          organization(),
          website(),
          webPage({
            path,
            name: title,
            description,
            primaryImage: image,
          }),
          breadcrumbs([
            { name: "Home", path: "/" },
            { name: "Discover", path: "/discover" },
            { name: game?.title ?? params.slug, path },
          ]),
          game
            ? videoGame({
                path,
                name: game.title,
                description: game.customDescription ?? game.summary,
                image,
                releaseDate: game.firstReleaseDate,
                genres: game.genres.map((genre) => genre.name),
                platforms: game.platforms.map((platform) => platform.name),
                gameModes: game.gameModes,
                keywords: game.themes,
                developer: game.developer?.name ?? null,
                publisher: game.publisher?.name ?? null,
                franchise: game.franchise ?? game.igdbCollectionName,
                sameAs: game.externalLinks
                  .map((link) => link.url)
                  .filter((link): link is string => Boolean(link)),
                screenshots: game.screenshots
                  .map((shot) => shot.url)
                  .filter((src): src is string => Boolean(src)),
                rating:
                  game.igdbRating !== null && game.igdbRatingCount !== null && game.igdbRatingCount > 0
                    ? { value: game.igdbRating, count: game.igdbRatingCount }
                    : null,
                contentRating:
                  game.ageRatings.find((entry) => entry.rating)?.rating ?? null,
              })
            : undefined,
        ),
      ],
    };
  },

  errorComponent: () => (
    <AppShell>
      <ErrorState message="This game could not be loaded. Please refresh." />
    </AppShell>
  ),
  notFoundComponent: () => (
    <AppShell>
      <EmptyState title="Game not found" />
    </AppShell>
  ),
  component: GamePage,
});

function GamePage() {
  const { slug } = Route.useParams();
  const game = useQuery(gameQueryOptions(slug));
  const collections = useQuery(gameCollectionsQueryOptions(slug));
  const { session } = useSession();
  const { data: access } = useEditorAccess(Boolean(session));

  if (game.isPending) {
    return (
      <AppShell>
        <LoadingState label="Loading game" />
      </AppShell>
    );
  }

  if (game.isError) {
    return (
      <AppShell>
        <ErrorState message="This game could not be loaded." />
      </AppShell>
    );
  }

  if (!game.data) {
    return (
      <AppShell>
        <EmptyState title="Game not found">
          <NesText>It may still be in review, or archived.</NesText>
        </EmptyState>
      </AppShell>
    );
  }

  const data = game.data;
  const cover = coverUrl(data, 640);

  const releaseDate = data.firstReleaseDate
    ? new Date(data.firstReleaseDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;
  const formatDateTime = (value: string) =>
    new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

  const metaRows: { label: string; value: string }[] = [];
  if (releaseDate) metaRows.push({ label: "Release date", value: releaseDate });
  if (data.developer) metaRows.push({ label: "Developer", value: data.developer.name });
  if (data.publisher) metaRows.push({ label: "Publisher", value: data.publisher.name });
  const otherCompanies = data.involvedCompanies
    .map((company) => company.name)
    .filter((name) => name !== data.developer?.name && name !== data.publisher?.name);
  if (otherCompanies.length > 0) metaRows.push({ label: "Also involved", value: otherCompanies.join(", ") });
  if (data.franchise) metaRows.push({ label: "Franchise", value: data.franchise });
  if (data.igdbCollectionName) metaRows.push({ label: "Series", value: data.igdbCollectionName });
  if (data.gameModes.length > 0) metaRows.push({ label: "Modes", value: data.gameModes.join(", ") });
  if (data.themes.length > 0) metaRows.push({ label: "Themes", value: data.themes.join(", ") });
  if (data.igdbRating) {
    metaRows.push({
      label: "IGDB rating",
      value: `${Math.round(data.igdbRating)} / 100 from ${data.igdbRatingCount ?? 0} ratings`,
    });
  }
  if (data.totalRating) metaRows.push({ label: "Total rating", value: `${Math.round(data.totalRating)} / 100` });
  if (data.popularity) metaRows.push({ label: "Popularity", value: String(Math.round(data.popularity)) });
  metaRows.push({ label: "IGDB ID", value: String(data.igdbId) });

  const memberCollections = (collections.data ?? []).filter((collection) => collection.slug);

  return (
    <AppShell>
      <div className="stack-lg">
        <div className="detail-layout">
          <Surface rounded>
            {cover ? (
              <img className="cover" src={cover} alt={`${data.title} cover art`} />
            ) : (
              <div className="cover-placeholder">
                <NesText>No cover art</NesText>
              </div>
            )}
          </Surface>
          <div className="stack">
            <h1 className="title-xl"><NesText variant="primary">{data.title}</NesText></h1>
            <div className="row">
              {data.releaseYear ? <NesBadge variant="primary">{String(data.releaseYear)}</NesBadge> : null}
              {data.featured ? <NesBadge variant="warning">Featured</NesBadge> : null}
              {data.platforms.map((platform) => (
                <NesBadge key={platform._id}>{platform.abbreviation ?? platform.name}</NesBadge>
              ))}
            </div>
            {data.slug ? (
              <Surface title="Track this game" rounded>
                <TrackControl
                  game={{ igdbId: data.igdbId, slug: data.slug, title: data.title, coverUrl: cover }}
                />
              </Surface>
            ) : null}
            {data.customDescription ? (
              <Surface title="From our editors">
                <p>{data.customDescription}</p>
              </Surface>
            ) : null}
            {data.summary ? (
              <Surface title="Summary (source: IGDB)">
                <p>{data.summary}</p>
              </Surface>
            ) : null}
          </div>
        </div>

        <Surface title="Metadata (source: IGDB)">
          <div className="stack">
            {data.genres.length > 0 ? (
              <div className="row">
                {data.genres.map((genre) => (
                  <NesBadge key={genre._id} variant="success">
                    {genre.name}
                  </NesBadge>
                ))}
              </div>
            ) : null}
            <dl className="stack">
              {metaRows.map((row) => (
                <div key={row.label} className="row">
                  <dt>
                    <NesText className="text-xs" variant="primary">{`${row.label}:`}</NesText>
                  </dt>
                  <dd>
                    <NesText className="text-xs">{row.value}</NesText>
                  </dd>
                </div>
              ))}
            </dl>
            {data.ageRatings.length > 0 ? (
              <div className="row">
                {data.ageRatings.map((rating, index) => (
                  <NesBadge key={`${rating.category}-${index}`} variant="error">
                    {`${rating.category}: ${rating.rating}`}
                  </NesBadge>
                ))}
              </div>
            ) : null}
            <div className="row">
              {data.externalLinks.map((link) =>
                link.url ? (
                  <a key={link.url} href={link.url} rel="noreferrer noopener" target="_blank">
                    {link.label ?? "Link"}
                  </a>
                ) : null,
              )}
              {data.externalLinks.some((link) => link.url?.includes("humblebundle.com")) ? null : (
                <a
                  href={`https://www.humblebundle.com/store/search?search=${encodeURIComponent(data.title)}`}
                  rel="noreferrer noopener"
                  target="_blank"
                >
                  Find on Humble Bundle
                </a>
              )}
            </div>
          </div>
        </Surface>

        {memberCollections.length > 0 ? (
          <Surface title="In our collections">
            <ul className="source-list">
              {memberCollections.map((collection) => (
                <li key={collection.slug}>
                  <Link to="/collections/$slug" params={{ slug: collection.slug ?? "" }}>
                    {collection.title}
                  </Link>
                </li>
              ))}
            </ul>
          </Surface>
        ) : null}

        {data.editorNotes ? (
          <Surface title="Editor notes">
            <p>{data.editorNotes}</p>
          </Surface>
        ) : null}

        {data.lgbtqCharacters.length > 0 ? (
          <Surface title="LGBTQ+ characters">
            <ul className="source-list">
              {data.lgbtqCharacters.map((character, index) => (
                <li key={`${character.name ?? "character"}-${index}`}>
                  <NesText className="text-xs" variant="primary">{character.name ?? "Unnamed"}</NesText>
                  {character.identity ? <NesText className="text-xs">{` — ${character.identity}`}</NesText> : null}
                  {character.sourceUrl ? (
                    <>
                      {" "}
                      <a href={character.sourceUrl} rel="noreferrer noopener" target="_blank">
                        Source
                      </a>
                    </>
                  ) : null}
                </li>
              ))}
            </ul>
          </Surface>
        ) : null}


        {data.sources.length > 0 ? (
          <Surface title="Where we found it">
            <ul className="source-list">
              {data.sources.map((source) =>
                source.url ? (
                  <li key={source.url}>
                    <a href={source.url} rel="noreferrer noopener" target="_blank">
                      {source.title ?? source.url}
                    </a>
                    {source.publication ? <NesText className="text-xs">{` — ${source.publication}`}</NesText> : null}
                  </li>
                ) : null,
              )}
            </ul>
          </Surface>
        ) : null}

        {data.storyline ? (
          <Surface title="Storyline (source: IGDB)">
            <p>{data.storyline}</p>
          </Surface>
        ) : null}

        {data.screenshots.length > 0 ? (
          <Surface title="Screenshots (source: IGDB)">
            <div className="shot-strip">
              {data.screenshots.map((shot) =>
                shot.url ? (
                  <figure key={shot.url}>
                    <img className="cover" src={shot.url} alt={shot.caption ?? `${data.title} screenshot`} loading="lazy" />
                    {shot.caption ? <figcaption><NesText className="text-xs">{shot.caption}</NesText></figcaption> : null}
                  </figure>
                ) : null,
              )}
            </div>
          </Surface>
        ) : null}

        <RelatedGames id={data._id} genreIds={data.genres.map((genre) => genre._id)} />

        {data.importedAt ? (
          <NesText className="text-xs">
            {`Imported ${formatDateTime(data.importedAt)}`}
            {data.lastSyncedAt ? ` · Last synced ${formatDateTime(data.lastSyncedAt)}` : ""}
            {data.sourceUpdatedAt ? ` · IGDB record updated ${formatDateTime(data.sourceUpdatedAt)}` : ""}
          </NesText>
        ) : null}

        {access?.role ? (
          <NesText className="text-xs" variant="primary">
            {`Editorial status: ${data.editorialStatus} · Import status: ${data.importStatus ?? "unknown"}`}
          </NesText>
        ) : null}
      </div>
    </AppShell>
  );
}

function RelatedGames({ id, genreIds }: { id: string; genreIds: string[] }) {
  const related = useQuery(relatedGamesQueryOptions(id, genreIds));
  const games = related.data ?? [];
  if (games.length === 0) return null;

  return (
    <section className="stack">
      <h2 className="title-md">
        <NesText>Related games</NesText>
      </h2>
      <div className="card-grid">
        {games.map((game) => (
          <GameCard key={game._id} game={game} />
        ))}
      </div>
    </section>
  );
}
