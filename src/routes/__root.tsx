import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
  useRouter,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import { ThemeProvider } from "@/components/ThemeProvider";
import { NesProvider } from "@/design-system/nes-229931";
import { supabase } from "@/integrations/supabase/client";
import { readAppearance } from "@/lib/theme/mode";
import { CONTENT_SECURITY_POLICY } from "@/lib/seo/csp";
import { DEFAULT_SHARE_IMAGE } from "@/lib/seo/structuredData";

import appCss from "../styles.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  staticData: { sitemap: false },
  loader: () => readAppearance(),
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "QueerCade" },
      {
        name: "description",
        content: "A curated arcade of games: IGDB discovery with a Sanity editorial workflow.",
      },
      { property: "og:title", content: "QueerCade" },
      {
        property: "og:description",
        content: "A curated arcade of games: IGDB discovery with a Sanity editorial workflow.",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "QueerCade" },
      { property: "og:image", content: DEFAULT_SHARE_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: DEFAULT_SHARE_IMAGE },
      { name: "google-site-verification", content: "RHlwBdxnagu8yjEC1UQ3cV-WcIJ17lGECi8uJYHO6P4" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      // The pixel font is self-hosted, so preload it instead of connecting to a
      // third-party font host. Cover art comes from the image CDN.
      {
        rel: "preload",
        href: "/fonts/press-start-2p-latin.woff2",
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
      { rel: "preconnect", href: "https://cdn.sanity.io", crossOrigin: "anonymous" },
      { rel: "preconnect", href: "https://images.igdb.com", crossOrigin: "anonymous" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/*
          CSP as the first head element: a meta-delivered policy only governs
          resources parsed after it, so it must precede styles, preloads, and
          scripts (HeadContent resource hoisting would otherwise push them first).
        */}
        <meta httpEquiv="Content-Security-Policy" content={CONTENT_SECURITY_POLICY} />
        {/* Private analytics tracker (loads on every page via the root shell). */}
        <script
          defer
          src="https://umami-lite.view.fast/tracker.js"
          data-website-id="d6f0c101-7e14-4719-8a37-510d659b3ff9"
        ></script>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

// Keep this root providers-only: canvas preview routes (/__mockup,
// /__component) render inside it, so any chrome leaks into every frame.
function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const appearance = Route.useLoaderData();
  const router = useRouter();

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => data.subscription.unsubscribe();
  }, [queryClient, router]);

  return (
    <QueryClientProvider client={queryClient}>
      <NesProvider loadFont={false}>
        <ThemeProvider initial={appearance}>
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <Outlet />
        </ThemeProvider>
      </NesProvider>
    </QueryClientProvider>
  );
}
