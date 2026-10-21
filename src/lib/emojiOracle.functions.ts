import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { EMOJI_MEANINGS, MAX_EMOJIS, MIN_EMOJIS, type EmojiMatch, type EmojiPick } from "@/lib/emojiOracle/emojis";
import type { GameSummary } from "@/lib/sanity/types";
import { clientIp, createQuota, isCrossSite } from "@/lib/security/quota";

const emojiInput = z.object({
  emojis: z
    .array(z.string().refine((emoji) => EMOJI_MEANINGS.has(emoji)))
    .min(MIN_EMOJIS)
    .max(MAX_EMOJIS)
    .refine((list) => new Set(list).size === list.length),
});

const perMinute = createQuota(6, 60_000);
const perDay = createQuota(40, 24 * 60 * 60 * 1000);
/** Caps total AI spend per server instance regardless of visitor. */
const globalHourly = createQuota(300, 60 * 60 * 1000);

export type OracleResponse =
  | { ok: true; game: GameSummary; reason: string; matches: EmojiMatch[] }
  | { ok: false; message: string };

/** Public: suggest one approved game for the chosen emojis. */
export const askEmojiOracle = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => emojiInput.parse(data))
  .handler(async ({ data }): Promise<OracleResponse> => {
    const request = getRequest();
    if (isCrossSite(request)) return { ok: false, message: "The oracle only answers on QueerCade." };
    const ip = clientIp(request);
    if (perMinute.hit(ip)) return { ok: false, message: "Too many tries. Please wait a minute." };
    if (perDay.hit(ip)) return { ok: false, message: "The oracle needs a rest. Come back tomorrow." };
    if (globalHourly.hit("all")) return { ok: false, message: "The oracle is very busy. Please try again later." };
    const { suggestGameFromEmojis, OracleError } = await import("@/lib/emojiOracle/oracle.server");
    try {
      const result = await suggestGameFromEmojis(data.emojis);
      return { ok: true, ...result };
    } catch (error) {
      if (error instanceof OracleError) return { ok: false, message: error.message };
      console.error("Emoji oracle failed", error);
      return { ok: false, message: "The oracle could not think of a game right now. Please try again." };
    }
  });

const saveInput = z.object({
  emojis: emojiInput.shape.emojis,
  gameSlug: z.string().regex(/^[a-z0-9-]{1,120}$/),
  title: z.string().min(1).max(300),
  coverUrl: z.string().url().max(500).nullable(),
  reason: z.string().min(1).max(240),
});

export const saveEmojiPick = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => saveInput.parse(data))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { error } = await context.supabase.from("emoji_picks").insert({
      user_id: context.userId,
      emojis: data.emojis,
      game_slug: data.gameSlug,
      title: data.title,
      cover_url: data.coverUrl,
      reason: data.reason,
    });
    if (error) {
      console.error("Emoji pick save failed", error.message);
      throw new Error("Your pick could not be saved.");
    }
    return { ok: true };
  });

export const listEmojiPicks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<EmojiPick[]> => {
    const { data, error } = await context.supabase
      .from("emoji_picks")
      .select("id, emojis, game_slug, title, cover_url, reason, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error("Your past picks could not be loaded.");
    return (data ?? []).map((row) => ({
      id: row.id,
      emojis: row.emojis,
      gameSlug: row.game_slug,
      title: row.title,
      coverUrl: row.cover_url,
      reason: row.reason,
      createdAt: row.created_at,
    }));
  });
