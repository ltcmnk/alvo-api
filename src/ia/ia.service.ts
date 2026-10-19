import { Injectable } from '@nestjs/common';
import { listarProvedores } from './provedores.js';
import type { Provedor } from './provedores.js';

@Injectable()
export class IaService {
  /** Provedores com o status da chave e se o app está em modo demonstração. */
  provedores(): { provedores: Provedor[]; modoDemonstracao: boolean } {
    const provedores = listarProvedores();
    return {
      provedores,
      modoDemonstracao: !provedores.some((p) => p.disponivel),
    };
  }
}
