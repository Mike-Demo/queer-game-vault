import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactElement } from "react";

import { NesContainer } from "@/design-system/nes-229931";
import { API_BASE_PATH, API_MAX_LIMIT } from "@/lib/publicApi";
import {
  DEFAULT_SHARE_IMAGE,
  SITE_URL,
  breadcrumbs,
  jsonLdScript,
  organization,
  website,
} from "@/lib/seo/structuredData";

const TITLE = "Developers & public API — QueerCade";
const DESCRIPTION =
  "Free, read-only API for searching QueerCade's curated catalog of games with LGBTQ+ characters. No key needed.";

interface Endpoint {
  readonly path: string;
  readonly summary: string;
  readonly example: string;
}

const ENDPOINTS: readonly Endpoint[] = [
  {
    path: "GET /games?q=&limit=&offset=",
    summary: `Search by title or LGBTQ+ character name. Up to ${API_MAX_LIMIT} per page.`,
    example: `${API_BASE_PATH}/games?q=chloe`,
  },
  { path: "GET /games/{slug}", summary: "One game with its full public details.", example: `${API_BASE_PATH}/games/seabed` },
  { path: "GET /collections", summary: "Every published collection.", example: `${API_BASE_PATH}/collections` },
  {
    path: "GET /collections/{slug}",
    summary: "One collection and its games, in order.",
    example: `${API_BASE_PATH}/collections/best-queer-horror-games`,
  },
];

export const Route = createFileRoute("/developers")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/developers` },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:image", content: DEFAULT_SHARE_IMAGE },
      { name: "twitter:image", content: DEFAULT_SHARE_IMAGE },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/developers` }],
    scripts: [
      jsonLdScript(
        organization(),
        website(),
        breadcrumbs([
          { name: "Home", path: "/" },
          { name: "Developers", path: "/developers" },
        ]),
      ),
    ],
  }),
  component: Developers,
});

function Developers(): ReactElement {
  return (
    <div className="stack">
      <Link to="/">← Back to the arcade</Link>
      <header className="stack">
        <h1 className="title-lg">Developers</h1>
        <p>
          A free, read-only API for the QueerCade catalog. No key or sign-in needed. It only returns games and
          collections that are public on this site.
        </p>
      </header>

      <section className="stack" aria-labelledby="api-endpoints">
        <h2 id="api-endpoints" className="title-md">
          Endpoints
        </h2>
        <p>
          Base URL: <code>{`${SITE_URL}${API_BASE_PATH}`}</code>
        </p>
        <div className="license-grid">
          {ENDPOINTS.map((endpoint) => (
            <NesContainer key={endpoint.path} title={endpoint.path}>
              <div className="stack">
                <p>{endpoint.summary}</p>
                <a href={endpoint.example}>Try it</a>
              </div>
            </NesContainer>
          ))}
        </div>
      </section>

      <section className="stack" aria-labelledby="api-machine">
        <h2 id="api-machine" className="title-md">
          For tools and AI agents
        </h2>
        <ul className="stack">
          <li>
            <a href="/openapi.json">OpenAPI description</a>
          </li>
          <li>
            <a href="/.well-known/agent.json">Agent card</a>
          </li>
          <li>
            <a href="/llms.txt">llms.txt</a> and the <a href="/llms-full.txt">full catalog</a>
          </li>
        </ul>
        <p>Responses are cached for a few minutes. Please be gentle — no bulk scraping.</p>
      </section>
    </div>
  );
}
