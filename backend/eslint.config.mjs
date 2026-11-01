// @ts-check
import { defineConfig } from 'eslint/config';
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import boundaries from 'eslint-plugin-boundaries';

export default defineConfig(
  {
    ignores: ['eslint.config.mjs', 'dist'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'module',
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/consistent-type-definitions': 'off',
      '@typescript-eslint/no-extraneous-class': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
    },
  },
  {
    files: ['**/*.spec.ts', '**/*.int-spec.ts', '**/*.e2e-spec.ts', 'test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-deprecated': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-dynamic-delete': 'off',
      '@typescript-eslint/non-nullable-type-assertion-style': 'off',
      'boundaries/dependencies': 'off',
      'no-restricted-imports': 'off',
    },
  },

  // ---- Boundaries: enforça a Clean Architecture por módulo ----
  {
    files: ['src/modules/**/*.ts'],
    plugins: { boundaries },
    settings: {
      'boundaries/elements': [
        {
          type: 'domain',
          pattern: 'src/modules/*/domain/**',
          mode: 'full',
        },
        {
          type: 'application',
          pattern: 'src/modules/*/application/**',
          mode: 'full',
        },
        {
          type: 'infrastructure',
          pattern: 'src/modules/*/infrastructure/**',
          mode: 'full',
        },
        {
          type: 'shared',
          pattern: 'src/shared/**',
          mode: 'full',
        },
      ],
      // captura o nome do módulo para impedir
      // um módulo importar internals de outro módulo
      'boundaries/include': ['src/modules/**/*.ts'],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          rules: [
            {
              from: { type: 'domain' },
              allow: { to: { type: 'shared' } },
            },
            {
              from: { type: 'application' },
              allow: { to: { type: ['domain', 'shared'] } },
            },
            {
              from: { type: 'infrastructure' },
              allow: { to: { type: ['domain', 'application', 'shared'] } },
            },
          ],
        },
      ],
      'boundaries/no-private': 'off',
      'boundaries/entry-point': 'off',
    },
  },

  // ---- Regras adicionais de boas práticas Nest ----
  {
    files: ['src/modules/**/application/use-cases/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/infrastructure/*', '**/infrastructure/**'],
              message:
                'Use-cases não podem importar nada de infrastructure. Dependa apenas da interface do repositório/serviço definida em domain.',
            },
            {
              group: ['**/*.repository.impl', '**/*.repository.impl.ts'],
              message:
                'Use-cases devem depender da interface do repositório (domain/repositories), nunca da implementação concreta.',
            },
          ],
        },
      ],
    },
  },
);