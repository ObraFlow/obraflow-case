/**
 * Seed completo da demonstração (Sprint 8).
 *
 * O que ele produz é o roteiro de avaliação inteiro, sem nenhuma edição manual depois: as obras,
 * os seis usuários dos quatro papéis, os fornecedores, a alçada de duas obras e **oito pedidos**,
 * um em cada ponto do ciclo — inclusive os dois que só existem para provar o ADR 0001, o pedido
 * cuja faixa foi **editada** depois da submissão e o pedido cuja faixa foi **apagada**.
 *
 * Três regras sustentam isso, e nenhuma é cerimônia:
 *
 * 1. **Todo id é fixo**, inclusive o dos pedidos, das etapas e dos itens. `db:reset` seguido de
 *    `seed` reproduz exatamente o mesmo estado, e o script de verificação e o README podem citar
 *    `#1003` sabendo que é sempre o mesmo pedido.
 * 2. **Toda data é literal**, nunca `new Date()`. Data relativa a hoje faria a screenshot do
 *    README envelhecer a cada execução e o "há 3 dias" da tela mudar sozinho.
 * 3. **O estado é escrito direto**, não encenado pelas rotas. Um pedido cuja faixa foi editada
 *    depois da submissão não é alcançável por uma sequência de chamadas num seed — e o que
 *    importa demonstrar é o estado, que é exatamente o que o ADR 0001 promete: o snapshot do
 *    pedido não acompanha a regra.
 */

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db" }),
});

/** Instante único para `criadoEm`/`atualizadoEm` dos cadastros — fixo, como todo o resto. */
const CADASTRO_EM = new Date("2026-10-01T09:00:00.000Z");

const USUARIOS = [
  { id: "cseedusuariomarina0001", nome: "Marina Alencar", email: "marina@vertice.com.br", papel: "admin" },
  { id: "cseedusuarioamanda0002", nome: "Amanda Prado", email: "amanda@vertice.com.br", papel: "aprovador" },
  { id: "cseedusuariojoao00003", nome: "João Ferreira", email: "joao@vertice.com.br", papel: "aprovador" },
  { id: "cseedusuariocaio00004", nome: "Caio Nogueira", email: "caio@vertice.com.br", papel: "comprador" },
  { id: "cseedusuarioteresa0005", nome: "Teresa Lima", email: "teresa@vertice.com.br", papel: "visualizador" },
  // Segundo comprador: a privacidade do rascunho (rascunho alheio responde 404) só é
  // demonstrável com dois compradores distintos, cada um com o seu rascunho.
  { id: "cseedusuariorafael0006", nome: "Rafael Souza", email: "rafael@vertice.com.br", papel: "comprador" },
];

// Documento no formato que a tela mostra. O modelo guarda o texto como está, sem máscara própria
// — validar CNPJ é regra de cadastro, e a tela de cadastros está fora do recorte.
const FORNECEDORES = [
  { id: "cseedfornecedorcimento01", nome: "Cimentos Bahia Ltda", documento: "12.345.678/0001-90" },
  { id: "cseedfornecedoraconorte2", nome: "Aço Norte Distribuidora", documento: "23.456.789/0001-01" },
  { id: "cseedfornecedoreletrica3", nome: "Elétrica Salvador ME", documento: "34.567.890/0001-12" },
  { id: "cseedfornecedorlocadora4", nome: "Locadora Terra Forte", documento: "45.678.901/0001-23" },
];

const OBRAS = [
  { id: "cseedobraaurora000001", nome: "Residencial Aurora", cidade: "Salvador/BA" },
  { id: "cseedobragalpao000002", nome: "Galpão Logístico Norte", cidade: "Camaçari/BA" },
  { id: "cseedobrasede00000003", nome: "Reforma da Sede", cidade: "Salvador/BA" },
];

const AMANDA = USUARIOS[1].id;
const JOAO = USUARIOS[2].id;
const CAIO = USUARIOS[3].id;
const RAFAEL = USUARIOS[5].id;
const AURORA = OBRAS[0].id;
const GALPAO = OBRAS[1].id;
const CIMENTO = FORNECEDORES[0].id;
const ACO = FORNECEDORES[1].id;
const ELETRICA = FORNECEDORES[2].id;
const LOCADORA = FORNECEDORES[3].id;

