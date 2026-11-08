// Precisa rodar antes de qualquer import do banco: por isso fica num módulo
// separado, importado primeiro pelo handler.
import { existsSync } from 'node:fs'
import { join } from 'node:path'

process.env.DATABASE_FILE ||= '/tmp/obraflow-demo.db'
process.env.MIGRATIONS_DIR ||= join(process.cwd(), 'drizzle')
process.env.SWAGGER_UI_DIR ||= join(process.cwd(), 'static')

// o arquivo é criado assim que o banco é aberto; por isso a checagem é aqui
export const freshDatabase = !existsSync(process.env.DATABASE_FILE)
