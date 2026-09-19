import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import { GameCard } from "@/components/GameCard";
import { EditorQuickStart } from "@/components/EditorQuickStart";
import { EmptyState, ErrorState, LoadingState } from "@/components/StateViews";
import {
  NesText,
} from "@/design-system/nes-229931";
import { Surface } from "@/components/Surface";
import {
  featuredCollectionsQueryOptions,
  featuredGamesQueryOptions,
  siteSettingsQueryOptions,
} from "@/lib/publicData";

export const Route = createFileRoute("/")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "QueerCade — a curated arcade of games" },
      {
        name: "description",
        content:
          "Browse a hand-picked arcade of games with LGBTQ+ characters and stories — featured picks, curated collections, and a library you can track your own play through.",
      },
      { property: "og:title", content: "QueerCade — a curated arcade of games" },
      {
        property: "og:description",
        content:
          "Hand-picked games with LGBTQ+ characters and stories: featured picks, curated collections, and a library you can track.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(siteSettingsQueryOptions),
      context.queryClient.ensureQueryData(featuredGamesQueryOptions),
      context.queryClient.ensureQueryData(featuredCollectionsQueryOptions),
    ]),
  errorComponent: () => (
    <AppShell>
      <ErrorState message="The arcade could not load its content right now. Please refresh." />
    </AppShell>
  ),
  component: Home,
});

function Home() {
  const settings = useQuery(siteSettingsQueryOptions);
  const games = useQuery(featuredGamesQueryOptions);
  const collections = useQuery(featuredCollectionsQueryOptions);

  return (
    <AppShell>
      <div className="stack-lg">
        <Surface rounded>
          <div className="stack">
            <h1 className="title-xl">
              <NesText variant="primary">{settings.data?.homepageHeading ?? "PRESS START"}</NesText>
            </h1>
            <p>{settings.data?.homepageIntroduction}</p>
          </div>
        </Surface>

        <EditorQuickStart />

        <section className="stack">
          <h2 className="title-md"><NesText>Featured games</NesText></h2>
          {games.isPending ? <LoadingState label="Loading featured games" /> : null}
          {games.isError ? <ErrorState message="Featured games could not be loaded." /> : null}
          {games.data && games.data.length === 0 ? (
            <EmptyState title="No featured games yet">
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
        </section>

        <section className="stack">
          <h2 className="title-md"><NesText>Featured collections</NesText></h2>
          {collections.data && collections.data.length === 0 ? (
            <EmptyState title="No collections yet">
              <NesText>Editors can curate collections in the studio.</NesText>
            </EmptyState>
          ) : null}
          {collections.data?.map((collection) => (
            <Surface key={collection._id} title={collection.title}>
              <div className="stack">
                <p className="text-xs">{collection.description}</p>
                {collection.slug ? (
                  <Link to="/collections/$slug" params={{ slug: collection.slug }}>
                    Open collection ({collection.gameCount} games)
                  </Link>
                ) : null}
              </div>
            </Surface>
          ))}
        </section>
      </div>
    </AppShell>
  );
}
