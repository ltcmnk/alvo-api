import { Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import { pontuarAts } from '../ats/pontuacao.js';
import { REQUEST } from '@nestjs/core';
import { Banco } from '../banco/banco.module.js';
import type { Requisicao } from '../auth/auth.module.js';
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

/** Linha da tabela curriculos como o node:sqlite devolve. */
type LinhaCurriculo = Record<string, string | number | null>;

/**
 * CRUD de currículos no banco. Escopo REQUEST: cada requisição recebe o id do usuário logado,
 * e toda consulta filtra por usuario_id, então uma conta nunca enxerga os dados de outra.
 */
@Injectable({ scope: Scope.REQUEST })
export class CurriculosService {
  constructor(
    private readonly banco: Banco,
    @Inject(REQUEST) private readonly req: Requisicao,
  ) {}

  /**
   * Lista os currículos do mais recente para o mais antigo.
   * @returns Lista de currículos.
   */
  listar(): Curriculo[] {
    return this.banco.db
      .prepare('SELECT * FROM curriculos WHERE usuario_id = ? ORDER BY atualizado_em DESC')
      .all(this.req.usuarioId)
      .map((linha) => this.ler(linha as LinhaCurriculo));
  }

  /**
   * Busca um currículo pelo id.
   * @param id - Identificador numérico do currículo.
   * @throws NotFoundException quando o id não existe ou é de outra conta (vira 404).
   */
  buscarPorId(id: number): Curriculo {
    const linha = this.banco.db
      .prepare('SELECT * FROM curriculos WHERE id = ? AND usuario_id = ?')
      .get(id, this.req.usuarioId);
    if (!linha) {
      throw new NotFoundException(`Currículo ${id} não encontrado`);
    }
    return this.ler(linha as LinhaCurriculo);
  }

  /**
   * Cria um currículo na conta do usuário.
   * @param dados - Corpo já validado pelo ValidationPipe.
   * @returns O currículo criado, com id, pontuação ATS e data.
   */
  criar(dados: CreateCurriculoDto): Curriculo {
    if (dados.origemId != null) this.buscarPorId(dados.origemId);
    const c = this.montar(dados);
    const resultado = this.banco.db
      .prepare(
        `INSERT INTO curriculos (usuario_id, origem_id, tipo, pontuacao, atualizado_em, conteudo)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(this.req.usuarioId, c.origemId, c.tipo, c.pontuacao, c.atualizadoEm, c.conteudo);
    return this.buscarPorId(Number(resultado.lastInsertRowid));
  }

  /**
   * Substitui o conteúdo de um currículo (edição pelo editor do site).
   * @throws NotFoundException quando o id não existe.
   */
  atualizar(id: number, dados: CreateCurriculoDto): Curriculo {
    const atual = this.buscarPorId(id);
    if (dados.origemId != null) this.buscarPorId(dados.origemId);
    const c = this.montar({ ...dados, tipo: dados.tipo ?? atual.tipo });
    this.banco.db
      .prepare(
        `UPDATE curriculos SET origem_id = ?, tipo = ?, pontuacao = ?, atualizado_em = ?, conteudo = ?
         WHERE id = ? AND usuario_id = ?`,
      )
      .run(c.origemId, c.tipo, c.pontuacao, c.atualizadoEm, c.conteudo, id, this.req.usuarioId);
    return this.buscarPorId(id);
  }

  /**
   * Remove um currículo. Candidaturas e versões ligadas a ele ficam, só perdem o vínculo.
   * @throws NotFoundException quando o id não existe.
   */
  remover(id: number): void {
    this.buscarPorId(id);
    this.banco.db
      .prepare('DELETE FROM curriculos WHERE id = ? AND usuario_id = ?')
      .run(id, this.req.usuarioId);
  }

  /** Calcula a nota ATS e separa o que vira coluna do que vai no JSON. */
  private montar({ tipo, origemId, ...resto }: CreateCurriculoDto) {
    const secoes = completarConteudo(resto);
    return {
      tipo: tipo ?? 'base',
      origemId: origemId ?? null,
      pontuacao: pontuarAts(secoes).total,
      atualizadoEm: new Date().toISOString(),
      conteudo: JSON.stringify(secoes),
    };
  }

  private ler(linha: LinhaCurriculo): Curriculo {
    return {
      ...JSON.parse(String(linha.conteudo)),
      id: Number(linha.id),
      tipo: linha.tipo,
      pontuacao: Number(linha.pontuacao),
      origemId: linha.origem_id == null ? undefined : Number(linha.origem_id),
      atualizadoEm: String(linha.atualizado_em),
    };
  }
}
