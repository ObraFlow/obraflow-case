import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import type { Obra, Regra, Usuario } from "../tipos";
import { formatarReais, lerNumero } from "../formato";
import { Carregando, ErroComRetry, Vazio } from "../componentes/Estados";

type FaixaEntrada = { valorMaximoCentavos: number | null; aprovadores: number[] };

type Edicao = {
  indice: number | null; // null quando é uma faixa nova
  semTeto: boolean;
  teto: string;
  aprovadores: number[];
};

// converte o que veio do back para o formato que o back espera na hora de salvar
const paraEntrada = (regra: Regra): FaixaEntrada => ({
  valorMaximoCentavos: regra.valorMaximoCentavos,
  aprovadores: regra.aprovadores.map((a) => a.idUsuario),
});

function descreverFaixa(regra: Regra, regras: Regra[]) {
  if (regra.valorMaximoCentavos !== null) return `Até ${formatarReais(regra.valorMaximoCentavos)}`;

  const tetos = regras.map((r) => r.valorMaximoCentavos).filter((v): v is number => v !== null);
  return tetos.length > 0 ? `Acima de ${formatarReais(Math.max(...tetos))}` : "Qualquer valor";
}

export default function Regras() {
  const [obras, setObras] = useState<Obra[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [idObra, setIdObra] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [regras, setRegras] = useState<Regra[]>([]);
  const [carregandoRegras, setCarregandoRegras] = useState(false);
  const [erroRegras, setErroRegras] = useState<string | null>(null);

  const [edicao, setEdicao] = useState<Edicao | null>(null);
  const [aprovadorParaAdicionar, setAprovadorParaAdicionar] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [listaObras, listaUsuarios] = await Promise.all([
        api<Obra[]>("/obras"),
        api<Usuario[]>("/usuarios"),
      ]);
      setObras(listaObras);
      setUsuarios(listaUsuarios);
      setIdObra((atual) => atual ?? listaObras[0]?.idObra ?? null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const carregarRegras = useCallback(async () => {
    if (idObra === null) return;
    setCarregandoRegras(true);
    setErroRegras(null);
    try {
      setRegras(await api<Regra[]>(`/obras/${idObra}/regras`));
    } catch (e) {
      setErroRegras(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setCarregandoRegras(false);
    }
  }, [idObra]);

  useEffect(() => {
    carregarRegras();
  }, [carregarRegras]);

  const nomeDe = (id: number) => usuarios.find((u) => u.idUsuario === id)?.nome ?? `Usuário ${id}`;

  function trocarObra(id: number) {
    setIdObra(id);
    setEdicao(null);
    setMensagem(null);
    setErroSalvar(null);
  }

  function abrirNova() {
    setEdicao({ indice: null, semTeto: false, teto: "", aprovadores: [] });
    setMensagem(null);
    setErroSalvar(null);
  }

  function abrirEdicao(indice: number) {
    const regra = regras[indice];
    setEdicao({
      indice,
      semTeto: regra.valorMaximoCentavos === null,
      teto: regra.valorMaximoCentavos === null ? "" : String(regra.valorMaximoCentavos / 100).replace(".", ","),
      aprovadores: regra.aprovadores.map((a) => a.idUsuario),
    });
    setMensagem(null);
    setErroSalvar(null);
  }

  function moverAprovador(posicao: number, direcao: -1 | 1) {
    setEdicao((atual) => {
      if (!atual) return atual;
      const destino = posicao + direcao;
      if (destino < 0 || destino >= atual.aprovadores.length) return atual;
      const lista = [...atual.aprovadores];
      [lista[posicao], lista[destino]] = [lista[destino], lista[posicao]];
      return { ...atual, aprovadores: lista };
    });
  }

  function removerAprovador(posicao: number) {
    setEdicao((atual) => atual && { ...atual, aprovadores: atual.aprovadores.filter((_, i) => i !== posicao) });
  }

  function adicionarAprovador() {
    const id = Number(aprovadorParaAdicionar);
    if (!id) return;
    setEdicao((atual) => atual && { ...atual, aprovadores: [...atual.aprovadores, id] });
    setAprovadorParaAdicionar("");
  }

  // o back recebe todas as faixas da obra de uma vez e troca as antigas pelas novas
  async function salvar(faixas: FaixaEntrada[], textoSucesso: string) {
    if (idObra === null) return false;
    setSalvando(true);
    setErroSalvar(null);
    try {
      setRegras(await api<Regra[]>(`/obras/${idObra}/regras`, { metodo: "PUT", corpo: { faixas } }));
      setMensagem(textoSucesso);
      return true;
    } catch (e) {
      setErroSalvar(e instanceof Error ? e.message : "Erro inesperado.");
      return false;
    } finally {
      setSalvando(false);
    }
  }

  async function salvarEdicao() {
    if (!edicao) return;

    // confere aqui para dar retorno rápido. O back confere de novo antes de gravar
    let valorMaximoCentavos: number | null = null;
    if (!edicao.semTeto) {
      const teto = lerNumero(edicao.teto);
      if (Number.isNaN(teto) || teto <= 0) {
        setErroSalvar("Informe um valor máximo maior que zero, ou marque a opção sem teto.");
        return;
      }
      valorMaximoCentavos = Math.round(teto * 100);
    }
    if (edicao.aprovadores.length === 0) {
      setErroSalvar("Adicione pelo menos um aprovador.");
      return;
    }

    const faixas = regras.map(paraEntrada);
    const faixa = { valorMaximoCentavos, aprovadores: edicao.aprovadores };
    if (edicao.indice === null) faixas.push(faixa);
    else faixas[edicao.indice] = faixa;

    if (await salvar(faixas, "Faixa salva. Os próximos pedidos já seguem essa regra.")) {
      setEdicao(null);
    }
  }

  async function remover(indice: number) {
    if (!window.confirm("Remover esta faixa? Pedidos já criados não são afetados.")) return;
    await salvar(
      regras.filter((_, i) => i !== indice).map(paraEntrada),
      "Faixa removida."
    );
  }

  if (carregando) return <Carregando texto="Carregando obras e usuários..." />;
  if (erro) return <ErroComRetry mensagem={erro} aoTentarDeNovo={carregar} />;
  if (obras.length === 0) {
    return <Vazio titulo="Nenhuma obra cadastrada" descricao="Cadastre uma obra para configurar as regras de alçada." />;
  }

  const temSemTeto = regras.some((r) => r.valorMaximoCentavos === null);
  const maiorTeto = Math.max(0, ...regras.map((r) => r.valorMaximoCentavos ?? 0));

  function renderizarEdicao(atual: Edicao) {
    const disponiveis = usuarios.filter((u) => !atual.aprovadores.includes(u.idUsuario));

    return (
      <section className="cartao">
        <h2>{atual.indice === null ? "Nova faixa" : "Editar faixa"}</h2>

        <div className="grade">
          <div className="campo">
            <label htmlFor="teto">Valor máximo da faixa (R$)</label>
            <input
              id="teto"
              inputMode="decimal"
              placeholder="Ex.: 10.000,00"
              value={atual.teto}
              disabled={atual.semTeto}
              onChange={(e) => setEdicao({ ...atual, teto: e.target.value })}
            />
            <label className="opcao">
              <input
                type="checkbox"
                checked={atual.semTeto}
                onChange={(e) => setEdicao({ ...atual, semTeto: e.target.checked })}
              />
              Sem teto (cobre qualquer valor acima das outras faixas)
            </label>
          </div>
        </div>

        <h3>Aprovadores, na ordem do fluxo</h3>
        {atual.aprovadores.length === 0 ? (
          <p className="texto-suave">Nenhum aprovador ainda. Adicione abaixo.</p>
        ) : (
          <ol className="lista-aprovadores">
            {atual.aprovadores.map((id, posicao) => (
              <li key={id}>
                <span><strong>{posicao + 1}.</strong> {nomeDe(id)}</span>
                <span className="acoes">
                  <button
                    className="botao botao-secundario botao-pequeno"
                    disabled={posicao === 0}
                    aria-label={`Subir ${nomeDe(id)}`}
                    onClick={() => moverAprovador(posicao, -1)}
                  >
                    ↑
                  </button>
                  <button
                    className="botao botao-secundario botao-pequeno"
                    disabled={posicao === atual.aprovadores.length - 1}
                    aria-label={`Descer ${nomeDe(id)}`}
                    onClick={() => moverAprovador(posicao, 1)}
                  >
                    ↓
                  </button>
                  <button className="botao-link perigo" onClick={() => removerAprovador(posicao)}>
                    Remover
                  </button>
                </span>
              </li>
            ))}
          </ol>
        )}

        <div className="adicionar-aprovador">
          <select
            aria-label="Usuário para adicionar"
            value={aprovadorParaAdicionar}
            onChange={(e) => setAprovadorParaAdicionar(e.target.value)}
          >
            <option value="">Escolha um usuário...</option>
            {disponiveis.map((u) => (
              <option key={u.idUsuario} value={u.idUsuario}>{u.nome}</option>
            ))}
          </select>
          <button className="botao botao-secundario" disabled={!aprovadorParaAdicionar} onClick={adicionarAprovador}>
            Adicionar
          </button>
        </div>

        {erroSalvar && <div className="aviso aviso-erro">{erroSalvar}</div>}

        <div className="acoes">
          <button className="botao" disabled={salvando} onClick={salvarEdicao}>
            {salvando ? "Salvando..." : "Salvar faixa"}
          </button>
          <button className="botao botao-secundario" disabled={salvando} onClick={() => setEdicao(null)}>
            Cancelar
          </button>
        </div>
      </section>
    );
  }

  function renderizarRegras() {
    if (carregandoRegras) return <Carregando texto="Carregando faixas..." />;
    if (erroRegras) return <ErroComRetry mensagem={erroRegras} aoTentarDeNovo={carregarRegras} />;
    if (regras.length === 0) {
      return (
        <div className="cartao">
          <Vazio
            titulo="Nenhuma faixa configurada"
            descricao="Sem faixas, não é possível criar pedidos nesta obra. Crie a primeira faixa."
          />
        </div>
      );
    }

    return (
      <div className="cartao tabela-rolagem">
        <table>
          <thead>
            <tr>
              <th>Faixa de valor</th>
              <th>Aprovadores, na ordem do fluxo</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {regras.map((regra, indice) => (
              <tr key={regra.idRegra}>
                <td><strong>{descreverFaixa(regra, regras)}</strong></td>
                <td>{regra.aprovadores.map((a) => a.usuario.nome).join(" → ")}</td>
                <td>
                  <div className="acoes">
                    <button
                      className="botao botao-secundario botao-pequeno"
                      disabled={salvando}
                      onClick={() => abrirEdicao(indice)}
                    >
                      Editar
                    </button>
                    <button className="botao-link perigo" disabled={salvando} onClick={() => remover(indice)}>
                      Remover
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div>
      <div className="cabecalho-pagina">
        <div>
          <h1>Regras de alçada</h1>
          <p className="subtitulo">Defina, para cada obra, quem aprova os pedidos em cada faixa de valor.</p>
        </div>
        <div className="campo campo-usuario">
          <label htmlFor="obra-regras">Obra</label>
          <select id="obra-regras" value={idObra ?? ""} onChange={(e) => trocarObra(Number(e.target.value))}>
            {obras.map((o) => (
              <option key={o.idObra} value={o.idObra}>{o.nome}</option>
            ))}
          </select>
        </div>
      </div>

        <div className="aviso aviso-info">
        Mudanças nas regras valem <strong>só para pedidos novos</strong>. Pedidos em andamento seguem a fila definida quando foram criados.
        </div>

      {mensagem && <div className="aviso aviso-sucesso">{mensagem}</div>}
      {!edicao && erroSalvar && <div className="aviso aviso-erro">{erroSalvar}</div>}

      {!carregandoRegras && regras.length > 0 && !temSemTeto && (
        <div className="aviso aviso-erro">
          Esta obra não tem faixa sem teto: pedidos acima de {formatarReais(maiorTeto)} não poderão ser criados.
        </div>
      )}

      {edicao && renderizarEdicao(edicao)}

      {renderizarRegras()}

      {!edicao && (
        <button className="botao" onClick={abrirNova}>
          + Nova faixa
        </button>
      )}
    </div>
  );
}