import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    env: { DATABASE_FILE: ':memory:' },
    setupFiles: ['./test/setup.ts'],
  },
})
