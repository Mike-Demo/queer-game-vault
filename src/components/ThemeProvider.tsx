import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  writeAppearanceCookies,
  type Appearance,
  type ResolvedTheme,
  type ThemeMode,
} from "@/lib/theme/mode";

interface ThemeContextValue {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  highContrast: boolean;
  setMode: (mode: ThemeMode) => void;
  setHighContrast: (highContrast: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: "system",
  resolved: "light",
  highContrast: false,
  setMode: () => undefined,
  setHighContrast: () => undefined,
});

/** Dark mode and high contrast, seeded from the request cookie so SSR matches. */
export function ThemeProvider({ initial, children }: { initial: Appearance; children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(initial.mode);
  const [highContrast, setContrastState] = useState(initial.highContrast);
  // The server cannot know the device preference, so "system" starts light and
  // settles after hydration.
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(media.matches);
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const resolved: ResolvedTheme = mode === "system" ? (systemDark ? "dark" : "light") : mode;

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", resolved);
    document.documentElement.setAttribute("data-contrast", highContrast ? "high" : "normal");
    document.documentElement.style.colorScheme = resolved;
  }, [resolved, highContrast]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    writeAppearanceCookies({ mode: next });
  }, []);

  const setHighContrast = useCallback((next: boolean) => {
    setContrastState(next);
    writeAppearanceCookies({ highContrast: next });
  }, []);

  const value = useMemo(
    () => ({ mode, resolved, highContrast, setMode, setHighContrast }),
    [mode, resolved, highContrast, setMode, setHighContrast],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
