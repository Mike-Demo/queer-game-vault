import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ImportOutcome } from "@/lib/import/import.server";
import type { GameDetail, ImportRecordEntry } from "@/lib/sanity/types";

export interface ImportSummary {
  outcomes: ImportOutcome[];
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  warnings: number;
  error: string | null;
}

function summarize(outcomes: ImportOutcome[]): ImportSummary {
  return {
    outcomes,
    created: outcomes.filter((entry) => entry.operation === "create" && entry.result !== "failed").length,
    updated: outcomes.filter((entry) => entry.operation === "refresh" && entry.result !== "failed").length,
    skipped: outcomes.filter((entry) => entry.result === "skipped").length,
    failed: outcomes.filter((entry) => entry.result === "failed").length,
    warnings: outcomes.reduce((total, entry) => total + entry.warnings.length, 0),
    error: null,
  };
}

const MAX_BULK = 10;

/** Import or refresh one or more IGDB games into Sanity. Editors and admins only. */
export const importGamesFromIgdb = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { igdbIds: number[]; updateExisting?: boolean }) => ({
    igdbIds: Array.from(
      new Set(
        (Array.isArray(input.igdbIds) ? input.igdbIds : [])
          .map((value) => Math.trunc(Number(value)))
          .filter((value) => Number.isFinite(value) && value > 0),
      ),
    ).slice(0, MAX_BULK),
    updateExisting: Boolean(input.updateExisting),
  }))
  .handler(async ({ data, context }): Promise<ImportSummary> => {
    const { assertEditor, authErrorMessage } = await import("@/lib/auth/roles.server");
    try {
      await assertEditor(context.supabase, context.userId);
    } catch (error) {
      return { ...summarize([]), error: authErrorMessage(String(error)) };
    }

    if (data.igdbIds.length === 0) {
      return { ...summarize([]), error: "Select at least one game to import." };
    }

    const { importManyGames } = await import("@/lib/import/import.server");
    try {
      const outcomes = await importManyGames(data.igdbIds, { updateExisting: data.updateExisting });
      return summarize(outcomes);
    } catch (error) {
      const code = error instanceof Error ? error.message : "IMPORT_FAILED";
      console.error("Bulk import failed", code);
      const { igdbErrorMessage } = await import("@/lib/igdb/igdb.server");
      return { ...summarize([]), error: igdbErrorMessage(code) };
    }
  });

export interface ReviewQueueResponse {
  games: GameDetail[];
  collections: { _id: string; title: string }[];
  error: string | null;
}

/** Review queue plus collection targets. Authorized read, never cached. */
export const getReviewQueue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ReviewQueueResponse> => {
    const { assertEditor, authErrorMessage } = await import("@/lib/auth/roles.server");
    try {
      await assertEditor(context.supabase, context.userId);
    } catch (error) {
      return { games: [], collections: [], error: authErrorMessage(String(error)) };
    }

    const { getSanityWriteClient } = await import("@/lib/sanity/write.server");
    const { reviewQueueQuery } = await import("@/lib/sanity/queries");

    try {
      const client = getSanityWriteClient();
      const [games, collections] = await Promise.all([
        client.fetch<GameDetail[]>(reviewQueueQuery),
        client.fetch<{ _id: string; title: string }[]>(
          `*[_type == "gameCollection" && !(_id in path("drafts.**"))] | order(title asc){ _id, title }`,
        ),
      ]);
      return { games, collections, error: null };
    } catch (error) {
      const code = error instanceof Error ? error.message : "SANITY_UNAVAILABLE";
      console.error("Review queue read failed", code);
      const { igdbErrorMessage } = await import("@/lib/igdb/igdb.server");
      return { games: [], collections: [], error: igdbErrorMessage(code) };
    }
  });

const STATUSES = ["imported", "underReview", "approved", "featured", "archived"] as const;
type Status = (typeof STATUSES)[number];