/**
 * A alçada semeada, e por que ela é assim.
 *
 * - **Residencial Aurora** tem faixa com teto *e* faixa aberta: todo valor cai em alguma regra, e
 *   é a obra onde a demonstração do fluxo feliz acontece.
 * - **Galpão Logístico Norte** tem faixa com teto e **nenhuma faixa aberta**: acima de
 *   R$ 5.000,00 não há regra, e é aí que `SEM_REGRA_APLICAVEL` deixa de ser teoria. O
 *   `scripts/verificar.sh` submete um pedido dessa obra acima do teto justamente por isso.
 * - **Reforma da Sede** não tem faixa nenhuma: é o estado vazio da tela 3 e a outra forma de
 *   chegar em "sem regra aplicável".
 */
const FAIXAS = [
  {
    id: "cseedfaixaauroraate10k01",
    obraId: AURORA,
    limiteCentavos: 1_000_000, // R$ 10.000,00 — limite superior inclusivo (ADR 0002)
    aprovadores: [AMANDA],
  },
  {
    id: "cseedfaixaauroraaberta02",
    obraId: AURORA,
    limiteCentavos: null, // faixa aberta: tudo acima de R$ 10.000,00
    aprovadores: [AMANDA, JOAO],
  },
  {
    id: "cseedfaixagalpaoate5k003",
    obraId: GALPAO,
    limiteCentavos: 500_000, // R$ 5.000,00 — e nada acima disso: a obra não tem faixa aberta
    aprovadores: [JOAO],
  },
];

type ItemSemeado = {
  descricao: string;
  /** Quantidade em milésimos: 2,5 kg = 2500. */
  quantidadeMilesimos: number;
  unidade: string;
  /** `null` = preço ainda não informado no rascunho. Zero seria preço válido. */
  precoUnitarioCentavos: number | null;
};

type EtapaSemeada = {
  usuarioId: string;
  situacao: "pendente" | "aprovada" | "rejeitada";
  decididoEm?: Date;
  motivo?: string;
};

type PedidoSemeado = {
  id: number;
  nota: string;
  obraId: string | null;
  fornecedorId: string | null;
  criadoPorId: string;
  situacao: "rascunho" | "pendente" | "aprovado" | "rejeitado";
  observacoes: string | null;
  criadoEm: Date;
  dataPedido: Date | null;
  submetidoEm: Date | null;
  /** O snapshot da regra aplicada na submissão — não a regra vigente hoje (ADR 0001). */
  faixaId: string | null;
  faixaLimiteCentavos: number | null;
  faixaSemTeto: boolean;
  itens: ItemSemeado[];
  etapas: EtapaSemeada[];
};

