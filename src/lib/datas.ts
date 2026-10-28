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

/** ISO 8601 com hora → "23/10/2026 às 14:10". */
export function formatarDataHora(iso: string): string {
  const data = new Date(iso);
  return `${formatadorData.format(data)} às ${formatadorHora.format(data)}`;
}

/** ISO 8601 com hora → "14:10". */
export function formatarHora(iso: string): string {
  return formatadorHora.format(new Date(iso));
}
