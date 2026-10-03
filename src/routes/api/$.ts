// Catch-all for unknown /api/* paths: agents get a JSON error, not the SPA shell.
// Agents asking for text/markdown get a markdown error body instead.
import { createFileRoute } from "@tanstack/react-router";

import { errorResponse } from "@/lib/publicApi";

export const Route = createFileRoute("/api/$")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      ANY: ({ request }) => {
        const accept = request.headers.get("accept") ?? "";
        if (accept.includes("text/markdown")) {
          return new Response(
            "# Not found\n\nUnknown API path. See https://queercade.mikedemo.dev/openapi.json for the API reference.\n",
            { status: 404, headers: { "Content-Type": "text/markdown; charset=utf-8" } },
          );
        }
        return errorResponse(
          404,
          "not_found",
          "Unknown API path. See https://queercade.mikedemo.dev/openapi.json for the API reference."
        );
      },
    },
  },
});
