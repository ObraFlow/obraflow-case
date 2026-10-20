import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import typescript from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default defineConfig([
  globalIgnores([".next/**", "src/generated/**", "coverage/**", ".local/**"]),
  js.configs.recommended,
  ...typescript.configs.recommended,
  { files: ["**/*.{ts,tsx}"], extends: [reactHooks.configs.flat.recommended] },
]);
