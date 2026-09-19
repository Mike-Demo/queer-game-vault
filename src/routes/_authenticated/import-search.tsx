import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { EmptyState, ErrorState, LoadingState } from "@/components/StateViews";
import {
  NesBadge,
  NesButton,
  NesCheckbox,
  NesContainer,
  NesField,
  NesInput,
  NesText,
} from "@/design-system/nes-229931";
import { studioDocumentUrl } from "@/lib/sanity/config";
import { importGamesFromIgdb, type ImportSummary } from "@/lib/editorial.functions";
import { getIgdbGameDetails, searchIgdbGames, type IgdbSearchResult } from "@/lib/igdb.functions";

export const Route = createFileRoute("/_authenticated/import-search")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Import games — QueerCade" },
      { name: "description", content: "Search IGDB, preview a game's full record, and import it into Sanity." },
      { property: "og:title", content: "Import games — QueerCade" },
      { property: "og:description", content: "Search IGDB and import games into the curated library." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DiscoverPage,
});

const MIN_TERM = 3;

function DiscoverPage() {
  const queryClient = useQueryClient();
  const runSearch = useServerFn(searchIgdbGames);
  const runDetails = useServerFn(getIgdbGameDetails);
  const runImport = useServerFn(importGamesFromIgdb);

  const [term, setTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const [pages, setPages] = useState(1);
  const [selected, setSelected] = useState<number[]>([]);
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(term.trim());
      setPages(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [term]);

  const searchEnabled = debouncedTerm.length >= MIN_TERM;

  const searchQuery = useQuery({
    queryKey: ["igdbSearch", debouncedTerm, pages],
    queryFn: async () => {
      const responses = await Promise.all(
        Array.from({ length: pages }, (_unused, index) =>
          runSearch({ data: { term: debouncedTerm, offset: index * 12 } }),
        ),
      );
      const results: IgdbSearchResult[] = responses.flatMap((response) => response.results);
      const last = responses[responses.length - 1];
      return { results, hasMore: Boolean(last?.hasMore), error: last?.error ?? null };
    },
    enabled: searchEnabled,
  });

  const detailsQuery = useQuery({
    queryKey: ["igdbDetails", previewId],
    queryFn: () => runDetails({ data: { igdbId: previewId! } }),
    enabled: previewId !== null,
  });

  const importMutation = useMutation({
    mutationFn: (input: { igdbIds: number[]; updateExisting: boolean }) => runImport({ data: input }),
    onSuccess: (result) => {
      setSummary(result);
      setSelected([]);
      void queryClient.invalidateQueries({ queryKey: ["igdbSearch"] });
      void queryClient.invalidateQueries({ queryKey: ["igdbDetails"] });
      void queryClient.invalidateQueries({ queryKey: ["importHistory"] });
      void queryClient.invalidateQueries({ queryKey: ["reviewQueue"] });
      void queryClient.invalidateQueries({ queryKey: ["games"] });
    },
  });

  const searchResults = searchQuery.data?.results;
  const results = useMemo(() => searchResults ?? [], [searchResults]);
  const selectableNew = useMemo(
    () => results.filter((result) => !result.libraryStatus).map((result) => result.igdbId),
    [results],
  );


  function toggle(igdbId: number) {
    setSelected((current) =>
      current.includes(igdbId) ? current.filter((id) => id !== igdbId) : [...current, igdbId],
    );
  }

  return (
    <AppShell>
      <div className="stack-lg">
        <NesText variant="primary" className="title-xl">
          Discover games
        </NesText>

        <NesContainer title="Search IGDB" rounded>
          <div className="stack">
            <NesField label="Game title" htmlFor="search">
              <NesInput
                id="search"
                type="search"
                value={term}
                placeholder="SUPER MARIO"
                aria-describedby="search-hint"
                onChange={(event) => setTerm(event.target.value)}
              />
            </NesField>
            <NesText id="search-hint" className="text-xs">
              {`Type at least ${MIN_TERM} characters. Results come from IGDB.`}
            </NesText>
            <div className="row">
              <NesButton
                type="button"
                variant="primary"
                disabled={selected.length === 0 || importMutation.isPending}
                onClick={() => importMutation.mutate({ igdbIds: selected, updateExisting: false })}
              >
                {importMutation.isPending ? "Importing..." : `Import selected (${selected.length})`}
              </NesButton>
              <NesButton
                type="button"
                disabled={selectableNew.length === 0}
                onClick={() => setSelected(selectableNew)}
              >
                Select all new
              </NesButton>
              <NesButton type="button" disabled={selected.length === 0} onClick={() => setSelected([])}>
                Cancel selection
              </NesButton>
            </div>
          </div>
        </NesContainer>

        {summary ? (
          <NesContainer title="Import summary">
            <div className="stack" role="status">
              {summary.error ? <NesText variant="error">{summary.error}</NesText> : null}
              <NesText>
                {`${summary.created} imported, ${summary.updated} refreshed, ${summary.skipped} skipped, ${summary.failed} failed.`}
              </NesText>
              {summary.outcomes.map((outcome) => (
                <div key={`${outcome.igdbId}-${outcome.operation}`} className="row">
                  <NesBadge
                    variant={
                      outcome.result === "success"
                        ? "success"
                        : outcome.result === "failed"
                          ? "error"
                          : "warning"
                    }
                  >
                    {outcome.result}
                  </NesBadge>
                  <NesText className="text-xs">{outcome.title}</NesText>
                  {outcome.error ? (
                    <NesText variant="error" className="text-xs">
                      {outcome.error}
                    </NesText>
                  ) : null}
                  {outcome.warnings.map((warning) => (
                    <NesText key={warning} variant="warning" className="text-xs">
                      {warning}
                    </NesText>
                  ))}
                  {outcome.gameId ? (
                    <a href={studioDocumentUrl(outcome.gameId)} target="_blank" rel="noreferrer noopener">
                      Open in Sanity Studio
                    </a>
                  ) : null}
                </div>
              ))}
              <NesButton type="button" onClick={() => setSummary(null)}>
                Dismiss
              </NesButton>
            </div>
          </NesContainer>
        ) : null}

        {!searchEnabled ? (
          <EmptyState title="Start typing to search IGDB">
            <NesText>Search by title, then preview a game before importing it.</NesText>
          </EmptyState>
        ) : null}
        {searchEnabled && searchQuery.isPending ? <LoadingState label="Searching IGDB" /> : null}
        {searchQuery.isError ? <ErrorState message="The search request failed. Please try again." /> : null}
        {searchQuery.data?.error ? <ErrorState message={searchQuery.data.error} /> : null}
        {searchEnabled && searchQuery.data && !searchQuery.data.error && results.length === 0 ? (
          <EmptyState title="No games matched">
            <NesText>Try a different spelling or a shorter title.</NesText>
          </EmptyState>
        ) : null}

        {results.length > 0 ? (
          <div className="card-grid">
            {results.map((result) => (
              <NesContainer key={result.igdbId} rounded>
                <div className="stack">
                  {result.coverUrl ? (
                    <img className="cover" src={result.coverUrl} alt={`${result.title} cover art`} loading="lazy" />
                  ) : (
                    <div className="cover-placeholder">
                      <NesText>No cover art</NesText>
                    </div>
                  )}
                  <NesText className="title-md">{result.title}</NesText>
                  <div className="row">
                    {result.releaseYear ? <NesBadge variant="primary">{String(result.releaseYear)}</NesBadge> : null}
                    {result.libraryStatus ? (
                      <NesBadge variant="success">{`In library: ${result.libraryStatus}`}</NesBadge>
                    ) : (
                      <NesBadge variant="warning">Not imported</NesBadge>
                    )}
                  </div>
                  <div className="row">
                    {result.platforms.slice(0, 3).map((platform) => (
                      <NesBadge key={platform}>{platform}</NesBadge>
                    ))}
                  </div>
                  {result.summary ? <p className="text-xs">{result.summary.slice(0, 130)}</p> : null}
                  <NesCheckbox
                    label="Select for import"
                    checked={selected.includes(result.igdbId)}
                    onChange={() => toggle(result.igdbId)}
                  />
                  <NesButton type="button" onClick={() => setPreviewId(result.igdbId)}>
                    Preview IGDB data
                  </NesButton>
                </div>
              </NesContainer>
            ))}
          </div>
        ) : null}

        {searchQuery.data?.hasMore ? (
          <NesButton type="button" onClick={() => setPages((current) => current + 1)}>
            Load more results
          </NesButton>
        ) : null}

        {previewId !== null ? (
          <NesContainer title="IGDB preview (source data)" rounded>
            <div className="stack">
              {detailsQuery.isPending ? <LoadingState label="Loading IGDB record" /> : null}
              {detailsQuery.data?.error ? <ErrorState message={detailsQuery.data.error} /> : null}
              {detailsQuery.data?.game ? (
                <>
                  <NesText className="title-md">{detailsQuery.data.game.title}</NesText>
                  <NesText className="text-xs">
                    {`All values below come from IGDB. Editorial fields stay yours after import.`}
                  </NesText>
                  {detailsQuery.data.game.summary ? <p className="text-xs">{detailsQuery.data.game.summary}</p> : null}
                  {detailsQuery.data.game.storyline ? (
                    <p className="text-xs">{detailsQuery.data.game.storyline}</p>
                  ) : null}
                  <NesText className="text-xs">
                    {`Release: ${detailsQuery.data.game.firstReleaseDate?.slice(0, 10) ?? "unknown"}`}
                  </NesText>
                  <NesText className="text-xs">{`Platforms: ${detailsQuery.data.game.platforms.join(", ") || "unknown"}`}</NesText>
                  <NesText className="text-xs">{`Genres: ${detailsQuery.data.game.genres.join(", ") || "unknown"}`}</NesText>
                  <NesText className="text-xs">{`Themes: ${detailsQuery.data.game.themes.join(", ") || "unknown"}`}</NesText>
                  <NesText className="text-xs">{`Modes: ${detailsQuery.data.game.gameModes.join(", ") || "unknown"}`}</NesText>
                  <NesText className="text-xs">{`Developer: ${detailsQuery.data.game.developerName ?? "unknown"}`}</NesText>
                  <NesText className="text-xs">{`Publisher: ${detailsQuery.data.game.publisherName ?? "unknown"}`}</NesText>
                  <NesText className="text-xs">{`Franchise: ${detailsQuery.data.game.franchise ?? "none"}`}</NesText>
                  <NesText className="text-xs">{`Series: ${detailsQuery.data.game.igdbCollectionName ?? "none"}`}</NesText>
                  {detailsQuery.data.game.ageRatings.map((rating, index) => (
                    <NesText key={`${rating.category}-${index}`} className="text-xs">
                      {`${rating.category}: ${rating.rating}`}
                    </NesText>
                  ))}
                  {detailsQuery.data.game.igdbRating ? (
                    <NesText className="text-xs">
                      {`IGDB rating: ${Math.round(detailsQuery.data.game.igdbRating)} / 100 (${detailsQuery.data.game.igdbRatingCount ?? 0} ratings)`}
                    </NesText>
                  ) : null}
                  {detailsQuery.data.game.screenshots.length > 0 ? (
                    <div className="shot-strip">
                      {detailsQuery.data.game.screenshots.slice(0, 4).map((url) => (
                        <img key={url} className="cover" src={url} alt="IGDB screenshot" loading="lazy" />
                      ))}
                    </div>
                  ) : null}
                  <div className="row">
                    {detailsQuery.data.game.externalLinks.map((link) => (
                      <a key={link.url} href={link.url} target="_blank" rel="noreferrer noopener">
                        {link.label}
                      </a>
                    ))}
                  </div>

                  {detailsQuery.data.existing ? (
                    <NesContainer title="Already in your library">
                      <div className="stack">
                        <NesText variant="warning" className="text-xs">
                          {`This game is already in your Sanity library as "${detailsQuery.data.existing.title}" (${detailsQuery.data.existing.editorialStatus}). Refreshing replaces IGDB metadata only — your custom description, notes, status, featured flag and collections stay as they are.`}
                        </NesText>
                        <div className="row">
                          <NesButton
                            type="button"
                            variant="warning"
                            disabled={importMutation.isPending}
                            onClick={() =>
                              importMutation.mutate({ igdbIds: [previewId], updateExisting: true })
                            }
                          >
                            Refresh imported metadata
                          </NesButton>
                          <a
                            href={studioDocumentUrl(detailsQuery.data.existing._id)}
                            target="_blank"
                            rel="noreferrer noopener"
                          >
                            Open in Sanity Studio
                          </a>
                          <NesButton type="button" onClick={() => setPreviewId(null)}>
                            Cancel
                          </NesButton>
                        </div>
                      </div>
                    </NesContainer>
                  ) : (
                    <div className="row">
                      <NesButton
                        type="button"
                        variant="success"
                        disabled={importMutation.isPending}
                        onClick={() => importMutation.mutate({ igdbIds: [previewId], updateExisting: false })}
                      >
                        {importMutation.isPending ? "Importing..." : "Import this game"}
                      </NesButton>
                      <NesButton type="button" onClick={() => setPreviewId(null)}>
                        Cancel
                      </NesButton>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </NesContainer>
        ) : null}
      </div>
    </AppShell>
  );
}
