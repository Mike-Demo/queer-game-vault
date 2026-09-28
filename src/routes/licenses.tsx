import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactElement } from "react";

import { Surface } from "@/components/Surface";
import {
  DEFAULT_SHARE_IMAGE,
  SITE_URL,
  breadcrumbs,
  jsonLdScript,
  organization,
  website,
} from "@/lib/seo/structuredData";

interface LicenseEntry {
  readonly name: string;
  readonly author: string;
  readonly license: string;
  readonly url: string;
  readonly note?: string;
}

interface LicenseGroup {
  readonly title: string;
  readonly entries: readonly LicenseEntry[];
}

const DESCRIPTION =
  "Licenses and credits for the open-source libraries, typefaces, data sources, and artwork used on QueerCade.";

const GROUPS: readonly LicenseGroup[] = [
  {
    title: "Typeface",
    entries: [
      {
        name: "Press Start 2P",
        author: "CodeMan38",
        license: "SIL Open Font License 1.1",
        url: "https://openfontlicense.org",
        note: "Pixel display typeface used across the whole site. Self-hosted from this site.",
      },
    ],
  },
  {
    title: "Design system",
    entries: [
      {
        name: "NES.css",
        author: "Ryo Sakai and contributors",
        license: "MIT",
        url: "https://github.com/nostalgic-css/NES.css/blob/develop/LICENSE",
        note: "The pixel-art component system behind every button, card, and badge.",
      },
    ],
  },
  {
    title: "Interactive components",
    entries: [
      {
        name: "Appreciate Button (rainbow pixel fork)",
        author: "Medhat Dawoud and contributors",
        license: "MIT",
        url: "https://github.com/Mike-Demo/appreciate-button-pixel",
        note: "The rainbow pixel heart on every game page is a pixel-art fork of the open-source Appreciate Button.",
      },
    ],
  },
  {
    title: "Framework & build tooling",
    entries: [
      {
        name: "React",
        author: "Meta Platforms, Inc. and contributors",
        license: "MIT",
        url: "https://github.com/facebook/react/blob/main/LICENSE",
        note: "The UI library every page is built with.",
      },
      {
        name: "TanStack Start & Router",
        author: "Tanner Linsley and contributors",
        license: "MIT",
        url: "https://github.com/TanStack/router/blob/main/LICENSE",
        note: "Routing, server rendering, and the static page builds.",
      },
      {
        name: "TanStack Query",
        author: "Tanner Linsley and contributors",
        license: "MIT",
        url: "https://github.com/TanStack/query/blob/main/LICENSE",
        note: "Data fetching and caching wired into the router.",
      },
      {
        name: "Vite",
        author: "Evan You and Vite contributors",
        license: "MIT",
        url: "https://github.com/vitejs/vite/blob/main/LICENSE",
        note: "Dev server and production bundler.",
      },
      {
        name: "TypeScript",
        author: "Microsoft Corporation",
        license: "Apache-2.0",
        url: "https://github.com/microsoft/TypeScript/blob/main/LICENSE.txt",
        note: "Every source file on this site is typed.",
      },
      {
        name: "Tailwind CSS",
        author: "Tailwind Labs, Inc.",
        license: "MIT",
        url: "https://github.com/tailwindlabs/tailwindcss/blob/main/LICENSE",
        note: "Utility styling layer under the pixel components.",
      },
      {
        name: "Zod",
        author: "Colin McDonnell and contributors",
        license: "MIT",
        url: "https://github.com/colinhacks/zod/blob/main/LICENSE",
        note: "Schema validation for typed data.",
      },
      {
        name: "Cloudflare Vite plugin",
        author: "Cloudflare, Inc.",
        license: "MIT",
        url: "https://github.com/cloudflare/workers-sdk/blob/main/LICENSE-MIT",
        note: "Builds the site for its production runtime.",
      },
      {
        name: "Recharts",
        author: "recharts contributors",
        license: "MIT",
        url: "https://github.com/recharts/recharts",
      },
    ],
  },
  {
    title: "Platform",
    entries: [
      {
        name: "Sanity",
        author: "Sanity.io",
        license: "MIT (client libraries)",
        url: "https://github.com/sanity-io/client/blob/main/LICENSE",
        note: "The content store behind every game, collection, and editorial field.",
      },
      {
        name: "Supabase",
        author: "Supabase, Inc.",
        license: "MIT (client libraries)",
        url: "https://github.com/supabase/supabase-js/blob/master/LICENSE",
        note: "Accounts, sign-in, and personal game tracking.",
      },
    ],
  },
  {
    title: "Game data & artwork",
    entries: [
      {
        name: "IGDB",
        author: "IGDB.com (a Twitch company)",
        license: "Data via the IGDB API",
        url: "https://www.igdb.com",
        note: "Game metadata, covers, and screenshots. Cover art rights remain with each game's publisher.",
      },
      {
        name: "Gayming Magazine",
        author: "Gayming Magazine",
        license: "Linked with credit",
        url: "https://gaymingmag.com",
        note: "Source articles for many of the games catalogued here.",
      },
      {
        name: "Humble Bundle",
        author: "Humble Bundle, Inc.",
        license: "Store search links",
        url: "https://www.humblebundle.com",
        note: "The 'Find on Humble Bundle' links open a store search for each game.",
      },
    ],
  },
  {
    title: "Site artwork",
    entries: [
      {
        name: "QueerCade logo & favicon",
        author: "Created for QueerCade",
        license: "All rights reserved",
        url: "/",
        note: "The pixel joystick mark used as the site favicon.",
      },
    ],
  },
];

