import { describe, expect, it } from 'vitest'

import { pode } from '@/src/server/permissao'

/**
 * Guarda de configuração, não caso de regra.
 *
 * O projeto `api` existe para o seam de Route Handler do extra E2, e a primeira coisa de que
 * ele depende é o alias `@/` resolver aqui. Quando faltava, o erro aparecia uma camada abaixo
 * (`Cannot find package '@/src/db/prisma'`) e parecia defeito do módulo importado. Este caso
 * falha no lugar certo.
 */
describe('configuração do projeto api', () => {
  it('resolve o alias @/ a partir de tests/api', () => {
    expect(pode('admin', 'gerir_alcada')).toBe(true)
  })
})
