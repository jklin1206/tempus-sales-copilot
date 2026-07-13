import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // The loaders import "server-only" so that a stray client import fails the
      // Next.js build. Under Vitest there is no React Server Components graph, so
      // resolve it to the same empty module Next uses on the server and keep the
      // guard meaningful where it actually matters.
      "server-only": fileURLToPath(new URL("./node_modules/server-only/empty.js", import.meta.url)),
    },
  },
});
