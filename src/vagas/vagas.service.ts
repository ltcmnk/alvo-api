import { Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Banco } from '../banco/banco.module.js';
import type { Requisicao } from '../auth/auth.module.js';
import type { CreateVagaDto, UpdateVagaDto } from './dto/create-vaga.dto.js';
import type { Vaga } from './interfaces/vaga.interface.js';

// Colunas com o nome que a API devolve (snake_case no banco, camelCase no JSON)
const COLUNAS = `id, curriculo_id AS curriculoId, empresa, cargo, status, link, descricao,
  compatibilidade, notas, aplicado_em AS aplicadoEm, atualizado_em AS atualizadoEm`;

/** Candidaturas do usuário logado; toda consulta filtra por usuario_id. */
@Injectable({ scope: Scope.REQUEST })
export class VagasService {
  constructor(
    private readonly banco: Banco,
    @Inject(REQUEST) private readonly req: Requisicao,
  ) {}

  /**
   * Lista as candidaturas da mais recente para a mais antiga.
   * @returns Lista de vagas.
   */
  listar(): Vaga[] {
    return this.banco.db
      .prepare(`SELECT ${COLUNAS} FROM vagas WHERE usuario_id = ? ORDER BY aplicado_em DESC`)
      .all(this.req.usuarioId)
      .map((linha) => this.ler(linha));
  }

  /**
   * Registra uma candidatura. Sem status informado, ela entra como "aplicado".
   * @param dados - Corpo já validado pelo ValidationPipe.
   * @returns A vaga criada, com id e datas.
   */
  criar(dados: CreateVagaDto): Vaga {
    this.validarCurriculo(dados.curriculoId);
    const agora = new Date().toISOString();
    const resultado = this.banco.db
      .prepare(
        `INSERT INTO vagas (usuario_id, curriculo_id, empresa, cargo, status, link, descricao,
           compatibilidade, notas, aplicado_em, atualizado_em)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        this.req.usuarioId,
        dados.curriculoId ?? null,
        dados.empresa,
        dados.cargo,
        dados.status ?? 'aplicado',
        dados.link ?? null,
        dados.descricao ?? null,
        dados.compatibilidade ?? null,
        dados.notas ?? null,
        agora,
        agora,
      );
    return this.buscarPorId(Number(resultado.lastInsertRowid));
  }

  /**
   * Altera só os campos enviados (ex.: mover a candidatura de etapa).
   * @throws NotFoundException quando o id não existe (vira 404).
   */
  atualizar(id: number, dados: UpdateVagaDto): Vaga {
    // Campos ausentes chegam como undefined e não devem apagar o valor atual
    const v = { ...this.buscarPorId(id), ...this.semVazios(dados) };
    this.validarCurriculo(v.curriculoId);
    this.banco.db
      .prepare(
        `UPDATE vagas SET curriculo_id = ?, empresa = ?, cargo = ?, status = ?, link = ?,
           descricao = ?, compatibilidade = ?, notas = ?, atualizado_em = ?
         WHERE id = ? AND usuario_id = ?`,
      )
      .run(
        v.curriculoId ?? null,
        v.empresa,
        v.cargo,
        v.status,
        v.link ?? null,
        v.descricao ?? null,
        v.compatibilidade ?? null,
        v.notas ?? null,
        new Date().toISOString(),
        id,
        this.req.usuarioId,
      );
    return this.buscarPorId(id);
  }

  /**
   * Remove a candidatura.
   * @throws NotFoundException quando o id não existe.
   */
  remover(id: number): void {
    this.buscarPorId(id);
    this.banco.db
      .prepare('DELETE FROM vagas WHERE id = ? AND usuario_id = ?')
      .run(id, this.req.usuarioId);
  }

  private buscarPorId(id: number): Vaga {
    const linha = this.banco.db
      .prepare(`SELECT ${COLUNAS} FROM vagas WHERE id = ? AND usuario_id = ?`)
      .get(id, this.req.usuarioId);
    if (!linha) throw new NotFoundException(`Candidatura ${id} não encontrada`);
    return this.ler(linha);
  }

  /** O currículo vinculado precisa ser da mesma conta. */
  private validarCurriculo(id?: number): void {
    if (id == null) return;
    const existe = this.banco.db
      .prepare('SELECT 1 FROM curriculos WHERE id = ? AND usuario_id = ?')
      .get(id, this.req.usuarioId);
    if (!existe) throw new NotFoundException(`Currículo ${id} não encontrado`);
  }

  /** NULL do banco vira campo ausente no JSON, como os opcionais da interface Vaga. */
  private ler(linha: object): Vaga {
    return this.semVazios(linha) as unknown as Vaga;
  }

  private semVazios<T extends object>(objeto: T): Partial<T> {
    return Object.fromEntries(
      Object.entries(objeto).filter(([, valor]) => valor !== null && valor !== undefined),
    ) as Partial<T>;
  }
}
