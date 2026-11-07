'use client'

import { useState } from 'react'

import { Alcada, Dinheiro, Schemas, type CamposComErro, type Centavos } from '@/src/domain'
import type { CorpoDeFaixa } from '@/src/ui/alcadas'
import type { FaixaPublica } from '@/src/ui/tipos'
import type { UsuarioPublico } from '@/src/ui/tipos'
import { Avatar } from './Avatar'
import {
  BOTAO,
  BOTAO_ESCURO,
  BOTAO_PEQUENO,
  CAMPO_DE_LEITURA,
  DESABILITADO_NEUTRO,
  campo,
  CARTAO,
  NOTA,
  ROTULO_DE_CAMPO as ROTULO,
} from './estilos'
import { ROTULO_DO_PAPEL } from './rotulos'
import { IconeAlca, IconeErro, IconeSetaBaixo, IconeSetaCima, IconeTirar } from './icones'

type Props = {
  obraNome: string
  /** `null` é a faixa nova. O painel é o mesmo: o artboard desenha um só. */
  faixa: FaixaPublica | null
  /** As faixas já salvas da obra — é delas que sai o valor mínimo, que não é campo gravado. */
  faixas: readonly FaixaPublica[]
  usuarios: readonly UsuarioPublico[]
  salvando: boolean
  /** A recusa do servidor, já desembrulhada do envelope. */
  erro: string | null
  campos: CamposComErro
  aoCancelar: () => void
  aoSalvar: (corpo: CorpoDeFaixa) => void
}

/** A alçada da obra no formato do domínio, para derivar o piso sem passar pelo servidor. */
function comoAlcada(obraId: string, faixas: readonly FaixaPublica[]): Alcada.Alcada {
  return {
    obraId,
    faixas: faixas.map((f) => ({
      id: f.id,
      limiteCentavos: f.limiteCentavos as Centavos | null,
      aprovadores: [],
    })),
  }
}

/**
 * O painel lateral do artboard `Alcadas`: limite, aprovadores na ordem e quem ainda pode entrar.
 *
 * A reordenação é **estado local até salvar**. Cada seta não é uma escrita: se fosse, a faixa
 * passaria por um instante com dois aprovadores na mesma posição, e o índice único (faixaId,
 * ordem) recusaria a segunda delas no meio do arrasto. Quem grava é o `PUT`, que substitui a
 * faixa inteira de uma vez.
 *
 * O campo **Valor mínimo** é de leitura: não existe coluna de mínimo (ADR 0002), e o que ele
 * mostra é o limite da faixa anterior mais um centavo, derivado pelo domínio a cada tecla. É a
 * divergência declarada do artboard, que o desenha como campo editável.
 */
