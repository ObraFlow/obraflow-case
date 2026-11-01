// Public local-demo identities only. Credentials are handled by normal login;
// roles and memberships remain authoritative in PostgreSQL.
export const DEMO_PASSWORDS = { ADMIN: "demo-admin-2026", USER: "demo-user-2026" } as const;
// Each project has its own cumulative ladder: `bands` lists the approvers in step order with the
// upper limit of each band (null = no limit). `requester` creates that project's demo orders, and
// `orderPrice` is the approximate total of a standard order, so the examples reach every level.
export const DEMO_PROJECTS = [
  {
    name: "Centro Comercial Atlântico",
    legacyName: "Obra Centro",
    orderPrice: "12500.00",
    requester: "beatriz",
    bands: [
      { upperLimit: "10000.00", approver: "joao" },
      { upperLimit: null, approver: "amanda" },
    ],
  },
  {
    name: "Residencial Vista Norte",
    legacyName: "Obra Norte",
    orderPrice: "200000.00",
    requester: "carlos",
    bands: [
      { upperLimit: "50000.00", approver: "amanda" },
      { upperLimit: "150000.00", approver: "joao" },
      { upperLimit: null, approver: "ricardo" },
    ],
  },
] as const;
export type DemoProject = (typeof DEMO_PROJECTS)[number];
export const DEMO_SUPPLIERS = [
  { name: "Concretos Horizonte", legacyName: "Fornecedor ABC" },
  { name: "Aço & Estruturas Brasil", legacyName: "Fornecedor XYZ" },
  { name: "Elétrica São Jorge", legacyName: null },
] as const;
const centro = DEMO_PROJECTS[0].name,
  norte = DEMO_PROJECTS[1].name;
export const DEMO_PERSONAS = [
  { username: "admin", displayName: "Administrador", role: "ADMIN", projects: [centro, norte] },
  { username: "joao", displayName: "João", role: "USER", projects: [centro, norte] },
  { username: "amanda", displayName: "Amanda", role: "USER", projects: [centro, norte] },
  { username: "carlos", displayName: "Carlos", role: "USER", projects: [norte] },
  { username: "beatriz", displayName: "Beatriz", role: "USER", projects: [centro] },
  { username: "ricardo", displayName: "Ricardo", role: "USER", projects: [norte] },
] as const;
export type DemoPersona = (typeof DEMO_PERSONAS)[number];

export const DEMO_ORDER_NOTES = {
  "pending-first":
    "Entrega programada conforme o cronograma de concretagem das fundações. Conferir acesso dos caminhões ao canteiro.",
  "pending-next":
    "Aço para a próxima etapa da estrutura. Entregar os lotes identificados e acompanhados dos certificados de qualidade.",
  approved: "Materiais elétricos para instalação dos quadros e circuitos. Recebimento no almoxarifado da obra.",
  rejected:
    "Concreto para a etapa de execução das lajes. Conferir o orçamento disponível antes de contratar a entrega.",
  "at-limit":
    "Medição de serviço no limite exato da primeira alçada: basta a aprovação do primeiro aprovador. Conferir quantitativos antes de liberar.",
  fractional:
    "Reposição de materiais de fixação com quantidades fracionadas. O total considera o arredondamento de cada item para centavos.",
} as const;

/** Presentation only: legacy stored notes remain intact for seed repeatability. */
export function displayOrderNotes(notes: string): string {
  const match =
    /^(?:([\s\S]*?)\n)?\[obraflow-demo:v1:[^\r\n]+:(pending-first|pending-next|approved|rejected|at-limit|fractional)\]$/.exec(
      notes,
    );
  // Old markers carry no delivery details: do not invent material-specific notes.
  return match
    ? match[1]?.trimEnd() ||
        "Pedido de demonstração. Entrega conforme o cronograma da obra; conferir materiais e documentos no recebimento."
    : notes;
}
