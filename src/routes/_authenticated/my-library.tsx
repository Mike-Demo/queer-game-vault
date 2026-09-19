import { createFileRoute, Link } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import { EntryCard } from "@/components/EntryCard";
import { EmptyState, ErrorState, LoadingState } from "@/components/StateViews";
import { NesContainer, NesText } from "@/design-system/nes-229931";
import { useMyProfile } from "@/hooks/useProfile";
import { useMyEntries } from "@/hooks/useTracking";
import { STATUS_LABELS, TRACK_STATUSES, type TrackStatus } from "@/lib/tracking/types";

export const Route = createFileRoute("/_authenticated/my-library")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "My library — QueerCade" },
      {
        name: "description",
        content: "Your own QueerCade library: what you are playing, completed, wishlisted and dropped.",
      },
      { property: "og:title", content: "My library — QueerCade" },
      { property: "og:description", content: "Track what you play in the QueerCade arcade." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MyLibraryPage,
});

function MyLibraryPage() {
  const entries = useMyEntries(true);
  const profile = useMyProfile(true);

  const grouped = TRACK_STATUSES.reduce<Record<TrackStatus, typeof entries.data>>(
    (accumulator, status) => {
      accumulator[status] = (entries.data ?? []).filter((entry) => entry.status === status);
      return accumulator;
    },
    { playing: [], completed: [], wishlist: [], dropped: [] },
  );

  return (
    <AppShell>
      <div className="stack-lg">
        <div className="row-between">
          <h1 className="title-xl">
            <NesText variant="primary">My library</NesText>
          </h1>
          <div className="row">
            {profile.data?.username ? (
              <Link to="/profile/$username" params={{ username: profile.data.username }}>
                My public profile
              </Link>
            ) : null}
            <Link to="/settings">Settings</Link>
          </div>
        </div>

        {entries.isPending ? <LoadingState label="Loading your library" /> : null}
        {entries.isError ? <ErrorState message="Your library could not be loaded. Please refresh." /> : null}

        {entries.data ? (
          entries.data.length === 0 ? (
            <EmptyState title="Nothing tracked yet">
              <NesText>
                Find something you like in <Link to="/discover">Discover</Link> and set it to Playing, Completed,
                Wishlist or Dropped.
              </NesText>
            </EmptyState>
          ) : (
            <div className="library-columns">
              {TRACK_STATUSES.map((status) => (
                <section className="stack" key={status}>
                  <h2 className="title-md">
                    <NesText>{`${STATUS_LABELS[status]} (${grouped[status]?.length ?? 0})`}</NesText>
                  </h2>
                  {(grouped[status]?.length ?? 0) === 0 ? (
                    <NesContainer rounded>
                      <NesText className="text-xs">No games here yet.</NesText>
                    </NesContainer>
                  ) : (
                    <div className="stack">
                      {grouped[status]?.map((entry) => (
                        <EntryCard key={entry.igdbId} entry={entry} editable />
                      ))}
                    </div>
                  )}
                </section>
              ))}
            </div>
          )
        ) : null}
      </div>
    </AppShell>
  );
}
