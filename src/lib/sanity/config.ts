/** Public Sanity coordinates. Safe in the browser: reads only, no tokens. */
export const SANITY_PROJECT_ID = "tzh8tziu";
export const SANITY_DATASET = "production";
export const SANITY_API_VERSION = "2024-10-01";
export const SANITY_STUDIO_URL = "https://queercade.sanity.studio";

/** Deep link to a document inside the hosted Studio. */
export function studioDocumentUrl(documentId: string): string {
  return `${SANITY_STUDIO_URL}/structure/intent/edit/id=${encodeURIComponent(documentId)}`;
}
