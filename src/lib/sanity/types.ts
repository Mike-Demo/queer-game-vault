export type EditorialStatus = "imported" | "underReview" | "approved" | "featured" | "archived";
export type CollectionStatus = "draft" | "published" | "archived";

export interface SanityImageRef {
  asset?: { _ref: string };
}

export interface TaxonomyRef {
  _id: string;
  name: string;
  slug: string | null;
  abbreviation?: string | null;
}

export interface GameSummary {
  _id: string;
  title: string;
  slug: string | null;
  igdbId: number;
  releaseYear: number | null;
  summary: string | null;
  customDescription: string | null;
  cover: SanityImageRef | null;
  sourceCoverUrl: string | null;
  editorialStatus: EditorialStatus;
  featured: boolean;
  genres: TaxonomyRef[];
  platforms: TaxonomyRef[];
}

export interface GameScreenshot {
  url: string | null;
  caption: string | null;
}

export interface GameAgeRating {
  category: string | null;
  rating: string | null;
}

export interface GameExternalLink {
  label: string | null;
  url: string | null;
}

export interface GameSourceReference {
  publication: string | null;
  title: string | null;
  url: string | null;
  capturedAt: string | null;
}

export interface GameDetail extends GameSummary {
  sources: GameSourceReference[];
  storyline: string | null;
  editorNotes: string | null;
  firstReleaseDate: string | null;
  screenshots: GameScreenshot[];
  themes: string[];
  gameModes: string[];
  ageRatings: GameAgeRating[];
  externalLinks: GameExternalLink[];
  igdbRating: number | null;
  igdbRatingCount: number | null;
  totalRating: number | null;
  igdbCollectionName: string | null;
  franchise: string | null;
  developer: { name: string } | null;
  publisher: { name: string } | null;
  involvedCompanies: { name: string }[];
  importStatus: string | null;
  importedAt: string | null;
  lastSyncedAt: string | null;
}

export interface CollectionSummary {
  _id: string;
  title: string;
  slug: string | null;
  description: string | null;
  coverImage: SanityImageRef | null;
  featured: boolean;
  status: CollectionStatus;
  gameCount: number;
}

export interface CollectionDetail extends CollectionSummary {
  curatorNotes: string | null;
  games: GameSummary[];
}

export interface NavItem {
  label: string;
  path: string;
}

export interface SiteSettings {
  appName: string | null;
  description: string | null;
  logo: SanityImageRef | null;
  primaryNavigation: NavItem[];
  homepageHeading: string | null;
  homepageIntroduction: string | null;
  emptyStateCopy: string | null;
  footerContent: string | null;
  defaultSeoTitle: string | null;
  defaultSeoDescription: string | null;
}

export interface ContentPage {
  _id: string;
  title: string;
  slug: string | null;
  summary: string | null;
  body: unknown[] | null;
  featuredImage: SanityImageRef | null;
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: string | null;
}

export interface ImportRecordEntry {
  _id: string;
  igdbId: number;
  gameTitle: string | null;
  operation: string | null;
  result: string | null;
  requestedAt: string | null;
  completedAt: string | null;
  fieldsChanged: string[];
  warningMessages: string[];
  errorMessage: string | null;
  game: { _id: string; title: string; slug: string | null } | null;
}
