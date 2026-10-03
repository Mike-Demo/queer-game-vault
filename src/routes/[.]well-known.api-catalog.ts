// RFC 9727 API catalog, served with the linkset media type.
// (Static-file hosting serves extensionless files as application/octet-stream,
// so this is a server route to control the Content-Type header.)
import { createFileRoute } from "@tanstack/react-router";

import { jsonResponse } from "@/lib/publicApi";
import { SITE_URL } from "@/lib/seo/structuredData";

const CATALOG = {
  linkset: [
    {
      anchor: `${SITE_URL}/`,
      item: [
        {
          href: `${SITE_URL}/openapi.json`,
          title: "QueerCade Public API (OpenAPI)",
          type: "application/vnd.oai.openapi+json",
        },
        {
          href: `${SITE_URL}/.well-known/agent-card.json`,
          title: "QueerCade agent card",
          type: "application/json",
        },
        {
          href: `${SITE_URL}/.well-known/mcp/server-card.json`,
          title: "QueerCade MCP server card",
          type: "application/json",
        },
      ],
    },
  ],
};

export const Route = createFileRoute("/.well-known/api-catalog")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      GET: () =>
        new Response(JSON.stringify(CATALOG), {
          status: 200,
          headers: {
            "Content-Type": 'application/linkset+json;profile="https://www.rfc-editor.org/info/rfc9727"',
            "Cache-Control": "public, max-age=3600",
          },
        }),
    },
  },
});
