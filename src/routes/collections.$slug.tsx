import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import { GameCard } from "@/components/GameCard";
import { EmptyState, ErrorState, LoadingState } from "@/components/StateViews";
import { NesContainer, NesText } from "@/design-system/nes-229931";
import { collectionQueryOptions } from "@/lib/publicData";

export const Route = createFileRoute("/collections/$slug")({
  staticData: { sitemap: true },
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} collection — QueerCade` },
      { name: "description", content: "An editor-curated collection of games in the QueerCade arcade." },
      { property: "og:title", content: `${params.slug} collection — QueerCade` },
      { property: "og:description", content: "An editor-curated collection of games." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(collectionQueryOptions(params.slug)),
  errorComponent: () => (
    <AppShell>
      <ErrorState message="This collection could not be loaded. Please refresh." />
    </AppShell>
  ),
  notFoundComponent: () => (
    <AppShell>
      <EmptyState title="Collection not found" />
    </AppShell>
  ),
  component: CollectionDetailPage,
});

function CollectionDetailPage() {
  const { slug } = Route.useParams();
  const collection = useQuery(collectionQueryOptions(slug));

  if (collection.isPending) {
    return (
      <AppShell>
        <LoadingState label="Loading collection" />
      </AppShell>
    );
  }

  if (collection.isError) {
    return (
      <AppShell>
        <ErrorState message="This collection could not be loaded." />
      </AppShell>
    );
  }

  if (!collection.data) {
    return (
      <AppShell>
        <EmptyState title="Collection not found">
          <NesText>It may be unpublished or archived.</NesText>
        </EmptyState>
      </AppShell>
    );
  }

  const data = collection.data;

  return (
    <AppShell>
      <div className="stack-lg">
        <NesContainer title={data.title} rounded>
          <div className="stack">
            {data.description ? <p>{data.description}</p> : null}
            {data.curatorNotes ? <p className="text-xs">{data.curatorNotes}</p> : null}
          </div>
        </NesContainer>
        {data.games.length === 0 ? (
          <EmptyState title="No public games in this collection yet" />
        ) : (
          <div className="card-grid">
            {data.games.map((game) => (
              <GameCard key={game._id} game={game} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
