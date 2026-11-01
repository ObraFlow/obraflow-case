// Cliente HTTP dos client components para ler /api (ky, só aqui em src/lib/api/).
// O server nunca chama a própria API por HTTP: RSC chama o service direto.

import ky, { HTTPError } from "ky";

export const api = ky.create({
  prefix: "/api",
  timeout: 10_000,
  // Só leituras passam por aqui; uma retentativa cobre oscilação de rede sem duplicar efeito.
  retry: { limit: 1, methods: ["get"] },
});

type CorpoDeErro = { erro?: { codigo?: string; mensagem?: string } };

/**
 * Extrai a mensagem em pt-BR do formato de erro da API (`{ erro: { codigo, mensagem } }`).
 * Para falha de rede, timeout ou corpo inesperado devolve um texto genérico.
 */
export async function mensagemDeErro(causa: unknown): Promise<string> {
  if (causa instanceof HTTPError) {
    try {
      const corpo = (await causa.response.json()) as CorpoDeErro;
      if (corpo.erro?.mensagem) return corpo.erro.mensagem;
    } catch {
      // corpo não é JSON: cai no texto genérico abaixo
    }
    return `Falha ao consultar o servidor (HTTP ${causa.response.status}).`;
  }
  return "Não foi possível falar com o servidor. Verifique a conexão e tente novamente.";
}
