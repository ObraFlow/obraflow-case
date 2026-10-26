import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Desliga as regras de estilo que conflitam com o Prettier (tem que ser o último).
  prettier,
  {
    rules: {
      // Variáveis não usadas são erro, exceto as prefixadas com _ (ex.: catch (_e)).
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Client do Prisma gerado.
    "src/generated/**",
  ]),
]);

export default eslintConfig;
