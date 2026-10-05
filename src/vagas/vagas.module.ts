import { Module } from '@nestjs/common';
import { VagasController } from './vagas.controller.js';
import { VagasService } from './vagas.service.js';

@Module({
  controllers: [VagasController],
  providers: [VagasService],
})
export class VagasModule {}
