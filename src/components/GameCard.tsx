import { Link } from "@tanstack/react-router";

import { TrackControl } from "@/components/TrackControl";
import {
  NesBadge,
  NesText,
} from "@/design-system/nes-229931";
import { Surface } from "@/components/Surface";
import { coverSrcSet, coverUrl } from "@/lib/publicData";
import type { GameSummary } from "@/lib/sanity/types";

/**
 * A game in a grid. `priority` marks the first row's covers so they load
 * immediately instead of lazily — those are the largest paint on a listing.
 */
export function GameCard({ game, priority = false }: { game: GameSummary; priority?: boolean }) {
  const cover = coverUrl(game);
  const srcSet = coverSrcSet(game);
  const blurb = game.customDescription ?? game.summary;

  return (
    <Surface rounded>
      <div className="stack">
        {cover ? (
          <img
            className="cover"
            src={cover}
            srcSet={srcSet}
            sizes="(min-width: 64rem) 20rem, (min-width: 48rem) 33vw, 100vw"
            alt={`${game.title} cover art`}
            width={400}
            height={532}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            decoding="async"
          />
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
    </Surface>
  );
}
