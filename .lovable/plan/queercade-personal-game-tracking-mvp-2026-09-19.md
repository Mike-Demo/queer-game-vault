# QueerCade: personal game tracking MVP

Built from the GaymingDB wireframes (Balsamiq board "New board 1"), which use the QueerCade branding, header nav and copy. Everything already working — the 535 imported games, collections, editor review and import tools — stays. Community, forums, messaging, user reviews and achievements from the wireframes are left out of this release, so nothing hints at features that don't exist.

The retro pixel look stays; the wireframes drive layout, navigation, wording and flows.

## What people will be able to do

- **Create an account and sign in** with email or Google, choosing a username. Signing up follows the wireframe's Register screen (username, email, password, confirm password, "Already have an account?").
- **Track any game** from its detail page with one control: Playing, Completed, Wishlist, Dropped, or removed from the library. The same control appears on game cards in Discover so tracking never needs a detour.
- **See their own library** at My Library: four columns (Playing, Completed, Wishlist, Dropped) exactly as in the Profile wireframe, each showing cover, title and a quick way to move a game between statuses or open it.
- **Browse and search** at Discover: a search box plus filters for genre, platform, theme and tag down the left, a results grid on the right, with clear loading, empty and error states.
- **Read a full game page**: cover, screenshots, description, platforms, genres, themes, release date, developer/publisher/studio, ratings, and related games — the metadata already imported from IGDB.
- **View a public profile** with username, join date, an About me blurb and their game lists.
- **Change settings**: username, email, password, profile visibility (public or private), theme (light, dark, or follow the device), and a high-contrast option — matching the Settings wireframe minus notifications and language, which have nothing to drive them yet.
- **Switch between light and dark**, with the choice remembered and respected on first paint.
- **Use it on a phone**, with a collapsing header menu and single-column layouts.

## Pages

| Page | Path | Notes |
| --- | --- | --- |
| Home | `/` | Existing curated homepage, plus a signed-in strip showing what the person is currently playing |
| Discover | `/discover` | Public search and filter page (today's editor-only Discover import tool moves to `/imports`) |
| Game details | `/games/:slug` | Existing page plus the tracking control |
| My Library | `/my-library` | Personal tracking dashboard, sign-in required |
| Profile | `/profile/:username` | Public profile with lists |
| Settings | `/settings` | Account, privacy, appearance |
| Sign in / Register | `/auth` | Existing page extended with username and confirm-password on the register tab |

The existing curated `/library` and `/collections` pages stay as the editorial side of the site.

## Naming clash to resolve up front

The editor-only import search currently lives at `/discover`. The wireframes use Discover for the public browse page, so the import tool moves to `/imports` (already an editor page) and `/discover` becomes public. Editor links update in the same pass.

## Staging

1. **Accounts and profile data** — profile fields, username sign-up, tracking storage, access rules.
2. **Tracking control** — the status control on game pages and cards, with optimistic updates and error recovery.
3. **My Library and Profile** — the four lists, moving games between them, public profile with visibility respected.
4. **Public Discover** — search, filters, states; import tool relocated.
5. **Settings and theming** — account edits, privacy, light/dark/system, high contrast.
6. **Accessibility and responsive pass** — keyboard flows, labels, contrast, focus, mobile header; then type check, build, browser pass, publish.

Each stage ends with a type check, a build and a browser check before the next one starts.

## Technical notes

- Tracking lives in Lovable Cloud (not Sanity), since it is per-person data, not editorial content. New tables: `game_entries` (`user_id`, `igdb_id`, `game_slug`, `title`, `cover_url`, `status` enum `playing|completed|wishlist|dropped`, `created_at`, `updated_at`, unique on `user_id + igdb_id`) and additive columns on `profiles` (`username` unique citext, `bio`, `avatar_url`, `profile_visibility`, `theme_preference`, `high_contrast`). Every new table gets GRANTs, RLS enabled, and policies: owners read/write their own rows; `anon` and `authenticated` may read rows belonging to public profiles only.
- A trigger extension on the existing `handle_new_user` fills `username` from sign-up metadata, with a fallback derived from the email plus a numeric suffix on collision. Existing roles and admin logic are untouched.
- Game titles and covers are denormalised into `game_entries` so My Library renders from one query without fanning out to Sanity per row; the canonical record stays the Sanity `game` document keyed by `igdbId`.
- Reads and writes go through `createServerFn` handlers in `src/lib/tracking.functions.ts` with `requireSupabaseAuth` for writes; public profile reads use the server publishable client. No new browser-side credentials.
- Theme is a `data-theme` attribute on `<html>` set from a cookie during server render, so there is no flash and no hydration mismatch; the design system's existing `data-nes-theme` palette switch is reused rather than replaced. High contrast maps to the design system's forced-colors-friendly styles.
- All new UI composes existing design-system components (`NesContainer`, `NesButton`, `NesSelect`, `NesField`, `NesTable`, `NesBadge`, `NesText`) with tokens only — no raw colours or pixel literals.
- Each new route gets its own `head()` with a unique title and description; profile pages are excluded from indexing when set to private.
- No fabricated games, reviews or activity anywhere.
