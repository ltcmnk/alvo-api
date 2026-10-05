import { Injectable } from '@nestjs/common';
import { VAGAS_MOCK } from './data/vagas.mock.js';
import type { CreateVagaDto } from './dto/create-vaga.dto.js';
import type { Vaga } from './interfaces/vaga.interface.js';

@Injectable()
export class VagasService {
  // Cópia profunda do mock: os POSTs mudam só a memória, não o arquivo de dados
  private readonly vagas: Vaga[] = structuredClone(VAGAS_MOCK);

  /**
   * Lista as candidaturas da mais recente para a mais antiga.
   * @returns Lista de vagas.
   */
  listar(): Vaga[] {
    return [...this.vagas].sort((a, b) => b.aplicadoEm.localeCompare(a.aplicadoEm));
  }

  /**
   * Registra uma candidatura. Sem status informado, ela entra como "aplicado".
   * @param dados - Corpo já validado pelo ValidationPipe.
   * @returns A vaga criada, com id e data.
   */
  criar(dados: CreateVagaDto): Vaga {
    const novaVaga: Vaga = {
      ...dados,
      id: Math.max(0, ...this.vagas.map((item) => item.id)) + 1,
      status: dados.status ?? 'aplicado',
      aplicadoEm: new Date().toISOString(),
    };
    this.vagas.push(novaVaga);
    return novaVaga;
  }
}
