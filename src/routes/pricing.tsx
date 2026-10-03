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

const DESCRIPTION = "QueerCade pricing: free, no paid tiers.";

export const Route = createFileRoute("/pricing")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Pricing — QueerCade" },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: "Pricing — QueerCade" },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/pricing` },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:image", content: DEFAULT_SHARE_IMAGE },
      { name: "twitter:image", content: DEFAULT_SHARE_IMAGE },
    ],
    links: [
      { rel: "canonical", href: `${SITE_URL}/pricing` },
      { rel: "alternate", type: "text/markdown", href: "/pricing.md" },
    ],
    scripts: [
      jsonLdScript(
        organization(),
        website(),
        breadcrumbs([
          { name: "Home", path: "/" },
          { name: "Pricing", path: "/pricing" },
        ]),
      ),
    ],
  }),
  component: Pricing,
});

function Pricing(): ReactElement {
  return (
    <Surface>
      <h1>Pricing</h1>
      <p>
        QueerCade is free. There are no paid tiers, no usage-based billing, and no premium
        features.
      </p>
      <ul>
        <li>Browse and search the full game catalog</li>
        <li>Unlimited use of the read-only public API — no key required</li>
        <li>Unlimited use of the MCP server — no authentication required</li>
      </ul>
      <p>
        Fair-use rate limits apply per IP (about 120 requests per 60 seconds); exceeding a limit
        returns HTTP <code>429</code> with a <code>Retry-After</code> header.
      </p>
    </Surface>
  );
}
