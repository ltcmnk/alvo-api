import { Controller, Get } from '@nestjs/common';
import { IaService } from './ia.service.js';
import type { Provedor } from './provedores.js';

@Controller('ia')
export class IaController {
  constructor(private readonly iaService: IaService) {}

  /** GET /api/ia/provedores — provedores de IA e quais têm chave configurada. */
  @Get('provedores')
  provedores(): { provedores: Provedor[]; modoDemonstracao: boolean } {
    return this.iaService.provedores();
  }
}
