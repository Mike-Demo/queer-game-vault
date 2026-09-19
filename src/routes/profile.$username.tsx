import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

import { AppShell } from "@/components/AppShell";
import { EntryCard } from "@/components/EntryCard";
import { EmptyState, ErrorState, LoadingState } from "@/components/StateViews";
import {
  NesAvatar,
  NesText,
} from "@/design-system/nes-229931";
import { Surface } from "@/components/Surface";
import { getProfileByUsername } from "@/lib/tracking.functions";
import { STATUS_LABELS, TRACK_STATUSES } from "@/lib/tracking/types";

export const Route = createFileRoute("/profile/$username")({
  ssr: false,
  staticData: { sitemap: false },
  head: ({ params }) => ({
    meta: [
      { title: `${params.username} — QueerCade profile` },
      { name: "description", content: `Games ${params.username} is playing on QueerCade.` },
      { property: "og:title", content: `${params.username} — QueerCade profile` },
      { property: "og:description", content: `Games ${params.username} is playing on QueerCade.` },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { username } = Route.useParams();
  const fetchProfile = useServerFn(getProfileByUsername);
  const profile = useQuery({
    queryKey: ["publicProfile", username],
    queryFn: () => fetchProfile({ data: { username } }),
  });

  const data = profile.data;

  return (
    <AppShell>
      <div className="stack-lg">
        {profile.isPending ? <LoadingState label="Loading profile" /> : null}
        {profile.isError ? <ErrorState message="That profile could not be loaded." /> : null}

        {data && !data.profile ? (
          <EmptyState title="Profile not available">
            <NesText>This player does not exist, or keeps their library private.</NesText>
          </EmptyState>
        ) : null}

        {data?.profile ? (
          <>
            <Surface rounded>
              <div className="row">
                <NesAvatar src={data.profile.avatarUrl ?? undefined} alt="" size="large" />
                <div className="stack">
                  <h1 className="title-xl">
                    <NesText variant="primary">{data.profile.username}</NesText>
                  </h1>
                  {data.profile.bio ? <NesText className="text-xs">{data.profile.bio}</NesText> : null}
                  <NesText className="text-xs">
                    {`${data.entries.length} game${data.entries.length === 1 ? "" : "s"} tracked`}
                  </NesText>
                </div>
              </div>
            </Surface>

            {data.entries.length === 0 ? (
              <EmptyState title="No games tracked yet">
                <NesText>This player has not added any games to their library.</NesText>
              </EmptyState>
            ) : (
              <div className="library-columns">
                {TRACK_STATUSES.map((status) => {
                  const list = data.entries.filter((entry) => entry.status === status);
                  if (list.length === 0) return null;
                  return (
                    <section className="stack" key={status}>
                      <h2 className="title-md">
                        <NesText>{`${STATUS_LABELS[status]} (${list.length})`}</NesText>
                      </h2>
                      <div className="stack">
                        {list.map((entry) => (
                          <EntryCard key={entry.igdbId} entry={entry} editable={false} />
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            )}
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