const PEDIDOS: PedidoSemeado[] = [
  {
    id: 1001,
    nota: "rascunho completo de Caio — pronto para submeter, cai na faixa até R$ 10.000,00",
    obraId: AURORA,
    fornecedorId: CIMENTO,
    criadoPorId: CAIO,
    situacao: "rascunho",
    observacoes: "Reposição para a concretagem da laje do 3º pavimento.",
    criadoEm: new Date("2026-10-28T13:40:00.000Z"),
    // Rascunho completo precisa estar submetível, e a data do pedido é obrigatória na submissão.
    // Meio-dia UTC: é como o servidor grava a data civil que o formulário envia.
    dataPedido: new Date("2026-10-28T12:00:00.000Z"),
    submetidoEm: null,
    faixaId: null,
    faixaLimiteCentavos: null,
    faixaSemTeto: false,
    itens: [
      { descricao: "Cimento CP-II 50 kg", quantidadeMilesimos: 120_000, unidade: "sc", precoUnitarioCentavos: 4_290 },
      { descricao: "Areia média lavada", quantidadeMilesimos: 18_000, unidade: "m3", precoUnitarioCentavos: 18_000 },
    ],
    etapas: [],
  },
  {
    id: 1002,
    nota: "rascunho incompleto de Rafael — sem fornecedor e sem preço; é o rascunho alheio que responde 404 para Caio",
    obraId: AURORA,
    fornecedorId: null,
    criadoPorId: RAFAEL,
    situacao: "rascunho",
    observacoes: "Confirmar a cor com o cliente antes de fechar o preço.",
    criadoEm: new Date("2026-10-29T08:15:00.000Z"),
    dataPedido: null,
    submetidoEm: null,
    faixaId: null,
    faixaLimiteCentavos: null,
    faixaSemTeto: false,
    itens: [
      { descricao: "Tinta acrílica fosca branca 18 L", quantidadeMilesimos: 24_000, unidade: "un", precoUnitarioCentavos: null },
    ],
    etapas: [],
  },
  {
    id: 1003,
    nota: "pendente na 1ª etapa — está na fila de Amanda; João tentando decidir recebe 409 NAO_E_SUA_VEZ",
    obraId: AURORA,
    fornecedorId: ACO,
    criadoPorId: CAIO,
    situacao: "pendente",
    observacoes: "Armadura da laje do 4º pavimento. Entrega parcelada em duas semanas.",
    criadoEm: new Date("2026-10-27T10:05:00.000Z"),
    dataPedido: new Date("2026-10-27T10:05:00.000Z"),
    submetidoEm: new Date("2026-10-27T10:05:00.000Z"),
    faixaId: "cseedfaixaauroraaberta02",
    faixaLimiteCentavos: null,
    faixaSemTeto: true,
    itens: [
      { descricao: "Vergalhão CA-50 10 mm", quantidadeMilesimos: 850_000, unidade: "kg", precoUnitarioCentavos: 840 },
      { descricao: "Vergalhão CA-60 5 mm", quantidadeMilesimos: 400_000, unidade: "kg", precoUnitarioCentavos: 960 },
      { descricao: "Tela soldada Q-196", quantidadeMilesimos: 32_000, unidade: "m2", precoUnitarioCentavos: 42_000 },
    ],
    etapas: [
      { usuarioId: AMANDA, situacao: "pendente" },
      { usuarioId: JOAO, situacao: "pendente" },
    ],
  },
  {
    id: 1004,
    nota: "pendente na 2ª etapa, com a 1ª já aprovada — está na fila de João, não na de Amanda",
    obraId: AURORA,
    fornecedorId: LOCADORA,
    criadoPorId: CAIO,
    situacao: "pendente",
    observacoes: "Locação mensal para a fachada norte.",
    criadoEm: new Date("2026-10-26T09:30:00.000Z"),
    dataPedido: new Date("2026-10-26T09:30:00.000Z"),
    submetidoEm: new Date("2026-10-26T09:30:00.000Z"),
    faixaId: "cseedfaixaauroraaberta02",
    faixaLimiteCentavos: null,
    faixaSemTeto: true,
    itens: [
      { descricao: "Locação de andaime fachadeiro", quantidadeMilesimos: 450_000, unidade: "m2", precoUnitarioCentavos: 2_800 },
      { descricao: "Locação de betoneira 400 L", quantidadeMilesimos: 2_000, unidade: "un", precoUnitarioCentavos: 185_000 },
    ],
    etapas: [
      { usuarioId: AMANDA, situacao: "aprovada", decididoEm: new Date("2026-10-26T15:12:00.000Z") },
      { usuarioId: JOAO, situacao: "pendente" },
    ],
  },
  {
    id: 1005,
    nota: "aprovado por inteiro — obra Galpão, faixa até R$ 5.000,00, cadeia de um aprovador só",
    obraId: GALPAO,
    fornecedorId: ELETRICA,
    criadoPorId: CAIO,
    situacao: "aprovado",
    observacoes: "Infraestrutura elétrica do mezanino.",
    criadoEm: new Date("2026-10-22T11:20:00.000Z"),
    dataPedido: new Date("2026-10-22T11:20:00.000Z"),
    submetidoEm: new Date("2026-10-22T11:20:00.000Z"),
    faixaId: "cseedfaixagalpaoate5k003",
    faixaLimiteCentavos: 500_000,
    faixaSemTeto: false,
    itens: [
      { descricao: "Cabo flexível 2,5 mm²", quantidadeMilesimos: 600_000, unidade: "m", precoUnitarioCentavos: 320 },
      { descricao: "Disjuntor bipolar 40 A", quantidadeMilesimos: 16_000, unidade: "un", precoUnitarioCentavos: 7_850 },
    ],
    etapas: [
      { usuarioId: JOAO, situacao: "aprovada", decididoEm: new Date("2026-10-22T16:48:00.000Z") },
    ],
  },
  {
    id: 1006,
    nota: "rejeitado na 1ª etapa, com motivo — a 2ª etapa nunca se torna decidível",
    obraId: AURORA,
    fornecedorId: ACO,
    criadoPorId: CAIO,
    situacao: "rejeitado",
    observacoes: "Estrutura metálica da cobertura da garagem.",
    criadoEm: new Date("2026-10-23T14:02:00.000Z"),
    dataPedido: new Date("2026-10-23T14:02:00.000Z"),
    submetidoEm: new Date("2026-10-23T14:02:00.000Z"),
    faixaId: "cseedfaixaauroraaberta02",
    faixaLimiteCentavos: null,
    faixaSemTeto: true,
    itens: [
      { descricao: "Perfil metálico W 200x15", quantidadeMilesimos: 2_400_000, unidade: "kg", precoUnitarioCentavos: 1_290 },
    ],
    etapas: [
      {
        usuarioId: AMANDA,
        situacao: "rejeitada",
        decididoEm: new Date("2026-10-24T09:21:00.000Z"),
        motivo:
          "Preço 18% acima da última compra do mesmo perfil e sem cotação concorrente anexada. " +
          "Refazer com três propostas antes de reenviar.",
      },
      { usuarioId: JOAO, situacao: "pendente" },
    ],
  },
  {
    id: 1007,
    nota:
      "faixa EDITADA depois da submissão — submetido sob 'até R$ 6.000,00 → João'; " +
      "a mesma faixa hoje é 'até R$ 10.000,00 → Amanda'. A cadeia gravada continua sendo a de João (ADR 0001)",
    obraId: AURORA,
    fornecedorId: CIMENTO,
    criadoPorId: CAIO,
    situacao: "pendente",
    observacoes: "Assentamento de revestimento das áreas molhadas.",
    criadoEm: new Date("2026-10-20T08:55:00.000Z"),
    dataPedido: new Date("2026-10-20T08:55:00.000Z"),
    submetidoEm: new Date("2026-10-20T08:55:00.000Z"),
    // O vínculo com a faixa continua: ela existe, foi editada. O snapshot guarda o limite de
    // antes da edição, e é por isso que o detalhe mostra "até R$ 6.000,00" numa faixa que hoje
    // vai até R$ 10.000,00.
    faixaId: "cseedfaixaauroraate10k01",
    faixaLimiteCentavos: 600_000,
    faixaSemTeto: false,
    itens: [
      { descricao: "Argamassa colante AC-III 20 kg", quantidadeMilesimos: 150_000, unidade: "sc", precoUnitarioCentavos: 2_990 },
    ],
    etapas: [{ usuarioId: JOAO, situacao: "pendente" }],
  },
  {
    id: 1008,
    nota:
      "faixa APAGADA depois da submissão — faixaId nulo e faixaLimiteCentavos preenchido. " +
      "A regra sumiu da obra; o pedido continua exibindo o limite sob o qual foi aprovado",
    obraId: AURORA,
    fornecedorId: LOCADORA,
    criadoPorId: CAIO,
    situacao: "aprovado",
    observacoes: "Locação da grua para a fase de estrutura.",
    criadoEm: new Date("2026-10-15T10:10:00.000Z"),
    dataPedido: new Date("2026-10-15T10:10:00.000Z"),
    submetidoEm: new Date("2026-10-15T10:10:00.000Z"),
    // `onDelete: SetNull` zerou o vínculo quando a faixa "até R$ 20.000,00 → Amanda → João" foi
    // removida da obra. As três colunas de snapshot são do próprio pedido e sobreviveram.
    faixaId: null,
    faixaLimiteCentavos: 2_000_000,
    faixaSemTeto: false,
    itens: [
      { descricao: "Locação de grua ascensional — mensal", quantidadeMilesimos: 1_000, unidade: "un", precoUnitarioCentavos: 1_460_000 },
    ],
    etapas: [
      { usuarioId: AMANDA, situacao: "aprovada", decididoEm: new Date("2026-10-15T17:05:00.000Z") },
      { usuarioId: JOAO, situacao: "aprovada", decididoEm: new Date("2026-10-16T09:40:00.000Z") },
    ],
  },
];

