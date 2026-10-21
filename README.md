# Custom design system (TanStack Start)

A deliberately bare [TanStack Start](https://tanstack.com/start) + React starter
for building a design system from scratch. No CSS framework, no component
library, no theme tokens — just a router, a blank page, and a plain-CSS reset.
Bring your own styling approach.

## What's (intentionally) not here

- No Tailwind, no PostCSS, no `components.json`
- No shadcn/ui or Radix primitives
- No theme tokens or design system — `src/styles.css` is a minimal reset

## Stack

- TanStack Start + TanStack Router (file-based routing under `src/routes/`)
- React 19 + TypeScript
- TanStack Query, Zod, Recharts, date-fns

## Develop

```sh
bun install
bun run dev
```

## Security audit triage — 2026-10-21

Parent: [Mike-Demo/queer-game-vault#3](https://github.com/Mike-Demo/queer-game-vault/issues/3).
Issue creation is unavailable in this session; the two titles and bodies below
are ready to file. This is documentation-only triage, not remediation.
Evidence was checked by static source inspection; no application code was
executed and no deployed endpoint was probed.

### Prioritized backlog

1. **Low — durable appreciation allowance.** The only confirmed finding is
   directly reachable through an unauthenticated public POST. Its impact is
   public-count integrity, not established sensitive-data exposure or privilege
   escalation. There are no other confirmed findings to rank or group; the
   handler and RPC gaps share one allowance-enforcement root cause and belong
   in one issue. The fix is localized but needs an atomic database change, so
   it is not merely a browser-side adjustment.
2. **Validation checklist.** Keep all four leads unconfirmed and without
   severity. Their missing runtime or deployment facts must be established
   before promoting them to remediation findings.

### Issue 1 title

`[security][low] Enforce a durable server-side appreciation allowance`

#### Issue 1 body

Parent audit: https://github.com/Mike-Demo/queer-game-vault/issues/3

Fingerprint: `unauthenticated-appreciation-inflation`

**Priority and impact:** First and only confirmed finding; low severity.
Unauthenticated callers can reach `POST /api/public/v1/appreciations/:slug`.
Public totals lack durable enforcement of the intended 10-per-visitor-per-game
allowance. No sensitive-data exposure or privilege escalation is established.

**Evidence and correction to the original audit:**

- `/home/runner/work/queer-game-vault/queer-game-vault/src/routes/api/public/v1/appreciations/$slug.ts:14–15,50–64`
  already enforces an IP-plus-slug quota of 10 per day before calling the
  service-role increment RPC with only a slug. The original claim that the
  server has no allowance at all is inaccurate: repeated requests from one IP
  are limited within that quota's lifetime and instance.
- `/home/runner/work/queer-game-vault/queer-game-vault/src/lib/security/quota.ts:6–17`
  stores quota state in process-local memory with expiry and bucket clearing.
  This is not a durable per-visitor allowance across instances or resets.
- `/home/runner/work/queer-game-vault/queer-game-vault/drizzle/migrations/0004_game_appreciations.sql:10–24`
  increments the shared total without visitor identity or an allowance counter.
- `/home/runner/work/queer-game-vault/queer-game-vault/src/components/PixelAppreciateButton.tsx:16–17,54–66,131–135`
  keeps the browser's allowance of 10 in localStorage. Direct callers do not
  participate in that browser accounting.

**Root cause:** The browser counter, process-local IP quota, and database
increment do not share a durable per-visitor-per-slug allowance. The RPC
unconditionally increments once admitted by the handler.

**Smallest safe fix:** Issue a server-generated, signed anonymous visitor
cookie or token and persist a counter keyed by visitor and slug. Atomically
check the cap of 10 and increment both that counter and the aggregate in the
database increment path; reject requests beyond the cap. Enforce this through
the POST handler, keeping localStorage for UI feedback and existing rate limits
as supplementary abuse controls, not allowance authority. Confirm the intended
reset policy before implementation (the browser allowance and daily IP quota
currently differ). Anonymous identities can be replaced by clearing cookies;
this limits a visitor identity, not a provable individual person.

**Acceptance checks for the future fix:**

- [ ] Direct requests using the same valid visitor identity and slug allow 10
  increments, then reject further increments without changing the total.
- [ ] Concurrent requests cannot overshoot the cap; a rejected or failed request
  cannot leave the visitor counter and aggregate inconsistent.
- [ ] The allowance survives instance changes and restarts for its defined
  lifetime; other slugs and visitor identities are counted independently.
- [ ] Tampered identities are not trusted, and browser feedback still works.

### Issue 2 title

`[security][needs-validation] Audit leads to validate`

#### Issue 2 body

Parent audit: https://github.com/Mike-Demo/queer-game-vault/issues/3

These are unconfirmed leads, not severity-rated findings. Record validation
evidence and disposition for each before opening any additional remediation
issues. Use authorized sandboxes for execution-dependent checks.

The first two missing-fact descriptions are truncated in the parent issue.
They are quoted exactly as supplied below, including the ellipsis; obtain the
omitted text from the audit owner rather than treating it as established fact.

- [ ] **Concurrent first sign-ups can both become admin (non-atomic empty-roles check in handle_new_user)**
  - Fingerprint: `first-admin-race-on-empty-roles`
  - Claimed root cause: `handle_new_user` checks `count(*)` and then inserts
    an admin without an advisory/table lock, serializable isolation, or a
    single-bootstrap uniqueness guard.
  - Evidence: `/home/runner/work/queer-game-vault/queer-game-vault/drizzle/migrations/0000_profiles_and_editor_roles.sql:78–83`
    and `/home/runner/work/queer-game-vault/queer-game-vault/drizzle/migrations/0001_add_profiles_fields_and_game_entries.sql:91–96`.
  - **Exact missing fact:** “A sandboxed Postgres run applying migrations 0000 and 0001 and firing two concurrent auth.users inserts showing whether both handle_new_user executions observe existing_count=0 and both insert admin, given Supabase Auth transaction isolation and commit timing, is missing; that timing is not in the repository and was not executed in this static-onl…”
  - Record the isolation, interleaving, and committed roles; the static
    count-then-insert pattern alone does not demonstrate the race.

- [ ] **Emoji oracle LLM tool guard is substring and regex only and falls back to the Sanity write token**
  - Fingerprint: `oracle-groq-guard-bypass-and-write-token-fallback`
  - Claimed root cause: GROQ filtering uses substring/regex checks rather than
    a parsed allowlist, and read-token selection falls back to a write token.
  - Evidence: `/home/runner/work/queer-game-vault/queer-game-vault/src/lib/emojiOracle/oracle.server.ts:138–168`.
  - **Exact missing fact:** “Whether a sandboxed or live Sanity MCP query_documents call with the configured token and perspective published actually returns editor-only fields for a query that passes the guard via a spread projection or an OR-broadened filter retaining the editorialStatus text, and whether those fields can surface in the returned reason or matches text, is u…”
  - Preserve the query-only tool, published perspective, editorial-status
    filtering, and final public-catalog slug revalidation. A write-token fallback
    alone does not establish a write path or returned editor-data exposure.

- [ ] **Unauthenticated emoji oracle spends paid LLM and MCP calls with only a per-isolate header-keyed rate limit**
  - Fingerprint: `oracle-unauthenticated-llm-cost-amplification`
  - Claimed root cause: Per-isolate, in-memory limits use `cf-connecting-ip`
    with a forwarded-for fallback while admitted calls perform paid inference
    with a high step cap.
  - Evidence: `/home/runner/work/queer-game-vault/queer-game-vault/src/lib/emojiOracle.functions.ts:18–36`.
    Existing controls include six requests/minute/IP, 40/day/IP, and
    300/hour/instance; this is not a claim of absent rate limiting.
  - **Exact missing fact:** “Production deployment topology for askEmojiOracle is unknown: whether cf-connecting-ip is always platform-set making the forwarded-for fallback unreachable, how requests from one client distribute across Workers isolates with separate in-memory maps, and the actual paid steps or credits consumed per admitted call.”

- [ ] **Analytics script runs on every page including auth pages while Supabase sessions live in localStorage**
  - Fingerprint: `third-party-analytics-script-session-exposure`
  - Claimed root cause: An external script executes in the application origin
    alongside localStorage-persisted sessions without auth-route exclusion or
    integrity pinning.
  - Evidence: `/home/runner/work/queer-game-vault/queer-game-vault/src/routes/__root.tsx:74–79`,
    `/home/runner/work/queer-game-vault/queer-game-vault/src/integrations/supabase/client.ts:51–54`,
    and `/home/runner/work/queer-game-vault/queer-game-vault/src/integrations/supabase/previewAuthStorage.ts:57`.
  - **Exact missing fact:** “Who controls and serves the analytics tracker origin in production (operator self-hosted versus independent third party), and whether the production build serves that script unchanged on auth and authenticated pages holding editor or admin sessions, is not established in the repository.”
  - Record ownership and deployed behavior; script/session coexistence alone
    does not demonstrate session theft.
