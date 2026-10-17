import { Module } from '@nestjs/common';
import { DocumentosController } from './documentos.controller.js';

@Module({
  controllers: [DocumentosController],
})
export class DocumentosModule {}
