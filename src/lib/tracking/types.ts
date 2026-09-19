/** Shared shapes for personal game tracking and profiles. */

export const TRACK_STATUSES = ["playing", "completed", "wishlist", "dropped"] as const;

export type TrackStatus = (typeof TRACK_STATUSES)[number];

export const STATUS_LABELS: Record<TrackStatus, string> = {
  playing: "Playing",
  completed: "Completed",
  wishlist: "Wishlist",
  dropped: "Dropped",
};

export interface GameEntry {
  igdbId: number;
  gameSlug: string;
  title: string;
  coverUrl: string | null;
  status: TrackStatus;
  updatedAt: string;
}

export interface PublicProfile {
  username: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  joinedAt: string | null;
}

export interface MyProfile extends PublicProfile {
  email: string | null;
  profileVisibility: "public" | "private";
  themePreference: "light" | "dark" | "system";
  highContrast: boolean;
}

export function isTrackStatus(value: unknown): value is TrackStatus {
  return typeof value === "string" && (TRACK_STATUSES as readonly string[]).includes(value);
}
