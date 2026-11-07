import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

/**
 * Dois projetos, porque as duas suítes têm custos opostos.
 *
 * `dominio` é função pura: nada a preparar, nada compartilhado, roda em paralelo e em segundos —
 * é a suíte que se roda a cada salvamento. `api` toca um SQLite único, e arquivos em paralelo
 * disputariam o mesmo banco; `fileParallelism: false` é o que torna o reset entre arquivos
 * confiável. Misturar as duas numa suíte só arrastaria o domínio para a velocidade do banco.
 *
 * O projeto `api` é declarado agora e exercitado no extra E2: declará-lo junto com o domínio
 * evita que a primeira suíte de rota chegue tendo também que decidir configuração.
 */
/**
 * O alias `@/` existe no tsconfig, que o Vite não lê. Sem repeti-lo, importar
 * `@/src/server/sessao` num teste falha em `@/src/db/prisma`, um nível abaixo — e o seam de
 * rota de que o extra E2 depende esbarraria nisso na primeira linha.
 *
 * Fica em cada projeto, e não na raiz: um `resolve` de raiz não desce para os projetos de
 * `projects`, que são configurações inteiras e independentes.
 */
const resolve = { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } }

export default defineConfig({
  test: {
    // O projeto `api` ainda nao tem caso: a suite de rota entra no extra E2. Sem isto, rodar
    // `--project api` sozinho falharia por "nenhum arquivo", que nao e erro de configuracao.
    passWithNoTests: true,
    projects: [
      {
        resolve,
        test: {
          name: 'dominio',
          include: ['src/domain/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        resolve,
        test: {
          // As funções puras da interface: o estado do formulário, a ancoragem do erro por
          // campo e o que o servidor recusa sem ter input correspondente. Projeto próprio, e
          // não dentro de `dominio`, porque `src/ui` não é domínio — e porque o teto de casos
          // que a Sprint 2 fixou é sobre a suíte do domínio, que esta não é.
          name: 'ui',
          include: ['src/ui/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        resolve,
        test: {
          name: 'api',
          include: ['tests/api/**/*.test.ts'],
          environment: 'node',
          // Um banco de teste só: arquivos concorrentes se sobrescreveriam.
          fileParallelism: false,
        },
      },
    ],
  },
})
