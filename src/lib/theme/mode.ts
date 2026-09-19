/** Light/dark appearance preference, stored in a cookie so SSR renders it too. */

export type ThemeMode = "light" | "dark" | "system";

export type ResolvedTheme = "light" | "dark";

export const THEME_COOKIE = "qc-theme";
export const CONTRAST_COOKIE = "qc-contrast";

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

function readCookieValue(cookieString: string, name: string): string | undefined {
  for (const part of cookieString.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

export interface Appearance {
  mode: ThemeMode;
  highContrast: boolean;
}

/** Reads the stored appearance on the server (request cookie) or in the browser. */
export async function readAppearance(): Promise<Appearance> {
  if (typeof document !== "undefined") {
    return {
      mode: toMode(readCookieValue(document.cookie, THEME_COOKIE)),
      highContrast: readCookieValue(document.cookie, CONTRAST_COOKIE) === "high",
    };
  }
  try {
    const { getCookie } = await import("@tanstack/react-start/server");
    return {
      mode: toMode(getCookie(THEME_COOKIE)),
      highContrast: getCookie(CONTRAST_COOKIE) === "high",
    };
  } catch {
    return { mode: "system", highContrast: false };
  }
}

function toMode(value: string | undefined): ThemeMode {
  return isThemeMode(value) ? value : "system";
}

/** Persists appearance for a year so the next server render matches. */
export function writeAppearanceCookies(appearance: Partial<Appearance>): void {
  if (typeof document === "undefined") return;
  const maxAge = 60 * 60 * 24 * 365;
  if (appearance.mode) {
    document.cookie = `${THEME_COOKIE}=${appearance.mode}; path=/; max-age=${maxAge}; samesite=lax`;
  }
  if (appearance.highContrast !== undefined) {
    document.cookie = `${CONTRAST_COOKIE}=${appearance.highContrast ? "high" : "normal"}; path=/; max-age=${maxAge}; samesite=lax`;
  }
}
