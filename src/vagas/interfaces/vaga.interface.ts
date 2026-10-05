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
  /** Data ISO 8601 em que a candidatura foi registrada. */
  aplicadoEm: string;
}
