import { PrismaClient, PedidoStatus, AprovacaoStatus, HistoricoAcao, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export async function runSeed() {
  console.log('🌱 Iniciando seed de demonstração do Dokimos ObraFlow...');

  // Limpeza prévia para garantir idempotência
  await prisma.pedidoHistorico.deleteMany();
  await prisma.pedidoAprovacao.deleteMany();
  await prisma.pedidoItem.deleteMany();
  await prisma.pedido.deleteMany();
  await prisma.regraAlcadaAprovador.deleteMany();
  await prisma.regraAlcada.deleteMany();
  await prisma.fornecedor.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.obra.deleteMany();

  // 1. Cadastrar Usuários
  console.log('👤 Criando usuários...');
  const joao = await prisma.usuario.create({
    data: {
      nome: 'João Silva',
      email: 'joao@obraflow.com',
      cargo: 'Engenheiro Residente',
    },
  });

  const amanda = await prisma.usuario.create({
    data: {
      nome: 'Amanda Oliveira',
      email: 'amanda@obraflow.com',
      cargo: 'Gerente de Obras',
    },
  });

  const carlos = await prisma.usuario.create({
    data: {
      nome: 'Carlos Mendonça',
      email: 'carlos@obraflow.com',
      cargo: 'Diretor de Operações',
    },
  });

  const fernanda = await prisma.usuario.create({
    data: {
      nome: 'Fernanda Costa',
      email: 'fernanda@obraflow.com',
      cargo: 'Gerente de Suprimentos',
    },
  });

  // 2. Cadastrar Obras
  console.log('🏗️ Criando obras...');
  const obraHorizonte = await prisma.obra.create({
    data: {
      nome: 'Residencial Horizonte Azul',
      endereco: 'Av. das Nações Unidas, 4500 - São Paulo, SP',
    },
  });

  const obraMetropole = await prisma.obra.create({
    data: {
      nome: 'Edifício Metrópole Tower',
      endereco: 'Rua Bela Cintra, 890 - Consolação, São Paulo, SP',
    },
  });

  // 3. Cadastrar Fornecedores
  console.log('🏢 Criando fornecedores...');
  const votorantim = await prisma.fornecedor.create({
    data: {
      razaoSocial: 'Votorantim Cimentos S/A',
      cnpj: '01.838.723/0001-27',
      email: 'vendas@votorantim.com.br',
      telefone: '(11) 3003-7777',
    },
  });

  const gerdau = await prisma.fornecedor.create({
    data: {
      razaoSocial: 'Gerdau Aços Longos S/A',
      cnpj: '07.242.474/0001-40',
      email: 'comercial@gerdau.com.br',
      telefone: '(11) 3094-6600',
    },
  });

  const tigre = await prisma.fornecedor.create({
    data: {
      razaoSocial: 'Tigre Materiais e Tubulações Ltda',
      cnpj: '84.684.444/0001-80',
      email: 'pedidos@tigre.com.br',
      telefone: '(47) 3441-5000',
    },
  });

  // 4. Cadastrar Regras de Alçada
  console.log('⚖️ Criando regras de alçada por obra...');

  // Obra 1: Horizonte Azul
  // Faixa 1: Até 10.000 -> João
  const regraH1 = await prisma.regraAlcada.create({
    data: {
      obraId: obraHorizonte.id,
      descricao: 'Até R$ 10.000,00 (Decisão rápida da Engenharia)',
      valorMinimo: new Prisma.Decimal(0.0),
      valorMaximo: new Prisma.Decimal(10000.0),
      aprovadores: {
        create: [{ usuarioId: joao.id, ordem: 1 }],
      },
    },
  });

  // Faixa 2: De 10.000,01 até 50.000 -> João -> Amanda
  const regraH2 = await prisma.regraAlcada.create({
    data: {
      obraId: obraHorizonte.id,
      descricao: 'De R$ 10.000,01 a R$ 50.000,00 (Engenharia + Gerência)',
      valorMinimo: new Prisma.Decimal(10000.01),
      valorMaximo: new Prisma.Decimal(50000.0),
      aprovadores: {
        create: [
          { usuarioId: joao.id, ordem: 1 },
          { usuarioId: amanda.id, ordem: 2 },
        ],
      },
    },
  });

  // Faixa 3: Acima de 50.000 -> João -> Amanda -> Carlos
  const regraH3 = await prisma.regraAlcada.create({
    data: {
      obraId: obraHorizonte.id,
      descricao: 'Acima de R$ 50.000,00 (Engenharia + Gerência + Diretoria)',
      valorMinimo: new Prisma.Decimal(50000.01),
      valorMaximo: null,
      aprovadores: {
        create: [
          { usuarioId: joao.id, ordem: 1 },
          { usuarioId: amanda.id, ordem: 2 },
          { usuarioId: carlos.id, ordem: 3 },
        ],
      },
    },
  });

  // Obra 2: Metrópole Tower
  // Faixa 1: Até 25.000 -> Fernanda
  const regraM1 = await prisma.regraAlcada.create({
    data: {
      obraId: obraMetropole.id,
      descricao: 'Até R$ 25.000,00 (Suprimentos da Obra)',
      valorMinimo: new Prisma.Decimal(0.0),
      valorMaximo: new Prisma.Decimal(25000.0),
      aprovadores: {
        create: [{ usuarioId: fernanda.id, ordem: 1 }],
      },
    },
  });

  // Faixa 2: Acima de 25.000 -> Fernanda -> Carlos
  const regraM2 = await prisma.regraAlcada.create({
    data: {
      obraId: obraMetropole.id,
      descricao: 'Acima de R$ 25.000,00 (Suprimentos + Diretoria)',
      valorMinimo: new Prisma.Decimal(25000.01),
      valorMaximo: null,
      aprovadores: {
        create: [
          { usuarioId: fernanda.id, ordem: 1 },
          { usuarioId: carlos.id, ordem: 2 },
        ],
      },
    },
  });

  // 5. Cadastrar Pedidos de Demonstração em Diferentes Estados
  console.log('📦 Criando pedidos de demonstração...');

  // Pedido 1: PENDENTE na etapa 1 (João Silva)
  const pedido1 = await prisma.pedido.create({
    data: {
      numero: 'PED-2026-0001',
      obraId: obraHorizonte.id,
      fornecedorId: votorantim.id,
      dataPedido: new Date('2026-11-01'),
      observacoes: 'Cimento e argamassa para início do contrapiso do subsolo.',
      valorTotal: new Prisma.Decimal(8250.0),
      status: PedidoStatus.PENDENTE,
      regraAlcadaId: regraH1.id,
      nivelAtualOrdem: 1,
      itens: {
        create: [
          {
            descricao: 'Cimento Portland CP II-E-32 50kg',
            quantidade: new Prisma.Decimal(150),
            unidade: 'sc',
            precoUnitario: new Prisma.Decimal(38.0),
            totalItem: new Prisma.Decimal(5700.0),
          },
          {
            descricao: 'Argamassa Colante AC-III Cinza 20kg',
            quantidade: new Prisma.Decimal(85),
            unidade: 'sc',
            precoUnitario: new Prisma.Decimal(30.0),
            totalItem: new Prisma.Decimal(2550.0),
          },
        ],
      },
      aprovacoes: {
        create: [
          {
            usuarioId: joao.id,
            ordem: 1,
            status: AprovacaoStatus.PENDENTE,
          },
        ],
      },
      historico: {
        create: [
          {
            acao: HistoricoAcao.CRIADO,
            descricao:
              'Pedido criado no valor de R$ 8.250,00 com 2 itens. Aguardando aprovação de João Silva (Etapa 1/1).',
          },
        ],
      },
    },
  });

  // Pedido 2: APROVADO (Passou por João Silva e Amanda Oliveira)
  const pedido2 = await prisma.pedido.create({
    data: {
      numero: 'PED-2026-0002',
      obraId: obraHorizonte.id,
      fornecedorId: gerdau.id,
      dataPedido: new Date('2026-10-28'),
      observacoes: 'Aço CA-50 para armação dos pilares do térreo.',
      valorTotal: new Prisma.Decimal(23400.0),
      status: PedidoStatus.APROVADO,
      regraAlcadaId: regraH2.id,
      nivelAtualOrdem: null, // Concluído!
      itens: {
        create: [
          {
            descricao: 'Barra de Aço CA-50 10.0mm (3/8") 12m',
            quantidade: new Prisma.Decimal(200),
            unidade: 'br',
            precoUnitario: new Prisma.Decimal(65.0),
            totalItem: new Prisma.Decimal(13000.0),
          },
          {
            descricao: 'Barra de Aço CA-50 12.5mm (1/2") 12m',
            quantidade: new Prisma.Decimal(130),
            unidade: 'br',
            precoUnitario: new Prisma.Decimal(80.0),
            totalItem: new Prisma.Decimal(10400.0),
          },
        ],
      },
      aprovacoes: {
        create: [
          {
            usuarioId: joao.id,
            ordem: 1,
            status: AprovacaoStatus.APROVADO,
            decididoEm: new Date('2026-10-29T10:15:00Z'),
            motivo: 'Quantitativo verificado com o projeto estrutural. Aprovado.',
          },
          {
            usuarioId: amanda.id,
            ordem: 2,
            status: AprovacaoStatus.APROVADO,
            decididoEm: new Date('2026-10-29T14:30:00Z'),
            motivo: 'Condições de pagamento e prazo de entrega validados. Liberado.',
          },
        ],
      },
      historico: {
        create: [
          {
            acao: HistoricoAcao.CRIADO,
            descricao:
              'Pedido criado no valor de R$ 23.400,00. Alçada configurada com 2 etapas.',
            criadoEm: new Date('2026-10-28T09:00:00Z'),
          },
          {
            usuarioId: joao.id,
            acao: HistoricoAcao.APROVADO,
            descricao:
              'Aprovado por João Silva (Engenheiro Residente) na etapa 1/2. Observação: "Quantitativo verificado com o projeto estrutural. Aprovado."',
            criadoEm: new Date('2026-10-29T10:15:00Z'),
          },
          {
            usuarioId: amanda.id,
            acao: HistoricoAcao.APROVADO,
            descricao:
              'Aprovado por Amanda Oliveira (Gerente de Obras) na etapa final 2/2. CADEIA DE ALÇADA CONCLUÍDA: Pedido 100% aprovado para compra.',
            criadoEm: new Date('2026-10-29T14:30:00Z'),
          },
        ],
      },
    },
  });

  // Pedido 3: REJEITADO (Interrompido por Amanda na etapa 2 com motivo obrigatório)
  const pedido3 = await prisma.pedido.create({
    data: {
      numero: 'PED-2026-0003',
      obraId: obraHorizonte.id,
      fornecedorId: tigre.id,
      dataPedido: new Date('2026-10-30'),
      observacoes: 'Tubos e conexões hidrossanitárias para prumadas.',
      valorTotal: new Prisma.Decimal(18900.0),
      status: PedidoStatus.REJEITADO,
      regraAlcadaId: regraH2.id,
      nivelAtualOrdem: null, // Interrompido
      motivoRejeicao:
        'Preço unitário dos tubos 22% acima da tabela SINAPI de referência para o estado de SP. Solicitar nova cotação com pelo menos mais 2 fornecedores.',
      itens: {
        create: [
          {
            descricao: 'Tubo PVC Esgoto Série Normal 100mm 6m',
            quantidade: new Prisma.Decimal(120),
            unidade: 'br',
            precoUnitario: new Prisma.Decimal(95.0),
            totalItem: new Prisma.Decimal(11400.0),
          },
          {
            descricao: 'Tubo Soldável PVC Água Fria 50mm 6m',
            quantidade: new Prisma.Decimal(150),
            unidade: 'br',
            precoUnitario: new Prisma.Decimal(50.0),
            totalItem: new Prisma.Decimal(7500.0),
          },
        ],
      },
      aprovacoes: {
        create: [
          {
            usuarioId: joao.id,
            ordem: 1,
            status: AprovacaoStatus.APROVADO,
            decididoEm: new Date('2026-10-30T11:00:00Z'),
            motivo: 'Itens em conformidade com as prumadas do projeto.',
          },
          {
            usuarioId: amanda.id,
            ordem: 2,
            status: AprovacaoStatus.REJEITADO,
            decididoEm: new Date('2026-10-30T16:45:00Z'),
            motivo:
              'Preço unitário dos tubos 22% acima da tabela SINAPI de referência para o estado de SP. Solicitar nova cotação com pelo menos mais 2 fornecedores.',
          },
        ],
      },
      historico: {
        create: [
          {
            acao: HistoricoAcao.CRIADO,
            descricao:
              'Pedido criado no valor de R$ 18.900,00 com 2 itens. Alçada de 2 etapas.',
            criadoEm: new Date('2026-10-30T08:30:00Z'),
          },
          {
            usuarioId: joao.id,
            acao: HistoricoAcao.APROVADO,
            descricao:
              'Aprovado por João Silva (Engenheiro Residente) na etapa 1/2.',
            criadoEm: new Date('2026-10-30T11:00:00Z'),
          },
          {
            usuarioId: amanda.id,
            acao: HistoricoAcao.REJEITADO,
            descricao:
              'REJEITADO por Amanda Oliveira (Gerente de Obras) na etapa 2/2. Motivo: "Preço unitário dos tubos 22% acima da tabela SINAPI de referência para o estado de SP. Solicitar nova cotação com pelo menos mais 2 fornecedores.". O fluxo de aprovação foi interrompido.',
            criadoEm: new Date('2026-10-30T16:45:00Z'),
          },
        ],
      },
    },
  });

  console.log('✅ Seed executado com sucesso!');
  console.log(`- 2 Obras criadas: ${obraHorizonte.nome}, ${obraMetropole.nome}`);
  console.log(`- 4 Usuários criados: João Silva, Amanda Oliveira, Carlos Mendonça, Fernanda Costa`);
  console.log(`- 3 Fornecedores criados: Votorantim, Gerdau, Tigre`);
  console.log(`- 5 Regras de Alçada configuradas por obra`);
  console.log(`- 3 Pedidos criados: PENDENTE (${pedido1.numero}), APROVADO (${pedido2.numero}), REJEITADO (${pedido3.numero})`);
}

runSeed()
  .catch((e) => {
    console.error('❌ Erro durante o seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
