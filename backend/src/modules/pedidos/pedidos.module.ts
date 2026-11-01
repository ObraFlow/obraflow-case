import { Module } from '@nestjs/common';
import { PedidosController } from './pedidos.controller';
import { PedidosService } from './pedidos.service';
import { RegrasAlcadaModule } from '../regras-alcada/regras-alcada.module';

@Module({
  imports: [RegrasAlcadaModule],
  controllers: [PedidosController],
  providers: [PedidosService],
  exports: [PedidosService],
})
export class PedidosModule {}
