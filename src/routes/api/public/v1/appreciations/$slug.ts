import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import {
  checkRateLimit,
  errorResponse,
  jsonResponse,
  optionsResponse,
} from "@/lib/publicApi";
import { sanityPublicClient } from "@/lib/sanity/client";
import { clientIp, createQuota, isCrossSite } from "@/lib/security/quota";

const SlugSchema = z.string().regex(/^[a-z0-9-]{1,120}$/);
/** Matches the button's 10-per-game allowance, enforced server-side per visitor per day. */
const perVisitorQuota = createQuota(10, 24 * 60 * 60 * 1000);

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
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data, error } = await supabaseAdmin
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
        if (isCrossSite(request)) {
          return errorResponse(403, "forbidden", "Appreciations must come from QueerCade.", rate.headers);
        }

        const slug = SlugSchema.safeParse(params.slug);
        if (!slug.success) return errorResponse(404, "not_found", "Game not found.", rate.headers);
        if (perVisitorQuota.hit(`${clientIp(request)}:${slug.data}`)) {
          return errorResponse(429, "rate_limited", "You have already appreciated this game today.", rate.headers);
        }
        try {
          const exists = await sanityPublicClient.fetch<number>(
            `count(*[_type == "game" && slug.current == $slug && editorialStatus in ["approved", "featured"]])`,
            { slug: slug.data },
          );
          if (exists < 1) return errorResponse(404, "not_found", "Game not found.", rate.headers);
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data, error } = await supabaseAdmin.rpc("increment_game_appreciation", {
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
