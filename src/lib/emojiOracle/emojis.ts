/** The fixed emoji set visitors can pick from. The server only accepts these. */
export interface EmojiGroup {
  readonly label: string;
  readonly items: readonly { readonly emoji: string; readonly meaning: string }[];
}

export const EMOJI_GROUPS: readonly EmojiGroup[] = [
  {
    label: "Mood",
    items: [
      { emoji: "😊", meaning: "happy, uplifting" },
      { emoji: "😢", meaning: "sad, emotional" },
      { emoji: "😱", meaning: "scary, horror" },
      { emoji: "😌", meaning: "calm, relaxing" },
      { emoji: "😂", meaning: "funny, comedic" },
      { emoji: "🥰", meaning: "romantic, loving" },
    ],
  },
  {
    label: "Vibe",
    items: [
      { emoji: "🌈", meaning: "pride, colorful" },
      { emoji: "✨", meaning: "magical, whimsical" },
      { emoji: "🔥", meaning: "intense, action-packed" },
      { emoji: "🌙", meaning: "dark, moody, nighttime" },
      { emoji: "🎶", meaning: "music, rhythm" },
      { emoji: "💀", meaning: "death, grim" },
    ],
  },
  {
    label: "Setting",
    items: [
      { emoji: "🚀", meaning: "space, sci-fi" },
      { emoji: "🏰", meaning: "fantasy, medieval" },
      { emoji: "🌆", meaning: "city, modern" },
      { emoji: "🌲", meaning: "nature, forest" },
      { emoji: "🌊", meaning: "ocean, water" },
      { emoji: "🤖", meaning: "robots, cyberpunk" },
    ],
  },
  {
    label: "Playstyle",
    items: [
      { emoji: "⚔️", meaning: "combat, fighting" },
      { emoji: "🧩", meaning: "puzzles" },
      { emoji: "📖", meaning: "story-rich, visual novel" },
      { emoji: "🌾", meaning: "farming, cozy life sim" },
      { emoji: "🔍", meaning: "mystery, investigation" },
      { emoji: "👥", meaning: "multiplayer, co-op" },
    ],
  },
];

export const EMOJI_MEANINGS: ReadonlyMap<string, string> = new Map(
  EMOJI_GROUPS.flatMap((group) => group.items.map((item) => [item.emoji, item.meaning] as const)),
);

export const MIN_EMOJIS = 3;
export const MAX_EMOJIS = 5;

export interface EmojiMatch {
  readonly emoji: string;
  readonly meaning: string;
}

export interface EmojiPick {
  readonly id: string;
  readonly emojis: string[];
  readonly gameSlug: string;
  readonly title: string;
  readonly coverUrl: string | null;
  readonly reason: string;
  readonly createdAt: string;
}
