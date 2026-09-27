# Emoji Game Oracle

A new page at `/emoji` where visitors tap 3–5 emojis from a curated grid and an AI agent suggests one game from your catalog, with a short "why these emojis fit" explanation. Signed-in members get their past picks saved to their account.

## What visitors see
- An NES-styled emoji grid in groups (Mood, Vibe, Setting, Playstyle), 3–5 picks allowed, no typing.
- "Find my game" button, then a loading state showing the agent at work.
- Result card: cover, title, link to the game page, a one-line reason, which emojis matched what, and the tracking control (Playing/Wishlist...).
- "Try again" to clear. Clear error messages if the AI or catalog is unavailable, or credits run out.
- Signed-in: a "Past picks" list below (emojis, game, date). Signed-out: works fully, with a "sign in to save your picks" note.
- Link added to the main menu and footer.

## How the agent works
- Runs on the server only; the browser just sends the chosen emojis.
- Uses the Sanity MCP server (`https://mcp.sanity.io`) as its tool source, authenticated with a new read-only Sanity token stored as a secret (you'll be asked to add it). One shared server connection, not per-visitor sign-in, since visitors don't have Sanity accounts.
- Only read tools are exposed to the model (query / get document / semantic search). All write, publish, schema and project tools are blocked by an allowlist.
- The prompt limits it to project tzh8tziu / production and approved, non-archived games.
- Safety net: whatever game the agent returns is re-checked against the public catalog before showing it; editor notes, drafts and unapproved games can never reach the page. If the check fails, one clear "couldn't find a match" message.
- The AI returns structured output (game slug, reason, emoji-to-meaning map); cover and details come from the public catalog, not the AI.

## Saving picks
- New table of emoji picks per member (emojis, game slug, title, cover, reason, time), owner-only access.
- Saved after a successful, verified suggestion.

## Risks
- Direct Sanity MCP access is broader than the site's own read-only catalog; the allowlist + re-check are what keep it safe. Rollback: swap the tool source to QueerCade's own MCP endpoint with no page changes.
- Each suggestion costs AI credits; a light per-visitor rate limit is added.
- Confidence the Sanity MCP accepts a token login: medium — first build step verifies this; if it requires interactive sign-in only, I'll stop and report before building further.

## Technical details
- Route `src/routes/emoji.tsx` (head metadata, not prerender-dependent for results); server fn in `src/lib/emojiOracle.functions.ts` + `emojiOracle.server.ts`.
- AI SDK `streamText` via Lovable AI Gateway, `openai/gpt-6-astra`, Responses API with required providerOptions, `Output.object` small schema, `stopWhen: stepCountIs(50)`; `@ai-sdk/mcp` `createMCPClient` HTTP transport, tools filtered by name, client closed in finally.
- Emoji set is a fixed list in code; server validates input against it (3–5 items).
- Migration: `emoji_picks` table with GRANTs, RLS `user_id = auth.uid()`; saves via `requireSupabaseAuth`.
- Gateway error handling per 402/403/429 rules; secret `SANITY_MCP_READ_TOKEN`.
- Verify: live call, returned slug approved, signed-in save + reload, build.
