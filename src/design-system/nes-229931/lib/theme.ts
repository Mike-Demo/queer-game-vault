import { useCallback, useSyncExternalStore } from "react";

export type NesTheme = "retro" | "fresh";

export const NES_THEMES: readonly NesTheme[] = ["retro", "fresh"];
const STORAGE_KEY = "nes-theme";

function isNesTheme(value: string | null): value is NesTheme {
  return value === "retro" || value === "fresh";
}

function readTheme(): NesTheme {
  if (typeof document === "undefined") return "retro";
  const attr = document.documentElement.getAttribute("data-nes-theme");
  return isNesTheme(attr) ? attr : "retro";
}

const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function applyTheme(theme: NesTheme): void {
  document.documentElement.setAttribute("data-nes-theme", theme);
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage may be unavailable (private mode); the attribute still applies.
  }
  for (const listener of listeners) listener();
}

/** Reads and switches the active NES palette. */
export function useNesTheme(): [NesTheme, (theme: NesTheme) => void] {
  const theme = useSyncExternalStore<NesTheme>(subscribe, readTheme, () => "retro");
  const setTheme = useCallback((next: NesTheme) => {
    applyTheme(next);
  }, []);

  return [theme, setTheme];
}
