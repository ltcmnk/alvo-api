import { Injectable, NotFoundException } from '@nestjs/common';
import { pontuarAts } from '../ats/pontuacao.js';
import { CURRICULOS_MOCK } from './data/curriculos.mock.js';
import type { CreateCurriculoDto } from './dto/create-curriculo.dto.js';
import type { ConteudoCurriculo, Curriculo } from './interfaces/curriculo.interface.js';

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

@Injectable()
export class CurriculosService {
  // Cópia profunda do mock: os testes manuais não alteram o arquivo de dados original.
  // A pontuação é recalculada para seguir sempre a mesma regra dos currículos novos.
  private readonly curriculos: Curriculo[] = structuredClone(CURRICULOS_MOCK).map((curriculo) => ({
    ...curriculo,
    pontuacao: pontuarAts(curriculo).total,
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
   * @returns O currículo criado, com id, pontuação ATS e data.
   */
  criar(dados: CreateCurriculoDto): Curriculo {
    const novoCurriculo = this.montar(this.gerarProximoId(), dados);
    this.curriculos.push(novoCurriculo);
    return novoCurriculo;
  }

  /**
   * Substitui o conteúdo de um currículo (edição pelo editor do site).
   * @throws NotFoundException quando o id não existe.
   */
  atualizar(id: number, dados: CreateCurriculoDto): Curriculo {
    const indice = this.curriculos.indexOf(this.buscarPorId(id));
    const atual = this.curriculos[indice];
    const atualizado = this.montar(id, { ...dados, tipo: dados.tipo ?? atual.tipo });
    this.curriculos[indice] = atualizado;
    return atualizado;
  }

  /**
   * Remove um currículo.
   * @throws NotFoundException quando o id não existe.
   */
  remover(id: number): void {
    this.curriculos.splice(this.curriculos.indexOf(this.buscarPorId(id)), 1);
  }

  private montar(id: number, dados: CreateCurriculoDto): Curriculo {
    const conteudo = completarConteudo(dados);
    return {
      ...conteudo,
      id,
      tipo: dados.tipo ?? 'base',
      vagaAlvo: dados.vagaAlvo,
      origemId: dados.origemId,
      pontuacao: pontuarAts(conteudo).total,
      atualizadoEm: new Date().toISOString(),
    };
  }

  private gerarProximoId(): number {
    return Math.max(0, ...this.curriculos.map((item) => item.id)) + 1;
  }
}
