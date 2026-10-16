/** base = currículo original · otimizado = melhorado para ATS · sob-medida = adaptado a uma vaga */
export const TIPOS_CURRICULO = ['base', 'otimizado', 'sob-medida'] as const;
export type TipoCurriculo = (typeof TIPOS_CURRICULO)[number];

export const SITUACOES_FORMACAO = ['concluido', 'cursando', 'trancado'] as const;
export const CONTEXTOS_PROJETO = ['academico', 'pessoal', 'voluntario', 'profissional'] as const;
export const NIVEIS_IDIOMA = ['basico', 'intermediario', 'avancado', 'fluente', 'nativo'] as const;

/** Datas de início e fim vêm do <input type="month"> do frontend: "AAAA-MM". */
export interface Experiencia {
  cargo: string;
  empresa: string;
  local?: string;
  inicio?: string;
  fim?: string;
  /** true quando é o emprego atual; nesse caso `fim` fica vazio. */
  atual?: boolean;
  descricao?: string;
}

export interface Formacao {
  curso: string;
  instituicao: string;
  inicio?: string;
  fim?: string;
  situacao?: (typeof SITUACOES_FORMACAO)[number];
}

/** Projetos contam como experiência prática, principalmente para quem busca o primeiro emprego. */
export interface Projeto {
  nome: string;
  contexto?: (typeof CONTEXTOS_PROJETO)[number];
  descricao?: string;
  tecnologias?: string[];
  link?: string;
}

export interface Idioma {
  idioma: string;
  nivel?: (typeof NIVEIS_IDIOMA)[number];
}

export interface Certificacao {
  nome: string;
  instituicao?: string;
  ano?: string;
}

/** Vaga para a qual uma versão sob medida foi gerada. */
export interface VagaAlvo {
  empresa?: string;
  cargo?: string;
  /** Percentual de compatibilidade com a vaga (0–100). */
  compatibilidade?: number;
}

/** Conteúdo do currículo: o que o usuário preenche e o que a IA reescreve. */
export interface ConteudoCurriculo {
  nome: string;
  cargoAlvo: string;
  email?: string;
  telefone?: string;
  cidade?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  resumo?: string;
  experiencias: Experiencia[];
  formacoes: Formacao[];
  projetos: Projeto[];
  /** Competências técnicas (hard skills). */
  habilidades: string[];
  /** Competências comportamentais (soft skills). */
  competencias: string[];
  idiomas: Idioma[];
  certificacoes: Certificacao[];
  /** Monitorias, voluntariado, hackathons, intercâmbios, eventos. */
  atividades: string[];
}

export interface Curriculo extends ConteudoCurriculo {
  id: number;
  tipo: TipoCurriculo;
  /** Pontuação ATS de 0 a 100, calculada pela API a cada gravação. */
  pontuacao: number;
  vagaAlvo?: VagaAlvo;
  /** Id do currículo de onde esta versão saiu (otimizada ou sob medida). */
  origemId?: number;
  /** Data ISO 8601 da última alteração. */
  atualizadoEm: string;
}
