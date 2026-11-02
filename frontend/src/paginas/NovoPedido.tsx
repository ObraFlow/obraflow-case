import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import type { Fornecedor, Obra, Pedido, Regra } from "../tipos";
import { formatarReais, lerNumero } from "../formato";
import { Carregando, ErroComRetry, Vazio } from "../componentes/Estados";

const UNIDADES = ["un", "kg", "m", "m²", "h"];

type ItemForm = {
  chave: string;
  descricao: string;
  quantidade: string;
  unidade: string;
  preco: string;
};

type ErrosItem = { descricao?: string; quantidade?: string; preco?: string };

const itemVazio = (): ItemForm => ({
  chave: crypto.randomUUID(),
  descricao: "",
  quantidade: "",
  unidade: "un",
  preco: "",
});

function hoje() {
  const agora = new Date();
  return new Date(agora.getTime() - agora.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function validarItem(item: ItemForm): ErrosItem {
  const erros: ErrosItem = {};
  const quantidade = lerNumero(item.quantidade);
  const preco = lerNumero(item.preco);

  if (!item.descricao.trim()) erros.descricao = "Informe a descrição.";

  if (Number.isNaN(quantidade)) erros.quantidade = "Informe um número válido.";
  else if (quantidade <= 0) erros.quantidade = "Deve ser maior que zero.";

  if (Number.isNaN(preco)) erros.preco = "Informe um valor válido.";
  else if (preco < 0) erros.preco = "Não pode ser negativo.";

  return erros;
}

// mesma conta do back: quantidade x preço em centavos
function totalDoItem(item: ItemForm): number | null {
  const quantidade = lerNumero(item.quantidade);
  const preco = lerNumero(item.preco);
  if (Number.isNaN(quantidade) || Number.isNaN(preco) || quantidade <= 0 || preco < 0) return null;
  return Math.round(quantidade * Math.round(preco * 100));
}

// só uma prévia para orientar quem está preenchendo. Quem decide de verdade é o back
function faixaPrevista(regras: Regra[], total: number) {
  return regras
    .filter((r) => r.valorMaximoCentavos === null || total <= r.valorMaximoCentavos)
    .sort((a, b) => (a.valorMaximoCentavos ?? Infinity) - (b.valorMaximoCentavos ?? Infinity))[0];
}

type Props = { aoVerPedidos: () => void };

export default function NovoPedido({ aoVerPedidos }: Props) {
  const [obras, setObras] = useState<Obra[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState<string | null>(null);

  const [idObra, setIdObra] = useState("");
  const [idFornecedor, setIdFornecedor] = useState("");
  const [dataPedido, setDataPedido] = useState(hoje());
  const [observacoes, setObservacoes] = useState("");
  const [itens, setItens] = useState<ItemForm[]>([itemVazio()]);
  const [regras, setRegras] = useState<Regra[]>([]);
  const [regrasProntas, setRegrasProntas] = useState(false);

  const [tocados, setTocados] = useState<Set<string>>(new Set());
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [criado, setCriado] = useState<Pedido | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErroCarga(null);
    try {
      const [listaObras, listaFornecedores] = await Promise.all([
        api<Obra[]>("/obras"),
        api<Fornecedor[]>("/fornecedores"),
      ]);
      setObras(listaObras);
      setFornecedores(listaFornecedores);
    } catch (e) {
      setErroCarga(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

    // busca as faixas da obra escolhida para mostrar quem vai aprovar
  useEffect(() => {
    setRegrasProntas(false);
    if (!idObra) {
      setRegras([]);
      return;
    }
    api<Regra[]>(`/obras/${idObra}/regras`)
      .then((lista) => {
        setRegras(lista);
        setRegrasProntas(true);
      })
      // se der erro aqui, só não mostro a prévia. O back confere a regra de novo ao cadastrar
      .catch(() => setRegras([]));
  }, [idObra]);

  // os erros só aparecem depois que a pessoa passa pelo campo, para não assustar logo de cara
  const marcarTocado = (campo: string) => setTocados((atual) => new Set(atual).add(campo));
  const erroVisivel = (campo: string, mensagem?: string) => (tocados.has(campo) ? mensagem : undefined);

  const errosGerais = {
    obra: idObra ? undefined : "Selecione a obra.",
    fornecedor: idFornecedor ? undefined : "Selecione o fornecedor.",
    data: dataPedido ? undefined : "Informe a data do pedido.",
  };
  const errosItens = itens.map(validarItem);
  const semItens = itens.length === 0;
  const totalPedido = itens.reduce((soma, item) => soma + (totalDoItem(item) ?? 0), 0);
  const faixa = idObra && !semItens && regrasProntas ? faixaPrevista(regras, totalPedido) : undefined;

  const formularioValido =
    !errosGerais.obra &&
    !errosGerais.fornecedor &&
    !errosGerais.data &&
    !semItens &&
    errosItens.every((erros) => Object.keys(erros).length === 0);

  function mostrarPendencias() {
    const todos = ["obra", "fornecedor", "data"];
    itens.forEach((item) => todos.push(`${item.chave}-descricao`, `${item.chave}-quantidade`, `${item.chave}-preco`));
    setTocados(new Set(todos));
  }

  function atualizarItem(chave: string, campo: keyof Omit<ItemForm, "chave">, valor: string) {
    setItens((atual) => atual.map((item) => (item.chave === chave ? { ...item, [campo]: valor } : item)));
  }

  function removerItem(chave: string) {
    setItens((atual) => atual.filter((item) => item.chave !== chave));
  }

  async function cadastrar() {
    if (!formularioValido) return;

    setEnviando(true);
    setErroEnvio(null);
    try {
      const pedido = await api<Pedido>("/pedidos", {
        metodo: "POST",
        corpo: {
          idObra: Number(idObra),
          idFornecedor: Number(idFornecedor),
          dataPedido,
          observacoes,
          itens: itens.map((item) => ({
            descricao: item.descricao.trim(),
            quantidade: lerNumero(item.quantidade),
            unidade: item.unidade,
            precoUnitarioCentavos: Math.round(lerNumero(item.preco) * 100),
          })),
        },
      });

      setCriado(pedido);
      setIdObra("");
      setIdFornecedor("");
      setDataPedido(hoje());
      setObservacoes("");
      setItens([itemVazio()]);
      setTocados(new Set());
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setErroEnvio(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setEnviando(false);
    }
  }

  if (carregando) return <Carregando texto="Carregando obras e fornecedores..." />;
  if (erroCarga) return <ErroComRetry mensagem={erroCarga} aoTentarDeNovo={carregar} />;
  if (obras.length === 0) {
    return <Vazio titulo="Nenhuma obra cadastrada" descricao="Para criar um pedido de compra, cadastre uma obra primeiro." />;
  }
  if (fornecedores.length === 0) {
    return <Vazio titulo="Nenhum fornecedor cadastrado" descricao="Para criar um pedido de compra, cadastre um fornecedor primeiro." />;
  }

  const eObra = erroVisivel("obra", errosGerais.obra);
  const eFornecedor = erroVisivel("fornecedor", errosGerais.fornecedor);
  const eData = erroVisivel("data", errosGerais.data);

  return (
    <div>
      <h1>Novo pedido de compra</h1>
      <p className="subtitulo">Preencha os dados e os itens. Quem aprova é definido pelo valor total do pedido.</p>

      {criado && (
        <div className="aviso aviso-sucesso acoes">
          <span>
            Pedido #{criado.idPedido} cadastrado no valor de {formatarReais(criado.totalCentavos)} e enviado para aprovação.
          </span>
          <button className="botao-link" onClick={aoVerPedidos}>Ver nas aprovações</button>
        </div>
      )}

      <section className="cartao">
        <h2>Dados gerais</h2>
        <div className="grade">
          <div className="campo">
            <label htmlFor="obra">Obra <span className="obrigatorio">*</span></label>
            <select
              id="obra"
              value={idObra}
              className={eObra ? "invalido" : ""}
              onChange={(e) => setIdObra(e.target.value)}
              onBlur={() => marcarTocado("obra")}
            >
              <option value="">Selecione...</option>
              {obras.map((o) => (
                <option key={o.idObra} value={o.idObra}>{o.nome}</option>
              ))}
            </select>
            {eObra && <span className="erro-campo">{eObra}</span>}
          </div>

          <div className="campo">
            <label htmlFor="fornecedor">Fornecedor <span className="obrigatorio">*</span></label>
            <select
              id="fornecedor"
              value={idFornecedor}
              className={eFornecedor ? "invalido" : ""}
              onChange={(e) => setIdFornecedor(e.target.value)}
              onBlur={() => marcarTocado("fornecedor")}
            >
              <option value="">Selecione...</option>
              {fornecedores.map((f) => (
                <option key={f.idFornecedor} value={f.idFornecedor}>{f.nome}</option>
              ))}
            </select>
            {eFornecedor && <span className="erro-campo">{eFornecedor}</span>}
          </div>

          <div className="campo">
            <label htmlFor="data">Data do pedido <span className="obrigatorio">*</span></label>
            <input
              id="data"
              type="date"
              value={dataPedido}
              className={eData ? "invalido" : ""}
              onChange={(e) => setDataPedido(e.target.value)}
              onBlur={() => marcarTocado("data")}
            />
            {eData && <span className="erro-campo">{eData}</span>}
          </div>

          <div className="campo campo-largo">
            <label htmlFor="observacoes">Observações internas</label>
            <textarea
              id="observacoes"
              rows={2}
              value={observacoes}
              placeholder="Opcional. Ex.: urgente para a concretagem da laje"
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="cartao">
        <h2>Itens</h2>

        {itens.map((item, indice) => {
          const erros = errosItens[indice];
          const erroDoCampo = (campo: keyof ErrosItem) => erroVisivel(`${item.chave}-${campo}`, erros[campo]);
          const total = totalDoItem(item);

          return (
            <div className="item" key={item.chave}>
              <div className="item-topo">
                <strong>Item {indice + 1}</strong>
                <button type="button" className="botao-link perigo" onClick={() => removerItem(item.chave)}>
                  Remover
                </button>
              </div>

              <div className="item-campos">
                <div className="campo campo-descricao">
                  <label htmlFor={`descricao-${item.chave}`}>Descrição <span className="obrigatorio">*</span></label>
                  <input
                    id={`descricao-${item.chave}`}
                    value={item.descricao}
                    placeholder="Ex.: Cimento CP-II 50kg"
                    className={erroDoCampo("descricao") ? "invalido" : ""}
                    onChange={(e) => atualizarItem(item.chave, "descricao", e.target.value)}
                    onBlur={() => marcarTocado(`${item.chave}-descricao`)}
                  />
                  {erroDoCampo("descricao") && <span className="erro-campo">{erroDoCampo("descricao")}</span>}
                </div>

                <div className="campo">
                  <label htmlFor={`quantidade-${item.chave}`}>Quantidade <span className="obrigatorio">*</span></label>
                  <input
                    id={`quantidade-${item.chave}`}
                    inputMode="decimal"
                    value={item.quantidade}
                    placeholder="0"
                    className={erroDoCampo("quantidade") ? "invalido" : ""}
                    onChange={(e) => atualizarItem(item.chave, "quantidade", e.target.value)}
                    onBlur={() => marcarTocado(`${item.chave}-quantidade`)}
                  />
                  {erroDoCampo("quantidade") && <span className="erro-campo">{erroDoCampo("quantidade")}</span>}
                </div>

                <div className="campo">
                  <label htmlFor={`unidade-${item.chave}`}>Unidade <span className="obrigatorio">*</span></label>
                  <select
                    id={`unidade-${item.chave}`}
                    value={item.unidade}
                    onChange={(e) => atualizarItem(item.chave, "unidade", e.target.value)}
                  >
                    {UNIDADES.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>

                <div className="campo">
                  <label htmlFor={`preco-${item.chave}`}>Preço unitário (R$) <span className="obrigatorio">*</span></label>
                  <input
                    id={`preco-${item.chave}`}
                    inputMode="decimal"
                    value={item.preco}
                    placeholder="0,00"
                    className={erroDoCampo("preco") ? "invalido" : ""}
                    onChange={(e) => atualizarItem(item.chave, "preco", e.target.value)}
                    onBlur={() => marcarTocado(`${item.chave}-preco`)}
                  />
                  {erroDoCampo("preco") && <span className="erro-campo">{erroDoCampo("preco")}</span>}
                </div>

                <div className="campo">
                  <span className="rotulo">Total do item</span>
                  <div className="valor-calculado">{total === null ? "—" : formatarReais(total)}</div>
                </div>
              </div>
            </div>
          );
        })}

        {semItens && <div className="aviso aviso-erro">O pedido precisa ter pelo menos um item.</div>}

        <button type="button" className="botao botao-secundario" onClick={() => setItens((atual) => [...atual, itemVazio()])}>
          + Adicionar item
        </button>
      </section>

      <section className="cartao resumo">
        <div>
          <div className="texto-suave">Total do pedido</div>
          <div className="total-pedido">{formatarReais(totalPedido)}</div>
          {faixa && (
            <div className="texto-suave">
              Quem vai aprovar: {faixa.aprovadores.map((a) => a.usuario.nome).join(" → ")}
            </div>
          )}
            {idObra && !semItens && regrasProntas && !faixa && (
            <div className="erro-campo">
              Nenhuma regra de alçada desta obra cobre esse valor. Ajuste as regras antes de cadastrar.
            </div>
          )}
        </div>

        <div className="resumo-acoes">
          {erroEnvio && <div className="aviso aviso-erro">{erroEnvio}</div>}
          <button className="botao" disabled={!formularioValido || enviando} onClick={cadastrar}>
            {enviando ? "Cadastrando..." : "Cadastrar pedido"}
          </button>
          {!formularioValido && (
            <button type="button" className="botao-link" onClick={mostrarPendencias}>
              Ver o que falta preencher
            </button>
          )}
        </div>
      </section>
    </div>
  );
}