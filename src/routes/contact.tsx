import { createFileRoute } from "@tanstack/react-router";
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

const DESCRIPTION = "How to reach the maker of QueerCade: GitHub, email, and social profiles.";

const ROWS: ReadonlyArray<{ label: string; value: string; href: string; note: string }> = [
  {
    label: "GitHub",
    value: "github.com/Mike-Demo/queer-game-vault",
    href: "https://github.com/Mike-Demo/queer-game-vault",
    note: "File issues about the catalog or the site.",
  },
  {
    label: "Email",
    value: "hey.demo@mikedemo.email",
    href: "mailto:hey.demo@mikedemo.email",
    note: "Corrections to game listings and general inquiries.",
  },
  {
    label: "Maker",
    value: "Mike Demopoulos (MikeDemo)",
    href: "https://mikedemo.com",
    note: "Project updates and other work.",
  },
  {
    label: "LinkedIn",
    value: "linkedin.com/in/mikedemopoulos",
    href: "https://www.linkedin.com/in/mikedemopoulos",
    note: "Professional contact.",
  },
];

export const Route = createFileRoute("/contact")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Contact — QueerCade" },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: "Contact — QueerCade" },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/contact` },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:image", content: DEFAULT_SHARE_IMAGE },
      { name: "twitter:image", content: DEFAULT_SHARE_IMAGE },
    ],
    links: [
      { rel: "canonical", href: `${SITE_URL}/contact` },
      { rel: "alternate", type: "text/markdown", href: "/contact.md" },
    ],
    scripts: [
      jsonLdScript(
        organization(),
        website(),
        breadcrumbs([
          { name: "Home", path: "/" },
          { name: "Contact", path: "/contact" },
        ]),
      ),
    ],
  }),
  component: Contact,
});

function Contact(): ReactElement {
  return (
    <Surface>
      <h1>Contact</h1>
      <p>
        QueerCade is made by Mike Demopoulos (MikeDemo). The site is open source — the fastest way
        to report a catalog error or a bug is a GitHub issue.
      </p>
      <ul>
        {ROWS.map((row) => (
          <li key={row.label}>
            <strong>{row.label}:</strong>{" "}
            <a href={row.href} target="_blank" rel="noreferrer">
              {row.value}
            </a>{" "}
            — {row.note}
          </li>
        ))}
      </ul>
    </Surface>
  );
}
