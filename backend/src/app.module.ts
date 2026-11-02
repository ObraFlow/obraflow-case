import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ObrasModule } from './modules/obras/obras.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { FornecedoresModule } from './modules/fornecedores/fornecedores.module';
import { RegrasAlcadaModule } from './modules/regras-alcada/regras-alcada.module';
import { PedidosModule } from './modules/pedidos/pedidos.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    ObrasModule,
    UsuariosModule,
    FornecedoresModule,
    RegrasAlcadaModule,
    PedidosModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
