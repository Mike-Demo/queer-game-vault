import { useEffect } from "react";
import type { ReactNode } from "react";

import { applyTheme, type NesTheme } from "./theme";

const FONT_LINK_ID = "nes-font";
const FONT_HREF = "https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap";
const STORAGE_KEY = "nes-theme";

export interface NesProviderProps {
  /** Palette applied on mount when nothing is stored. Defaults to "retro". */
  defaultTheme?: NesTheme;
  /** Set false when the host app already loads Press Start 2P itself. */
  loadFont?: boolean;
  children: ReactNode;
}

function ensureFontLink(): void {
  if (document.getElementById(FONT_LINK_ID)) return;
  if (document.querySelector(`link[href="${FONT_HREF}"]`)) return;

  const preconnect = document.createElement("link");
  preconnect.rel = "preconnect";
  preconnect.href = "https://fonts.gstatic.com";
  preconnect.crossOrigin = "anonymous";
  document.head.appendChild(preconnect);

  const link = document.createElement("link");
  link.id = FONT_LINK_ID;
  link.rel = "stylesheet";
  link.href = FONT_HREF;
  document.head.appendChild(link);
}

function readStoredTheme(): NesTheme | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "retro" || stored === "fresh" ? stored : null;
  } catch {
    return null;
  }
}

/**
 * Wires the design system into a host app: loads the pixel font and applies
 * the palette attribute the stylesheet reads.
 */
export function NesProvider({ defaultTheme = "retro", loadFont = true, children }: NesProviderProps) {
  useEffect(() => {
    if (loadFont) ensureFontLink();
    applyTheme(readStoredTheme() ?? defaultTheme);
  }, [defaultTheme, loadFont]);

  return <>{children}</>;
}
