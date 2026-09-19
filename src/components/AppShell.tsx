import { useQuery } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { NesBadge, NesButton, NesText } from "@/design-system/nes-229931";
import { useEditorAccess, useSession } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { siteSettingsQueryOptions } from "@/lib/publicData";

/** Paths only editors and admins should be offered. */
const EDITOR_PATHS = new Set(["/discover", "/imports", "/review"]);

/** Shown while site settings are still loading, so the header is never empty. */
const FALLBACK_NAV = [
  { label: "Home", path: "/" },
  { label: "Library", path: "/library" },
  { label: "Collections", path: "/collections" },
  { label: "About", path: "/about" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data: settings } = useQuery(siteSettingsQueryOptions);
  const { session } = useSession();
  const { data: access } = useEditorAccess(Boolean(session));
  const isEditor = Boolean(access?.role);

  const sourceNav = settings?.primaryNavigation?.length ? settings.primaryNavigation : FALLBACK_NAV;
  const navItems = sourceNav.filter((item) => !EDITOR_PATHS.has(item.path) || isEditor);
  const currentPath = router.state.location.pathname;

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="app-header">
        <div className="app-header-row">
          <Link to="/">
            <NesText variant="primary" className="title-md">
              {settings?.appName ?? "QueerCade"}
            </NesText>
          </Link>
          <nav aria-label="Primary">
            <ul className="app-nav">
              {navItems.map((item) => (
                <li key={item.path}>
                  <a href={item.path} data-active={currentPath === item.path}>
                    {item.label}
                  </a>
                </li>
              ))}
              {isEditor ? (
                <li>
                  <a href="/review" data-active={currentPath === "/review"}>
                    Review
                  </a>
                </li>
              ) : null}
            </ul>
          </nav>
          <div className="row">
            {access?.role ? <NesBadge variant="success">{access.role}</NesBadge> : null}
            {session ? (
              <NesButton
                type="button"
                onClick={async () => {
                  await supabase.auth.signOut();
                  await router.navigate({ to: "/" });
                }}
              >
                Sign out
              </NesButton>
            ) : (
              <Link to="/auth">
                <NesButton type="button" variant="primary">
                  Sign in
                </NesButton>
              </Link>
            )}
          </div>
        </div>
      </header>
      <main id="main" className="app-main">
        {children}
      </main>
      <footer className="app-footer">
        <NesText className="text-xs">
          {settings?.footerContent ?? "QueerCade — game data from IGDB, curation by humans."}
        </NesText>
      </footer>
    </div>
  );
}
