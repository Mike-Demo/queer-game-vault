import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

import { AppShell } from "@/components/AppShell";
import { EmptyState, ErrorState, LoadingState } from "@/components/StateViews";
import {
  NesBadge,
  NesText,
} from "@/design-system/nes-229931";
import { Surface } from "@/components/Surface";
import { getImportHistory } from "@/lib/editorial.functions";

export const Route = createFileRoute("/_authenticated/imports")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { name: "robots", content: "noindex" },
      { title: "Import history — QueerCade" },
      { name: "description", content: "Every IGDB import and refresh recorded for the QueerCade library." },
      { property: "og:title", content: "Import history — QueerCade" },
      { property: "og:description", content: "Audit trail of IGDB imports and refreshes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ImportsPage,
});

function resultVariant(result: string | null) {
  if (result === "success") return "success" as const;
  if (result === "failed") return "error" as const;
  if (result === "partial" || result === "skipped") return "warning" as const;
  return "dark" as const;
}

function ImportsPage() {
  const fetchHistory = useServerFn(getImportHistory);
  const history = useQuery({
    queryKey: ["importHistory"],
    queryFn: () => fetchHistory(),
  });

  return (
    <AppShell>
      <div className="stack-lg">
        <NesText variant="primary" className="title-xl">
          Import history
        </NesText>
        {history.isPending ? <LoadingState label="Loading import history" /> : null}
        {history.isError ? <ErrorState message="Import history could not be loaded." /> : null}
        {history.data?.error ? <ErrorState message={history.data.error} /> : null}
        {history.data && !history.data.error && history.data.records.length === 0 ? (
          <EmptyState title="No imports yet">
            <NesText>Import a game from Discover and it will show up here.</NesText>
          </EmptyState>
        ) : null}
        {history.data?.records.map((record) => (
          <Surface key={record._id} title={record.gameTitle ?? `IGDB ${record.igdbId}`}>
            <div className="stack">
              <div className="row">
                <NesBadge variant={resultVariant(record.result)}>{record.result ?? "unknown"}</NesBadge>
                <NesBadge variant="primary">{record.operation ?? "import"}</NesBadge>
                <NesText className="text-xs">
                  {record.completedAt ? new Date(record.completedAt).toLocaleString() : ""}
                </NesText>
              </div>
              {record.fieldsChanged.length > 0 ? (
                <NesText className="text-xs">{`Fields updated: ${record.fieldsChanged.join(", ")}`}</NesText>
              ) : null}
              {record.warningMessages.map((warning) => (
                <NesText key={warning} variant="warning" className="text-xs">
                  {warning}
                </NesText>
              ))}
              {record.errorMessage ? (
                <NesText variant="error" className="text-xs">
                  {record.errorMessage}
                </NesText>
              ) : null}
              {record.game?.slug ? (
                <Link to="/games/$slug" params={{ slug: record.game.slug }}>
                  Open game page
                </Link>
              ) : null}
            </div>
          </Surface>
        ))}
      </div>
    </AppShell>
  );
}
