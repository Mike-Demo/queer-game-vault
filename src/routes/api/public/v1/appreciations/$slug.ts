import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/integrations/supabase/client.server";
import {
  checkRateLimit,
  errorResponse,
  jsonResponse,
  optionsResponse,
} from "@/lib/publicApi";

const SlugSchema = z.string().regex(/^[a-z0-9-]{1,120}$/);

export const Route = createFileRoute("/api/public/v1/appreciations/$slug")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      OPTIONS: () => optionsResponse(),
      GET: async ({ params, request }) => {
        const rate = checkRateLimit(request);
        if (rate.limited) return rate.limited;

        const slug = SlugSchema.safeParse(params.slug);
        if (!slug.success) return errorResponse(404, "not_found", "Game not found.", rate.headers);
        try {
          const admin = createSupabaseAdminClient();
          const { data, error } = await admin
            .from("game_appreciations")
            .select("total")
            .eq("game_slug", slug.data)
            .maybeSingle();
          if (error) throw error;
          return jsonResponse({ slug: slug.data, total: data?.total ?? 0 }, 200, rate.headers);
        } catch {
          return errorResponse(503, "service_unavailable", "Appreciations temporarily unavailable.", rate.headers);
        }
      },
      POST: async ({ params, request }) => {
        const rate = checkRateLimit(request);
        if (rate.limited) return rate.limited;

        const slug = SlugSchema.safeParse(params.slug);
        if (!slug.success) return errorResponse(404, "not_found", "Game not found.", rate.headers);
        try {
          const admin = createSupabaseAdminClient();
          const { data, error } = await admin.rpc("increment_game_appreciation", {
            p_slug: slug.data,
          });
          if (error) throw error;
          return jsonResponse({ slug: slug.data, total: data ?? 0 }, 200, rate.headers);
        } catch {
          return errorResponse(503, "service_unavailable", "Appreciations temporarily unavailable.", rate.headers);
        }
      },
    },
  },
});
