import { createClient, type SanityClient } from "@sanity/client";

import { SANITY_API_VERSION } from "./config";

/**
 * Server-only Sanity client with write access. The token lives in Lovable Cloud
 * secrets and is read at call time, never at module scope.
 */
export function getSanityWriteClient(): SanityClient {
  const token = process.env["SANITY_API_WRITE_TOKEN"];
  if (!token) {
    throw new Error("SANITY_WRITE_TOKEN_MISSING");
  }

  return createClient({
    projectId: process.env["SANITY_PROJECT_ID"] ?? "tzh8tziu",
    dataset: process.env["SANITY_DATASET"] ?? "production",
    apiVersion: SANITY_API_VERSION,
    token,
    useCdn: false,
    perspective: "raw",
  });
}
