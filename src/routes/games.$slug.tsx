import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import { GameCard } from "@/components/GameCard";
import { EmptyState, ErrorState, LoadingState } from "@/components/StateViews";
import { TrackControl } from "@/components/TrackControl";
import { NesBadge, NesContainer, NesText } from "@/design-system/nes-229931";
import { coverUrl, gameQueryOptions, relatedGamesQueryOptions } from "@/lib/publicData";

export const Route = createFileRoute("/games/$slug")({
  staticData: { sitemap: true },
  loader: ({ context, params }) => context.queryClient.ensureQueryData(gameQueryOptions(params.slug)),
  head: ({ loaderData, params }) => {
    const game = loaderData ?? null;
    const title = game ? `${game.title} — QueerCade` : `${params.slug} — QueerCade`;
    const description =
      game?.customDescription?.slice(0, 160) ??
      game?.summary?.slice(0, 160) ??
      "A curated game page: editorial writing alongside metadata sourced from IGDB.";
    const image = game ? coverUrl(game, 640) : null;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
        ...(image
          ? [
              { property: "og:image", content: image },
              { name: "twitter:image", content: image },
            ]
          : []),
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
  metaRows.push({ label: "IGDB ID", value: String(data.igdbId) });

  return (
    <AppShell>
      <div className="stack-lg">
        <div className="detail-layout">
          <NesContainer rounded>
            {cover ? (
              <img className="cover" src={cover} alt={`${data.title} cover art`} />
            ) : (
              <div className="cover-placeholder">
                <NesText>No cover art</NesText>
              </div>
            )}
          </NesContainer>
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
              <NesContainer title="Track this game" rounded>
                <TrackControl
                  game={{ igdbId: data.igdbId, slug: data.slug, title: data.title, coverUrl: cover }}
                />
              </NesContainer>
            ) : null}
            {data.customDescription ? (
              <NesContainer title="From our editors">
                <p>{data.customDescription}</p>
              </NesContainer>
            ) : null}
            {data.summary ? (
              <NesContainer title="Summary (source: IGDB)">
                <p>{data.summary}</p>
              </NesContainer>
            ) : null}
          </div>
        </div>

        <NesContainer title="Metadata (source: IGDB)">
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
            {data.externalLinks.length > 0 ? (
              <div className="row">
                {data.externalLinks.map((link) =>
                  link.url ? (
                    <a key={link.url} href={link.url} rel="noreferrer noopener" target="_blank">
                      {link.label ?? "Link"}
                    </a>
                  ) : null,
                )}
              </div>
            ) : null}
          </div>
        </NesContainer>

        {data.editorNotes ? (
          <NesContainer title="Editor notes">
            <p>{data.editorNotes}</p>
          </NesContainer>
        ) : null}

        {data.sources.length > 0 ? (
          <NesContainer title="Where we found it">
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
          </NesContainer>
        ) : null}

        {data.storyline ? (
          <NesContainer title="Storyline (source: IGDB)">
            <p>{data.storyline}</p>
          </NesContainer>
        ) : null}

        {data.screenshots.length > 0 ? (
          <NesContainer title="Screenshots (source: IGDB)">
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
          </NesContainer>
        ) : null}

        <RelatedGames id={data._id} genreIds={data.genres.map((genre) => genre._id)} />

        {data.importedAt ? (
          <NesText className="text-xs">
            {`Imported ${formatDateTime(data.importedAt)}`}
            {data.lastSyncedAt ? ` · Last synced ${formatDateTime(data.lastSyncedAt)}` : ""}
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
