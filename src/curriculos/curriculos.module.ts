import { Module } from '@nestjs/common';
import { CurriculosController } from './curriculos.controller.js';
import { CurriculosService } from './curriculos.service.js';

@Module({
  controllers: [CurriculosController],
  providers: [CurriculosService],
})
export class CurriculosModule {}
