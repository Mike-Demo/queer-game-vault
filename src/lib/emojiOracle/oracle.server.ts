/**
 * Emoji game oracle: an AI agent that reads the catalog through the Sanity
 * MCP server. Only one read tool is exposed, pinned to the production dataset
 * and published perspective; the chosen game is re-checked afterwards.
 */
import { createOpenAI } from "@ai-sdk/openai";
import { stepCountIs, streamText, tool } from "ai";
import { z } from "zod";

import { sanityPublicClient } from "@/lib/sanity/client";
import { GAME_SUMMARY_PROJECTION } from "@/lib/sanity/queries";
import type { GameSummary } from "@/lib/sanity/types";

import { EMOJI_MEANINGS, type EmojiMatch } from "./emojis";

const MCP_URL = "https://mcp.sanity.io";
const PROJECT_ID = "tzh8tziu";
const DATASET = "production";
const MODEL = "openai/gpt-6-astra";
const GATEWAY = "https://ai.gateway.lovable.dev/v1";

/** Fields that must never be read by the agent. */
const BLOCKED_TERMS = ["editorNotes", "importRecord", "importStatus", "sources", "drafts.", "profile", "siteSettings"];

export class OracleError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

interface RpcResponse {
  result?: { content?: { type: string; text?: string }[]; isError?: boolean };
  error?: { message?: string };
}

function parseRpc(text: string): RpcResponse {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return JSON.parse(trimmed) as RpcResponse;
  const line = trimmed.split("\n").find((row) => row.startsWith("data:"));
  if (!line) throw new Error("Empty MCP response");
  return JSON.parse(line.slice(5)) as RpcResponse;
}

/** Minimal MCP Streamable HTTP session scoped to one request. */
async function openSanityMcp(token: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
    Authorization: `Bearer ${token}`,
  };
  const init = await fetch(MCP_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "queercade-oracle", version: "1" } },
    }),
  });
  const sessionId = init.headers.get("mcp-session-id");
  if (!init.ok || !sessionId) throw new OracleError("The catalog connection is unavailable right now.", 503);
  headers["Mcp-Session-Id"] = sessionId;
  await fetch(MCP_URL, { method: "POST", headers, body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) });

  let nextId = 2;
  return {
    async query(groq: string): Promise<string> {
      const response = await fetch(MCP_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: nextId++,
          method: "tools/call",
          params: {
            name: "query_documents",
            arguments: { projectId: PROJECT_ID, dataset: DATASET, perspective: "published", query: groq, intent: "suggesting a game from emojis" },
          },
        }),
      });
      const rpc = parseRpc(await response.text());
      if (rpc.error) return `Query failed: ${rpc.error.message ?? "unknown error"}`;
      const text = (rpc.result?.content ?? []).map((part) => part.text ?? "").join("\n");
      return text.slice(0, 12000);
    },
    async close(): Promise<void> {
      await fetch(MCP_URL, { method: "DELETE", headers }).catch(() => undefined);
    },
  };
}

const SYSTEM_PROMPT = `You are the QueerCade Emoji Oracle. A visitor picked emojis; suggest exactly ONE game from the QueerCade catalog that best matches them.
Use the query_catalog tool (GROQ against Sanity). Every query MUST include the filter: _type == "game" && editorialStatus in ["approved", "featured"].
Useful fields: title, "slug": slug.current, summary, customDescription, themes, gameModes, "genres": genres[]->name, "characters": lgbtqCharacters[].name, releaseYear.
Keep projections small and slice results (e.g. [0...40]). Useful patterns: themes match "Horror", genres[]->name match "Puzzle", summary match "space".
Do 2-5 queries, then answer. Your final message must be ONLY this JSON, no prose:
{"slug": "<game slug>", "reason": "<one friendly sentence, max 160 chars>", "matches": [{"emoji": "<emoji>", "meaning": "<what it matched in the game, max 60 chars>"}]}`;

interface OracleAnswer {
  slug: string;
  reason: string;
  matches: EmojiMatch[];
}

function parseAnswer(text: string): OracleAnswer | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const raw = JSON.parse(text.slice(start, end + 1)) as Partial<OracleAnswer>;
    if (typeof raw.slug !== "string" || typeof raw.reason !== "string") return null;
    const matches = Array.isArray(raw.matches)
      ? raw.matches
          .filter((m): m is EmojiMatch => typeof m?.emoji === "string" && typeof m?.meaning === "string")
          .map((m) => ({ emoji: m.emoji.slice(0, 8), meaning: m.meaning.slice(0, 80) }))
      : [];
    return { slug: raw.slug.trim(), reason: raw.reason.trim().slice(0, 240), matches };
  } catch {
    return null;
  }
}

export interface OracleResult {
  game: GameSummary;
  reason: string;
  matches: EmojiMatch[];
}

function gatewayError(error: unknown): OracleError {
  const status = (error as { statusCode?: number })?.statusCode;
  if (status === 402) return new OracleError("The oracle is out of AI credits for now. Please try again later.", 402);
  if (status === 429) return new OracleError("The oracle is busy. Please wait a minute and try again.", 429);
  if (status === 403) return new OracleError("The oracle is not available right now.", 403);
  return new OracleError("The oracle could not think of a game right now. Please try again.", 503);
}

export async function suggestGameFromEmojis(emojis: string[]): Promise<OracleResult> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  const sanityToken = process.env["SANITY_MCP_READ_TOKEN"] ?? process.env["SANITY_API_WRITE_TOKEN"];
  if (!apiKey || !sanityToken) throw new OracleError("The oracle is not configured.", 500);

  const mcp = await openSanityMcp(sanityToken);
  try {
    const provider = createOpenAI({
      baseURL: GATEWAY,
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });
    const picked = emojis.map((emoji) => `${emoji} (${EMOJI_MEANINGS.get(emoji) ?? ""})`).join(", ");

    let text: string;
    try {
      const result = streamText({
        model: provider.responses(MODEL),
        system: SYSTEM_PROMPT,
        prompt: `Emojis picked: ${picked}`,
        stopWhen: stepCountIs(50),
        tools: {
          query_catalog: tool({
            description: "Run a read-only GROQ query against the published QueerCade game catalog.",
            inputSchema: z.object({ groq: z.string() }),
            execute: async ({ groq }) => {
              if (BLOCKED_TERMS.some((term) => groq.includes(term))) return "That field is not available.";
              if (!/editorialStatus\s+in\s*\[/.test(groq)) {
                return 'Rejected: include editorialStatus in ["approved", "featured"] in the filter.';
              }
              return mcp.query(groq.slice(0, 2000));
            },
          }),
        },
        providerOptions: {
          openai: {
            forceReasoning: true,
            reasoningEffort: "low",
            reasoningSummary: "auto",
            store: false,
            include: ["reasoning.encrypted_content"],
          },
        },
      });
      text = await result.text;
    } catch (error) {
      throw gatewayError(error);
    }

    const answer = parseAnswer(text);
    if (!answer || !/^[a-z0-9-]{1,120}$/.test(answer.slug)) {
      throw new OracleError("The oracle couldn't find a match. Try different emojis.", 404);
    }
    const game = await sanityPublicClient.fetch<GameSummary | null>(
      `*[_type == "game" && editorialStatus in ["approved", "featured"] && slug.current == $slug][0] ${GAME_SUMMARY_PROJECTION}`,
      { slug: answer.slug },
    );
    if (!game) throw new OracleError("The oracle couldn't find a match. Try different emojis.", 404);
    return { game, reason: answer.reason, matches: answer.matches.filter((m) => emojis.includes(m.emoji)) };
  } finally {
    await mcp.close();
  }
}