/**
 * `round(quantidade × preço / 1000)`, a mesma conta de `Dinheiro.porMilesimos`.
 *
 * Repetida aqui, e não importada de `src/domain`, porque o seed é um script `tsx` fora do
 * bundler do Next e o domínio é o que as rotas usam — o seed grava o estado, não o deriva. A
 * conta é de uma linha e a suíte do domínio já a cobre; importar o módulo traria junto a cadeia
 * de imports de tipos que nada aqui usa.
 */
function totalDoItem(quantidadeMilesimos: number, precoUnitarioCentavos: number | null): number {
  // Preço não informado: a linha ainda não tem total, como em `linhasDeItens` do domínio.
  if (precoUnitarioCentavos === null) return 0;
  const produto = quantidadeMilesimos * precoUnitarioCentavos;
  return Math.sign(produto) * Math.round(Math.abs(produto) / 1000);
}

function reais(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

async function main() {
  // Ordem inversa da dependência: Usuario e Obra são alvo de FK com onDelete Restrict. Apagar
  // antes de inserir é o que torna `npm run seed` repetível — com ids fixos, a alternativa seria
  // falhar por unicidade na segunda execução. Duplicar, nunca: todo id é literal.
  await prisma.etapa.deleteMany();
  await prisma.itemPedido.deleteMany();
  await prisma.pedido.deleteMany();
  await prisma.faixaAprovador.deleteMany();
  await prisma.faixa.deleteMany();
  await prisma.fornecedor.deleteMany();
  await prisma.obra.deleteMany();
  await prisma.usuario.deleteMany();

  // `Pedido.id` é AUTOINCREMENT: o SQLite guarda o último valor em `sqlite_sequence` e ele
  // sobrevive ao DELETE. Sem zerar, um banco onde pedidos foram criados pela interface faria o
  // próximo pedido nascer com outro número — o seed em si já é reproduzível pelos ids literais,
  // mas o que vem **depois** dele não seria.
  await prisma.$executeRaw`DELETE FROM sqlite_sequence WHERE name = 'Pedido'`;

  await prisma.usuario.createMany({ data: USUARIOS.map((u) => ({ ...u, criadoEm: CADASTRO_EM })) });
  await prisma.obra.createMany({ data: OBRAS.map((o) => ({ ...o, criadoEm: CADASTRO_EM })) });
  await prisma.fornecedor.createMany({
    data: FORNECEDORES.map((f) => ({ ...f, criadoEm: CADASTRO_EM })),
  });

  for (const faixa of FAIXAS) {
    await prisma.faixa.create({
      data: {
        id: faixa.id,
        obraId: faixa.obraId,
        limiteCentavos: faixa.limiteCentavos,
        criadoEm: CADASTRO_EM,
        aprovadores: {
          create: faixa.aprovadores.map((usuarioId, ordem) => ({
            id: `${faixa.id.slice(0, 20)}ap${ordem}`,
            usuarioId,
            ordem,
          })),
        },
      },
    });
  }

  for (const pedido of PEDIDOS) {
    const itens = pedido.itens.map((item, ordem) => ({
      id: `cseeditem${pedido.id}ordem${ordem}`,
      descricao: item.descricao,
      quantidadeMilesimos: item.quantidadeMilesimos,
      unidade: item.unidade,
      precoUnitarioCentavos: item.precoUnitarioCentavos,
      totalCentavos: totalDoItem(item.quantidadeMilesimos, item.precoUnitarioCentavos),
      ordem,
    }));

    await prisma.pedido.create({
      data: {
        id: pedido.id,
        obraId: pedido.obraId,
        fornecedorId: pedido.fornecedorId,
        criadoPorId: pedido.criadoPorId,
        situacao: pedido.situacao,
        observacoes: pedido.observacoes,
        // O total é a soma dos itens, calculada aqui — nunca um número digitado à parte, pelo
        // mesmo motivo que a rota não lê `totalCentavos` do corpo.
        totalCentavos: itens.reduce((soma, item) => soma + item.totalCentavos, 0),
        dataPedido: pedido.dataPedido,
        submetidoEm: pedido.submetidoEm,
        faixaId: pedido.faixaId,
        faixaLimiteCentavos: pedido.faixaLimiteCentavos,
        faixaSemTeto: pedido.faixaSemTeto,
        criadoEm: pedido.criadoEm,
        atualizadoEm: pedido.submetidoEm ?? pedido.criadoEm,
        itens: { create: itens },
        etapas: {
          create: pedido.etapas.map((etapa, ordem) => ({
            id: `cseedetapa${pedido.id}ordem${ordem}`,
            ordem,
            usuarioId: etapa.usuarioId,
            situacao: etapa.situacao,
            decididoEm: etapa.decididoEm ?? null,
            motivo: etapa.motivo ?? null,
          })),
        },
      },
    });
  }

  const porSituacao = await prisma.pedido.groupBy({ by: ["situacao"], _count: true });
  const resumo = porSituacao
    .map((linha) => `${linha._count} ${linha.situacao}`)
    .sort()
    .join(", ");

  console.log(
    `${USUARIOS.length} usuários, ${OBRAS.length} obras, ${FORNECEDORES.length} fornecedores e ` +
      `${FAIXAS.length} faixas inseridos.`,
  );
  console.log(`${PEDIDOS.length} pedidos: ${resumo}.`);
  for (const pedido of PEDIDOS) {
    const total = pedido.itens.reduce(
      (soma, item) => soma + totalDoItem(item.quantidadeMilesimos, item.precoUnitarioCentavos),
      0,
    );
    console.log(`  #${pedido.id} ${reais(total).padStart(13)} · ${pedido.nota}`);
  }
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
