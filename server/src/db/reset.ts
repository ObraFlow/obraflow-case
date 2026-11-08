// npm run setup: apaga o banco local, aplica as migrações e popula os dados de demonstração.
import { rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const file = process.env.DATABASE_FILE ? resolve(root, process.env.DATABASE_FILE) : resolve(root, 'data/obraflow.db')
try {
  for (const suffix of ['', '-wal', '-shm']) rmSync(file + suffix, { force: true })
} catch (err) {
  // no Windows o arquivo fica travado enquanto a API está rodando
  console.error('Não consegui apagar o banco. Pare o "npm run dev" e rode o setup de novo.')
  throw err
}

const { runMigrations } = await import('./client.js')
const { seed } = await import('./seed.js')
runMigrations()
seed()
console.log('Banco criado e populado em', file)
