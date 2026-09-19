import { Link } from "@tanstack/react-router";

import { NesSelect, NesText } from "@/design-system/nes-229931";
import { useSession } from "@/hooks/useAuth";
import { useMyEntries, useSetGameStatus } from "@/hooks/useTracking";
import { isTrackStatus, STATUS_LABELS, TRACK_STATUSES } from "@/lib/tracking/types";

export interface TrackableGame {
  igdbId: number;
  slug: string;
  title: string;
  coverUrl?: string | null;
}

/**
 * The one control people use to track a game. Shown on game cards and on the
 * game page; signed-out visitors get a sign-in prompt instead.
 */
export function TrackControl({ game }: { game: TrackableGame }) {
  const { session, loading } = useSession();
  const signedIn = Boolean(session);
  const { data: entries } = useMyEntries(signedIn);
  const setStatus = useSetGameStatus();

  const controlId = `track-${game.igdbId}`;
  const current = entries?.find((entry) => entry.igdbId === game.igdbId)?.status ?? "";

  if (loading) return null;

  if (!signedIn) {
    return (
      <Link to="/auth" search={{ next: `/games/${game.slug}` }}>
        Sign in to track this game
      </Link>
    );
  }

  return (
    <div className="stack-tight">
      <label className="text-xs" htmlFor={controlId}>
        In my library
      </label>
      <NesSelect
        id={controlId}
        value={current}
        disabled={setStatus.isPending}
        onChange={(event) => {
          const next = event.target.value;
          setStatus.mutate({
            igdbId: game.igdbId,
            gameSlug: game.slug,
            title: game.title,
            coverUrl: game.coverUrl ?? null,
            status: isTrackStatus(next) ? next : null,
          });
        }}
      >
        <option value="">Not tracked</option>
        {TRACK_STATUSES.map((status) => (
          <option key={status} value={status}>
            {STATUS_LABELS[status]}
          </option>
        ))}
      </NesSelect>
      <span aria-live="polite" className="text-xs">
        {setStatus.isError ? (
          <NesText variant="error">
            {setStatus.error instanceof Error ? setStatus.error.message : "That change was not saved."}
          </NesText>
        ) : null}
      </span>
    </div>
  );
}
