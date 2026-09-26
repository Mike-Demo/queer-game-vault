import { createFileRoute } from "@tanstack/react-router";

import { buildLlmsTxt } from "@/lib/llmsTxt";

export const Route = createFileRoute("/llms.txt")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      GET: () =>
        new Response(buildLlmsTxt(), {
          headers: { "Content-Type": "text/markdown; charset=utf-8", "Cache-Control": "public, max-age=3600" },
        }),
    },
  },
});
