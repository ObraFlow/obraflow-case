'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

import { Schemas, type CamposComErro } from '@/src/domain'
import { FalhaDaApi, corpoJson, pedir } from '@/src/ui/api'
import { Vazio } from './estados'
import {
  BOTAO,
  BOTAO_ESCURO,
  CABECALHO,
  CARTAO,
  DESABILITADO_NEUTRO,
  NOTA,
  ROTULO_DE_CAMPO,
  campo,
} from './estilos'
import { IconeConfirmado, IconeErro, IconeObra } from './icones'

/**
 * Tela 9 — Empresa (artboard `Empresa`), abas Obras e Fornecedores.
 *
 * O cadastro grava pelos dois campos que o modelo tem de cada entidade, e nada além: o artboard
 * desenha responsável, situação e início da obra, e contato, ramo e bloqueio do fornecedor, que
 * não existem no modelo — divergência declarada no README, não coluna inventada na tela.
 *
 * Depois de gravar, `router.refresh()` relê as listas no servidor: a tela não mantém uma cópia
 * local que poderia discordar do banco.
 */

export type ObraDaEmpresa = {
  id: string
  nome: string
  cidade: string
  faixas: number
  /** Pedidos submetidos. Rascunho é privado de quem o criou e não entra na contagem de ninguém. */
  pedidos: number
}

export type FornecedorDaEmpresa = {
  id: string
  nome: string
  documento: string | null
  pedidos: number
}

type Aba = 'obras' | 'fornecedores'

export function Empresa({
  obras,
  fornecedores,
}: {
  obras: readonly ObraDaEmpresa[]
  fornecedores: readonly FornecedorDaEmpresa[]
}) {
  const parametros = useSearchParams()
  const router = useRouter()
  const caminho = usePathname()
  const aba: Aba = parametros.get('aba') === 'fornecedores' ? 'fornecedores' : 'obras'
  const [abertoEm, setAbertoEm] = useState<Aba | null>(null)
  const [criado, setCriado] = useState<string | null>(null)

  function trocarAba(nova: Aba) {
    setAbertoEm(null)
    setCriado(null)
    // A aba vive na URL para que recarregar e compartilhar o endereço devolvam a mesma aba.
    router.replace(nova === 'obras' ? caminho : `${caminho}?aba=${nova}`, { scroll: false })
  }

  function aoCriar(nome: string) {
    setAbertoEm(null)
    setCriado(nome)
    router.refresh()
  }

  const formularioAberto = abertoEm === aba

  return (
    <main className="flex flex-auto flex-col">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-neutro-200 bg-cartao px-8 py-5">
        <div>
          <p className="mb-1.5 text-[12px] text-neutro-600">Configurações / Empresa</p>
          <h1 className="text-[24px] font-[650] tracking-[-0.03em] text-forte">Empresa</h1>
          <p className="mt-1 text-[13px] text-neutro-600">
            {aba === 'obras'
              ? 'Cadastros que alimentam os pedidos e as alçadas. Só quem administra edita esta área.'
              : 'De quem a obra compra. Todo fornecedor cadastrado aparece no cadastro de pedido.'}
          </p>
        </div>
        <button
          type="button"
          disabled={formularioAberto}
          onClick={() => {
            setCriado(null)
            setAbertoEm(aba)
          }}
          className={`${BOTAO_ESCURO} ${DESABILITADO_NEUTRO}`}
        >
          {aba === 'obras' ? '+ Nova obra' : '+ Novo fornecedor'}
        </button>
      </header>

      <div className="flex flex-col gap-5 px-8 pt-6 pb-10">
        <div role="tablist" aria-label="Cadastros da empresa" className="flex flex-wrap gap-2">
          <Guia ativa={aba === 'obras'} aoEscolher={() => trocarAba('obras')} rotulo="Obras" total={obras.length} />
          <Guia
            ativa={aba === 'fornecedores'}
            aoEscolher={() => trocarAba('fornecedores')}
            rotulo="Fornecedores"
            total={fornecedores.length}
          />
        </div>

        {criado && (
          <div role="status" className={`${NOTA} border-marca-50 bg-marca-15 text-marca-850`}>
            <p className="flex items-start gap-2">
              <IconeConfirmado className="mt-px shrink-0" />
              <span>
                <strong>{criado}</strong>{' '}
                {aba === 'obras'
                  ? 'cadastrada. Ela já aparece no seletor de obra do pedido — e o envio fica bloqueado até a alçada dela ter uma faixa.'
                  : 'cadastrado. Ele já aparece no seletor de fornecedor do pedido.'}
              </span>
            </p>
          </div>
        )}

        {formularioAberto &&
          (aba === 'obras' ? (
            <FormularioDeObra aoCriar={aoCriar} aoCancelar={() => setAbertoEm(null)} />
          ) : (
            <FormularioDeFornecedor aoCriar={aoCriar} aoCancelar={() => setAbertoEm(null)} />
          ))}

        <section className={CARTAO} role="tabpanel" aria-label={aba === 'obras' ? 'Obras' : 'Fornecedores'}>
          {aba === 'obras' ? <TabelaDeObras obras={obras} /> : <TabelaDeFornecedores fornecedores={fornecedores} />}
        </section>
      </div>
    </main>
  )
}

