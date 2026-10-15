/** Etapas da candidatura, na ordem em que normalmente acontecem. */
export const STATUS_VAGA = ['aplicado', 'entrevista', 'oferta', 'rejeitado'] as const;

export type StatusVaga = (typeof STATUS_VAGA)[number];

export interface Vaga {
  id: number;
  empresa: string;
  cargo: string;
  status: StatusVaga;
  link?: string;
  descricao?: string;
  /** Currículo enviado nesta candidatura (liga o tracker às versões sob medida). */
  curriculoId?: number;
  /** Compatibilidade do currículo com a vaga, de 0 a 100, vinda do relatório. */
  compatibilidade?: number;
  /** Anotações livres: nome do recrutador, data da entrevista, próximos passos. */
  notas?: string;
  /** Data ISO 8601 em que a candidatura foi registrada. */
  aplicadoEm: string;
  /** Data ISO 8601 da última mudança (ex.: troca de etapa). */
  atualizadoEm: string;
}
