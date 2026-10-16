import { Injectable, NotFoundException } from '@nestjs/common';
import { CURRICULOS_MOCK } from './data/curriculos.mock.js';
import type { CreateCurriculoDto } from './dto/create-curriculo.dto.js';
import type { ConteudoCurriculo, Curriculo } from './interfaces/curriculo.interface.js';

const PONTUACAO_BASE = 40;
const PONTOS_POR_CRITERIO = 12;

/** Preenche as listas que o cliente pode omitir, para o resto da API nunca lidar com undefined. */
export function completarConteudo(dados: CreateCurriculoDto): ConteudoCurriculo {
  return {
    ...dados,
    experiencias: dados.experiencias ?? [],
    formacoes: dados.formacoes ?? [],
    projetos: dados.projetos ?? [],
    habilidades: dados.habilidades ?? [],
    competencias: dados.competencias ?? [],
    idiomas: dados.idiomas ?? [],
    certificacoes: dados.certificacoes ?? [],
    atividades: dados.atividades ?? [],
  };
}

/**
 * Pontua a completude do currículo (0–100). Provisória: a nota ATS por critérios
 * (src/ats/pontuacao.ts) substitui este cálculo no fim desta branch.
 */
function pontuacaoProvisoria(conteudo: ConteudoCurriculo): number {
  const criterios = [
    Boolean(conteudo.email),
    Boolean(conteudo.resumo),
    conteudo.formacoes.length > 0,
    conteudo.experiencias.length > 0,
    conteudo.habilidades.length >= 3,
  ];
  return PONTUACAO_BASE + criterios.filter(Boolean).length * PONTOS_POR_CRITERIO;
}

@Injectable()
export class CurriculosService {
  // Cópia profunda do mock: os testes manuais não alteram o arquivo de dados original
  private readonly curriculos: Curriculo[] = structuredClone(CURRICULOS_MOCK).map((curriculo) => ({
    ...curriculo,
    pontuacao: pontuacaoProvisoria(curriculo),
  }));

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
   * Cria um currículo e guarda em memória até a API reiniciar.
   * @param dados - Corpo já validado pelo ValidationPipe.
   * @returns O currículo criado, com id, pontuação e data.
   */
  criar(dados: CreateCurriculoDto): Curriculo {
    const conteudo = completarConteudo(dados);
    const novoCurriculo: Curriculo = {
      ...conteudo,
      id: Math.max(0, ...this.curriculos.map((item) => item.id)) + 1,
      tipo: dados.tipo ?? 'base',
      vagaAlvo: dados.vagaAlvo,
      origemId: dados.origemId,
      pontuacao: pontuacaoProvisoria(conteudo),
      atualizadoEm: new Date().toISOString(),
    };
    this.curriculos.push(novoCurriculo);
    return novoCurriculo;
  }
}
