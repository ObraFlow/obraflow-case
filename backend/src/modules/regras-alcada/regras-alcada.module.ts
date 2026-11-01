import { Module } from '@nestjs/common';
import { RegrasAlcadaController } from './regras-alcada.controller';
import { RegrasAlcadaService } from './regras-alcada.service';

@Module({
  controllers: [RegrasAlcadaController],
  providers: [RegrasAlcadaService],
  exports: [RegrasAlcadaService],
})
export class RegrasAlcadaModule {}
