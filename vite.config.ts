import { writeFileSync } from "node:fs";
import path from "path";
import { defineConfig, type Plugin } from "vite";

import { collectPrerenderPaths } from "./src/lib/prerender/pages";
import tsConfigPaths from "vite-tsconfig-paths";
import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { componentTagger } from "lovable-tagger";
import { mockupPreviewPlugin } from "./mockupPreviewPlugin";

/**
 * The Cloudflare plugin emits the server bundle as dist/server/index.js, while
 * the prerender step's preview server imports dist/server/server.js. Alias one
 * to the other so static prerendering can render pages during the build.
 */
function prerenderServerEntryAlias(): Plugin {
  return {
    name: "queercade:prerender-server-entry-alias",
    apply: "build",
    configResolved() {
      // Importing the Worker bundle during prerendering swaps the global
      // `process` for a stub whose stdin lacks `off`, which crashes Vite's
      // preview-server teardown. Pin the real Node process object.
      const realProcess = globalThis.process;
      Object.defineProperty(globalThis, "process", {
        get: () => realProcess,
        set: () => {},
        configurable: true,
      });
    },
    writeBundle: {
      order: "post",
      handler(options) {
        if (this.environment.name !== "ssr") return;
        const dir = options.dir;
        if (!dir) return;
        writeFileSync(path.join(dir, "server.js"), 'export { default } from "./index.js";\n');
      },
    },
  };
}

export default defineConfig(async ({ command, mode }) => {
  // Cloudflare Workers plugin only on build (produces the worker output);
  // the workerd runtime isn't available for the dev server.
  const useCloudflare = command === "build";

  // Public pages are rendered to static files at build time.
  const prerenderPaths = command === "build" ? await collectPrerenderPaths() : [];

  return {
    server: {
      host: "::",
      port: 8080,
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    plugins: [
      mockupPreviewPlugin(),
      tsConfigPaths({ projects: ["./tsconfig.json"] }),
      ...(useCloudflare ? [cloudflare({ viteEnvironment: { name: "ssr" } }), prerenderServerEntryAlias()] : []),
      tanstackStart({
        pages: prerenderPaths.map((route) => ({ path: route })),
        prerender: { enabled: command === "build", autoStaticPathsDiscovery: false, crawlLinks: false },
      }),
      viteReact(),
      ...(mode === "development" ? [componentTagger()] : []),
    ],
  };
});
