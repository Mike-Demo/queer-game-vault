import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import { GameCard } from "@/components/GameCard";
import { EmptyState, ErrorState, LoadingState } from "@/components/StateViews";
import { NesButton, NesText } from "@/design-system/nes-229931";
import { coverUrl, libraryInfiniteQueryOptions, siteSettingsQueryOptions } from "@/lib/publicData";
import {
  breadcrumbs,
  DEFAULT_SHARE_IMAGE,
  itemList,
  jsonLdScript,
  organization,
  webPage,
  website,
} from "@/lib/seo/structuredData";

export const Route = createFileRoute("/library")({
  staticData: { sitemap: true },
  head: ({ loaderData }) => {
    const games = loaderData?.pages.flat() ?? [];
    return {
      meta: [
        { title: "Game library — QueerCade" },
        {
          name: "description",
          content: "Every approved game in the QueerCade arcade, imported from IGDB and reviewed by editors.",
        },
        { property: "og:title", content: "Game library — QueerCade" },
        { property: "og:description", content: "Approved and featured games in the QueerCade arcade." },
        { property: "og:url", content: "https://queercade.mikedemo.dev/library" },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        { property: "og:image", content: DEFAULT_SHARE_IMAGE },
        { name: "twitter:image", content: DEFAULT_SHARE_IMAGE },
      ],
      links: [{ rel: "canonical", href: "https://queercade.mikedemo.dev/library" }],
      scripts: [
        jsonLdScript(
          organization(),
          website(),
          webPage({
            type: "CollectionPage",
            path: "/library",
            name: "Game library — QueerCade",
            description: "Every approved game in the QueerCade arcade, imported from IGDB and reviewed by editors.",
          }),
          breadcrumbs([
            { name: "Home", path: "/" },
            { name: "Library", path: "/library" },
          ]),
          itemList(
            "Library games",
            games.map((game) => ({
              name: game.title,
              path: game.slug ? `/games/${game.slug}` : null,
              image: coverUrl(game, 400),
            })),
          ),
        ),
      ],
    };
  },
  loader: ({ context }) => context.queryClient.ensureInfiniteQueryData(libraryInfiniteQueryOptions),
  errorComponent: () => (
    <AppShell>
      <ErrorState message="The library could not be loaded. Please refresh." />
    </AppShell>
  ),
  component: Library,
});

function Library() {
  const library = useInfiniteQuery(libraryInfiniteQueryOptions);
  const settings = useQuery(siteSettingsQueryOptions);
  const games = library.data?.pages.flat() ?? [];

  return (
    <AppShell>
      <div className="stack-lg">
        <h1 className="title-xl"><NesText variant="primary">Game library</NesText></h1>
        {library.isPending ? <LoadingState label="Loading the library" /> : null}
        {library.isError ? <ErrorState message="The library could not be loaded." /> : null}
        {library.data && games.length === 0 ? (
          <EmptyState title="The cabinet is empty">
            <NesText>{settings.data?.emptyStateCopy}</NesText>
          </EmptyState>
        ) : null}
        {games.length > 0 ? (
          <>
            <div className="card-grid">
              {games.map((game, index) => (
                <GameCard key={game._id} game={game} priority={index < 4} />
              ))}
            </div>
            <NesText className="text-xs">{games.length} games shown</NesText>
            {library.hasNextPage ? (
              <NesButton
                type="button"
                variant="primary"
                onClick={() => void library.fetchNextPage()}
                disabled={library.isFetchingNextPage}
              >
                {library.isFetchingNextPage ? "Loading…" : "Load more games"}
              </NesButton>
            ) : null}
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
