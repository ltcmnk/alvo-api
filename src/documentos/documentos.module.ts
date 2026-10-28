import { Module } from '@nestjs/common';
import { IaModule } from '../ia/ia.module.js';
import { DocumentosController } from './documentos.controller.js';

@Module({
  imports: [IaModule],
  controllers: [DocumentosController],
})
export class DocumentosModule {}
