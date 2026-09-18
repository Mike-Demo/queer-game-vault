import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import { EmptyState, ErrorState, LoadingState } from "@/components/StateViews";
import { NesBadge, NesContainer, NesText } from "@/design-system/nes-229931";
import { collectionsQueryOptions } from "@/lib/publicData";

export const Route = createFileRoute("/collections/")({
  head: () => ({
    meta: [
      { title: "Curated collections — QueerCade" },
      {
        name: "description",
        content: "Editor-curated collections of games, grouped by theme, mood and era.",
      },
      { property: "og:title", content: "Curated collections — QueerCade" },
      { property: "og:description", content: "Editor-curated groupings of games in the QueerCade arcade." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(collectionsQueryOptions),
  errorComponent: () => (
    <AppShell>
      <ErrorState message="Collections could not be loaded. Please refresh." />
    </AppShell>
  ),
  component: Collections,
});

function Collections() {
  const collections = useQuery(collectionsQueryOptions);

  return (
    <AppShell>
      <div className="stack-lg">
        <NesText variant="primary" className="title-xl">
          Collections
        </NesText>
        {collections.isPending ? <LoadingState label="Loading collections" /> : null}
        {collections.isError ? <ErrorState message="Collections could not be loaded." /> : null}
        {collections.data && collections.data.length === 0 ? (
          <EmptyState title="No published collections">
            <NesText>Editors can curate and publish collections in the studio.</NesText>
          </EmptyState>
        ) : null}
        <div className="card-grid">
          {collections.data?.map((collection) => (
            <NesContainer key={collection._id} title={collection.title} rounded>
              <div className="stack">
                <p className="text-xs">{collection.description}</p>
                <div className="row">
                  <NesBadge variant="primary">{`${collection.gameCount} games`}</NesBadge>
                  {collection.featured ? <NesBadge variant="warning">Featured</NesBadge> : null}
                </div>
                {collection.slug ? (
                  <Link to="/collections/$slug" params={{ slug: collection.slug }}>
                    Open collection
                  </Link>
                ) : null}
              </div>
            </NesContainer>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
