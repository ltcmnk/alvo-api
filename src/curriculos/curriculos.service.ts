import { Injectable, NotFoundException } from '@nestjs/common';
import { CURRICULOS_MOCK } from './data/curriculos.mock.js';
import type { CreateCurriculoDto } from './dto/create-curriculo.dto.js';
import type { Curriculo } from './interfaces/curriculo.interface.js';

const PONTUACAO_BASE = 40;
const PONTOS_POR_CRITERIO = 12;

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

  /**
   * Cria um currículo do tipo "base" e guarda em memória até a API reiniciar.
   * @param dados - Corpo já validado pelo ValidationPipe.
   * @returns O currículo criado, com id, pontuação e data.
   */
  criar(dados: CreateCurriculoDto): Curriculo {
    const novoCurriculo: Curriculo = {
      ...dados,
      id: this.gerarProximoId(),
      tipo: 'base',
      pontuacao: this.calcularPontuacaoInicial(dados),
      experiencias: dados.experiencias ?? [],
      habilidades: dados.habilidades ?? [],
      atualizadoEm: new Date().toISOString(),
    };
    this.curriculos.push(novoCurriculo);
    return novoCurriculo;
  }

  private gerarProximoId(): number {
    return Math.max(0, ...this.curriculos.map((item) => item.id)) + 1;
  }

  /**
   * Pontua a completude do currículo (0–100). É provisória: a pontuação de
   * aderência ATS feita por IA substitui este cálculo nas próximas sprints.
   */
  private calcularPontuacaoInicial(dados: CreateCurriculoDto): number {
    const criterios = [
      Boolean(dados.email),
      Boolean(dados.resumo),
      Boolean(dados.formacao),
      (dados.experiencias?.length ?? 0) > 0,
      (dados.habilidades?.length ?? 0) >= 3,
    ];
    const atendidos = criterios.filter(Boolean).length;
    return PONTUACAO_BASE + atendidos * PONTOS_POR_CRITERIO;
  }
}
