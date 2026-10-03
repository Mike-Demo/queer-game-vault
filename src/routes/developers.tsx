import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactElement } from "react";

import { NesContainer } from "@/design-system/nes-229931";
import {
  API_BASE_PATH,
  API_DEFAULT_LIMIT,
  API_MAX_LIMIT,
  API_MAX_OFFSET,
  API_VERSION,
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_SECONDS,
} from "@/lib/publicApi";
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
  "Free, read-only API and MCP server for searching QueerCade's curated catalog of games with LGBTQ+ characters. No key needed.";

interface Endpoint {
  readonly path: string;
  readonly summary: string;
  readonly example: string;
}

const ENDPOINTS: readonly Endpoint[] = [
  {
    path: "GET /games",
    summary: `Search by title or LGBTQ+ character name. Filters: genre, platform, theme, year. Up to ${API_MAX_LIMIT} per page.`,
    example: `${API_BASE_PATH}/games?q=chloe`,
  },
  {
    path: "GET /games/{slug}",
    summary: "One game with its full public details.",
    example: `${API_BASE_PATH}/games/seabed`,
  },
  { path: "GET /collections", summary: "Every published collection.", example: `${API_BASE_PATH}/collections` },
  {
    path: "GET /collections/{slug}",
    summary: "One collection and its games, in order.",
    example: `${API_BASE_PATH}/collections/best-queer-horror-games`,
  },
  {
    path: "GET /facets",
    summary: "The genre slugs, platform slugs and theme names the filters accept.",
    example: `${API_BASE_PATH}/facets`,
  },
];

const MCP_TOOLS: readonly { name: string; summary: string }[] = [
  { name: "search_games", summary: "Search by title or character, with the same filters and paging as the API." },
  { name: "get_game", summary: "Full public details for one game by slug." },
  { name: "list_collections", summary: "Every published collection." },
  { name: "get_collection", summary: "One collection and its games, in editorial order." },
  { name: "list_facets", summary: "The values the filters accept." },
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
    links: [
      { rel: "canonical", href: `${SITE_URL}/developers` },
      { rel: "alternate", type: "text/markdown", href: "/developers.md" },
    ],
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
          A free, read-only API for the QueerCade catalog, version {API_VERSION}. No key or sign-in needed. It only
          returns games and collections that are public on this site — editorial notes, review data and member
          information are never included.
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

      <section className="stack" aria-labelledby="api-rules">
        <h2 id="api-rules" className="title-md">
          Paging, limits and errors
        </h2>
        <ul className="stack">
          <li>
            <strong>Paging.</strong> Use <code>limit</code> (1–{API_MAX_LIMIT}, default {API_DEFAULT_LIMIT}) and{" "}
            <code>offset</code> (0–{API_MAX_OFFSET}). List responses include <code>total</code> and{" "}
            <code>nextOffset</code>; keep following <code>nextOffset</code> until it is <code>null</code>.
          </li>
          <li>
            <strong>Rate limit.</strong> About {RATE_LIMIT_MAX} requests every {RATE_LIMIT_WINDOW_SECONDS} seconds per
            client. Responses carry <code>X-RateLimit-*</code> and RFC-style <code>RateLimit-*</code> headers; going over
            returns <code>429</code> with a{" "} <code>Retry-After</code> header in seconds.
          </li>
          <li>
            <strong>Caching.</strong> Successful responses may be cached for 5 minutes. Please cache rather than
            re-poll.
          </li>
          <li>
            <strong>Errors.</strong> Every failure returns{" "}
            <code>{`{ "error": { "code", "message", "status" } }`}</code>. Codes: <code>invalid_request</code>,{" "}
            <code>not_found</code>, <code>rate_limited</code>, <code>service_unavailable</code>.
          </li>
          <li>
            <strong>Methods and origins.</strong> GET only, all origins allowed, no authentication. There are no write
            endpoints.
          </li>
        </ul>
      </section>

      <section className="stack" aria-labelledby="api-mcp">
        <h2 id="api-mcp" className="title-md">
          MCP server
        </h2>
        <p>
          AI tools can connect straight to the catalog over the Model Context Protocol. Send JSON-RPC 2.0 requests by
          POST to <code>{`${SITE_URL}/api/public/mcp`}</code>. It is read-only and needs no credentials.
        </p>
        <ul className="stack">
          {MCP_TOOLS.map((tool) => (
            <li key={tool.name}>
              <code>{tool.name}</code> — {tool.summary}
            </li>
          ))}
        </ul>
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
            <a href="/api/public/mcp">MCP endpoint details</a>
          </li>
          <li>
            <a href="/llms.txt">llms.txt</a> and the <a href="/llms-full.txt">full catalog</a>
          </li>
        </ul>
        <p>Please be gentle — no bulk scraping.</p>
      </section>

      <section className="stack" aria-labelledby="api-versioning">
        <h2 id="api-versioning" className="title-md">
          Versioning and deprecation policy
        </h2>
        <p>
          The current API version is <strong>v1</strong>. Breaking changes ship as a new versioned
          path; v1 keeps working. If an endpoint is ever deprecated, the deprecation is announced
          here with the replacement documented before the old one stops working.
        </p>
      </section>
    </div>
  );
}
