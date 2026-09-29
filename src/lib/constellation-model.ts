export const IDENTITY_TAGS = [
  "lesbian",
  "gay",
  "bisexual",
  "pansexual",
  "queer",
  "transgender",
  "trans woman",
  "trans man",
  "non-binary",
  "genderqueer",
  "asexual",
  "aromantic",
  "intersex",
] as const;

export type IdentityTag = (typeof IDENTITY_TAGS)[number];
export type RelationshipKind = "identity" | "era" | "trope";

export interface ConstellationCharacterRecord {
  readonly gameId: string;
  readonly gameTitle: string;
  readonly gameSlug: string;
  readonly coverUrl: string | null;
  readonly releaseYear: number | null;
  readonly name: string;
  readonly identity: string;
  readonly identityTags: readonly string[];
  readonly narrativeTropes: readonly string[];
  readonly sourceUrl: string | null;
  readonly portraitUrl: string | null;
}

export interface ConstellationNode extends ConstellationCharacterRecord {
  readonly id: string;
  readonly normalizedIdentityTags: readonly IdentityTag[];
  readonly decade: string | null;
}

export interface ConstellationEdge {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  readonly kind: RelationshipKind;
  readonly label: string;
}

const IDENTITY_PATTERNS: readonly [IdentityTag, RegExp][] = [
  ["trans woman", /\b(trans(?:gender)? woman|transfeminine)\b/i],
  ["trans man", /\b(trans(?:gender)? man|transmasculine)\b/i],
  ["non-binary", /\b(non[ -]?binary|enby)\b/i],
  ["genderqueer", /\bgenderqueer\b/i],
  ["bisexual", /\b(bisexual|bi)\b/i],
  ["pansexual", /\bpansexual\b/i],
  ["lesbian", /\blesbian\b/i],
  ["gay", /\bgay\b/i],
  ["asexual", /\basexual\b/i],
  ["aromantic", /\baromantic\b/i],
  ["intersex", /\bintersex\b/i],
  ["transgender", /\btrans(?:gender)?\b/i],
  ["queer", /\bqueer\b/i],
];

function isIdentityTag(value: string): value is IdentityTag {
  return (IDENTITY_TAGS as readonly string[]).includes(value);
}

export function normalizeIdentityTags(identity: string, stored: readonly string[]): IdentityTag[] {
  const normalizedStored = stored
    .map((value) => value.trim().toLowerCase())
    .filter(isIdentityTag);
  const inferred = IDENTITY_PATTERNS
    .filter(([, pattern]) => pattern.test(identity))
    .map(([tag]) => tag);
  const tags = [...new Set([...normalizedStored, ...inferred])];
  if (tags.includes("trans woman") || tags.includes("trans man")) {
    return tags.filter((tag) => tag !== "transgender");
  }
  return tags;
}

function slugPart(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

export function buildConstellationNodes(records: readonly ConstellationCharacterRecord[]): ConstellationNode[] {
  const seen = new Set<string>();
  const nodes: ConstellationNode[] = [];
  for (const record of records) {
    const key = `${record.gameId}:${record.name.trim().toLocaleLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const id = `${record.gameId}-${slugPart(record.name) || nodes.length}`;
    nodes.push({
      ...record,
      id,
      normalizedIdentityTags: normalizeIdentityTags(record.identity, record.identityTags),
      decade: record.releaseYear === null ? null : `${Math.floor(record.releaseYear / 10) * 10}s`,
    });
  }
  return nodes.sort((a, b) => a.id.localeCompare(b.id));
}

function sparseGroupEdges(
  groups: ReadonlyMap<string, readonly ConstellationNode[]>,
  kind: RelationshipKind,
): ConstellationEdge[] {
  const edges: ConstellationEdge[] = [];
  for (const [label, members] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const ordered = [...members].sort((a, b) => a.id.localeCompare(b.id));
    for (let index = 1; index < ordered.length; index += 1) {
      const source = ordered[index - 1];
      const target = ordered[index];
      if (!source || !target) continue;
      edges.push({ id: `${kind}:${label}:${source.id}:${target.id}`, source: source.id, target: target.id, kind, label });
    }
  }
  return edges;
}

function groupNodes(nodes: readonly ConstellationNode[], values: (node: ConstellationNode) => readonly string[]): Map<string, ConstellationNode[]> {
  const groups = new Map<string, ConstellationNode[]>();
  for (const node of nodes) {
    for (const value of values(node)) {
      const members = groups.get(value) ?? [];
      members.push(node);
      groups.set(value, members);
    }
  }
  return groups;
}

export function buildConstellationEdges(nodes: readonly ConstellationNode[]): ConstellationEdge[] {
  return [
    ...sparseGroupEdges(groupNodes(nodes, (node) => node.normalizedIdentityTags), "identity"),
    ...sparseGroupEdges(groupNodes(nodes, (node) => (node.decade ? [node.decade] : [])), "era"),
    ...sparseGroupEdges(groupNodes(nodes, (node) => node.narrativeTropes), "trope"),
  ];
}
