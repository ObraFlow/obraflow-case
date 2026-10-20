import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const alias = { "@": fileURLToPath(new URL("./src", import.meta.url)) };

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        test: { name: "unit", environment: "node", include: ["tests/unit/**/*.test.ts"] },
      },
      {
        resolve: { alias },
        test: { name: "integration", environment: "node", include: ["tests/integration/**/*.test.ts"], fileParallelism: false, testTimeout: 15000, hookTimeout: 20000 },
      },
    ],
  },
});
