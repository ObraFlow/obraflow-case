import { useState } from "react";
import NovoPedido from "./paginas/NovoPedido";
import Aprovacoes from "./paginas/Aprovacoes";
import Regras from "./paginas/Regras";

type Pagina = "novo" | "aprovacoes" | "regras";

const ABAS: { id: Pagina; titulo: string }[] = [
  { id: "novo", titulo: "Novo pedido" },
  { id: "aprovacoes", titulo: "Aprovações" },
  { id: "regras", titulo: "Regras de alçada" },
];

export default function App() {
  const [pagina, setPagina] = useState<Pagina>("aprovacoes");

  return (
    <>
      <header className="topo">
        <div className="topo-interno">
          <span className="marca">ObraFlow</span>
          <nav className="abas">
            {ABAS.map((aba) => (
              <button
                key={aba.id}
                className={aba.id === pagina ? "aba ativa" : "aba"}
                onClick={() => setPagina(aba.id)}
              >
                {aba.titulo}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="conteudo">
        {pagina === "novo" && <NovoPedido aoVerPedidos={() => setPagina("aprovacoes")} />}
        {pagina === "aprovacoes" && <Aprovacoes />}
        {pagina === "regras" && <Regras />}
      </main>
    </>
  );
}