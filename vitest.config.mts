import { defineConfig } from "vitest/config";

// Testes unitários só no domínio (funções puras, sem Prisma).
export default defineConfig({
  test: {
    include: ["src/domain/**/*.test.ts"],
    passWithNoTests: true,
  },
});
