import { Injectable, NotFoundException } from '@nestjs/common';
import { CURRICULOS_MOCK } from './data/curriculos.mock.js';
import type { Curriculo } from './interfaces/curriculo.interface.js';

@Injectable()
export class CurriculosService {
  // Cópia profunda do mock: assim os testes manuais não alteram o arquivo de dados original
  private readonly curriculos: Curriculo[] = structuredClone(CURRICULOS_MOCK);

  /**
   * Lista os currículos do mais recente para o mais antigo.
   * @returns Lista de currículos.
   */
  listar(): Curriculo[] {
    return [...this.curriculos].sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm));
  }

  /**
   * Busca um currículo pelo id.
   * @param id - Identificador numérico do currículo.
   * @throws NotFoundException quando o id não existe (vira 404).
   */
  buscarPorId(id: number): Curriculo {
    const curriculo = this.curriculos.find((item) => item.id === id);
    if (!curriculo) {
      throw new NotFoundException(`Currículo ${id} não encontrado`);
    }
    return curriculo;
  }
}
