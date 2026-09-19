/**
 * Server-side, unauthenticated reads of publicly visible profile data.
 * Uses the publishable key, so row level security still applies; the two
 * security-definer functions it calls expose only public profiles and return
 * nothing sensitive.
 */
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import type { GameEntry, PublicProfile } from "./types";

function createPublicClient() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Supabase is not configured.");

  return createClient<Database>(url, key, {
    global: {
      fetch: (input, init) => {
        const headers = new Headers(
          typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
        );
        if (init?.headers) new Headers(init.headers).forEach((value, name) => headers.set(name, value));
        // Publishable keys are opaque strings, not bearer JWTs.
        if (headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

export async function readPublicProfile(
  username: string,
): Promise<{ profile: PublicProfile | null; entries: GameEntry[] }> {
  const client = createPublicClient();

  const { data: profileRows, error: profileError } = await client.rpc("get_public_profile", {
    _username: username,
  });
  if (profileError) {
    console.error("Public profile lookup failed", profileError.message);
    throw new Error("PROFILE_LOOKUP_FAILED");
  }

  const row = profileRows?.[0];
  if (!row) return { profile: null, entries: [] };

  const { data: entryRows, error: entryError } = await client.rpc("get_public_game_entries", {
    _username: username,
  });
  if (entryError) {
    console.error("Public entries lookup failed", entryError.message);
    throw new Error("PROFILE_LOOKUP_FAILED");
  }

  return {
    profile: {
      username: row.username ?? username,
      displayName: row.display_name ?? null,
      bio: row.bio ?? null,
      avatarUrl: row.avatar_url ?? null,
      joinedAt: row.created_at ?? null,
    },
    entries: (entryRows ?? []).map((entry) => ({
      igdbId: entry.igdb_id,
      gameSlug: entry.game_slug,
      title: entry.title,
      coverUrl: entry.cover_url ?? null,
      status: entry.status,
      updatedAt: entry.updated_at,
    })),
  };
}
