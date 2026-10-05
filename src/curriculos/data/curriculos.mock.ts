import type { Curriculo } from '../interfaces/curriculo.interface.js';

/**
 * Dados fictícios baseados nas personas do Design Thinking.
 * Substituem o banco de dados na Semana 1.
 */
export const CURRICULOS_MOCK: Curriculo[] = [
  {
    id: 1,
    nome: 'Marcelo Andrade',
    email: 'marcelo.andrade@email.com',
    cargoAlvo: 'Desenvolvedor Back-end Pleno',
    tipo: 'base',
    pontuacao: 62,
    resumo: 'Desenvolvedor com 6 anos de experiência em APIs REST com Node.js e Java.',
    formacao: 'Sistemas de Informação',
    experiencias: [
      { cargo: 'Desenvolvedor Back-end', empresa: 'Fintech X', periodo: '2021–atual' },
    ],
    habilidades: ['Node.js', 'Java', 'PostgreSQL', 'Docker'],
    atualizadoEm: '2026-09-12T14:00:00.000Z',
  },
  {
    id: 2,
    nome: 'Marcelo Andrade',
    email: 'marcelo.andrade@email.com',
    cargoAlvo: 'Engenheiro de Software — Nubank',
    tipo: 'otimizado',
    pontuacao: 88,
    resumo:
      'Engenheiro de software com 6 anos em APIs de alta disponibilidade. Reduziu em 30% o tempo de resposta de serviços críticos.',
    formacao: 'Sistemas de Informação',
    experiencias: [
      {
        cargo: 'Desenvolvedor Back-end',
        empresa: 'Fintech X',
        periodo: '2021–atual',
        descricao: 'Liderou a migração de 12 serviços para containers, reduzindo custos em 25%.',
      },
    ],
    habilidades: ['Node.js', 'TypeScript', 'Kafka', 'AWS', 'Docker', 'Testes automatizados'],
    atualizadoEm: '2026-09-20T10:30:00.000Z',
  },
  {
    id: 3,
    nome: 'Renata Oliveira',
    email: 'renata.oliveira@email.com',
    cargoAlvo: 'Analista de Dados — iFood',
    tipo: 'sob-medida',
    pontuacao: 84,
    resumo: 'Profissional em transição para dados, com projetos em SQL, Python e Power BI.',
    formacao: 'Administração · Especialização em Ciência de Dados',
    experiencias: [{ cargo: 'Analista Administrativa', empresa: 'Varejo Y', periodo: '2019–2025' }],
    habilidades: ['SQL', 'Python', 'Power BI', 'Excel'],
    atualizadoEm: '2026-09-25T18:15:00.000Z',
  },
  {
    id: 4,
    nome: 'Júlia Ferreira',
    email: 'julia.ferreira@email.com',
    cargoAlvo: 'Estágio em UX Design',
    tipo: 'base',
    pontuacao: 58,
    formacao: 'Design Digital (cursando)',
    experiencias: [],
    habilidades: ['Figma', 'Pesquisa com usuários'],
    atualizadoEm: '2026-10-01T09:00:00.000Z',
  },
];
