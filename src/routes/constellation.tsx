import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

import { AppShell } from "@/components/AppShell";
import { ErrorState, LoadingState } from "@/components/StateViews";
import { NesText } from "@/design-system/nes-229931";
import { constellationQueryOptions } from "@/lib/publicData";
import { breadcrumbs, DEFAULT_SHARE_IMAGE, jsonLdScript, organization, webPage, website } from "@/lib/seo/structuredData";

const CharacterConstellation = lazy(() => import("@/components/CharacterConstellation").then((module) => ({ default: module.CharacterConstellation })));

interface ConstellationSearch {
  character?: string;
  game?: string;
}

function readSearchValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim().slice(0, 120) : undefined;
}

const title = "Queer Character Constellation — QueerCade";
const description = "Explore LGBTQ+ video game characters as stars connected by identity, release era, and verified narrative tropes.";

export const Route = createFileRoute("/constellation")({
  staticData: { sitemap: true },
  validateSearch: (search: Record<string, unknown>): ConstellationSearch => ({
    character: readSearchValue(search["character"]),
    game: readSearchValue(search["game"]),
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(constellationQueryOptions),
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: "https://queercade.mikedemo.dev/constellation" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: DEFAULT_SHARE_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: DEFAULT_SHARE_IMAGE },
    ],
    links: [{ rel: "canonical", href: "https://queercade.mikedemo.dev/constellation" }],
    scripts: [jsonLdScript(
      organization(),
      website(),
      webPage({ path: "/constellation", name: title, description }),
      breadcrumbs([{ name: "Home", path: "/" }, { name: "Character Constellation", path: "/constellation" }]),
    )],
  }),
  errorComponent: () => <AppShell><ErrorState message="The character constellation could not be loaded." /></AppShell>,
  component: ConstellationPage,
});

function ConstellationPage() {
  const search = Route.useSearch();
  const { data } = useSuspenseQuery(constellationQueryOptions);
  return (
    <AppShell>
      <div className="constellation-page stack">
        <header className="stack">
          <h1 className="title-xl"><NesText variant="primary">Queer Character Constellation</NesText></h1>
          <NesText className="text-xs">Characters become stars. Shared identities, release eras, and verified story patterns become paths across franchises.</NesText>
        </header>
        <Suspense fallback={<LoadingState label="Charting the stars" />}>
          <CharacterConstellation records={data} initialCharacter={search.character} initialGame={search.game} />
        </Suspense>
      </div>
    </AppShell>
  );
}
