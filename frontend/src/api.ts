const URL_API = "http://localhost:1036";

export class ErroApi extends Error {}

// faz a chamada para o back e já trata os dois tipos de erro:
// API fora do ar e erro de regra de negócio (que vem com mensagem)
export async function api<T>(caminho: string, opcoes?: { metodo?: string; corpo?: unknown }): Promise<T> {
  let resposta: Response;

  try {
    resposta = await fetch(URL_API + caminho, {
      method: opcoes?.metodo ?? "GET",
      headers: { "Content-Type": "application/json" },
      body: opcoes?.corpo !== undefined ? JSON.stringify(opcoes.corpo) : undefined,
    });
  } catch {
    throw new ErroApi("Não foi possível conectar ao servidor. Verifique se a API está rodando.");
  }

  const dados = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    throw new ErroApi(dados?.erro ?? "Erro inesperado no servidor.");
  }

  return dados as T;
}