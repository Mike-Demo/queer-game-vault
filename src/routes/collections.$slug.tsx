import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import { GameCard } from "@/components/GameCard";
import { EmptyState, ErrorState, LoadingState } from "@/components/StateViews";
import {
  NesText,
} from "@/design-system/nes-229931";
import { Surface } from "@/components/Surface";
import { collectionQueryOptions } from "@/lib/publicData";

export const Route = createFileRoute("/collections/$slug")({
  staticData: { sitemap: true },
  loader: ({ context, params }) => context.queryClient.ensureQueryData(collectionQueryOptions(params.slug)),
  head: ({ params, loaderData }) => {
    const title = loaderData?.title ?? "Collection";
    const description =
      loaderData?.description ??
      `Games curated in the ${title} collection on QueerCade.`;
    const url = `https://queercade.mikedemo.dev/collections/${params.slug}`;
    return {
      meta: [
        { title: `${title} — QueerCade` },
        { name: "description", content: description },
        { property: "og:title", content: `${title} — QueerCade` },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
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
        <h1 className="title-xl"><NesText variant="primary">{data.title}</NesText></h1>
        <Surface rounded>
          <div className="stack">
            {data.description ? <p>{data.description}</p> : null}
            {data.curatorNotes ? <p className="text-xs">{data.curatorNotes}</p> : null}
          </div>
        </Surface>
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
