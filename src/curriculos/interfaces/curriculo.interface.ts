/** base = currículo original · otimizado = melhorado para ATS · sob-medida = adaptado a uma vaga */
export type TipoCurriculo = 'base' | 'otimizado' | 'sob-medida';

export interface Experiencia {
  cargo: string;
  empresa: string;
  periodo?: string;
  descricao?: string;
}

export interface Curriculo {
  id: number;
  nome: string;
  email?: string;
  cargoAlvo: string;
  tipo: TipoCurriculo;
  /** Pontuação de 0 a 100. */
  pontuacao: number;
  resumo?: string;
  formacao?: string;
  experiencias: Experiencia[];
  habilidades: string[];
  /** Data ISO 8601 da última alteração. */
  atualizadoEm: string;
}
