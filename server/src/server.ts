import { runMigrations } from './db/client.js'
import { buildApp } from './app.js'

runMigrations()

const app = buildApp({ logger: true })
const port = Number(process.env.PORT ?? 3333)

app
  .listen({ port, host: '0.0.0.0' })
  .then(() => console.log(`API em http://localhost:${port}/api · documentação em http://localhost:${port}/api/docs`))
  .catch((err) => {
    app.log.error(err)
    process.exit(1)
  })
