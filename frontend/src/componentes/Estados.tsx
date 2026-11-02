export function Carregando({ texto = "Carregando..." }: { texto?: string }) {
  return (
    <div className="estado" role="status">
      <div className="spinner" aria-hidden="true" />
      <p>{texto}</p>
    </div>
  );
}

export function ErroComRetry({ mensagem, aoTentarDeNovo }: { mensagem: string; aoTentarDeNovo: () => void }) {
  return (
    <div className="estado">
      <h2>Não foi possível carregar os dados</h2>
      <p>{mensagem}</p>
      <button className="botao" onClick={aoTentarDeNovo}>Tentar novamente</button>
    </div>
  );
}

export function Vazio({ titulo, descricao }: { titulo: string; descricao: string }) {
  return (
    <div className="estado">
      <h2>{titulo}</h2>
      <p>{descricao}</p>
    </div>
  );
}