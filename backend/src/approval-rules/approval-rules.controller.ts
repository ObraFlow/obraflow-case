import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
} from '@nestjs/common';
import { ApprovalRulesService } from './approval-rules.service.js';
import {
    CreateApprovalRangeDto,
    UpdateApprovalRangeDto,
} from './dto/approval-range.dto.js';

// Sem prefixo de controller: as rotas têm dois formatos sem raiz comum
// (/projects/:projectId/approval-ranges e /approval-ranges/:id).
@Controller()
export class ApprovalRulesController {
    constructor(private readonly service: ApprovalRulesService) {}

    @Get('projects/:projectId/approval-ranges')
    listByProject(@Param('projectId') projectId: string) {
        return this.service.listByProject(projectId);
    }

    @Post('projects/:projectId/approval-ranges')
    create(
        @Param('projectId') projectId: string,
        @Body() dto: CreateApprovalRangeDto,
    ) {
        return this.service.create(projectId, dto);
    }

    @Get('approval-ranges/:id')
    findOne(@Param('id') id: string) {
        return this.service.findOne(id);
    }

    @Patch('approval-ranges/:id')
    update(@Param('id') id: string, @Body() dto: UpdateApprovalRangeDto) {
        return this.service.update(id, dto);
    }

    @Delete('approval-ranges/:id')
    remove(@Param('id') id: string) {
        return this.service.remove(id);
    }
}
