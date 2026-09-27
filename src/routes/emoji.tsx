import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { AppShell } from "@/components/AppShell";
import { GameCard } from "@/components/GameCard";
import { ErrorState, LoadingState } from "@/components/StateViews";
import { Surface } from "@/components/Surface";
import { NesButton, NesText } from "@/design-system/nes-229931";
import { useSession } from "@/hooks/useAuth";
import { askEmojiOracle, listEmojiPicks, saveEmojiPick, type OracleResponse } from "@/lib/emojiOracle.functions";
import { EMOJI_GROUPS, MAX_EMOJIS, MIN_EMOJIS } from "@/lib/emojiOracle/emojis";
import { coverUrl } from "@/lib/publicData";
import { breadcrumbs, DEFAULT_SHARE_IMAGE, jsonLdScript, organization, webPage, website } from "@/lib/seo/structuredData";

const TITLE = "Emoji Game Oracle — QueerCade";
const DESCRIPTION = "Pick a few emojis and the QueerCade oracle suggests a queer game that matches your mood.";

export const Route = createFileRoute("/emoji")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: "https://queercade.mikedemo.dev/emoji" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:image", content: DEFAULT_SHARE_IMAGE },
      { name: "twitter:image", content: DEFAULT_SHARE_IMAGE },
    ],
    links: [{ rel: "canonical", href: "https://queercade.mikedemo.dev/emoji" }],
    scripts: [
      jsonLdScript(
        organization(),
        website(),
        webPage({ type: "WebPage", path: "/emoji", name: TITLE, description: DESCRIPTION }),
        breadcrumbs([
          { name: "Home", path: "/" },
          { name: "Emoji Oracle", path: "/emoji" },
        ]),
      ),
    ],
  }),
  component: EmojiPage,
});

function EmojiPage() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const ask = useServerFn(askEmojiOracle);
  const save = useServerFn(saveEmojiPick);
  const list = useServerFn(listEmojiPicks);
  const [picked, setPicked] = useState<string[]>([]);
  const [result, setResult] = useState<OracleResponse | null>(null);

  const history = useQuery({ queryKey: ["emoji-picks"], queryFn: () => list(), enabled: Boolean(session) });

  const oracle = useMutation({
    mutationFn: (emojis: string[]) => ask({ data: { emojis } }),
    onSuccess: async (response, emojis) => {
      setResult(response);
      if (response.ok && session && response.game.slug) {
        await save({
          data: {
            emojis,
            gameSlug: response.game.slug,
            title: response.game.title,
            coverUrl: coverUrl(response.game),
            reason: response.reason,
          },
        }).catch(() => undefined);
        await queryClient.invalidateQueries({ queryKey: ["emoji-picks"] });
      }
    },
    onError: () => setResult({ ok: false, message: "The oracle could not be reached. Please try again." }),
  });

  const toggle = (emoji: string) => {
    setPicked((current) =>
      current.includes(emoji)
        ? current.filter((item) => item !== emoji)
        : current.length >= MAX_EMOJIS
          ? current
          : [...current, emoji],
    );
  };

  const reset = () => {
    setPicked([]);
    setResult(null);
  };

  return (
    <AppShell>
      <div className="stack-lg">
        <div className="stack">
          <h1 className="title-xl">Emoji Oracle</h1>
          <p className="text-xs">
            Pick {MIN_EMOJIS} to {MAX_EMOJIS} emojis and the oracle will suggest one game from the arcade.
          </p>
        </div>

        <Surface title="Choose your emojis" rounded>
          <div className="stack">
            {EMOJI_GROUPS.map((group) => (
              <div key={group.label} className="stack" role="group" aria-label={group.label}>
                <NesText>{group.label}</NesText>
                <div className="row">
                  {group.items.map((item) => {
                    const on = picked.includes(item.emoji);
                    return (
                      <NesButton
                        key={item.emoji}
                        variant={on ? "primary" : "default"}
                        aria-pressed={on}
                        aria-label={item.meaning}
                        title={item.meaning}
                        disabled={oracle.isPending || (!on && picked.length >= MAX_EMOJIS)}
                        onClick={() => toggle(item.emoji)}
                      >
                        {item.emoji}
                      </NesButton>
                    );
                  })}
                </div>
              </div>
            ))}
            <NesText aria-live="polite">
              Picked: {picked.length > 0 ? picked.join(" ") : "none yet"} ({picked.length}/{MAX_EMOJIS})
            </NesText>
            <div className="row">
              <NesButton
                variant="success"
                disabled={picked.length < MIN_EMOJIS || oracle.isPending}
                onClick={() => oracle.mutate(picked)}
              >
                Find my game
              </NesButton>
              <NesButton onClick={reset} disabled={oracle.isPending}>
                Try again
              </NesButton>
            </div>
          </div>
        </Surface>

        {oracle.isPending ? <LoadingState label="The oracle is browsing the arcade" /> : null}

        {!oracle.isPending && result && !result.ok ? <ErrorState message={result.message} /> : null}

        {!oracle.isPending && result?.ok ? (
          <div className="stack" aria-live="polite">
            <h2 className="title-md">Your game</h2>
            <p className="text-xs">{result.reason}</p>
            {result.matches.length > 0 ? (
              <ul className="stack">
                {result.matches.map((match) => (
                  <li key={match.emoji} className="text-xs">
                    {match.emoji} {match.meaning}
                  </li>
                ))}
              </ul>
            ) : null}
            <GameCard game={result.game} priority />
          </div>
        ) : null}

        <Surface title="Past picks" rounded>
          {session ? (
            history.isLoading ? (
              <LoadingState label="Loading your picks" />
            ) : (history.data ?? []).length === 0 ? (
              <p className="text-xs">No picks yet.</p>
            ) : (
              <ul className="stack">
                {(history.data ?? []).map((pick) => (
                  <li key={pick.id} className="text-xs">
                    {pick.emojis.join(" ")} →{" "}
                    <Link to="/games/$slug" params={{ slug: pick.gameSlug }}>
                      {pick.title}
                    </Link>{" "}
                    <NesText variant="disabled">{new Date(pick.createdAt).toLocaleDateString()}</NesText>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <p className="text-xs">
              <Link to="/auth">Sign in</Link> to save your picks.
            </p>
          )}
        </Surface>
      </div>
    </AppShell>
  );
}
