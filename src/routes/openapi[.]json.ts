import { createFileRoute } from "@tanstack/react-router";

import { OPENAPI_DOCUMENT, jsonResponse } from "@/lib/publicApi";

export const Route = createFileRoute("/openapi.json")({
  staticData: { sitemap: false },
  server: { handlers: { GET: () => jsonResponse(OPENAPI_DOCUMENT) } },
});