export const Route = createFileRoute("/licenses")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Open Source & Credits — QueerCade" },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: "Open Source & Credits — QueerCade" },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/licenses` },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:image", content: DEFAULT_SHARE_IMAGE },
      { name: "twitter:image", content: DEFAULT_SHARE_IMAGE },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/licenses` }],
    scripts: [
      jsonLdScript(
        organization(),
        website(),
        breadcrumbs([
          { name: "Home", path: "/" },
          { name: "Open Source & Credits", path: "/licenses" },
        ]),
      ),
    ],
  }),
  component: Licenses,
});

function Licenses(): ReactElement {
  return (
    <div className="stack">
      <Link to="/">← Back to the arcade</Link>
      <header className="stack">
        <h1 className="title-lg">Open source & credits</h1>
        <p>
          QueerCade is built on freely licensed software and typefaces. Every
          library and data source it relies on is credited below.
        </p>
        <a
          href="https://app.aikido.dev/audit-report/external/smlvhLoPnScdRnVeF7TjudEr/request"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Aikido Security Audit Report (opens in new tab)"
        >
          <img
            src="https://app.aikido.dev/assets/badges/full-light-theme.svg"
            alt="Aikido Security Audit Report"
            height={40}
          />
        </a>
      </header>
      <section className="stack" aria-labelledby="license-open-source">
        <h2 id="license-open-source" className="title-md">
          Open source
        </h2>
        <p>
          This site&apos;s source code is{" "}
          <a
            href="https://github.com/Mike-Demo/queer-game-vault"
            target="_blank"
            rel="noopener noreferrer"
          >
            on GitHub
          </a>
          .
        </p>
      </section>
      {GROUPS.map((group) => {
        const headingId = `license-${group.title.replaceAll(" ", "-").toLowerCase()}`;
        return (
          <section key={group.title} className="stack" aria-labelledby={headingId}>
            <h2 id={headingId} className="title-md">
              {group.title}
            </h2>
            <div className="license-grid">
              {group.entries.map((entry) => (
                <Surface key={`${group.title}-${entry.name}`} title={entry.name}>
                  <div className="stack">
                    <p>
                      {entry.author} · {entry.license}
                    </p>
                    {entry.note ? <p>{entry.note}</p> : null}
                    <a href={entry.url} target="_blank" rel="noopener noreferrer">
                      License source
                    </a>
                  </div>
                </Surface>
              ))}
            </div>
          </section>
        );
      })}
      <section className="stack" aria-labelledby="digital-carbon">
        <h2 id="digital-carbon" className="title-md">
          Digital carbon
        </h2>
        <p>
          Homepage transfer is about 278.7 KB, roughly 0.042 g of CO2 per visit. Estimated with CO2.js using the Sustainable Web Design Model v4, measured 2026-09-27. Hosting: delivered via Cloudflare (verified green hosting by the Green Web Foundation); origin hosting on Lovable Cloud. Machine-readable disclosure:{" "}
          <a href="/carbon.txt">/carbon.txt</a>.
        </p>
      </section>
    </div>
  );
}
