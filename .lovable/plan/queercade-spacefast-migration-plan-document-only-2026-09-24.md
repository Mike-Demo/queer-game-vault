# QueerCade → Spacefast migration plan (document only)

Produce one migration plan document, based on QueerCade's real setup and on Spacefast's published docs. No app code, hosting or data changes.

## Deliverable
`/mnt/documents/queercade-spacefast-migration-plan.md`, laid out like your template:

1. **Current architecture (filled in from the code)**: TanStack Start on Vite 7, built for Cloudflare Workers with about 748 pre-built pages. Server functions handle IGDB, Sanity writes, tracking, editorial tools and public reads. Lovable Cloud Postgres holds profiles, user_roles, game_entries, security-definer functions, the handle_new_user trigger and RLS. Sign-in uses email and Google. Sanity (tzh8tziu/production) holds all editorial content and stays where it is. Secrets: TWITCH_CLIENT_ID/SECRET, SANITY_API_WRITE_TOKEN. There's also the Google Search Console verification and the custom domain queercade.mikedemo.dev.
2. **Pre-migration audit**: the pieces tied to Cloudflare or Lovable, such as the Workers build plugin, the prerender alias hack, the Supabase clients and middleware, preview auth storage and the Lovable Google OAuth wrapper. Also package compatibility and which Spacefast features map to each piece.
3. **Phases 1–4**: CLI setup and a prototype publish; moving the schema and data (with row-count and checksum checks, plus a note that passwords and OAuth identities need special handling); porting the server functions to Spacefast Functions and testing that every endpoint still works; adapting the frontend and build (`_redirects`/`_headers`, static output, how environment variables are injected).
4. **Code samples**: before and after for one server function (for example `searchPublicGames`), the database connection helper and the build config.
5. **Cutover, DNS and rollback**: lowering DNS TTL, running both hosts side by side, a smoke-test checklist (sign-in, tracking, imports, public pages, sitemap, structured data) and a rollback plan (point DNS back and restore a Spacefast version).
6. **Risks and open questions**: each marked as confirmed from the docs or assumed. A big one is whether Spacefast's database and auth can replace RLS, roles and Google sign-in.

## Method
- Read Spacefast's docs on Functions, database, storage, scheduled jobs, domains and moving from another host, and cite them.
- Record the real schema and endpoints from the codebase.
- Clearly flag every assumption Spacefast's docs don't answer.
