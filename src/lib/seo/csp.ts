/**
 * Content Security Policy, delivered via <meta http-equiv="Content-Security-Policy">.
 *
 * Rationale per directive:
 * - default-src 'self': deny everything not explicitly allowed.
 * - script-src 'self' 'unsafe-inline': same-origin app bundles plus TanStack
 *   Start streaming/inline hydration scripts. No third-party scripts load in
 *   production (analytics is the same-origin /~flock.js snippet).
 * - style-src 'self' 'unsafe-inline': same-origin stylesheet; components use
 *   inline styles sparingly.
 * - img-src: same-origin, data: URIs, the IGDB cover CDN, the Sanity image CDN,
 *   and the Aikido security-audit badge on /licenses.
 * - font-src 'self': the pixel font is self-hosted under /fonts.
 * - connect-src: same-origin server functions, Supabase (REST + realtime websocket),
 *   and the Sanity API/CDN for direct browser reads.
 * - object-src 'none': no plugins or embeds anywhere in the app.
 * - base-uri 'self': block <base> hijacking.
 * - form-action 'self': auth/settings forms submit through app code only.
 * - frame-ancestors 'self': included for audit parity. NOTE: a meta-delivered
 *   CSP cannot enforce frame-ancestors; real clickjacking protection needs this as
 *   an HTTP response header, which the host controls.
 */
const SUPABASE_HTTPS = "https://mfwitqkhpuqnuwjwvtiy.supabase.co";
const SUPABASE_WSS = "wss://mfwitqkhpuqnuwjwvtiy.supabase.co";

const DIRECTIVES: Array<[string, string]> = [
  ["default-src", "'self'"],
  ["script-src", "'self' 'unsafe-inline'"],
  ["style-src", "'self' 'unsafe-inline'"],
  [
    "img-src",
    "'self' data: https://images.igdb.com https://cdn.sanity.io https://app.aikido.dev",
  ],
  ["font-src", "'self'"],
  [
    "connect-src",
    [
      "'self'",
      SUPABASE_HTTPS,
      SUPABASE_WSS,
      "https://tzh8tziu.api.sanity.io",
      "https://tzh8tziu.apicdn.sanity.io",
    ].join(" "),
  ],
  ["object-src", "'none'"],
  ["base-uri", "'self'"],
  ["form-action", "'self'"],
  ["frame-ancestors", "'self'"],
];

export const CONTENT_SECURITY_POLICY = DIRECTIVES.map(([name, value]) => name + " " + value).join("; ");
