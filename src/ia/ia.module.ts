import { Module } from '@nestjs/common';
import { IaController } from './ia.controller.js';
import { IaService } from './ia.service.js';

@Module({
  controllers: [IaController],
  providers: [IaService],
  // A leitura de arquivos usa a IA para organizar o texto extraído
  exports: [IaService],
})
export class IaModule {}
