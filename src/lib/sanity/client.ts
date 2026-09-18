import { createClient } from "@sanity/client";
import imageUrlBuilder from "@sanity/image-url";

import { SANITY_API_VERSION, SANITY_DATASET, SANITY_PROJECT_ID } from "./config";

/** Cached public client for published content. No credentials involved. */
export const sanityPublicClient = createClient({
  projectId: SANITY_PROJECT_ID,
  dataset: SANITY_DATASET,
  apiVersion: SANITY_API_VERSION,
  useCdn: true,
  perspective: "published",
});

/** Uncached public client for screens that must not show stale status. */
export const sanityFreshClient = createClient({
  projectId: SANITY_PROJECT_ID,
  dataset: SANITY_DATASET,
  apiVersion: SANITY_API_VERSION,
  useCdn: false,
  perspective: "published",
});

const builder = imageUrlBuilder(sanityPublicClient);

type SanityImageSource = Parameters<ReturnType<typeof imageUrlBuilder>["image"]>[0];

export function sanityImageUrl(source: SanityImageSource, width: number, height?: number): string {
  const image = builder.image(source).width(width).auto("format");
  return (height ? image.height(height).fit("crop") : image).url();
}
