import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateProjectDto } from './create-project.dto.js';
import { ProjectsService } from './projects.service.js';

@ApiTags('projects')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  @ApiOperation({
    summary:
      'Lista as obras, com a quantidade de faixas e a cobertura de valores',
  })
  list() {
    return this.projects.list();
  }

  @Post()
  @ApiOperation({ summary: 'Cadastra uma obra' })
  create(@Body() dto: CreateProjectDto) {
    return this.projects.create(dto);
  }
}
