// Monta a saída no formato Build Output API da Vercel (.vercel/output):
// o front estático e a API como uma função Node, com o SQLite nativo junto.
import { build } from 'esbuild'
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, '.vercel/output')
const fn = join(out, 'functions/api.func')

rmSync(out, { recursive: true, force: true })
mkdirSync(fn, { recursive: true })

execSync('npm run build -w web', { cwd: root, stdio: 'inherit' })
cpSync(join(root, 'web/dist'), join(out, 'static'), { recursive: true })

await build({
  entryPoints: [join(root, 'deploy/vercel-api.ts')],
  outfile: join(fn, 'app.cjs'),
  bundle: true,
  platform: 'node',
  target: `node${process.versions.node.split('.')[0]}`,
  format: 'cjs',
  external: ['better-sqlite3'],
  logLevel: 'warning',
})
writeFileSync(join(fn, 'index.cjs'), "module.exports = require('./app.cjs').default\n")

// módulo nativo e o que ele carrega em tempo de execução
for (const pkg of ['better-sqlite3', 'bindings', 'file-uri-to-path']) {
  cpSync(join(root, 'node_modules', pkg), join(fn, 'node_modules', pkg), {
    recursive: true,
    filter: (src) => !/[/\\](src|deps|docs)([/\\]|$)/.test(src.slice(join(root, 'node_modules', pkg).length)),
  })
}
cpSync(join(root, 'server/drizzle'), join(fn, 'drizzle'), { recursive: true })
cpSync(join(root, 'node_modules/@fastify/swagger-ui/static'), join(fn, 'static'), { recursive: true })

writeFileSync(
  join(fn, '.vc-config.json'),
  // o binário do SQLite foi compilado para o Node que rodou o build: a função usa o mesmo
  JSON.stringify(
    {
      runtime: `nodejs${process.versions.node.split('.')[0]}.x`,
      handler: 'index.cjs',
      launcherType: 'Nodejs',
      shouldAddHelpers: false,
      maxDuration: 10,
    },
    null,
    2,
  ),
)
writeFileSync(
  join(out, 'config.json'),
  JSON.stringify(
    {
      version: 3,
      routes: [{ src: '/api(?:/.*)?', dest: '/api' }, { handle: 'filesystem' }, { src: '/.*', dest: '/index.html' }],
    },
    null,
    2,
  ),
)
console.log('Saída da Vercel pronta em .vercel/output')
