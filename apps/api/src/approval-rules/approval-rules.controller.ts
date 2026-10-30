import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParseIdPipe } from '../common/validation/ids.js';
import { ApprovalRuleDto, ResolveRuleQuery } from './approval-rule.dto.js';
import { ApprovalRulesService } from './approval-rules.service.js';

@ApiTags('approval-rules')
@Controller()
export class ApprovalRulesController {
  constructor(private readonly rules: ApprovalRulesService) {}

  @Get('projects/:projectId/approval-rules')
  @ApiOperation({
    summary:
      'Lista as faixas da obra (ordenadas, com início calculado) e a cobertura',
  })
  list(@Param('projectId', ParseIdPipe) projectId: number) {
    return this.rules.list(projectId);
  }

  @Get('projects/:projectId/approval-rules/resolve')
  @ApiOperation({
    summary: 'Prévia: qual faixa e cadeia se aplicam a um valor',
  })
  resolve(
    @Param('projectId', ParseIdPipe) projectId: number,
    @Query() query: ResolveRuleQuery,
  ) {
    return this.rules.resolve(projectId, query.amount);
  }

  @Post('projects/:projectId/approval-rules')
  @ApiOperation({ summary: 'Cria uma faixa na obra' })
  create(
    @Param('projectId', ParseIdPipe) projectId: number,
    @Body() dto: ApprovalRuleDto,
  ) {
    return this.rules.create(projectId, dto);
  }

  @Put('approval-rules/:id')
  @ApiOperation({
    summary: 'Substitui o limite e a cadeia de aprovadores da faixa',
  })
  update(@Param('id', ParseIdPipe) id: number, @Body() dto: ApprovalRuleDto) {
    return this.rules.update(id, dto);
  }

  @Delete('approval-rules/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove a faixa (pedidos existentes não são afetados)',
  })
  remove(@Param('id', ParseIdPipe) id: number) {
    return this.rules.remove(id);
  }
}
