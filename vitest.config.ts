import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Integration tests share one local SQLite file (prisma/dev.db) with real
    // writes; running test files in parallel opens concurrent connections
    // that race for the write lock and time out. Serialize file execution.
    fileParallelism: false,
  },
});
