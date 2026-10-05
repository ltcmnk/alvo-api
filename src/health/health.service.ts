import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface StatusApi {
  status: 'ok';
  service: string;
  ambiente: string;
  timestamp: string;
}

@Injectable()
export class HealthService {
  constructor(private readonly config: ConfigService) {}

  /**
   * Monta o status atual da API.
   * @returns Objeto com `status: "ok"`, nome do serviço, ambiente e horário ISO.
   */
  obterStatus(): StatusApi {
    return {
      status: 'ok',
      service: 'alvo-api',
      ambiente: this.config.get<string>('NODE_ENV', 'development'),
      timestamp: new Date().toISOString(),
    };
  }
}
