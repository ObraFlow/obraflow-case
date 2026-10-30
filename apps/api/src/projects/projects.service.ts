import { Injectable } from '@nestjs/common';
import { coverage } from '../common/domain/approval-rules.js';
import { PrismaService } from '../common/prisma/prisma.service.js';
import type { CreateProjectDto } from './create-project.dto.js';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const projects = await this.prisma.project.findMany({
      orderBy: { name: 'asc' },
      include: { approvalRules: { select: { maxAmount: true } } },
    });
    return {
      data: projects.map((project) => ({
        id: project.id,
        name: project.name,
        city: project.city,
        ruleCount: project.approvalRules.length,
        // Permite ao formulário de pedido avisar que a obra não tem (ou não cobre todos os) valores.
        coverage: coverage(project.approvalRules).status,
      })),
    };
  }

  async create(dto: CreateProjectDto) {
    const project = await this.prisma.project.create({ data: dto });
    return {
      id: project.id,
      name: project.name,
      city: project.city,
      ruleCount: 0,
      coverage: 'NONE',
    };
  }
}
