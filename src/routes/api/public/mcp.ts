/**
 * Read-only MCP (Model Context Protocol) endpoint over JSON-RPC 2.0.
 *
 * Exposes exactly the same public, editor-approved catalog as the REST API:
 * search, game lookup, collections and filter values. There are no write
 * tools, no authentication, and no access to editorial or member data.
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import {
  API_DEFAULT_LIMIT,
  API_MAX_LIMIT,
  API_MAX_OFFSET,
  API_VERSION,
  checkRateLimit,
  toPublicCollection,
  toPublicGame,
  toPublicGameDetail,
} from "@/lib/publicApi";
import { sanityPublicClient } from "@/lib/sanity/client";
import {
  collectionBySlugQuery,
  discoverFacetsQuery,
  gameBySlugQuery,
  publicApiGamesQuery,
  publishedCollectionsQuery,
} from "@/lib/sanity/queries";
import type { CollectionDetail, CollectionSummary, GameDetail, GameSummary } from "@/lib/sanity/types";
import { SITE_URL } from "@/lib/seo/structuredData";

const PROTOCOL_VERSION = "2025-06-18";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Mcp-Session-Id, Mcp-Protocol-Version",
  "Access-Control-Max-Age": "86400",
};

const JSON_RPC_INVALID_REQUEST = -32600;
const JSON_RPC_METHOD_NOT_FOUND = -32601;
const JSON_RPC_INVALID_PARAMS = -32602;
const JSON_RPC_INTERNAL = -32603;

type Id = string | number | null;

function rpcResult(id: Id, result: unknown, extraHeaders: Record<string, string> = {}): Response {
  return Response.json({ jsonrpc: "2.0", id, result }, { headers: { ...CORS_HEADERS, "Cache-Control": "no-store", ...extraHeaders } });
}

function rpcError(id: Id, code: number, message: string, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return Response.json(
    { jsonrpc: "2.0", id, error: { code, message } },
    { status, headers: { ...CORS_HEADERS, "Cache-Control": "no-store", ...extraHeaders } },
  );
}

function toolText(payload: unknown): { content: { type: "text"; text: string }[] } {
  return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
}

function toolError(message: string): { content: { type: "text"; text: string }[]; isError: true } {
  return { content: [{ type: "text", text: message }], isError: true };
}

const slugSchema = z.string().regex(/^[a-z0-9-]{1,120}$/);

const SearchArgs = z.object({
  query: z.string().trim().max(100).optional(),
  genre: z.string().trim().max(60).regex(/^[a-z0-9-]*$/).optional(),
  platform: z.string().trim().max(60).regex(/^[a-z0-9-]*$/).optional(),
  theme: z.string().trim().max(60).optional(),
  year: z.number().int().min(1970).max(2100).optional(),
  limit: z.number().int().min(1).max(API_MAX_LIMIT).optional(),
  offset: z.number().int().min(0).max(API_MAX_OFFSET).optional(),
});

const SlugArgs = z.object({ slug: slugSchema });

const TOOLS = [
  {
    name: "search_games",
    title: "Search QueerCade games",
    description:
      "Search the curated catalog by game title or LGBTQ+ character name, optionally filtered by genre slug, platform slug, theme or release year. Returns paged summaries with a total and nextOffset.",
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Title or character name prefix." },
        genre: { type: "string", description: "Genre slug from list_facets." },
        platform: { type: "string", description: "Platform slug from list_facets." },
        theme: { type: "string", description: "Theme name from list_facets." },
        year: { type: "integer", description: "Exact release year." },
        limit: { type: "integer", minimum: 1, maximum: API_MAX_LIMIT, default: API_DEFAULT_LIMIT },
        offset: { type: "integer", minimum: 0, maximum: API_MAX_OFFSET, default: 0 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_game",
    title: "Get one game",
    description:
      "Full public details for one game by slug: description, release info, platforms, genres, companies, ratings, store links, screenshots and documented LGBTQ+ characters.",
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
inputSchema: {
      type: "object",
      properties: { slug: { type: "string", description: "Game slug, e.g. sayonara-wild-hearts." } },
      required: ["slug"],
      additionalProperties: false,
    },
  },
  {
    name: "list_collections",
    title: "List curated collections",
    description: "Every published editorial collection with its description and game count.",
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_collection",
    title: "Get one collection",
    description: "One published collection by slug, with its games in editorial order.",
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
inputSchema: {
      type: "object",
      properties: { slug: { type: "string", description: "Collection slug, e.g. best-queer-horror-games." } },
      required: ["slug"],
      additionalProperties: false,
    },
  },
  {
    name: "list_facets",
    title: "List filter values",
    description: "The genre slugs, platform slugs and theme names that search_games filters accept.",
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
] as const;

interface GamesResult {
  readonly total: number;
  readonly games: GameSummary[];
}

interface FacetRow {
  readonly name: string;
  readonly slug: string | null;
}

interface FacetsResult {
  readonly genres: FacetRow[];
  readonly platforms: FacetRow[];
  readonly themes: (string | null)[];
}

async function callTool(name: string, args: unknown): Promise<unknown> {
  switch (name) {
    case "search_games": {
      const parsed = SearchArgs.safeParse(args ?? {});
      if (!parsed.success) return toolError("Invalid arguments for search_games.");
      const { query, genre, platform, theme, year, limit, offset } = parsed.data;
      const pageSize = limit ?? API_DEFAULT_LIMIT;
      const start = offset ?? 0;
      const term = (query ?? "").replace(/[*"\\]/g, "");
      const result = await sanityPublicClient.fetch<GamesResult>(publicApiGamesQuery, {
        term: term.length > 0 ? `${term}*` : "",
        genre: genre ?? "",
        platform: platform ?? "",
        theme: theme ?? "",
        year: year ?? 0,
        offset: start,
        end: start + pageSize,
      });
      const games = result.games.map(toPublicGame).filter((game) => game !== null);
      return toolText({
        games,
        total: result.total,
        limit: pageSize,
        offset: start,
        nextOffset: start + pageSize < result.total ? start + pageSize : null,
      });
    }
    case "get_game": {
      const parsed = SlugArgs.safeParse(args ?? {});
      if (!parsed.success) return toolError("Invalid arguments for get_game: slug is required.");
      const game = await sanityPublicClient.fetch<GameDetail | null>(gameBySlugQuery, { slug: parsed.data.slug });
      const body = game ? toPublicGameDetail(game) : null;
      return body ? toolText(body) : toolError("Game not found.");
    }
    case "list_collections": {
      const rows = await sanityPublicClient.fetch<CollectionSummary[]>(publishedCollectionsQuery);
      const collections = rows.map(toPublicCollection).filter((row) => row !== null);
      return toolText({ collections, total: collections.length });
    }
    case "get_collection": {
      const parsed = SlugArgs.safeParse(args ?? {});
      if (!parsed.success) return toolError("Invalid arguments for get_collection: slug is required.");
      const collection = await sanityPublicClient.fetch<CollectionDetail | null>(collectionBySlugQuery, {
        slug: parsed.data.slug,
      });
      const summary = collection ? toPublicCollection(collection) : null;
      if (!collection || !summary) return toolError("Collection not found.");
      const games = collection.games.map(toPublicGame).filter((game) => game !== null);
      return toolText({ ...summary, games });
    }
    case "list_facets": {
      const facets = await sanityPublicClient.fetch<FacetsResult>(discoverFacetsQuery);
      return toolText({
        genres: (facets.genres ?? []).filter((row) => row.slug).map((row) => ({ name: row.name, slug: row.slug })),
        platforms: (facets.platforms ?? [])
          .filter((row) => row.slug)
          .map((row) => ({ name: row.name, slug: row.slug })),
        themes: (facets.themes ?? [])
          .filter((theme): theme is string => Boolean(theme))
          .sort((a, b) => a.localeCompare(b)),
      });
    }
    default:
      return null;
  }
}

export const Route = createFileRoute("/api/public/mcp")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      GET: () =>
        Response.json(
          {
            name: "queercade-catalog",
            version: API_VERSION,
            protocolVersion: PROTOCOL_VERSION,
            transport: "http",
            description:
              "Read-only MCP server for the QueerCade catalog. POST JSON-RPC 2.0 requests to this URL.",
            endpoint: `${SITE_URL}/api/public/mcp`,
            tools: TOOLS.map((tool) => tool.name),
            documentation: `${SITE_URL}/developers`,
          },
          { headers: { ...CORS_HEADERS, "Cache-Control": "public, max-age=3600" } },
        ),
      POST: async ({ request }) => {
        const rate = checkRateLimit(request);
        if (rate.limited) {
          return rpcError(null, JSON_RPC_INTERNAL, "Too many requests. Please retry later.", 429, {
            ...rate.headers,
            "Retry-After": "60",
          });
        }

        let payload: unknown;
        try {
          payload = await request.json();
        } catch {
          return rpcError(null, JSON_RPC_INVALID_REQUEST, "Request body must be JSON-RPC 2.0.", 400, rate.headers);
        }
        if (Array.isArray(payload)) {
          return rpcError(null, JSON_RPC_INVALID_REQUEST, "Batched requests are not supported.", 400, rate.headers);
        }
        if (typeof payload !== "object" || payload === null) {
          return rpcError(null, JSON_RPC_INVALID_REQUEST, "Invalid JSON-RPC request.", 400, rate.headers);
        }

        const message = payload as { method?: unknown; id?: Id; params?: unknown };
        const method = typeof message.method === "string" ? message.method : "";
        const id = message.id ?? null;

        // Notifications (no id) get an empty 202, per the MCP HTTP transport.
        if (message.id === undefined) {
          return new Response(null, { status: 202, headers: { ...CORS_HEADERS, ...rate.headers } });
        }

        try {
          switch (method) {
            case "initialize":
              return rpcResult(
                id,
                {
                  protocolVersion: PROTOCOL_VERSION,
                  capabilities: { tools: { listChanged: false } },
                  serverInfo: { name: "queercade-catalog", version: API_VERSION },
                  instructions:
                    "Read-only access to QueerCade's curated catalog of video games with LGBTQ+ characters and stories. Use list_facets to discover filter values, search_games to find games, and get_game for full details.",
                },
                rate.headers,
              );
            case "ping":
              return rpcResult(id, {}, rate.headers);
            case "tools/list":
              return rpcResult(id, { tools: TOOLS }, rate.headers);
            case "tools/call": {
              const params = (message.params ?? {}) as { name?: unknown; arguments?: unknown };
              if (typeof params.name !== "string") {
                return rpcError(id, JSON_RPC_INVALID_PARAMS, "A tool name is required.", 200, rate.headers);
              }
              const result = await callTool(params.name, params.arguments);
              if (result === null) {
                return rpcError(id, JSON_RPC_METHOD_NOT_FOUND, `Unknown tool: ${params.name}`, 200, rate.headers);
              }
              return rpcResult(id, result, rate.headers);
            }
            default:
              return rpcError(id, JSON_RPC_METHOD_NOT_FOUND, `Unsupported method: ${method}`, 200, rate.headers);
          }
        } catch {
          return rpcError(id, JSON_RPC_INTERNAL, "Catalog temporarily unavailable.", 200, rate.headers);
        }
      },
    },
  },
});
