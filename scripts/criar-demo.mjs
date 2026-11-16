// Cria a conta de demonstração com currículos e candidaturas prontos para a apresentação.
// Uso, com a API rodando: npm run demo
// Tudo passa pela própria API, então as notas ATS são as calculadas pelo sistema. Dados fictícios.
// Rodar de novo não duplica nada: se a conta já tem currículos, o script só avisa.

const API = process.env.API_URL || 'http://localhost:3001/api';
const EMAIL = 'demo@alvo.dev';
const SENHA = 'AlvoDemo2026!';

let cookie = '';

async function chamar(metodo, caminho, corpo) {
  const resposta = await fetch(API + caminho, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', cookie },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const sessao = resposta.headers.getSetCookie().find((c) => c.startsWith('alvo_sessao='));
  if (sessao) cookie = sessao.split(';')[0];
  const dados = resposta.status === 204 ? null : await resposta.json();
  return { status: resposta.status, dados };
}

const CURRICULOS = [
  {
    nome: 'Ana Demonstração',
    cargoAlvo: 'Desenvolvedora Front-end Júnior',
    email: 'ana.demo@exemplo.com',
    telefone: '(11) 90000-0000',
    cidade: 'São Paulo, SP',
    linkedin: 'https://www.linkedin.com/in/ana-demonstracao',
    github: 'https://github.com/ana-demonstracao',
    resumo:
      'Desenvolvedora front-end júnior com experiência em React, JavaScript e CSS responsivo. ' +
      'Criei interfaces acessíveis consumindo APIs REST e reduzi o tempo de carregamento de páginas em projetos acadêmicos e de estágio.',
    experiencias: [
      {
        cargo: 'Estagiária de Desenvolvimento Front-end',
        empresa: 'Loja Fictícia S.A.',
        local: 'São Paulo, SP',
        inicio: '2025-02',
        atual: true,
        descricao:
          'Desenvolvi 12 telas em React integradas a uma API REST. Reduzi em 30% o tempo de carregamento da vitrine com lazy loading. Corrigi problemas de acessibilidade apontados pelo Lighthouse.',
      },
      {
        cargo: 'Monitora de Programação',
        empresa: 'Faculdade Exemplo',
        inicio: '2024-03',
        fim: '2024-12',
        descricao:
          'Orientei 40 alunos em lógica de programação e JavaScript. Preparei listas de exercícios semanais.',
      },
    ],
    formacoes: [
      {
        curso: 'Análise e Desenvolvimento de Sistemas',
        instituicao: 'Faculdade Exemplo',
        inicio: '2023-02',
        fim: '2026-12',
        situacao: 'cursando',
      },
    ],
    projetos: [
      {
        nome: 'Painel de tarefas',
        contexto: 'academico',
        descricao:
          'Construí um painel de tarefas em React com filtros, rotas protegidas e testes de componentes.',
        tecnologias: ['React', 'Vite', 'CSS'],
      },
    ],
    habilidades: [
      'React',
      'JavaScript',
      'TypeScript',
      'HTML',
      'CSS',
      'Git',
      'APIs REST',
      'Acessibilidade',
    ],
    competencias: ['Trabalho em equipe', 'Comunicação', 'Organização'],
    idiomas: [{ idioma: 'Inglês', nivel: 'intermediario' }],
    certificacoes: [
      { nome: 'JavaScript Moderno', instituicao: 'Curso Online Exemplo', ano: '2024' },
    ],
    atividades: ['Voluntária na organização de hackathon acadêmico'],
  },
  {
    // Versão fraca de propósito: boa para mostrar a otimização aumentando a nota
    nome: 'Ana Demonstração',
    cargoAlvo: 'Assistente Administrativo',
    email: 'ana.demo@exemplo.com',
    cidade: 'São Paulo, SP',
    resumo: 'Pessoa organizada buscando oportunidade.',
    experiencias: [
      {
        cargo: 'Auxiliar Administrativo',
        empresa: 'Escritório Fictício Ltda.',
        inicio: '2022-01',
        fim: '2024-12',
        descricao: 'responsável por planilhas, atendimento e arquivo de documentos',
      },
    ],
    formacoes: [
      {
        curso: 'Técnico em Administração',
        instituicao: 'Escola Técnica Exemplo',
        situacao: 'concluido',
      },
    ],
    habilidades: ['Excel', 'Word'],
  },
  {
    nome: 'Ana Demonstração',
    cargoAlvo: 'Analista de Dados Júnior',
    email: 'ana.demo@exemplo.com',
    cidade: 'São Paulo, SP',
    resumo:
      'Estudante de tecnologia com interesse em dados. Uso SQL e Excel para montar relatórios.',
    experiencias: [
      {
        cargo: 'Estagiária de Desenvolvimento Front-end',
        empresa: 'Loja Fictícia S.A.',
        inicio: '2025-02',
        atual: true,
        descricao:
          'Montei relatórios semanais de vendas em Excel e consultas SQL para a equipe comercial.',
      },
    ],
    formacoes: [
      {
        curso: 'Análise e Desenvolvimento de Sistemas',
        instituicao: 'Faculdade Exemplo',
        situacao: 'cursando',
      },
    ],
    habilidades: ['SQL', 'Excel', 'Python'],
    idiomas: [{ idioma: 'Inglês', nivel: 'intermediario' }],
  },
];

const CANDIDATURAS = [
  {
    curriculo: 0,
    empresa: 'Tech Exemplo',
    cargo: 'Desenvolvedora Front-end Júnior',
    status: 'entrevista',
    compatibilidade: 82,
    notas: 'Entrevista técnica marcada.',
  },
  {
    curriculo: 0,
    empresa: 'Startup Fictícia',
    cargo: 'Estágio em Front-end',
    status: 'aplicado',
    compatibilidade: 74,
  },
  {
    curriculo: 1,
    empresa: 'Escritório Modelo',
    cargo: 'Assistente Administrativo',
    status: 'rejeitado',
    compatibilidade: 41,
    notas: 'Currículo antigo, antes da otimização.',
  },
  {
    curriculo: 2,
    empresa: 'Dados & Cia (fictícia)',
    cargo: 'Analista de Dados Júnior',
    status: 'oferta',
    compatibilidade: 68,
  },
];

let acesso = await chamar('POST', '/auth/entrar', { email: EMAIL, senha: SENHA });
if (acesso.status === 401)
  acesso = await chamar('POST', '/auth/cadastro', {
    nome: 'Ana Demonstração',
    email: EMAIL,
    senha: SENHA,
  });
if (!cookie) {
  console.error(
    `Não foi possível entrar na conta de demonstração (HTTP ${acesso.status}).`,
    acesso.dados ?? '',
  );
  console.error(`A API está rodando em ${API}?`);
  process.exit(1);
}

const existentes = await chamar('GET', '/curriculos');
if (existentes.dados.length > 0) {
  console.log(`A conta ${EMAIL} já tem ${existentes.dados.length} currículo(s). Nada foi criado.`);
  console.log('Para recomeçar, exclua a conta em "Minha conta" e rode npm run demo de novo.');
  process.exit(0);
}

const ids = [];
for (const curriculo of CURRICULOS) {
  const { status, dados } = await chamar('POST', '/curriculos', curriculo);
  if (status !== 201)
    throw new Error(
      `Currículo "${curriculo.cargoAlvo}" recusado (HTTP ${status}): ${JSON.stringify(dados)}`,
    );
  ids.push(dados.id);
  console.log(`Currículo: ${dados.cargoAlvo} (nota ATS ${dados.pontuacao}/100)`);
}
for (const { curriculo, ...vaga } of CANDIDATURAS) {
  const { status, dados } = await chamar('POST', '/vagas', {
    ...vaga,
    curriculoId: ids[curriculo],
  });
  if (status !== 201)
    throw new Error(
      `Candidatura "${vaga.empresa}" recusada (HTTP ${status}): ${JSON.stringify(dados)}`,
    );
  console.log(`Candidatura: ${vaga.cargo} em ${vaga.empresa} (${vaga.status})`);
}

console.log(`\nPronto. Entre no frontend com ${EMAIL} / ${SENHA}`);
