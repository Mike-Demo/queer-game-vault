import { describe, expect, test } from "vitest";
import { buildConstellationEdges, buildConstellationNodes, normalizeIdentityTags, type ConstellationCharacterRecord } from "../constellation-model";

const base: ConstellationCharacterRecord = { gameId: "game-1", gameTitle: "Game", gameSlug: "game", coverUrl: null, releaseYear: 2023, name: "Alex", identity: "Bisexual or pansexual", identityTags: [], narrativeTropes: [], sourceUrl: null, portraitUrl: null };

describe("constellation model", () => {
  test("normalizes clear identity terms without guessing", () => expect(normalizeIdentityTags("Trans woman", [])).toEqual(["trans woman"]));
  test("de-duplicates the same character within a game", () => expect(buildConstellationNodes([base, base])).toHaveLength(1));
  test("keeps recurring characters in different games", () => expect(buildConstellationNodes([base, { ...base, gameId: "game-2" }])).toHaveLength(2));
  test("creates sparse rather than all-to-all edges", () => {
    const nodes = buildConstellationNodes([base, { ...base, gameId: "game-2", name: "Blair" }, { ...base, gameId: "game-3", name: "Casey" }]);
    const identityEdges = buildConstellationEdges(nodes).filter((edge) => edge.kind === "identity" && edge.label === "bisexual");
    expect(identityEdges).toHaveLength(2);
  });
});
