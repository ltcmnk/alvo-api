import type { Vaga } from '../interfaces/vaga.interface.js';

/** Candidaturas fictícias que substituem o banco de dados na Semana 1. */
export const VAGAS_MOCK: Vaga[] = [
  {
    id: 1,
    empresa: 'iFood',
    cargo: 'Analista de Dados',
    status: 'aplicado',
    aplicadoEm: '2026-09-28T12:00:00.000Z',
  },
  {
    id: 2,
    empresa: 'Loft',
    cargo: 'Product Manager',
    status: 'aplicado',
    aplicadoEm: '2026-09-27T15:30:00.000Z',
  },
  {
    id: 3,
    empresa: 'Mercado Livre',
    cargo: 'UX Researcher',
    status: 'aplicado',
    aplicadoEm: '2026-09-25T09:10:00.000Z',
  },
  {
    id: 4,
    empresa: 'Nubank',
    cargo: 'Engenheiro de Software',
    status: 'entrevista',
    aplicadoEm: '2026-09-18T11:00:00.000Z',
  },
  {
    id: 5,
    empresa: 'QuintoAndar',
    cargo: 'Desenvolvedor Back-end',
    status: 'entrevista',
    aplicadoEm: '2026-09-15T16:45:00.000Z',
  },
  {
    id: 6,
    empresa: 'Stone',
    cargo: 'Engenheiro Front-end',
    status: 'oferta',
    aplicadoEm: '2026-09-05T10:00:00.000Z',
  },
  {
    id: 7,
    empresa: 'Globo',
    cargo: 'Desenvolvedor Pleno',
    status: 'rejeitado',
    aplicadoEm: '2026-08-30T14:20:00.000Z',
  },
];
