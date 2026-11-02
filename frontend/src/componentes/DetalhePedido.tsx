import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import type { Pedido } from "../tipos";
import { formatarData, formatarDataHora, formatarReais, ROTULO_STATUS } from "../formato";
import { Carregando, ErroComRetry } from "./Estados";
import CadeiaAlcada from "./CadeiaAlcada";

type Props = {
  idPedido: number;
  idUsuario: number | null;
  aoVoltar: () => void;
};

export default function DetalhePedido({ idPedido, idUsuario, aoVoltar }: Props) {
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [rejeitando, setRejeitando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [erroMotivo, setErroMotivo] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erroDecisao, setErroDecisao] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setPedido(await api<Pedido>(`/pedidos/${idPedido}`));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setCarregando(false);
    }
  }, [idPedido]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function decidir(decisao: "aprovar" | "rejeitar") {
    if (idUsuario === null) return;

    // rejeitar exige motivo: valida aqui antes de mandar para o back
    if (decisao === "rejeitar" && !motivo.trim()) {
      setErroMotivo("Informe o motivo da rejeição.");
      return;
    }

    setEnviando(true);
    setErroDecisao(null);
    try {
      await api(`/pedidos/${idPedido}/${decisao}`, {
        metodo: "POST",
        corpo: { idUsuario, motivo: motivo.trim() },
      });
      setMensagem(
        decisao === "aprovar"
          ? "Pedido aprovado."
          : "Pedido rejeitado. O motivo ficou registrado no histórico."
      );
      setRejeitando(false);
      setMotivo("");
      await carregar();
    } catch (e) {
      setErroDecisao(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setEnviando(false);
    }
  }

  function renderizarPedido(p: Pedido) {
    const etapaDaVez = p.etapas.find((e) => e.ordem === p.etapaAtual);
    const minhaVez = p.status === "PENDENTE" && etapaDaVez?.idUsuario === idUsuario;
    const decisoes = p.etapas.filter((e) => e.decididoEm);

    let explicacao = "";
    if (p.status === "APROVADO") {
      explicacao = "Cadeia de aprovação concluída: todos os aprovadores aprovaram. Não há mais decisões pendentes.";
    } else if (p.status === "REJEITADO") {
      explicacao = "Pedido rejeitado. O fluxo foi interrompido e não aceita novas decisões.";
    } else if (!minhaVez) {
      explicacao = `Aguardando a decisão de ${etapaDaVez?.usuario.nome}. Só o aprovador da vez pode decidir.`;
    }

    return (
      <>
        <section className="cartao">
          <div className="titulo-detalhe">
            <h1>Pedido #{p.idPedido}</h1>
            <span className={`selo selo-${p.status}`}>{ROTULO_STATUS[p.status]}</span>
          </div>
          <dl className="info">
            <div><dt>Obra</dt><dd>{p.obra.nome}</dd></div>
            <div><dt>Fornecedor</dt><dd>{p.fornecedor.nome}</dd></div>
            <div><dt>Data do pedido</dt><dd>{formatarData(p.dataPedido)}</dd></div>
            <div><dt>Valor total</dt><dd>{formatarReais(p.totalCentavos)}</dd></div>
          </dl>
          {p.observacoes && <p className="texto-suave">Observações: {p.observacoes}</p>}
        </section>

        <section className="cartao">
          <h2>Alçada</h2>
          <CadeiaAlcada etapas={p.etapas} etapaAtual={p.etapaAtual} />

          <div className="painel-decisao">
            {mensagem && <div className="aviso aviso-sucesso">{mensagem}</div>}
            {erroDecisao && <div className="aviso aviso-erro">{erroDecisao}</div>}
            {explicacao && <div className="aviso aviso-info">{explicacao}</div>}

            {rejeitando ? (
              <div className="campo">
                <label htmlFor="motivo">Motivo da rejeição</label>
                <textarea
                  id="motivo"
                  rows={3}
                  value={motivo}
                  className={erroMotivo ? "invalido" : ""}
                  placeholder="Explique por que o pedido está sendo rejeitado"
                  onChange={(e) => {
                    setMotivo(e.target.value);
                    setErroMotivo(null);
                  }}
                />
                {erroMotivo && <span className="erro-campo">{erroMotivo}</span>}
                <div className="acoes">
                  <button className="botao botao-perigo" disabled={enviando} onClick={() => decidir("rejeitar")}>
                    {enviando ? "Enviando..." : "Confirmar rejeição"}
                  </button>
                  <button
                    className="botao botao-secundario"
                    disabled={enviando}
                    onClick={() => {
                      setRejeitando(false);
                      setErroMotivo(null);
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="acoes">
                <button className="botao" disabled={!minhaVez || enviando} onClick={() => decidir("aprovar")}>
                  {enviando ? "Enviando..." : "Aprovar"}
                </button>
                <button className="botao botao-secundario" disabled={!minhaVez || enviando} onClick={() => setRejeitando(true)}>
                  Rejeitar
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="cartao">
          <h2>Itens ({p.itens?.length ?? 0})</h2>
          <div className="tabela-rolagem">
            <table>
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th className="numero">Quantidade</th>
                  <th>Unidade</th>
                  <th className="numero">Preço unitário</th>
                  <th className="numero">Total</th>
                </tr>
              </thead>
              <tbody>
                {p.itens?.map((item) => (
                  <tr key={item.idItemPedido}>
                    <td>{item.descricao}</td>
                    <td className="numero">{item.quantidade.toLocaleString("pt-BR")}</td>
                    <td>{item.unidade}</td>
                    <td className="numero">{formatarReais(item.precoUnitarioCentavos)}</td>
                    <td className="numero">{formatarReais(item.totalCentavos)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4}><strong>Total do pedido</strong></td>
                  <td className="numero"><strong>{formatarReais(p.totalCentavos)}</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        <section className="cartao">
          <h2>Histórico</h2>
          <ul className="historico">
            <li>Pedido criado em {formatarData(p.dataPedido)}</li>
            {decisoes.map((etapa) => (
              <li key={etapa.idEtapaAprovacao}>
                <strong>{etapa.usuario.nome}</strong> {etapa.status === "APROVADO" ? "aprovou" : "rejeitou"} em{" "}
                {formatarDataHora(etapa.decididoEm!)}
                {etapa.motivo && <p className="motivo">Motivo: {etapa.motivo}</p>}
              </li>
            ))}
            {decisoes.length === 0 && <li className="texto-suave">Nenhuma decisão registrada ainda.</li>}
          </ul>
        </section>
      </>
    );
  }

  return (
    <div>
      <button className="botao botao-secundario botao-pequeno voltar" onClick={aoVoltar}>
        ← Voltar para a lista
      </button>

      {carregando && <Carregando texto="Carregando pedido..." />}
      {!carregando && (erro || !pedido) && (
        <ErroComRetry mensagem={erro ?? "Pedido não encontrado."} aoTentarDeNovo={carregar} />
      )}
      {!carregando && !erro && pedido && renderizarPedido(pedido)}
    </div>
  );
}