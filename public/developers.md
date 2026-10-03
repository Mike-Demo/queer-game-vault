---
title: "Developers — QueerCade"
description: "How to use QueerCade's free, read-only public API and MCP server."
canonical: "https://queercade.mikedemo.dev/developers.md"
last-updated: "2026-10-03"
---

# Developers — QueerCade

A free, read-only API for the QueerCade catalog. No key or sign-in needed.

## REST API

Base: `https://queercade.mikedemo.dev/api/public/v1`

- `GET /games?q=&genre=&platform=&theme=&year=&limit=&offset=` — search
- `GET /games/{slug}` — full details for one game
- `GET /collections` — every published collection
- `GET /collections/{slug}` — one collection with games in editorial order
- `GET /facets` — genre slugs, platform slugs, theme names the filters accept

Machine-readable spec: `https://queercade.mikedemo.dev/openapi.json`

Paging: max 48 per request (default 24); follow `nextOffset` until null. Rate limit: 120 requests per 60 seconds; 429 responses include `Retry-After`. Errors: `{ error: { code, message, status } }`.

## MCP server

`https://queercade.mikedemo.dev/api/public/mcp` (Streamable HTTP, no auth). Tools: `search_games`, `get_game`, `list_collections`, `get_collection`, `list_facets`.

## Versioning and deprecation policy

The current API version is **v1** (`/api/public/v1/*`). Breaking changes ship as a new versioned path; v1 keeps working. If an endpoint is ever deprecated, the deprecation will be announced on the developers page with the replacement documented before the old one stops working.

## Discovery documents

- `/.well-known/ard.json` — Agentic Resource Discovery catalog
- `/.well-known/agent-card.json` — agent card
- `/.well-known/agent-skills/` — Agent Skills discovery index
- `/.well-known/mcp/server-card.json` — MCP server card
- `/llms.txt` — agent guide to this site
- `/auth.md` — authentication model (none required)
