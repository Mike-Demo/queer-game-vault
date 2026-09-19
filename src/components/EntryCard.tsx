import { Link } from "@tanstack/react-router";

import {
  NesButton,
  NesSelect,
  NesText,
} from "@/design-system/nes-229931";
import { Surface } from "@/components/Surface";
import { useSetGameStatus } from "@/hooks/useTracking";
import { isTrackStatus, STATUS_LABELS, TRACK_STATUSES, type GameEntry } from "@/lib/tracking/types";

/** One tracked game, with controls to move it between lists or remove it. */
export function EntryCard({ entry, editable }: { entry: GameEntry; editable: boolean }) {
  const setStatus = useSetGameStatus();
  const controlId = `entry-${entry.igdbId}`;

  return (
    <Surface rounded>
      <div className="stack">
        {entry.coverUrl ? (
          <img
            className="cover cover-sm"
            src={entry.coverUrl}
            alt={`${entry.title} cover art`}
            width={400}
            height={532}
            loading="lazy"
            decoding="async"
          />
        ) : null}
        <NesText className="text-xs">{entry.title}</NesText>
        <Link to="/games/$slug" params={{ slug: entry.gameSlug }}>
          View details
        </Link>
        {editable ? (
          <>
            <label className="visually-hidden" htmlFor={controlId}>
              {`Status for ${entry.title}`}
            </label>
            <NesSelect
              id={controlId}
              value={entry.status}
              disabled={setStatus.isPending}
              onChange={(event) => {
                const next = event.target.value;
                if (!isTrackStatus(next)) return;
                setStatus.mutate({
                  igdbId: entry.igdbId,
                  gameSlug: entry.gameSlug,
                  title: entry.title,
                  coverUrl: entry.coverUrl,
                  status: next,
                });
              }}
            >
              {TRACK_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </NesSelect>
            <NesButton
              type="button"
              variant="error"
              disabled={setStatus.isPending}
              onClick={() =>
                setStatus.mutate({
                  igdbId: entry.igdbId,
                  gameSlug: entry.gameSlug,
                  title: entry.title,
                  coverUrl: entry.coverUrl,
                  status: null,
                })
              }
              aria-label={`Remove ${entry.title} from my library`}
            >
              Remove
            </NesButton>
          </>
        ) : null}
      </div>
    </Surface>
  );
}
