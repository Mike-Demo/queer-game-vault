import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import { EmptyState, ErrorState, LoadingState } from "@/components/StateViews";
import {
  NesBadge,
  NesText,
} from "@/design-system/nes-229931";
import { Surface } from "@/components/Surface";
import { collectionsQueryOptions } from "@/lib/publicData";
import {
  breadcrumbs,
  itemList,
  jsonLdScript,
  organization,
  webPage,
  website,
} from "@/lib/seo/structuredData";

export const Route = createFileRoute("/collections/")({
  staticData: { sitemap: true },
  loader: ({ context }) => context.queryClient.ensureQueryData(collectionsQueryOptions),
  head: ({ loaderData }) => ({
    meta: [
      { title: "Curated collections — QueerCade" },
      {
        name: "description",
        content: "Editor-curated collections of games, grouped by theme, mood and era.",
      },
      { property: "og:title", content: "Curated collections — QueerCade" },
      { property: "og:description", content: "Editor-curated groupings of games in the QueerCade arcade." },
      { property: "og:url", content: "https://queercade.mikedemo.dev/collections" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://queercade.mikedemo.dev/collections" }],
    scripts: [
      jsonLdScript(
        organization(),
        website(),
        webPage({
          type: "CollectionPage",
          path: "/collections",
          name: "Curated collections — QueerCade",
          description: "Editor-curated collections of games, grouped by theme, mood and era.",
        }),
        breadcrumbs([
          { name: "Home", path: "/" },
          { name: "Collections", path: "/collections" },
        ]),
        itemList(
          "Curated collections",
          (loaderData ?? []).map((collection) => ({
            name: collection.title,
            path: collection.slug ? `/collections/${collection.slug}` : null,
            type: "CollectionPage" as const,
          })),
        ),
      ),
    ],
  }),

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
        <h1 className="title-xl"><NesText variant="primary">Collections</NesText></h1>
        {collections.isPending ? <LoadingState label="Loading collections" /> : null}
        {collections.isError ? <ErrorState message="Collections could not be loaded." /> : null}
        {collections.data && collections.data.length === 0 ? (
          <EmptyState title="No published collections">
            <NesText>Editors can curate and publish collections in the studio.</NesText>
          </EmptyState>
        ) : null}
        <div className="card-grid">
          {collections.data?.map((collection) => (
            <Surface key={collection._id} title={collection.title} rounded>
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
            </Surface>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
