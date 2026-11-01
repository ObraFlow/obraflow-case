// Datas para a tela, em pt-BR. Sem Prisma, sem Next: client e server usam.
//
// O fuso é fixo (horário de Brasília) de propósito: a mesma string tem que sair no server
// (RSC) e no browser, senão o React acusa diferença de hidratação. Em produção, o fuso
// viria da empresa ou do usuário autenticado.

export const FUSO_HORARIO = "America/Sao_Paulo";

const formatadorData = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO_HORARIO,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const formatadorHora = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO_HORARIO,
  hour: "2-digit",
  minute: "2-digit",
});

/** "2026-10-23" (data de emissão, sem hora) → "23/10/2026". Só reordena, sem fuso. */
export function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}

/** ISO 8601 com hora → "23/10/2026", no fuso de Brasília (não usar `formatarData` aqui: ela ignora o fuso). */
export function formatarDataDoInstante(iso: string): string {
  return formatadorData.format(new Date(iso));
}

/** ISO 8601 com hora → "23/10/2026 às 14:10". */
export function formatarDataHora(iso: string): string {
  const data = new Date(iso);
  return `${formatadorData.format(data)} às ${formatadorHora.format(data)}`;
}

/** ISO 8601 com hora → "14:10". */
export function formatarHora(iso: string): string {
  return formatadorHora.format(new Date(iso));
}

const HORA_MS = 3_600_000;
const DIA_MS = 24 * HORA_MS;

const formatadorDias = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

/**
 * Há quanto tempo algo espera: "hoje", "há 1 dia", "há 6 dias". Dias inteiros entre os
 * dois instantes; `agora` vem por parâmetro para server e client calcularem o mesmo texto.
 */
export function descreverIdade(desdeIso: string, agoraIso: string): string {
  const dias = Math.floor((new Date(agoraIso).getTime() - new Date(desdeIso).getTime()) / DIA_MS);
  if (dias <= 0) return "hoje";
  if (dias === 1) return "há 1 dia";
  return `há ${dias} dias`;
}

const formatadorAnoMes = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSO_HORARIO,
  year: "numeric",
  month: "2-digit",
});

/** Instante em ms → chave do mês no fuso de Brasília, "2026-10". */
export function chaveDoMes(ms: number): string {
  // en-CA formata como "2026-10-31"; só o ano e o mês interessam.
  return formatadorAnoMes.format(new Date(ms)).slice(0, 7);
}

/**
 * Chaves dos últimos `quantidade` meses, do mais antigo ao atual (inclusive). Anda pelos
 * números do ano e do mês, sem Date, para o fuso não mudar o resultado.
 */
export function ultimosMeses(agoraMs: number, quantidade: number): string[] {
  const [anoAtual, mesAtual] = chaveDoMes(agoraMs).split("-").map(Number);
  const meses: string[] = [];
  for (let atras = quantidade - 1; atras >= 0; atras -= 1) {
    const indice = anoAtual * 12 + (mesAtual - 1) - atras;
    const ano = Math.floor(indice / 12);
    const mes = (indice % 12) + 1;
    meses.push(`${ano}-${String(mes).padStart(2, "0")}`);
  }
  return meses;
}

const formatadorMesCurto = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", month: "short" });
const formatadorMesLongo = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
  month: "long",
  year: "numeric",
});

function dataDoMes(chave: string): Date {
  const [ano, mes] = chave.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, 15));
}

/** "2026-10" → "out" (sem o ponto que o pt-BR põe). */
export function nomeDoMesCurto(chave: string): string {
  return formatadorMesCurto.format(dataDoMes(chave)).replace(".", "");
}

/** "2026-10" → "outubro de 2026". */
export function nomeDoMesLongo(chave: string): string {
  return formatadorMesLongo.format(dataDoMes(chave));
}

/** Duração em ms → "menos de 1 hora", "5 horas", "1 dia", "2,5 dias". */
export function formatarDuracao(ms: number): string {
  if (ms < HORA_MS) return "menos de 1 hora";
  if (ms < DIA_MS) {
    const horas = Math.round(ms / HORA_MS);
    return horas === 1 ? "1 hora" : `${horas} horas`;
  }
  const dias = formatadorDias.format(ms / DIA_MS);
  return dias === "1" ? "1 dia" : `${dias} dias`;
}
