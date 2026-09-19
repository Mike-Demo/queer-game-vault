# Fix the "arcade could not load" error, then a quick start for editors

## What is actually wrong

Your content is fine and your account is fine. I checked: the site name, homepage copy, navigation and your imported game all come back correctly from the content library, and your account `mdemop@mikedemo.com` is confirmed and has the **admin** role.

The failure is in how the page is handed from the server to the browser. Pages are built once on the server and then taken over by the browser, but the data fetched on the server is not being passed along with the page. So the browser briefly builds a different page than the one the server sent — the navigation links appear and disappear — and the safety net replaces the screen with "The arcade could not load its content right now."

I reproduced this on the running app and confirmed the mismatch is in the header navigation, caused by the missing data hand-off. It affects every screen, not just the homepage.

## The fix

1. Pass the server-fetched data along with the page so the browser reuses it instead of starting empty. This is a one-place change in the app's router setup.
2. Make the header safe even while data is still arriving, so a slow content request can never blank the navigation or trip the error screen again.
3. Re-check every screen — home, library, collections, a game page, about, sign-in, and the editor screens — with a real browser, confirming no page error and no error state.
4. Publish so the live site gets the fix.

## Then: help you actually use the app

5. Add a short "how it works" panel on the homepage that is only visible to signed-in editors, linking the three steps: Discover (search games) → Review (write your words, approve) → the public arcade. It disappears for visitors.
6. Give you a plain walkthrough in chat of the whole flow, plus where your editing interface lives.
7. Remove the sample "Chrono Trigger" entry I imported during testing, unless you want to keep it.

## How the app works today (so it makes sense now)

- `/discover` — editors only. Search games, preview the source details, import one or several.
- `/review` — editors only. Add your own description and notes, set the status (imported / under review / approved / featured), mark featured, add to a collection, or refresh the source data.
- `/library`, `/collections`, `/games/...`, `/about` — public, and only show approved or featured items.
- `/imports` — editors only. History of every import, refresh and skip.
- Your editing interface: https://queercade.sanity.studio

Editor-only links appear in the header only once you are signed in with an editor or admin role, which is why the header looked sparse.

## Technical notes

- Root cause: `src/router.tsx` creates the `QueryClient` without the TanStack Router/Query SSR integration, so no dehydrated cache ships with the SSR payload. Every `useQuery` in `AppShell` and the route components renders data on the server and `undefined` on the first client render — React 19 throws the hydration mismatch (error #418), and the route `errorComponent` renders the error state.
- Fix: add `@tanstack/react-router-ssr-query` and call `setupRouterSsrQueryIntegration({ router, queryClient })` inside `getRouter`. No route or query changes needed.
- Secondary hardening: `AppShell` falls back to a static nav list when `siteSettings` is still pending, and keeps the editor-path filter purely additive.
- Verification: `bunx tsgo --noEmit`, `bun run build`, and a Playwright pass per route asserting zero `pageerror` events.
- No schema, secret, Edge Function or content changes. Nothing existing is removed.

## Credit estimate

Roughly 8–14 credits: the fix itself is small, most of it is browser verification across routes and the publish.