/** Editor-owned updates: status, feature flag, custom copy, notes. */
export const updateGameEditorial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      gameId: string;
      editorialStatus?: string;
      featured?: boolean;
      customDescription?: string;
      editorNotes?: string;
    }) => ({
      gameId: String(input.gameId ?? ""),
      editorialStatus: STATUSES.includes(input.editorialStatus as Status)
        ? (input.editorialStatus as Status)
        : undefined,
      featured: typeof input.featured === "boolean" ? input.featured : undefined,
      customDescription:
        typeof input.customDescription === "string" ? input.customDescription.slice(0, 4000) : undefined,
      editorNotes: typeof input.editorNotes === "string" ? input.editorNotes.slice(0, 4000) : undefined,
    }),
  )
  .handler(async ({ data, context }): Promise<{ ok: boolean; error: string | null }> => {
    const { assertEditor, authErrorMessage } = await import("@/lib/auth/roles.server");
    try {
      await assertEditor(context.supabase, context.userId);
    } catch (error) {
      return { ok: false, error: authErrorMessage(String(error)) };
    }

    if (!data.gameId) return { ok: false, error: "No game was selected." };

    const patch: Record<string, unknown> = {};
    if (data.editorialStatus) patch["editorialStatus"] = data.editorialStatus;
    if (data.featured !== undefined) patch["featured"] = data.featured;
    if (data.customDescription !== undefined) patch["customDescription"] = data.customDescription;
    if (data.editorNotes !== undefined) patch["editorNotes"] = data.editorNotes;
    if (Object.keys(patch).length === 0) return { ok: false, error: "There was nothing to save." };

    const { getSanityWriteClient } = await import("@/lib/sanity/write.server");
    try {
      const client = getSanityWriteClient();

      // Bind the patch target to a real, published game document so an editor
      // cannot rewrite editorial fields on arbitrary Sanity documents by ID.
      const target = await client.fetch<{ _type: string } | null>(
        `*[_id == $id && !(_id in path("drafts.**"))][0]{ _type }`,
        { id: data.gameId },
      );
      if (!target || target._type !== "game") {
        return { ok: false, error: "That game could not be found in the library." };
      }

      await client.patch(data.gameId).set(patch).commit();
      return { ok: true, error: null };
    } catch (error) {
      const code = error instanceof Error ? error.message : "SANITY_WRITE_FAILED";
      console.error("Editorial update failed", code);
      const { igdbErrorMessage } = await import("@/lib/igdb/igdb.server");
      return { ok: false, error: igdbErrorMessage(code) };
    }
  });

/** Adds a reviewed game to a curated collection. */
export const addGameToCollection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { gameId: string; collectionId: string }) => ({
    gameId: String(input.gameId ?? ""),
    collectionId: String(input.collectionId ?? ""),
  }))
  .handler(async ({ data, context }): Promise<{ ok: boolean; error: string | null }> => {
    const { assertEditor, authErrorMessage } = await import("@/lib/auth/roles.server");
    try {
      await assertEditor(context.supabase, context.userId);
    } catch (error) {
      return { ok: false, error: authErrorMessage(String(error)) };
    }

    if (!data.gameId || !data.collectionId) {
      return { ok: false, error: "Choose both a game and a collection." };
    }

    const { getSanityWriteClient } = await import("@/lib/sanity/write.server");
    try {
      await getSanityWriteClient()
        .patch(data.collectionId)
        .setIfMissing({ games: [] })
        .insert("after", "games[-1]", [
          { _key: `game-${data.gameId}`, _type: "reference", _ref: data.gameId },
        ])
        .commit();
      return { ok: true, error: null };
    } catch (error) {
      const code = error instanceof Error ? error.message : "SANITY_WRITE_FAILED";
      console.error("Collection update failed", code);
      return { ok: false, error: "That collection could not be updated. Please try again." };
    }
  });

/** Import history for the /imports screen. Authorized, uncached. */
export const getImportHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ records: ImportRecordEntry[]; error: string | null }> => {
    const { assertEditor, authErrorMessage } = await import("@/lib/auth/roles.server");
    try {
      await assertEditor(context.supabase, context.userId);
    } catch (error) {
      return { records: [], error: authErrorMessage(String(error)) };
    }

    const { getSanityWriteClient } = await import("@/lib/sanity/write.server");
    const { importHistoryQuery } = await import("@/lib/sanity/queries");
    try {
      const records = await getSanityWriteClient().fetch<ImportRecordEntry[]>(importHistoryQuery, { limit: 50 });
      return { records, error: null };
    } catch (error) {
      console.error("Import history read failed", error instanceof Error ? error.message : "unknown");
      return { records: [], error: "Import history could not be loaded right now." };
    }
  });