export function EditorDeFaixa({
  obraNome,
  faixa,
  faixas,
  usuarios,
  salvando,
  erro,
  campos,
  aoCancelar,
  aoSalvar,
}: Props) {
  const [limiteTexto, setLimiteTexto] = useState(
    faixa?.limiteCentavos != null ? textoDeCentavos(faixa.limiteCentavos) : '',
  )
  const [aprovadores, setAprovadores] = useState<string[]>(
    faixa ? faixa.aprovadores.map((a) => a.usuarioId) : [],
  )
  const [camposLocais, setCamposLocais] = useState<CamposComErro>({})
  // Os campos já mexidos desde a última recusa. Corrigir o campo apaga o erro dele na hora, sem
  // novo envio — um erro que fica aceso sobre um valor já trocado está falando do passado.
  const [corrigidos, setCorrigidos] = useState<ReadonlySet<string>>(new Set())

  const problemas: CamposComErro = semCorrigidos({ ...campos, ...camposLocais }, corrigidos)

  function corrigir(chave: string) {
    setCorrigidos((anterior) => new Set(anterior).add(chave))
  }

  const limite = limiteTexto.trim() === '' ? null : Dinheiro.deEntrada(limiteTexto)
  const piso = Alcada.pisoImplicito(
    comoAlcada('', faixas),
    limite,
    faixa?.id,
  )

  const porId = new Map(usuarios.map((u) => [u.id, u]))
  const escolhidos = aprovadores
    .map((id) => porId.get(id))
    .filter((u): u is UsuarioPublico => u !== undefined)
  const disponiveis = usuarios.filter((u) => !aprovadores.includes(u.id))

  const titulo = faixa
    ? Alcada.faixaDescrita(comoAlcada('', faixas), {
        id: faixa.id,
        limiteCentavos: faixa.limiteCentavos as Centavos | null,
        aprovadores: [],
      }).titulo
    : 'Faixa ainda não salva'

  function mover(indice: number, passo: 1 | -1) {
    const destino = indice + passo
    if (destino < 0 || destino >= aprovadores.length) return
    const proximo = [...aprovadores]
    ;[proximo[indice], proximo[destino]] = [proximo[destino], proximo[indice]]
    trocarAprovadores(proximo)
  }

  function trocarAprovadores(proximo: string[]) {
    setAprovadores(proximo)
    corrigir('aprovadores')
  }

  function enviar(evento: React.FormEvent) {
    evento.preventDefault()
    // A recusa que vem a seguir é sobre o valor de agora: nenhum campo continua dispensado.
    setCorrigidos(new Set())

    // O mesmo schema que a rota roda. Validar aqui não dispensa o servidor de validar — dispensa
    // a pessoa de descobrir no envio o que já dava para saber antes dele.
    const analise = Schemas.validarFaixa({ limiteCentavos: limiteTexto, aprovadores })
    if (!analise.ok) {
      setCamposLocais(analise.erro.campos ?? {})
      return
    }

    setCamposLocais({})
    aoSalvar({ limiteCentavos: limiteTexto.trim() === '' ? null : limiteTexto, aprovadores })
  }

  return (
    <>
      <form
        onSubmit={enviar}
        className={CARTAO}
        aria-label={faixa ? 'Editar faixa' : 'Nova faixa'}
      >
        <div className="border-b border-neutro-100 px-5 py-[18px]">
          <h2 className="text-[15px] font-[650] tracking-[-0.02em] text-forte">
            {faixa ? 'Editar faixa' : 'Nova faixa'}
          </h2>
          <p className="mt-1 text-[12px] text-neutro-600">
            {faixa ? `${titulo} · ${obraNome}` : obraNome}
          </p>
        </div>

        <div className="flex flex-col gap-[18px] p-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex min-w-0 flex-col gap-1.5">
              <label htmlFor="piso" className={ROTULO}>
                Valor mínimo
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[14px] text-neutro-600">R$</span>
                <input
                  id="piso"
                  readOnly
                  aria-describedby="ajuda-piso"
                  value={textoDeCentavos(piso)}
                  className={CAMPO_DE_LEITURA}
                />
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-1.5">
              <label htmlFor="limite" className={ROTULO}>
                Valor máximo
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[14px] text-neutro-600">R$</span>
                <input
                  id="limite"
                  inputMode="decimal"
                  placeholder="Sem teto"
                  value={limiteTexto}
                  onChange={(e) => {
                    setLimiteTexto(e.target.value)
                    corrigir('limiteCentavos')
                  }}
                  aria-invalid={problemas.limiteCentavos ? true : undefined}
                  aria-describedby={problemas.limiteCentavos ? 'erro-limite' : undefined}
                  className={campo(Boolean(problemas.limiteCentavos))}
                />
              </div>
              {problemas.limiteCentavos && (
                <Mensagem id="erro-limite">{problemas.limiteCentavos}</Mensagem>
              )}
            </div>
          </div>

          <p id="ajuda-piso" className="-mt-2 text-[12px] text-neutro-600">
            O valor mínimo vem da faixa anterior e não é editável. Deixe o máximo em branco para a
            última faixa.
          </p>

          <div>
            <p className="mb-2 text-[13px] font-semibold text-neutro-700">Aprovadores, na ordem</p>

            {escolhidos.length === 0 ? (
              <p className="rounded-[10px] border border-dashed border-neutro-300 px-3 py-4 text-center text-[12.5px] text-neutro-600">
                Nenhum aprovador ainda. Escolha ao menos um abaixo.
              </p>
            ) : (
              <ol className="flex flex-col gap-2">
                {escolhidos.map((usuario, indice) => (
                  <li
                    key={usuario.id}
                    className="flex items-center gap-2.5 rounded-[10px] border border-neutro-200 bg-cartao px-3 py-2.5"
                  >
                    <IconeAlca className="shrink-0 text-neutro-300" />
                    <span
                      aria-hidden="true"
                      className="flex size-6 shrink-0 items-center justify-center rounded-full bg-marca-15 text-[12px] font-[650] text-marca-800"
                    >
                      {indice + 1}
                    </span>
                    <span className="min-w-0 flex-auto text-[14px] font-semibold text-forte">
                      {usuario.nome}
                      <span className="block text-[12px] font-normal text-neutro-600">
                        {ROTULO_DO_PAPEL[usuario.papel]}
                      </span>
                    </span>
                    <BotaoDeLinha
                      rotulo={`Mover ${usuario.nome} para cima`}
                      desabilitado={indice === 0}
                      aoClicar={() => mover(indice, -1)}
                    >
                      <IconeSetaCima />
                    </BotaoDeLinha>
                    <BotaoDeLinha
                      rotulo={`Mover ${usuario.nome} para baixo`}
                      desabilitado={indice === escolhidos.length - 1}
                      aoClicar={() => mover(indice, 1)}
                    >
                      <IconeSetaBaixo />
                    </BotaoDeLinha>
                    <BotaoDeLinha
                      rotulo={`Remover ${usuario.nome} da faixa`}
                      perigo
                      aoClicar={() =>
                        trocarAprovadores(aprovadores.filter((id) => id !== usuario.id))
                      }
                    >
                      <IconeTirar />
                    </BotaoDeLinha>
                  </li>
                ))}
              </ol>
            )}

            {problemas.aprovadores && <Mensagem className="mt-2">{problemas.aprovadores}</Mensagem>}
          </div>

          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-neutro-700">Usuários disponíveis</p>
            {disponiveis.length === 0 ? (
              <p className="py-2 text-[12.5px] text-neutro-600">
                Todos os usuários já estão nesta faixa.
              </p>
            ) : (
              <ul>
                {disponiveis.map((usuario) => (
                  <li
                    key={usuario.id}
                    className="flex items-center gap-2.5 border-b border-neutro-100 px-0.5 py-[9px] last:border-b-0"
                  >
                    <Avatar id={usuario.id} nome={usuario.nome} tamanho={28} />
                    <span className="min-w-0 flex-auto text-[13px] text-neutro-700">
                      {usuario.nome}
                      <span className="block text-[12px] text-neutro-600">
                        {ROTULO_DO_PAPEL[usuario.papel]}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => trocarAprovadores([...aprovadores, usuario.id])}
                      disabled={aprovadores.length >= Alcada.MAX_APROVADORES_POR_FAIXA}
                      className={`${BOTAO_PEQUENO} ${DESABILITADO_NEUTRO}`}
                    >
                      Adicionar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {erro && (
            <div role="alert" className={`${NOTA} border-erro-borda-forte bg-erro-papel`}>
              <p className="flex items-start gap-2 text-erro-texto">
                <IconeErro className="mt-0.5 shrink-0" />
                {erro}
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={aoCancelar}
              className={`${BOTAO} flex-[1_1_120px]`}
              disabled={salvando}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className={`${BOTAO_ESCURO} flex-[1_1_140px] disabled:opacity-60`}
            >
              {salvando ? 'Salvando…' : 'Salvar faixa'}
            </button>
          </div>
        </div>

      </form>

      {/* Irmão do cartão, entre ele e o aviso de regra — é onde o artboard o desenha. Fica fora
          do <form> porque não é campo nem controle: é a leitura do que a faixa fará. */}
      <div className="rounded-[10px] border border-neutro-200 bg-neutro-50 px-4 py-3.5 text-[13px] leading-[1.5] text-neutro-700">
        <strong>Pré-visualização:</strong>{' '}
        {escolhidos.length === 0 ? (
          <>
            um pedido de <strong>{Dinheiro.formatar(limite ?? piso)}</strong> nesta obra não teria
            quem assinasse. Escolha ao menos um aprovador.
          </>
        ) : (
          <>
            um pedido de <strong>{Dinheiro.formatar(limite ?? piso)}</strong> nesta obra exigirá{' '}
            <strong>{escolhidos.map((u) => u.nome).join(' → ')}</strong>, nessa ordem.
          </>
        )}
      </div>
    </>
  )
}

function BotaoDeLinha({
  rotulo,
  perigo,
  desabilitado,
  aoClicar,
  children,
}: {
  rotulo: string
  perigo?: boolean
  desabilitado?: boolean
  aoClicar: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      title={rotulo}
      disabled={desabilitado}
      onClick={aoClicar}
      className={`inline-flex size-8 max-md:size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-neutro-200 bg-cartao text-neutro-600 hover:bg-neutro-50 hover:text-neutro-700 disabled:cursor-not-allowed disabled:text-neutro-300 disabled:hover:bg-cartao ${
        perigo ? 'hover:border-erro-borda hover:bg-erro-fundo hover:text-erro-texto' : ''
      }`}
    >
      {children}
    </button>
  )
}

function Mensagem({
  id,
  className = '',
  children,
}: {
  id?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <span
      id={id}
      className={`flex items-center gap-1.5 text-[12px] text-erro-texto ${className}`}
    >
      <IconeErro className="shrink-0" />
      {children}
    </span>
  )
}

function semCorrigidos(campos: CamposComErro, corrigidos: ReadonlySet<string>): CamposComErro {
  if (corrigidos.size === 0) return campos
  return Object.fromEntries(Object.entries(campos).filter(([chave]) => !corrigidos.has(chave)))
}

/** Centavos no formato que o campo aceita de volta: "10000,01", sem o símbolo da moeda. */
function textoDeCentavos(centavos: number): string {
  return Dinheiro.formatar(centavos as Centavos).replace(/^R\$\s*/, '')
}
