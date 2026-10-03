import { PortableText, type PortableTextBlock } from "@portabletext/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import { EmptyState, ErrorState, LoadingState } from "@/components/StateViews";
import {
  NesText,
} from "@/design-system/nes-229931";
import { Surface } from "@/components/Surface";
import { contentPageQueryOptions } from "@/lib/publicData";
import {
  breadcrumbs,
  DEFAULT_SHARE_IMAGE,
  jsonLdScript,
  organization,
  webPage,
  website,
} from "@/lib/seo/structuredData";

export const Route = createFileRoute("/about")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "About — QueerCade" },
      {
        name: "description",
        content: "How QueerCade combines IGDB game data with editorial curation managed in Sanity.",
      },
      { property: "og:title", content: "About — QueerCade" },
      { property: "og:description", content: "How the arcade is curated, and where the game data comes from." },
      { property: "og:url", content: "https://queercade.mikedemo.dev/about" },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:image", content: DEFAULT_SHARE_IMAGE },
      { name: "twitter:image", content: DEFAULT_SHARE_IMAGE },
    ],
    links: [
      { rel: "canonical", href: "https://queercade.mikedemo.dev/about" },
      { rel: "alternate", type: "text/markdown", href: "/about.md" },
    ],
    scripts: [
      jsonLdScript(
        organization(),
        website(),
        webPage({
          type: "AboutPage",
          path: "/about",
          name: "About — QueerCade",
          description: "How the arcade is curated, and where the game data comes from.",
        }),
        breadcrumbs([
          { name: "Home", path: "/" },
          { name: "About", path: "/about" },
        ]),
      ),
    ],
  }),

  loader: ({ context }) => context.queryClient.ensureQueryData(contentPageQueryOptions("about")),
  errorComponent: () => (
    <AppShell>
      <ErrorState message="This page could not be loaded. Please refresh." />
    </AppShell>
  ),
  component: About,
});

function About() {
  const page = useQuery(contentPageQueryOptions("about"));

  return (
    <AppShell>
      {page.isPending ? <LoadingState label="Loading page" /> : null}
      {page.isError ? <ErrorState message="This page could not be loaded." /> : null}
      {page.data === null ? <EmptyState title="This page has not been published yet" /> : null}
      {page.data ? (
        <div className="stack-lg">
          <h1 className="title-xl"><NesText variant="primary">{page.data.title}</NesText></h1>
          {page.data.summary ? <p>{page.data.summary}</p> : null}
          <Surface rounded>
            <div className="prose">
              <PortableText value={(page.data.body ?? []) as unknown as PortableTextBlock[]} />
            </div>
          </Surface>
        </div>
      ) : null}
    </AppShell>
  );
}
