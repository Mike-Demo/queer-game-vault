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

const DESCRIPTION = "QueerCade's data practices: what is collected and what is not.";

export const Route = createFileRoute("/privacy")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Privacy — QueerCade" },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: "Privacy — QueerCade" },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/privacy` },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:image", content: DEFAULT_SHARE_IMAGE },
      { name: "twitter:image", content: DEFAULT_SHARE_IMAGE },
    ],
    links: [
      { rel: "canonical", href: `${SITE_URL}/privacy` },
      { rel: "alternate", type: "text/markdown", href: "/privacy.md" },
    ],
    scripts: [
      jsonLdScript(
        organization(),
        website(),
        breadcrumbs([
          { name: "Home", path: "/" },
          { name: "Privacy", path: "/privacy" },
        ]),
      ),
    ],
  }),
  component: Privacy,
});

function Privacy(): ReactElement {
  return (
    <Surface>
      <h1>Privacy</h1>
      <p>QueerCade collects as little as possible.</p>
      <ul>
        <li>
          <strong>No accounts required</strong> to browse the catalog or use the public API and MCP
          server.
        </li>
        <li>
          <strong>Optional sign-in</strong> (via Razer ID) is only for site features like saving
          preferences — it is never required for reading.
        </li>
        <li>
          <strong>No data sale:</strong> usage data is never sold or shared with advertisers.
        </li>
        <li>
          <strong>Rate limiting:</strong> minimal request counters keep the service stable; they
          expire automatically.
        </li>
      </ul>
      <p>
        Questions: <a href="mailto:hey.demo@mikedemo.email">hey.demo@mikedemo.email</a>.
      </p>
    </Surface>
  );
}
