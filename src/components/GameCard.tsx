import { Link } from "@tanstack/react-router";

import { TrackControl } from "@/components/TrackControl";
import { NesBadge, NesContainer, NesText } from "@/design-system/nes-229931";
import { coverUrl } from "@/lib/publicData";
import type { GameSummary } from "@/lib/sanity/types";

export function GameCard({ game }: { game: GameSummary }) {
  const cover = coverUrl(game);
  const blurb = game.customDescription ?? game.summary;

  return (
    <NesContainer rounded>
      <div className="stack">
        {cover ? (
          <img className="cover" src={cover} alt={`${game.title} cover art`} loading="lazy" />
        ) : (
          <div className="cover-placeholder">
            <NesText>No cover art</NesText>
          </div>
        )}
        <NesText className="title-md">{game.title}</NesText>
        <div className="row">
          {game.releaseYear ? <NesBadge variant="primary">{String(game.releaseYear)}</NesBadge> : null}
          {(game.featured || game.editorialStatus === "featured") ? (
            <NesBadge variant="warning">Featured</NesBadge>
          ) : null}
        </div>
        {blurb ? <p className="text-xs">{blurb.slice(0, 140)}</p> : null}
        <div className="row">
          {game.platforms.slice(0, 3).map((platform) => (
            <NesBadge key={platform._id}>{platform.abbreviation ?? platform.name}</NesBadge>
          ))}
        </div>
        {game.slug ? (
          <Link to="/games/$slug" params={{ slug: game.slug }}>
            View details
          </Link>
        ) : null}
        {game.slug ? (
          <TrackControl
            game={{ igdbId: game.igdbId, slug: game.slug, title: game.title, coverUrl: cover }}
          />
        ) : null}
      </div>
    </NesContainer>
  );
}
