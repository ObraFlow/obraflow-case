import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateWorkDto } from '../../application/dtos/create-work.dto';
import { CreateWorkUseCase } from '../../application/use-cases/create-work.use-case';
import { ListWorksUseCase } from '../../application/use-cases/list-works.use-case';
import { ListWorksResponseDto } from '../../application/dtos/list-works.dto';
import { CreateWorkResponseDto } from '../../application/dtos/create-work.dto';

@ApiTags('Works')
@Controller()
export class WorksController {
  constructor(
    private readonly listWorksUseCase: ListWorksUseCase,
    private readonly createWorkUseCase: CreateWorkUseCase,
  ) {}

  @Get('works')
  @ApiOperation({
    summary: 'Lista todas as obras',
    description: 'Retorna a lista de todas as obras cadastradas no sistema.',
  })
  async list(): Promise<ListWorksResponseDto> {
    const works = this.listWorksUseCase.execute();
    return works.then((data) => ({
      success: true,
      data,
      message: 'Lista de obras retornada com sucesso.',
    }));
  }

  @Post('works')
  @ApiOperation({
    summary: 'Cria uma nova obra',
    description: 'Cria uma nova obra com base nos dados fornecidos.',
  })
  async create(@Body() dto: CreateWorkDto): Promise<CreateWorkResponseDto> {
    const work = await this.createWorkUseCase.execute(dto);

    if (!work) {
      return {
        success: false,
        data: null,
        message: 'Falha ao criar a obra.',
      };
    }

    return {
      success: true,
      data: work,
      message: 'Obra criada com sucesso.',
    };
  }
}
