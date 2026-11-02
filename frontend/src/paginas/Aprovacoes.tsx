import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import type { Pedido, StatusPedido, Usuario } from "../tipos";
import { formatarData, formatarReais, ROTULO_STATUS } from "../formato";
import { Carregando, ErroComRetry, Vazio } from "../componentes/Estados";
import CadeiaAlcada from "../componentes/CadeiaAlcada";
import DetalhePedido from "../componentes/DetalhePedido";

type Filtro = "TODOS" | StatusPedido;

const FILTROS: { id: Filtro; titulo: string }[] = [
  { id: "PENDENTE", titulo: "Pendentes" },
  { id: "APROVADO", titulo: "Aprovados" },
  { id: "REJEITADO", titulo: "Rejeitados" },
  { id: "TODOS", titulo: "Todos" },
];

export default function Aprovacoes() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [idUsuario, setIdUsuario] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("PENDENTE");
  const [idAberto, setIdAberto] = useState<number | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [listaPedidos, listaUsuarios] = await Promise.all([
        api<Pedido[]>("/pedidos"),
        api<Usuario[]>("/usuarios"),
      ]);
      setPedidos(listaPedidos);
      setUsuarios(listaUsuarios);
      setIdUsuario((atual) => atual ?? listaUsuarios[0]?.idUsuario ?? null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  function voltarParaLista() {
    setIdAberto(null);
    carregar();
  }

  const contar = (f: Filtro) => (f === "TODOS" ? pedidos.length : pedidos.filter((p) => p.status === f).length);
  const visiveis = filtro === "TODOS" ? pedidos : pedidos.filter((p) => p.status === filtro);

  function renderizarConteudo() {
    if (idAberto !== null) {
      return <DetalhePedido key={idAberto} idPedido={idAberto} idUsuario={idUsuario} aoVoltar={voltarParaLista} />;
    }
    if (carregando) return <Carregando texto="Carregando pedidos..." />;
    if (erro) return <ErroComRetry mensagem={erro} aoTentarDeNovo={carregar} />;
    if (pedidos.length === 0) {
      return <Vazio titulo="Nenhum pedido cadastrado" descricao="Crie o primeiro pedido na aba Novo pedido." />;
    }

    return (
      <>
        <div className="filtros">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              className={f.id === filtro ? "filtro ativo" : "filtro"}
              onClick={() => setFiltro(f.id)}
            >
              {f.titulo} ({contar(f.id)})
            </button>
          ))}
        </div>

        {visiveis.length === 0 ? (
          <Vazio titulo="Nada por aqui" descricao="Nenhum pedido com essa situação." />
        ) : (
            <div className="cartao tabela-rolagem">
            <table className="tabela-cartoes">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Obra / Fornecedor</th>
                  <th className="numero">Itens</th>
                  <th className="numero">Total</th>
                  <th>Situação</th>
                  <th>Alçada</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map((p) => {
                  const etapaDaVez = p.etapas.find((e) => e.ordem === p.etapaAtual);
                  const minhaVez = p.status === "PENDENTE" && etapaDaVez?.idUsuario === idUsuario;

                  return (
                                       <tr key={p.idPedido}>
                      <td data-rotulo="Pedido">
                        <div>
                          <strong>#{p.idPedido}</strong>
                          <div className="texto-suave">{formatarData(p.dataPedido)}</div>
                        </div>
                      </td>
                      <td data-rotulo="Obra / Fornecedor">
                        <div>
                          {p.obra.nome}
                          <div className="texto-suave">{p.fornecedor.nome}</div>
                        </div>
                      </td>
                      <td data-rotulo="Itens" className="numero">{p._count?.itens ?? 0}</td>
                      <td data-rotulo="Total" className="numero">{formatarReais(p.totalCentavos)}</td>
                      <td data-rotulo="Situação">
                        <span className={`selo selo-${p.status}`}>{ROTULO_STATUS[p.status]}</span>
                      </td>
                      <td data-rotulo="Alçada">
                        <CadeiaAlcada etapas={p.etapas} etapaAtual={p.etapaAtual} />
                      </td>
                      <td data-rotulo="Ações">
                        <button
                          className={minhaVez ? "botao botao-pequeno" : "botao botao-secundario botao-pequeno"}
                          onClick={() => setIdAberto(p.idPedido)}
                        >
                          {minhaVez ? "Decidir" : "Ver detalhes"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </>
    );
  }

  return (
    <div>
      <div className="cabecalho-pagina">
        <div>
          <h1>Aprovações</h1>
          <p className="subtitulo">Acompanhe os pedidos de compra e decida os que estão na sua vez.</p>
        </div>
        {usuarios.length > 0 && (
          <div className="campo campo-usuario">
            <label htmlFor="usuario">Acessando como</label>
            <select id="usuario" value={idUsuario ?? ""} onChange={(e) => setIdUsuario(Number(e.target.value))}>
              {usuarios.map((u) => (
                <option key={u.idUsuario} value={u.idUsuario}>{u.nome}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {renderizarConteudo()}
    </div>
  );
}