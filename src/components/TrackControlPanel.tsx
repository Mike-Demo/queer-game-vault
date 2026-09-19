import { NesSelect, NesText } from "@/design-system/nes-229931";
import { useMyEntries, useSetGameStatus } from "@/hooks/useTracking";
import { isTrackStatus, STATUS_LABELS, TRACK_STATUSES } from "@/lib/tracking/types";
import type { TrackableGame } from "@/components/TrackControl";

/**
 * The signed-in half of the tracking control. Loaded on demand so public,
 * pre-rendered pages do not ship the tracking data layer to visitors.
 */
export function TrackControlPanel({ game }: { game: TrackableGame }) {
  const { data: entries } = useMyEntries(true);
  const setStatus = useSetGameStatus();

  const controlId = `track-${game.igdbId}`;
  const current = entries?.find((entry) => entry.igdbId === game.igdbId)?.status ?? "";

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