function Guia({
  ativa,
  aoEscolher,
  rotulo,
  total,
}: {
  ativa: boolean
  aoEscolher: () => void
  rotulo: string
  total: number
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={ativa}
      onClick={aoEscolher}
      className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-4 text-[14px] font-semibold ${
        ativa
          ? 'border-neutro-900 bg-neutro-900 text-cartao'
          : 'border-neutro-300 bg-cartao text-neutro-700 hover:bg-neutro-50'
      }`}
    >
      {rotulo}
      <span className={`rounded-full px-2 text-[12px] tabular-nums ${ativa ? 'bg-neutro-700' : 'bg-neutro-100'}`}>
        {total}
      </span>
    </button>
  )
}

// --- tabelas -----------------------------------------------------------------------------------

const CELULA = 'border-b border-neutro-100 p-3.5 align-middle text-[14px]'

function TabelaDeObras({ obras }: { obras: readonly ObraDaEmpresa[] }) {
  if (obras.length === 0) {
    return (
      <Vazio titulo="Nenhuma obra cadastrada" icone={<IconeObra />}>
        Cadastre a primeira obra em <strong>+ Nova obra</strong>. Sem obra não há pedido nem alçada.
      </Vazio>
    )
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] border-collapse">
        <caption className="px-5 pt-4 pb-3 text-left text-[15px] font-[650] text-forte">
          Obras da construtora
        </caption>
        <thead>
          <tr>
            <th scope="col" className={CABECALHO}>Obra</th>
            <th scope="col" className={CABECALHO}>Alçada</th>
            <th scope="col" className={CABECALHO}>Pedidos submetidos</th>
            <th scope="col" className={CABECALHO}>
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {obras.map((obra) => (
            <tr key={obra.id}>
              <td className={CELULA}>
                <span className="block font-semibold text-forte">{obra.nome}</span>
                <span className="text-[13px] text-neutro-600">{obra.cidade}</span>
              </td>
              <td className={CELULA}>
                {obra.faixas > 0 ? (
                  <span className="text-neutro-700">
                    {obra.faixas} {obra.faixas === 1 ? 'faixa configurada' : 'faixas configuradas'}
                  </span>
                ) : (
                  <span className="text-aviso-texto">Sem alçada · envio de pedido bloqueado</span>
                )}
              </td>
              <td className={`${CELULA} tabular-nums text-neutro-700`}>{obra.pedidos}</td>
              <td className={`${CELULA} text-right`}>
                <Link
                  href={`/alcadas?obra=${obra.id}`}
                  className="text-[13px] font-semibold text-marca-700 hover:underline"
                >
                  {obra.faixas > 0 ? 'Configurar alçada →' : 'Criar a primeira faixa →'}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TabelaDeFornecedores({ fornecedores }: { fornecedores: readonly FornecedorDaEmpresa[] }) {
  if (fornecedores.length === 0) {
    return (
      <Vazio titulo="Nenhum fornecedor cadastrado" icone={<IconeObra />}>
        Cadastre o primeiro em <strong>+ Novo fornecedor</strong>. Sem fornecedor o pedido não é
        enviado.
      </Vazio>
    )
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse">
        <caption className="px-5 pt-4 pb-3 text-left text-[15px] font-[650] text-forte">
          Fornecedores da construtora
        </caption>
        <thead>
          <tr>
            <th scope="col" className={CABECALHO}>Fornecedor</th>
            <th scope="col" className={CABECALHO}>CNPJ</th>
            <th scope="col" className={CABECALHO}>Pedidos submetidos</th>
          </tr>
        </thead>
        <tbody>
          {fornecedores.map((fornecedor) => (
            <tr key={fornecedor.id}>
              <td className={`${CELULA} font-semibold text-forte`}>{fornecedor.nome}</td>
              <td className={`${CELULA} tabular-nums text-neutro-700`}>{fornecedor.documento ?? '—'}</td>
              <td className={`${CELULA} tabular-nums text-neutro-700`}>{fornecedor.pedidos}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// --- formulários -------------------------------------------------------------------------------

type Campo = { chave: string; rotulo: string; obrigatorio: boolean; maxLength: number; placeholder: string }

const CAMPOS_DA_OBRA: readonly Campo[] = [
  { chave: 'nome', rotulo: 'Nome da obra', obrigatorio: true, maxLength: Schemas.MAX_NOME_DE_OBRA, placeholder: 'Edifício Corporativo Íris' },
  { chave: 'cidade', rotulo: 'Cidade', obrigatorio: true, maxLength: Schemas.MAX_CIDADE, placeholder: 'Lauro de Freitas/BA' },
]

const CAMPOS_DO_FORNECEDOR: readonly Campo[] = [
  { chave: 'nome', rotulo: 'Nome do fornecedor', obrigatorio: true, maxLength: Schemas.MAX_NOME_DE_FORNECEDOR, placeholder: 'Madeireira Recôncavo Ltda' },
  { chave: 'documento', rotulo: 'CNPJ', obrigatorio: false, maxLength: 18, placeholder: '12.345.678/0001-90' },
]

function FormularioDeObra(props: { aoCriar: (nome: string) => void; aoCancelar: () => void }) {
  return (
    <Formulario
      {...props}
      titulo="Nova obra"
      campos={CAMPOS_DA_OBRA}
      validar={Schemas.validarObra}
      url="/api/obras"
    />
  )
}

function FormularioDeFornecedor(props: { aoCriar: (nome: string) => void; aoCancelar: () => void }) {
  return (
    <Formulario
      {...props}
      titulo="Novo fornecedor"
      campos={CAMPOS_DO_FORNECEDOR}
      validar={Schemas.validarFornecedor}
      url="/api/fornecedores"
    />
  )
}

/**
 * O formulário das duas abas. Valida com o **mesmo** schema da rota antes de enviar, e ancora no
 * campo tanto o erro local quanto o `fields` que o servidor devolver.
 */
function Formulario({
  titulo,
  campos,
  validar,
  url,
  aoCriar,
  aoCancelar,
}: {
  titulo: string
  campos: readonly Campo[]
  validar: (dados: unknown) => { ok: true } | { ok: false; erro: { campos?: CamposComErro } }
  url: string
  aoCriar: (nome: string) => void
  aoCancelar: () => void
}) {
  const [valores, setValores] = useState<Record<string, string>>({})
  const [problemas, setProblemas] = useState<CamposComErro>({})
  const [falha, setFalha] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault()
    setFalha(null)
    const analise = validar(valores)
    if (!analise.ok) {
      setProblemas(analise.erro.campos ?? {})
      return
    }
    setProblemas({})
    setEnviando(true)
    try {
      const criado = await pedir<{ nome: string }>(url, { method: 'POST', ...corpoJson(valores) })
      aoCriar(criado.nome)
    } catch (erro) {
      if (erro instanceof FalhaDaApi) {
        setProblemas(erro.campos)
        setFalha(erro.message)
      } else {
        setFalha('Erro inesperado ao falar com o servidor.')
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={enviar} noValidate className={`${CARTAO} p-5`} aria-label={titulo}>
      <h2 className="mb-4 text-[15px] font-[650] tracking-[-0.02em] text-forte">{titulo}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {campos.map((c) => {
          const problema = problemas[c.chave]
          return (
            <div key={c.chave} className="flex min-w-0 flex-col gap-1.5">
              <label htmlFor={`empresa-${c.chave}`} className={ROTULO_DE_CAMPO}>
                {c.rotulo}{' '}
                {c.obrigatorio ? (
                  <span className="text-marca-700" aria-hidden="true">
                    *
                  </span>
                ) : (
                  <span className="font-normal text-neutro-600">(opcional)</span>
                )}
              </label>
              <input
                id={`empresa-${c.chave}`}
                value={valores[c.chave] ?? ''}
                onChange={(evento) => setValores({ ...valores, [c.chave]: evento.target.value })}
                maxLength={c.maxLength}
                placeholder={c.placeholder}
                aria-invalid={problema ? true : undefined}
                aria-describedby={problema ? `erro-empresa-${c.chave}` : undefined}
                className={campo(Boolean(problema))}
              />
              {problema && (
                <span id={`erro-empresa-${c.chave}`} className="flex items-center gap-1.5 text-[12px] text-erro-texto">
                  <IconeErro className="shrink-0" />
                  {problema}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {falha && Object.keys(problemas).length === 0 && (
        <p role="alert" className="mt-4 text-[13px] text-erro-texto">
          {falha}
        </p>
      )}

      <div className="mt-5 flex flex-wrap justify-end gap-2.5">
        <button type="button" onClick={aoCancelar} className={BOTAO}>
          Cancelar
        </button>
        <button type="submit" disabled={enviando} className={`${BOTAO_ESCURO} ${DESABILITADO_NEUTRO}`}>
          {enviando ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
    </form>
  )
}
