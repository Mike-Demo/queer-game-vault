import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import { GameCard } from "@/components/GameCard";
import { EmptyState, ErrorState, LoadingState } from "@/components/StateViews";
import { NesText } from "@/design-system/nes-229931";
import { libraryQueryOptions, siteSettingsQueryOptions } from "@/lib/publicData";

export const Route = createFileRoute("/library")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Game library — QueerCade" },
      {
        name: "description",
        content: "Every approved game in the QueerCade arcade, imported from IGDB and reviewed by editors.",
      },
      { property: "og:title", content: "Game library — QueerCade" },
      { property: "og:description", content: "Approved and featured games in the QueerCade arcade." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(libraryQueryOptions),
  errorComponent: () => (
    <AppShell>
      <ErrorState message="The library could not be loaded. Please refresh." />
    </AppShell>
  ),
  component: Library,
});

function Library() {
  const games = useQuery(libraryQueryOptions);
  const settings = useQuery(siteSettingsQueryOptions);

  return (
    <AppShell>
      <div className="stack-lg">
        <h1 className="title-xl"><NesText variant="primary">Game library</NesText></h1>
        {games.isPending ? <LoadingState label="Loading the library" /> : null}
        {games.isError ? <ErrorState message="The library could not be loaded." /> : null}
        {games.data && games.data.length === 0 ? (
          <EmptyState title="The cabinet is empty">
            <NesText>{settings.data?.emptyStateCopy}</NesText>
          </EmptyState>
        ) : null}
        {games.data && games.data.length > 0 ? (
          <div className="card-grid">
            {games.data.map((game) => (
              <GameCard key={game._id} game={game} />
            ))}
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
