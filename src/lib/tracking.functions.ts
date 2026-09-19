import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  isTrackStatus,
  type GameEntry,
  type MyProfile,
  type PublicProfile,
  type TrackStatus,
} from "@/lib/tracking/types";

interface EntryRow {
  igdb_id: number;
  game_slug: string;
  title: string;
  cover_url: string | null;
  status: TrackStatus;
  updated_at: string;
}

function toEntry(row: EntryRow): GameEntry {
  return {
    igdbId: row.igdb_id,
    gameSlug: row.game_slug,
    title: row.title,
    coverUrl: row.cover_url,
    status: row.status,
    updatedAt: row.updated_at,
  };
}

function trimmed(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const next = value.trim().slice(0, max);
  return next.length === 0 ? null : next;
}

/** Everything the signed-in person is tracking. */
export const listMyEntries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<GameEntry[]> => {
    const { data, error } = await context.supabase
      .from("game_entries")
      .select("igdb_id, game_slug, title, cover_url, status, updated_at")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Tracking list failed", error.message);
      throw new Error("Your library could not be loaded. Please try again.");
    }

    return (data ?? []).map((row) => toEntry(row as EntryRow));
  });

export interface SetStatusInput {
  igdbId: number;
  gameSlug: string;
  title: string;
  coverUrl?: string | null;
  /** null removes the game from the person's library. */
  status: TrackStatus | null;
}

/** Add, move, or remove one game in the signed-in person's library. */
export const setGameStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: SetStatusInput) => {
    const igdbId = Math.trunc(Number(input?.igdbId));
    if (!Number.isFinite(igdbId) || igdbId <= 0) throw new Error("A valid game is required.");
    const gameSlug = trimmed(input?.gameSlug, 200);
    const title = trimmed(input?.title, 300);
    if (!gameSlug || !title) throw new Error("A valid game is required.");
    if (input?.status !== null && !isTrackStatus(input?.status)) throw new Error("Unknown status.");
    return {
      igdbId,
      gameSlug,
      title,
      coverUrl: trimmed(input?.coverUrl, 500),
      status: input.status as TrackStatus | null,
    };
  })
  .handler(async ({ data, context }): Promise<GameEntry | null> => {
    if (data.status === null) {
      const { error } = await context.supabase
        .from("game_entries")
        .delete()
        .eq("user_id", context.userId)
        .eq("igdb_id", data.igdbId);
      if (error) {
        console.error("Tracking delete failed", error.message);
        throw new Error("That game could not be removed. Please try again.");
      }
      return null;
    }

    const { data: row, error } = await context.supabase
      .from("game_entries")
      .upsert(
        {
          user_id: context.userId,
          igdb_id: data.igdbId,
          game_slug: data.gameSlug,
          title: data.title,
          cover_url: data.coverUrl,
          status: data.status,
        },
        { onConflict: "user_id,igdb_id" },
      )
      .select("igdb_id, game_slug, title, cover_url, status, updated_at")
      .single();

    if (error || !row) {
      console.error("Tracking save failed", error?.message);
      throw new Error("That game could not be saved. Please try again.");
    }

    return toEntry(row as EntryRow);
  });

/** The signed-in person's own profile, including private settings. */
export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyProfile | null> => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select(
        "username, display_name, bio, avatar_url, created_at, email, profile_visibility, theme_preference, high_contrast",
      )
      .eq("id", context.userId)
      .maybeSingle();

    if (error) {
      console.error("Profile read failed", error.message);
      throw new Error("Your profile could not be loaded. Please try again.");
    }
    if (!data) return null;

    return {
      username: data.username ?? "",
      displayName: data.display_name ?? null,
      bio: data.bio ?? null,
      avatarUrl: data.avatar_url ?? null,
      joinedAt: data.created_at ?? null,
      email: data.email ?? null,
      profileVisibility: (data.profile_visibility as MyProfile["profileVisibility"]) ?? "public",
      themePreference: (data.theme_preference as MyProfile["themePreference"]) ?? "system",
      highContrast: Boolean(data.high_contrast),
    };
  });

export interface UpdateProfileInput {
  username?: string;
  displayName?: string | null;
  bio?: string | null;
  profileVisibility?: "public" | "private";
  themePreference?: "light" | "dark" | "system";
  highContrast?: boolean;
}

const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,24}$/;

/** Save profile and preference changes for the signed-in person. */
export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: UpdateProfileInput) => {
    const patch: UpdateProfileInput = {};

    if (typeof input?.username === "string") {
      const username = input.username.trim();
      if (!USERNAME_PATTERN.test(username)) {
        throw new Error("Usernames use 3–24 letters, numbers or underscores.");
      }
      patch.username = username;
    }
    if (input?.displayName !== undefined) patch.displayName = trimmed(input.displayName, 60);
    if (input?.bio !== undefined) patch.bio = trimmed(input.bio, 600);
    if (input?.profileVisibility !== undefined) {
      if (input.profileVisibility !== "public" && input.profileVisibility !== "private") {
        throw new Error("Unknown profile visibility.");
      }
      patch.profileVisibility = input.profileVisibility;
    }
    if (input?.themePreference !== undefined) {
      if (!["light", "dark", "system"].includes(input.themePreference)) {
        throw new Error("Unknown theme.");
      }
      patch.themePreference = input.themePreference;
    }
    if (input?.highContrast !== undefined) patch.highContrast = Boolean(input.highContrast);

    return patch;
  })
  .handler(async ({ data, context }): Promise<{ ok: boolean; error: string | null }> => {
    const update: {
      username?: string;
      display_name?: string | null;
      bio?: string | null;
      profile_visibility?: string;
      theme_preference?: string;
      high_contrast?: boolean;
    } = {};
    if (data.username !== undefined) update.username = data.username;
    if (data.displayName !== undefined) update.display_name = data.displayName;
    if (data.bio !== undefined) update.bio = data.bio;
    if (data.profileVisibility !== undefined) update.profile_visibility = data.profileVisibility;
    if (data.themePreference !== undefined) update.theme_preference = data.themePreference;
    if (data.highContrast !== undefined) update.high_contrast = data.highContrast;

    if (Object.keys(update).length === 0) return { ok: true, error: null };

    const { error } = await context.supabase.from("profiles").update(update).eq("id", context.userId);

    if (error) {
      if (error.code === "23505") return { ok: false, error: "That username is already taken." };
      console.error("Profile update failed", error.message);
      return { ok: false, error: "Your changes could not be saved. Please try again." };
    }

    return { ok: true, error: null };
  });

export interface PublicProfileResult {
  profile: PublicProfile | null;
  entries: GameEntry[];
}

/** A public profile and its game lists. Private profiles resolve to null. */
export const getProfileByUsername = createServerFn({ method: "GET" })
  .inputValidator((input: { username: string }) => {
    const username = typeof input?.username === "string" ? input.username.trim().slice(0, 24) : "";
    if (!USERNAME_PATTERN.test(username)) throw new Error("NOT_FOUND");
    return { username };
  })
  .handler(async ({ data }): Promise<PublicProfileResult> => {
    const { readPublicProfile } = await import("@/lib/tracking/public.server");
    try {
      return await readPublicProfile(data.username);
    } catch (error) {
      console.error("Public profile failed", error instanceof Error ? error.message : error);
      throw new Error("That profile could not be loaded. Please try again.");
    }
  });
