import { Link } from "@tanstack/react-router";
import { Suspense, lazy } from "react";

import { useSession } from "@/hooks/useAuth";

export interface TrackableGame {
  igdbId: number;
  slug: string;
  title: string;
  coverUrl?: string | null;
}

const TrackControlPanel = lazy(async () => ({
  default: (await import("@/components/TrackControlPanel")).TrackControlPanel,
}));

/**
 * The one control people use to track a game. Shown on game cards and on the
 * game page; signed-out visitors get a sign-in prompt instead, and the
 * interactive panel only loads once there is a session.
 */
export function TrackControl({ game }: { game: TrackableGame }) {
  const { session, loading } = useSession();

  if (loading) return null;

  if (!session) {
    return (
      <Link to="/auth" search={{ next: `/games/${game.slug}` }}>
        Sign in to track this game
      </Link>
    );
  }

  return (
    <Suspense fallback={null}>
      <TrackControlPanel game={game} />
    </Suspense>
  );
}
