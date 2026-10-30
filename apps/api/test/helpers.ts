import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { App } from 'supertest/types.js';
import { seed } from '../prisma/seed-data.js';
import { AppModule } from '../src/app/app.module.js';
import { setupApp } from '../src/app/setup.js';
import { PrismaService } from '../src/common/prisma/prisma.service.js';

/** Sobe a API completa (mesmos pipes, filtros e prefixo do main.ts) contra o banco de teste. */
export async function createTestApp() {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app: INestApplication<App> = moduleRef.createNestApplication();
  setupApp(app);
  await app.init();
  return { app, prisma: app.get(PrismaService) };
}

/** Volta o banco de teste para os dados do seed (ids reiniciados: PED-001…PED-011). */
export function resetDatabase(prisma: PrismaService) {
  return seed(prisma);
}

// Ids fixos do seed.
export const USERS = { joao: 1, amanda: 2, carlos: 3, beatriz: 4, fernando: 5 };
export const PROJECTS = { mare: 1, sol: 2, torre: 3 };
export const SUPPLIERS = { votorantim: 1 };
