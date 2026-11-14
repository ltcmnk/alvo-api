import { Global, Injectable, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { CAMINHO_BANCO_PADRAO } from '../config/database.js';

/*
 * Banco SQL (SQLite, nativo do Node 22.13+): um arquivo local, sem servidor para instalar.
 * As tabelas são criadas na primeira execução. Cada currículo e candidatura pertence a um usuário;
 * excluir o usuário apaga tudo dele em cascata (ON DELETE CASCADE).
 */
const ESQUEMA = `
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;
  PRAGMA busy_timeout = 5000;

  CREATE TABLE IF NOT EXISTS usuarios (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    nome       TEXT NOT NULL,
    email      TEXT NOT NULL UNIQUE COLLATE NOCASE,
    senha_hash TEXT NOT NULL,
    criado_em  TEXT NOT NULL
  );

  -- Guarda só o hash do token: quem ler o banco não consegue reutilizar a sessão
  CREATE TABLE IF NOT EXISTS sessoes (
    token_hash TEXT PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    expira_em  INTEGER NOT NULL
  );

  -- As seções do currículo (contatos, experiências, formações...) ficam em JSON na coluna
  -- conteudo: são listas aninhadas que sempre são lidas e gravadas juntas.
  CREATE TABLE IF NOT EXISTS curriculos (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id    INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    origem_id     INTEGER REFERENCES curriculos(id) ON DELETE SET NULL,
    tipo          TEXT NOT NULL CHECK (tipo IN ('base', 'otimizado', 'sob-medida')),
    pontuacao     INTEGER NOT NULL CHECK (pontuacao BETWEEN 0 AND 100),
    atualizado_em TEXT NOT NULL,
    conteudo      TEXT NOT NULL CHECK (json_valid(conteudo))
  );
  CREATE INDEX IF NOT EXISTS curriculos_usuario ON curriculos(usuario_id);

  CREATE TABLE IF NOT EXISTS vagas (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id      INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    curriculo_id    INTEGER REFERENCES curriculos(id) ON DELETE SET NULL,
    empresa         TEXT NOT NULL,
    cargo           TEXT NOT NULL,
    status          TEXT NOT NULL CHECK (status IN ('aplicado', 'entrevista', 'oferta', 'rejeitado')),
    link            TEXT,
    descricao       TEXT,
    compatibilidade INTEGER CHECK (compatibilidade BETWEEN 0 AND 100),
    notas           TEXT,
    aplicado_em     TEXT NOT NULL,
    atualizado_em   TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS vagas_usuario ON vagas(usuario_id);
`;

/** Conexão única com o banco, compartilhada por todos os módulos. */
@Injectable()
export class Banco implements OnModuleDestroy {
  readonly db: DatabaseSync;

  constructor(config: ConfigService) {
    const caminho = resolve(config.get<string>('DATABASE_PATH', CAMINHO_BANCO_PADRAO));
    mkdirSync(dirname(caminho), { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(caminho);
    this.db.exec(ESQUEMA);
  }

  onModuleDestroy(): void {
    this.db.close();
  }
}

@Global()
@Module({ providers: [Banco], exports: [Banco] })
export class BancoModule {}
