import { Controller, Get } from '@nestjs/common';
import { ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service.js';

@ApiTags('health')
@Controller('health')
export class AppController {
  constructor(private readonly appService: AppService) {}

  /** Checks that the API and the database are up. */
  @Get()
  @ApiServiceUnavailableResponse({ description: 'Database unreachable.' })
  health() {
    return this.appService.health();
  }
}
