import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { AppShell } from "@/components/AppShell";
import { EmptyState, ErrorState, LoadingState } from "@/components/StateViews";
import {
  NesBadge,
  NesButton,
  NesCheckbox,
  NesContainer,
  NesField,
  NesSelect,
  NesText,
  NesTextarea,
} from "@/design-system/nes-229931";
import {
  addGameToCollection,
  getReviewQueue,
  updateGameEditorial,
} from "@/lib/editorial.functions";
import { importGamesFromIgdb } from "@/lib/editorial.functions";
import { studioDocumentUrl } from "@/lib/sanity/config";
import type { GameDetail } from "@/lib/sanity/types";

export const Route = createFileRoute("/_authenticated/review")({
  head: () => ({
    meta: [
      { title: "Review queue — QueerCade" },
      { name: "description", content: "Review imported games, write editorial copy, and approve what goes public." },
      { property: "og:title", content: "Review queue — QueerCade" },
      { property: "og:description", content: "Editorial review of imported IGDB games." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReviewPage,
});

const STATUS_OPTIONS = [
  { value: "imported", label: "Imported" },
  { value: "underReview", label: "Under review" },
  { value: "approved", label: "Approved (public)" },
  { value: "featured", label: "Featured (public)" },
  { value: "archived", label: "Archived (never public)" },
];

function ReviewPage() {
  const queryClient = useQueryClient();
  const fetchQueue = useServerFn(getReviewQueue);
  const saveEditorial = useServerFn(updateGameEditorial);
  const assignCollection = useServerFn(addGameToCollection);
  const refreshFromIgdb = useServerFn(importGamesFromIgdb);

  const queue = useQuery({ queryKey: ["reviewQueue"], queryFn: () => fetchQueue() });
  const [notice, setNotice] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  function afterWrite(message: string) {
    setNotice(message);
    setProblem(null);
    void queryClient.invalidateQueries({ queryKey: ["reviewQueue"] });
    void queryClient.invalidateQueries({ queryKey: ["games"] });
    void queryClient.invalidateQueries({ queryKey: ["importHistory"] });
  }

  const saveMutation = useMutation({
    mutationFn: saveEditorial,
    onSuccess: (result) => {
      if (result.error) setProblem(result.error);
      else afterWrite("Saved.");
    },
  });

  const collectionMutation = useMutation({
    mutationFn: assignCollection,
    onSuccess: (result) => {
      if (result.error) setProblem(result.error);
      else afterWrite("Added to the collection.");
    },
  });

  const refreshMutation = useMutation({
    mutationFn: refreshFromIgdb,
    onSuccess: (result) => {
      if (result.error) setProblem(result.error);
      else {
        const changed = result.outcomes[0]?.fieldsChanged ?? [];
        afterWrite(
          changed.length > 0
            ? `Refreshed from IGDB. Updated: ${changed.join(", ")}.`
            : "Refreshed from IGDB. Nothing changed.",
        );
      }
    },
  });

  return (
    <AppShell>
      <div className="stack-lg">
        <NesText variant="primary" className="title-xl">
          Review queue
        </NesText>
        <NesText className="text-xs">
          Imported games wait here until an editor approves them. Nothing on this screen is public yet.
        </NesText>
        {notice ? (
          <NesText variant="success" role="status">
            {notice}
          </NesText>
        ) : null}
        {problem ? <ErrorState message={problem} /> : null}
        {queue.isPending ? <LoadingState label="Loading review queue" /> : null}
        {queue.isError ? <ErrorState message="The review queue could not be loaded." /> : null}
        {queue.data?.error ? <ErrorState message={queue.data.error} /> : null}
        {queue.data && !queue.data.error && queue.data.games.length === 0 ? (
          <EmptyState title="Nothing waiting for review">
            <NesText>Import games from Discover and they will appear here.</NesText>
          </EmptyState>
        ) : null}
        {queue.data?.games.map((game) => (
          <ReviewCard
            key={game._id}
            game={game}
            collections={queue.data?.collections ?? []}
            busy={saveMutation.isPending || refreshMutation.isPending || collectionMutation.isPending}
            onSave={(input) => saveMutation.mutate({ data: { gameId: game._id, ...input } })}
            onRefresh={() =>
              refreshMutation.mutate({ data: { igdbIds: [game.igdbId], updateExisting: true } })
            }
            onAddToCollection={(collectionId) =>
              collectionMutation.mutate({ data: { gameId: game._id, collectionId } })
            }
          />
        ))}
      </div>
    </AppShell>
  );
}

interface ReviewCardProps {
  game: GameDetail;
  collections: { _id: string; title: string }[];
  busy: boolean;
  onSave: (input: {
    editorialStatus?: string;
    featured?: boolean;
    customDescription?: string;
    editorNotes?: string;
  }) => void;
  onRefresh: () => void;
  onAddToCollection: (collectionId: string) => void;
}

function ReviewCard({ game, collections, busy, onSave, onRefresh, onAddToCollection }: ReviewCardProps) {
  const [status, setStatus] = useState(game.editorialStatus);
  const [featured, setFeatured] = useState(game.featured);
  const [description, setDescription] = useState(game.customDescription ?? "");
  const [notes, setNotes] = useState(game.editorNotes ?? "");
  const [collectionId, setCollectionId] = useState("");
  const [confirmRefresh, setConfirmRefresh] = useState(false);

  return (
    <NesContainer title={game.title} rounded>
      <div className="stack">
        <div className="row">
          <NesBadge variant="warning">{game.editorialStatus}</NesBadge>
          {game.releaseYear ? <NesBadge variant="primary">{String(game.releaseYear)}</NesBadge> : null}
          <NesText className="text-xs">{`IGDB ${game.igdbId}`}</NesText>
        </div>
        {game.summary ? <p className="text-xs">{`IGDB summary: ${game.summary.slice(0, 300)}`}</p> : null}

        <NesField label="Custom description (yours, never overwritten)" htmlFor={`desc-${game._id}`}>
          <NesTextarea
            id={`desc-${game._id}`}
            rows={4}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </NesField>
        <NesField label="Editor notes" htmlFor={`notes-${game._id}`}>
          <NesTextarea
            id={`notes-${game._id}`}
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </NesField>
        <NesField label="Editorial status" htmlFor={`status-${game._id}`}>
          <NesSelect
            id={`status-${game._id}`}
            value={status}
            onChange={(event) => setStatus(event.target.value as GameDetail["editorialStatus"])}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </NesSelect>
        </NesField>
        <NesCheckbox
          label="Featured on the homepage"
          checked={featured}
          onChange={(event) => setFeatured(event.target.checked)}
        />
        <div className="row">
          <NesButton
            type="button"
            variant="success"
            disabled={busy}
            onClick={() =>
              onSave({
                editorialStatus: status,
                featured,
                customDescription: description,
                editorNotes: notes,
              })
            }
          >
            Save review
          </NesButton>
          <a href={studioDocumentUrl(game._id)} target="_blank" rel="noreferrer noopener">
            Open in Sanity Studio
          </a>
        </div>

        {collections.length > 0 ? (
          <div className="row">
            <NesField label="Add to collection" htmlFor={`collection-${game._id}`}>
              <NesSelect
                id={`collection-${game._id}`}
                value={collectionId}
                onChange={(event) => setCollectionId(event.target.value)}
              >
                <option value="">Choose a collection</option>
                {collections.map((collection) => (
                  <option key={collection._id} value={collection._id}>
                    {collection.title}
                  </option>
                ))}
              </NesSelect>
            </NesField>
            <NesButton
              type="button"
              disabled={busy || !collectionId}
              onClick={() => onAddToCollection(collectionId)}
            >
              Add
            </NesButton>
          </div>
        ) : null}

        {confirmRefresh ? (
          <div className="stack">
            <NesText variant="warning" className="text-xs">
              Refreshing overwrites the IGDB-sourced fields on this game (title, summary, storyline, media,
              dates, genres, platforms, companies, ratings). Your custom description, notes, status, featured
              flag and collection membership are untouched.
            </NesText>
            <div className="row">
              <NesButton
                type="button"
                variant="warning"
                disabled={busy}
                onClick={() => {
                  setConfirmRefresh(false);
                  onRefresh();
                }}
              >
                Yes, refresh from IGDB
              </NesButton>
              <NesButton type="button" onClick={() => setConfirmRefresh(false)}>
                Cancel
              </NesButton>
            </div>
          </div>
        ) : (
          <NesButton type="button" disabled={busy} onClick={() => setConfirmRefresh(true)}>
            Refresh source metadata from IGDB
          </NesButton>
        )}
      </div>
    </NesContainer>
  );
}
