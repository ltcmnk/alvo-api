import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service.js';
import type { StatusApi } from './health.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * GET /api/health — o frontend usa esta rota para saber se a API está no ar.
   * @returns 200 com o status da API.
   */
  @Get()
  verificar(): StatusApi {
    return this.healthService.obterStatus();
  }
}
