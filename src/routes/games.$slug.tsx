import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import { EmptyState, ErrorState, LoadingState } from "@/components/StateViews";
import { NesBadge, NesContainer, NesText } from "@/design-system/nes-229931";
import { coverUrl, gameQueryOptions } from "@/lib/publicData";

export const Route = createFileRoute("/games/$slug")({
  staticData: { sitemap: true },
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
  loader: ({ context, params }) => context.queryClient.ensureQueryData(gameQueryOptions(params.slug)),
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
            <div className="row">
              {data.genres.map((genre) => (
                <NesBadge key={genre._id} variant="success">
                  {genre.name}
                </NesBadge>
              ))}
            </div>
            {data.developer ? <NesText className="text-xs">{`Developer: ${data.developer.name}`}</NesText> : null}
            {data.publisher ? <NesText className="text-xs">{`Publisher: ${data.publisher.name}`}</NesText> : null}
            {data.franchise ? <NesText className="text-xs">{`Franchise: ${data.franchise}`}</NesText> : null}
            {data.igdbCollectionName ? (
              <NesText className="text-xs">{`Series: ${data.igdbCollectionName}`}</NesText>
            ) : null}
            {data.gameModes.length > 0 ? (
              <NesText className="text-xs">{`Modes: ${data.gameModes.join(", ")}`}</NesText>
            ) : null}
            {data.themes.length > 0 ? (
              <NesText className="text-xs">{`Themes: ${data.themes.join(", ")}`}</NesText>
            ) : null}
            {data.igdbRating ? (
              <NesText className="text-xs">
                {`IGDB rating: ${Math.round(data.igdbRating)} / 100 from ${data.igdbRatingCount ?? 0} ratings`}
              </NesText>
            ) : null}
            {data.ageRatings.map((rating, index) => (
              <NesText key={`${rating.category}-${index}`} className="text-xs">
                {`${rating.category}: ${rating.rating}`}
              </NesText>
            ))}
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
                  <img key={shot.url} className="cover" src={shot.url} alt={`${data.title} screenshot`} loading="lazy" />
                ) : null,
              )}
            </div>
          </NesContainer>
        ) : null}
      </div>
    </AppShell>
  );
}
