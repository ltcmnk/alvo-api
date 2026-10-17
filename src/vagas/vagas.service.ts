import { Injectable, NotFoundException } from '@nestjs/common';
import { VAGAS_MOCK } from './data/vagas.mock.js';
import type { CreateVagaDto, UpdateVagaDto } from './dto/create-vaga.dto.js';
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
   * @returns A vaga criada, com id e datas.
   */
  criar(dados: CreateVagaDto): Vaga {
    const agora = new Date().toISOString();
    const novaVaga: Vaga = {
      ...dados,
      id: Math.max(0, ...this.vagas.map((item) => item.id)) + 1,
      status: dados.status ?? 'aplicado',
      aplicadoEm: agora,
      atualizadoEm: agora,
    };
    this.vagas.push(novaVaga);
    return novaVaga;
  }

  /**
   * Altera só os campos enviados (ex.: mover a candidatura de etapa).
   * @throws NotFoundException quando o id não existe (vira 404).
   */
  atualizar(id: number, dados: UpdateVagaDto): Vaga {
    const vaga = this.buscarPorId(id);
    // Campos ausentes chegam como undefined e não devem apagar o valor atual
    const enviados = Object.fromEntries(
      Object.entries(dados).filter(([, valor]) => valor !== undefined),
    );
    Object.assign(vaga, enviados, { atualizadoEm: new Date().toISOString() });
    return vaga;
  }

  /**
   * Remove a candidatura.
   * @throws NotFoundException quando o id não existe.
   */
  remover(id: number): void {
    this.vagas.splice(this.vagas.indexOf(this.buscarPorId(id)), 1);
  }

  private buscarPorId(id: number): Vaga {
    const vaga = this.vagas.find((item) => item.id === id);
    if (!vaga) throw new NotFoundException(`Candidatura ${id} não encontrada`);
    return vaga;
  }
}
