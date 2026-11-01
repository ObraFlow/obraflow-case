import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PedidosService } from './pedidos.service';
import { RegrasAlcadaService } from '../regras-alcada/regras-alcada.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PedidoStatus } from '@prisma/client';

describe('PedidosService', () => {
  let service: PedidosService;
  let prisma: PrismaService;
  let regrasAlcadaService: RegrasAlcadaService;

  const mockPrismaService = {
    obra: { findUnique: jest.fn() },
    fornecedor: { findUnique: jest.fn() },
    pedido: {
      count: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    pedidoAprovacao: { update: jest.fn() },
    pedidoHistorico: { create: jest.fn() },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  const mockRegrasAlcadaService = {
    determinarAlcada: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PedidosService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RegrasAlcadaService, useValue: mockRegrasAlcadaService },
      ],
    }).compile();

    service = module.get<PedidosService>(PedidosService);
    prisma = module.get<PrismaService>(PrismaService);
    regrasAlcadaService = module.get<RegrasAlcadaService>(RegrasAlcadaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('deve lançar erro se não houver regra de alçada cobrindo o valor total', async () => {
      (prisma.obra.findUnique as jest.Mock).mockResolvedValue({ id: 'obra-1', nome: 'Obra 1' });
      (prisma.fornecedor.findUnique as jest.Mock).mockResolvedValue({ id: 'forn-1', razaoSocial: 'Forn 1' });
      (regrasAlcadaService.determinarAlcada as jest.Mock).mockResolvedValue(null);

      await expect(
        service.create({
          obraId: 'obra-1',
          fornecedorId: 'forn-1',
          dataPedido: '2026-11-01',
          itens: [
            {
              descricao: 'Cimento',
              quantidade: 10,
              unidade: 'sc',
              precoUnitario: 35,
            },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('aprovar', () => {
    it('deve impedir aprovação se o usuário não for o aprovador da etapa atual', async () => {
      const mockPedido = {
        id: 'pedido-1',
        status: PedidoStatus.PENDENTE,
        nivelAtualOrdem: 1,
        aprovacoes: [
          {
            id: 'aprov-1',
            ordem: 1,
            usuarioId: 'user-joao',
            usuario: { nome: 'João Silva', cargo: 'Engenheiro' },
          },
        ],
      };

      (prisma.pedido.findUnique as jest.Mock).mockResolvedValue(mockPedido);

      await expect(
        service.aprovar('pedido-1', {
          usuarioId: 'outro-usuario',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve impedir aprovação se o pedido não estiver PENDENTE', async () => {
      const mockPedido = {
        id: 'pedido-1',
        status: PedidoStatus.APROVADO,
        nivelAtualOrdem: null,
        aprovacoes: [],
      };

      (prisma.pedido.findUnique as jest.Mock).mockResolvedValue(mockPedido);

      await expect(
        service.aprovar('pedido-1', {
          usuarioId: 'user-joao',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('rejeitar', () => {
    it('deve impedir rejeição por usuário que não seja o aprovador da etapa atual', async () => {
      const mockPedido = {
        id: 'pedido-1',
        status: PedidoStatus.PENDENTE,
        nivelAtualOrdem: 1,
        aprovacoes: [
          {
            id: 'aprov-1',
            ordem: 1,
            usuarioId: 'user-joao',
            usuario: { nome: 'João Silva' },
          },
        ],
      };

      (prisma.pedido.findUnique as jest.Mock).mockResolvedValue(mockPedido);

      await expect(
        service.rejeitar('pedido-1', {
          usuarioId: 'user-amanda',
          motivo: 'Preço elevado',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
