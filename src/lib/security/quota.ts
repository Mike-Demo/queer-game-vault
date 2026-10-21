/** Fixed-window counter. Returns true when the key has exceeded `max` in the window. */
export interface Quota {
  hit: (key: string, now?: number) => boolean;
}

export function createQuota(max: number, windowMs: number, maxKeys = 10_000): Quota {
  const buckets = new Map<string, { count: number; resetAt: number }>();
  return {
    hit(key, now = Date.now()) {
      const bucket = buckets.get(key);
      if (!bucket || bucket.resetAt <= now) {
        if (buckets.size >= maxKeys) buckets.clear();
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        return 1 > max;
      }
      bucket.count += 1;
      return bucket.count > max;
    },
  };
}

export function clientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "anon"
  );
}

/** True when a browser request clearly comes from another site. */
export function isCrossSite(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return true;
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host !== new URL(request.url).host;
  } catch {
    return true;
  }
}
