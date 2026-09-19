import { QueryClient, timeoutManager } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";

import { routeTree } from "./routeTree.gen";

// During static prerendering, query timers would keep the build process alive
// after every page is written. Unref them so the build can exit.
const isPrerendering = typeof process !== "undefined" && process.env.TSS_PRERENDERING === "true";
if (isPrerendering) {
  const unref = (id: unknown) => {
    (id as { unref?: () => void }).unref?.();
    return id as ReturnType<typeof setTimeout>;
  };
  timeoutManager.setTimeoutProvider({
    setTimeout: (cb, ms) => unref(setTimeout(cb, ms)),
    clearTimeout: (id) => clearTimeout(id),
    setInterval: (cb, ms) => unref(setInterval(cb, ms)),
    clearInterval: (id) => clearInterval(id),
  });
}

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  // Ships the server-fetched query cache with the SSR payload so the first
  // client render matches the server HTML instead of starting empty.
  setupRouterSsrQueryIntegration({ router, queryClient });

  return router;
};
