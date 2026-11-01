import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { RegrasAlcadaService } from './regras-alcada.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

describe('RegrasAlcadaService', () => {
  let service: RegrasAlcadaService;
  let prisma: PrismaService;

  const mockPrismaService = {
    regraAlcada: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegrasAlcadaService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<RegrasAlcadaService>(RegrasAlcadaService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('determinarAlcada', () => {
    it('deve retornar a regra correta para valor até R$ 10.000,00', async () => {
      const mockRegra = {
        id: 'regra-1',
        obraId: 'obra-1',
        descricao: 'Até R$ 10.000,00',
        valorMinimo: new Prisma.Decimal(0),
        valorMaximo: new Prisma.Decimal(10000),
        aprovadores: [
          {
            usuarioId: 'user-joao',
            ordem: 1,
            usuario: { nome: 'João Silva' },
          },
        ],
      };

      (prisma.regraAlcada.findMany as jest.Mock).mockResolvedValue([mockRegra]);

      const resultado = await service.determinarAlcada('obra-1', 8500);

      expect(resultado).toBeDefined();
      expect(resultado?.id).toBe('regra-1');
      expect(resultado?.aprovadores).toHaveLength(1);
      expect(resultado?.aprovadores[0].usuario.nome).toBe('João Silva');
    });

    it('deve retornar null quando nenhuma regra cobrir o valor especificado', async () => {
      (prisma.regraAlcada.findMany as jest.Mock).mockResolvedValue([]);

      const resultado = await service.determinarAlcada('obra-1', 999999);

      expect(resultado).toBeNull();
    });
  });

  describe('create', () => {
    it('deve rejeitar se o valor máximo for menor ou igual ao valor mínimo', async () => {
      await expect(
        service.create({
          obraId: 'obra-1',
          valorMinimo: 5000,
          valorMaximo: 2000,
          aprovadores: [{ usuarioId: 'user-1', ordem: 1 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve rejeitar regra que tenta repetir o mesmo usuário como aprovador', async () => {
      await expect(
        service.create({
          obraId: 'obra-1',
          valorMinimo: 0,
          valorMaximo: 10000,
          aprovadores: [
            { usuarioId: 'user-joao', ordem: 1 },
            { usuarioId: 'user-joao', ordem: 2 },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
