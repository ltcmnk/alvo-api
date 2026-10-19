import type { Curriculo } from '../interfaces/curriculo.interface.js';

/**
 * Dados fictícios baseados nas personas do Design Thinking.
 * Substituem o banco de dados enquanto ele não entra no projeto.
 * A pontuação é recalculada pela API ao subir (ver CurriculosService).
 */
export const CURRICULOS_MOCK: Curriculo[] = [
  {
    id: 1,
    nome: 'Marcelo Andrade',
    email: 'marcelo.andrade@email.com',
    telefone: '(11) 98765-4321',
    cidade: 'São Paulo, SP',
    linkedin: 'https://linkedin.com/in/marceloandrade',
    github: 'https://github.com/marceloandrade',
    cargoAlvo: 'Desenvolvedor Back-end Pleno',
    tipo: 'base',
    pontuacao: 0,
    resumo: 'Desenvolvedor com 6 anos de experiência em APIs REST com Node.js e Java.',
    experiencias: [
      {
        cargo: 'Desenvolvedor Back-end',
        empresa: 'Fintech X',
        local: 'São Paulo, SP',
        inicio: '2021-02',
        atual: true,
        descricao: 'Responsável pelas APIs de pagamento e pela manutenção dos serviços.',
      },
      {
        cargo: 'Desenvolvedor Júnior',
        empresa: 'Agência Y',
        inicio: '2019-01',
        fim: '2021-01',
        descricao: 'Desenvolvimento de sistemas internos em Java.',
      },
    ],
    formacoes: [
      {
        curso: 'Bacharelado em Sistemas de Informação',
        instituicao: 'Universidade Presbiteriana Mackenzie',
        inicio: '2015-02',
        fim: '2018-12',
        situacao: 'concluido',
      },
    ],
    projetos: [],
    habilidades: ['Node.js', 'Java', 'PostgreSQL', 'Docker'],
    competencias: ['Comunicação'],
    idiomas: [{ idioma: 'Inglês', nivel: 'intermediario' }],
    certificacoes: [],
    atividades: [],
    atualizadoEm: '2026-09-12T14:00:00.000Z',
  },
  {
    id: 2,
    nome: 'Marcelo Andrade',
    email: 'marcelo.andrade@email.com',
    telefone: '(11) 98765-4321',
    cidade: 'São Paulo, SP',
    linkedin: 'https://linkedin.com/in/marceloandrade',
    cargoAlvo: 'Engenheiro de Software — Nubank',
    tipo: 'sob-medida',
    pontuacao: 0,
    origemId: 1,
    vagaAlvo: { empresa: 'Nubank', cargo: 'Engenheiro de Software', compatibilidade: 86 },
    resumo:
      'Engenheiro de software com 6 anos em APIs de alta disponibilidade. Reduziu em 30% o tempo de resposta de serviços críticos.',
    experiencias: [
      {
        cargo: 'Desenvolvedor Back-end',
        empresa: 'Fintech X',
        local: 'São Paulo, SP',
        inicio: '2021-02',
        atual: true,
        descricao:
          'Liderou a migração de 12 serviços para containers, reduzindo custos de infraestrutura em 25%.\nImplementou mensageria com Kafka para 2 milhões de eventos por dia.',
      },
    ],
    formacoes: [
      {
        curso: 'Bacharelado em Sistemas de Informação',
        instituicao: 'Universidade Presbiteriana Mackenzie',
        fim: '2018-12',
        situacao: 'concluido',
      },
    ],
    projetos: [],
    habilidades: ['Node.js', 'TypeScript', 'Kafka', 'AWS', 'Docker', 'Testes automatizados'],
    competencias: ['Liderança técnica', 'Comunicação'],
    idiomas: [{ idioma: 'Inglês', nivel: 'avancado' }],
    certificacoes: [
      { nome: 'AWS Certified Developer – Associate', instituicao: 'AWS', ano: '2024' },
    ],
    atividades: [],
    atualizadoEm: '2026-09-20T10:30:00.000Z',
  },
  {
    id: 3,
    nome: 'Renata Oliveira',
    email: 'renata.oliveira@email.com',
    cidade: 'Curitiba, PR',
    cargoAlvo: 'Analista de Dados — iFood',
    tipo: 'otimizado',
    pontuacao: 0,
    resumo: 'Profissional em transição para dados, com projetos em SQL, Python e Power BI.',
    experiencias: [
      {
        cargo: 'Analista Administrativa',
        empresa: 'Varejo Y',
        inicio: '2019-03',
        fim: '2025-06',
        descricao: 'Criou relatórios semanais de vendas em Excel usados por 15 gerentes de loja.',
      },
    ],
    formacoes: [
      { curso: 'Administração', instituicao: 'UFPR', fim: '2018-12', situacao: 'concluido' },
      {
        curso: 'Especialização em Ciência de Dados',
        instituicao: 'PUCPR',
        inicio: '2025-03',
        situacao: 'cursando',
      },
    ],
    projetos: [
      {
        nome: 'Painel de evasão escolar',
        contexto: 'academico',
        descricao: 'Análise de dados públicos do INEP com Python e dashboard no Power BI.',
        tecnologias: ['Python', 'Pandas', 'Power BI'],
      },
    ],
    habilidades: ['SQL', 'Python', 'Power BI', 'Excel'],
    competencias: ['Organização', 'Visão de negócio'],
    idiomas: [{ idioma: 'Inglês', nivel: 'basico' }],
    certificacoes: [],
    atividades: [],
    atualizadoEm: '2026-09-25T18:15:00.000Z',
  },
  {
    id: 4,
    nome: 'Júlia Ferreira',
    email: 'julia.ferreira@email.com',
    cidade: 'Recife, PE',
    portfolio: 'https://behance.net/juliaferreira',
    cargoAlvo: 'Estágio em UX Design',
    tipo: 'base',
    pontuacao: 0,
    experiencias: [],
    formacoes: [
      {
        curso: 'Design Digital',
        instituicao: 'UFPE',
        inicio: '2024-02',
        situacao: 'cursando',
      },
    ],
    projetos: [
      {
        nome: 'Redesign do app do restaurante universitário',
        contexto: 'academico',
        descricao: 'Fiz entrevistas com alunos e criei protótipos no Figma.',
        tecnologias: ['Figma'],
      },
    ],
    habilidades: ['Figma', 'Pesquisa com usuários'],
    competencias: ['Empatia', 'Trabalho em equipe'],
    idiomas: [],
    certificacoes: [],
    atividades: ['Monitora da disciplina de Interação Humano-Computador (2025)'],
    atualizadoEm: '2026-10-01T09:00:00.000Z',
  },
];
