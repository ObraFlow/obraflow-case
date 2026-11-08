import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { mkdirSync } from 'node:fs'
import { dirname, isAbsolute, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as schema from './schema.js'

// pasta server/. Função, e não constante, porque no bundle da demo (CommonJS)
// import.meta não existe: lá os caminhos vêm todos por variável de ambiente.
const root = () => resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const env = process.env.DATABASE_FILE
const file = env === ':memory:' || (env && isAbsolute(env)) ? env : resolve(root(), env ?? 'data/obraflow.db')

if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true })

export const sqlite = new Database(file)
// O SQLite vem com chaves estrangeiras DESLIGADAS por padrão.
sqlite.pragma('foreign_keys = ON')
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('busy_timeout = 5000')

export const db = drizzle(sqlite, { schema })
export type DB = typeof db

export function runMigrations() {
  migrate(db, { migrationsFolder: process.env.MIGRATIONS_DIR ?? resolve(root(), 'drizzle') })
}
