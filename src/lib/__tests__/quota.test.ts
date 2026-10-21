import { describe, expect, it } from "vitest";

import { createQuota, isCrossSite } from "@/lib/security/quota";

describe("createQuota", () => {
  it("allows 10 appreciations per visitor per game, blocks the 11th", () => {
    const quota = createQuota(10, 86_400_000);
    for (let i = 0; i < 10; i += 1) expect(quota.hit("ip:slug", 0)).toBe(false);
    expect(quota.hit("ip:slug", 0)).toBe(true);
    expect(quota.hit("ip:other", 0)).toBe(false);
  });

  it("resets after the window", () => {
    const quota = createQuota(1, 1000);
    expect(quota.hit("k", 0)).toBe(false);
    expect(quota.hit("k", 10)).toBe(true);
    expect(quota.hit("k", 1000)).toBe(false);
  });
});

describe("isCrossSite", () => {
  it("rejects other origins and accepts same origin", () => {
    const url = "https://queercade.mikedemo.dev/api/x";
    expect(isCrossSite(new Request(url, { headers: { origin: "https://evil.example" } }))).toBe(true);
    expect(isCrossSite(new Request(url, { headers: { origin: "https://queercade.mikedemo.dev" } }))).toBe(false);
    expect(isCrossSite(new Request(url, { headers: { "sec-fetch-site": "cross-site" } }))).toBe(true);
  });
});
