/*
 * Dicionário de palavras-chave por categoria e funções de busca em texto.
 *
 * O Alvo atende qualquer área (não só tecnologia), então o dicionário cobre vários setores.
 * É usado em três lugares: análise automática da vaga, pontuação ATS e agrupamento das
 * competências no currículo exportado. Termo que não está aqui não é descartado: vai para
 * "Outras" no agrupamento e para "Outros termos da vaga" na análise.
 *
 * Formato de cada entrada: "Nome exibido|sinônimo|sinônimo". A busca ignora acentos e caixa.
 */

export const CATEGORIAS = {
  Linguagens:
    'Python;JavaScript;TypeScript;Java;C#;C++;Golang;Kotlin;Swift;PHP;Ruby;Rust;Dart;Scala;HTML;CSS;Bash|Shell Script;VBA',
  'Frameworks e Bibliotecas':
    'React|React.js|ReactJS;Angular;Vue.js|Vue;Next.js|NextJS;Node.js|NodeJS;NestJS;Express;Spring Boot|Spring;Django;Flask;FastAPI;.NET|dotnet;Laravel;Flutter;React Native;pandas;NumPy;scikit-learn|sklearn;TensorFlow;PyTorch;Bootstrap;Tailwind|Tailwind CSS;jQuery;Jest;Cypress',
  Ferramentas:
    'Git;GitHub;GitLab;Jira;Trello;Notion;Figma;Sketch;Adobe XD;Photoshop;Illustrator;InDesign;Premiere;After Effects;Canva;Excel|Microsoft Excel;Excel avançado;Power BI;Tableau;Looker;Google Analytics;Google Tag Manager;SAP;TOTVS;Protheus;Salesforce;HubSpot;RD Station;Pacote Office|Microsoft Office;Microsoft 365|Office 365;Google Workspace;AutoCAD;Revit;SketchUp;SolidWorks;Postman;VS Code|VSCode;Slack;Zendesk;Miro;Asana;Monday;ERP;Tasy;MV Soul',
  Dados:
    'Análise de dados;Ciência de dados;Machine Learning|aprendizado de máquina;Inteligência Artificial|IA generativa;Estatística;ETL;Big Data;Data Warehouse;Dashboards|dashboard;Indicadores|KPIs|KPI;Business Intelligence;Testes A/B|A/B testing|teste A/B;Métricas de produto;Visualização de dados;Modelagem preditiva',
  'Cloud e Infraestrutura':
    'AWS|Amazon Web Services;Azure;Google Cloud|GCP;Docker;Kubernetes;Linux;CI/CD;Terraform;Redes de computadores;DevOps;Microsserviços|microservices;Suporte técnico;Active Directory;Windows Server;ITIL;Segurança da informação',
  'Banco de Dados':
    'SQL;PostgreSQL|Postgres;MySQL;MongoDB;Oracle;SQL Server;Redis;Firebase;Modelagem de dados;NoSQL',
  Automação:
    'RPA;Power Automate;Google Apps Script;Selenium;Zapier;n8n;Automação de processos;Macros',
  'Metodologias e Conceitos':
    'Scrum;Kanban;Metodologias ágeis|ágil|agile;Design Thinking;Lean;Six Sigma;OKR|OKRs;API REST|APIs REST|REST;GraphQL;Testes automatizados;TDD;Clean Code;Arquitetura de software;Design System;Pesquisa com usuários|UX Research;Acessibilidade;SEO;PDCA;5S;LGPD;Melhoria contínua;Gestão de riscos;Mensageria|Kafka|RabbitMQ',
  Design:
    'UI Design|UI;UX Design|UX;Prototipação|protótipos;Wireframes|wireframe;Design gráfico;Identidade visual;Motion design;Edição de vídeo;Fotografia;Design de produto;Usabilidade',
  'Marketing e Vendas':
    'Marketing digital;Tráfego pago;Google Ads;Meta Ads;Mídias sociais|redes sociais;Inbound marketing;Branding;Copywriting;E-mail marketing;Produção de conteúdo;CRM;Vendas consultivas;Vendas B2B;Vendas B2C;Prospecção;Funil de vendas;Atendimento ao cliente;Customer Success;Pós-venda;E-commerce;Trade marketing',
  'Gestão e Negócios':
    'Gestão de projetos;Gestão de pessoas;Planejamento estratégico;Orçamento;Gestão de estoque;Logística;Supply Chain|cadeia de suprimentos;Compras;Processos administrativos;Rotinas administrativas;Gestão de contratos;Indicadores de desempenho;Atendimento ao público;Gestão de fornecedores;Análise de negócios',
  'Finanças e Contabilidade':
    'Contabilidade;Finanças;Fluxo de caixa;Conciliação bancária;Contas a pagar;Contas a receber;Faturamento;Análise financeira;Controladoria;Auditoria;Compliance;Tributário|apuração de impostos;DRE;Custos',
  'Pessoas e RH':
    'Recrutamento e seleção|recrutamento;Departamento pessoal;Folha de pagamento;Treinamento e desenvolvimento;Onboarding;Clima organizacional;Benefícios;eSocial;Employer branding;People Analytics',
  'Saúde, Educação e Jurídico':
    'Atendimento humanizado;Prontuário eletrônico;Primeiros socorros;Biossegurança;Enfermagem;Farmacologia;Docência;Planejamento de aulas;Ensino a distância|EAD;Educação inclusiva;Direito civil;Direito trabalhista;Peticionamento;Contratos;Pesquisa jurisprudencial',
  'Soft skills':
    'Comunicação;Liderança;Trabalho em equipe;Colaboração;Proatividade;Organização;Resolução de problemas;Pensamento crítico;Negociação;Adaptabilidade|flexibilidade;Empatia;Gestão do tempo;Criatividade;Oratória|apresentações;Autonomia;Visão de negócio;Inteligência emocional',
  Idiomas: 'Inglês|english;Espanhol|spanish;Francês;Alemão;Italiano;Mandarim;Japonês;Libras',
  'Áreas de atuação':
    'Back-end|backend;Front-end|frontend;Full Stack|fullstack;Desenvolvimento mobile|mobile;Fintech;SaaS;Varejo;Agronegócio;Setor público;Healthtech;Edtech',
} as const;

export type Categoria = keyof typeof CATEGORIAS;

export interface TermoDicionario {
  nome: string;
  categoria: Categoria;
  /** Formas normalizadas (nome + sinônimos) usadas na busca. */
  formas: string[];
}

/** Minúsculas, sem acentos e sem pontuação de borda: "Análise." vira "analise". */
export function normalizar(texto: string): string {
  return ` ${texto}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9+#./]+/g, ' ')
    .replace(/[./]+(?=\s|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .concat(' ');
}

/** Dicionário achatado: ";" separa termos e "|" separa sinônimos do mesmo termo. */
export const DICIONARIO: TermoDicionario[] = Object.entries(CATEGORIAS).flatMap(
  ([categoria, lista]) =>
    lista.split(';').map((termo) => {
      const formas = termo.split('|');
      return {
        nome: formas[0],
        categoria: categoria as Categoria,
        formas: formas.map((forma) => normalizar(forma).trim()),
      };
    }),
);

/**
 * Diz se o texto (já normalizado) contém alguma forma do termo como palavra inteira.
 * "Java" não casa com "JavaScript" porque a busca exige espaço dos dois lados.
 */
export function contemTermo(textoNormalizado: string, termo: TermoDicionario): boolean {
  return termo.formas.some((forma) => textoNormalizado.includes(` ${forma} `));
}

/** Termos do dicionário presentes no texto, sem repetição. */
export function termosNoTexto(texto: string): TermoDicionario[] {
  const normalizado = normalizar(texto);
  return DICIONARIO.filter((termo) => contemTermo(normalizado, termo));
}

/** Procura o termo do dicionário que corresponde a uma habilidade digitada pelo usuário. */
export function buscarNoDicionario(habilidade: string): TermoDicionario | undefined {
  const forma = normalizar(habilidade).trim();
  return DICIONARIO.find((termo) => termo.formas.includes(forma));
}

/** Quantas vezes uma forma do termo aparece (para medir a importância na vaga). */
export function contarOcorrencias(textoNormalizado: string, termo: TermoDicionario): number {
  return termo.formas.reduce(
    (total, forma) => total + (textoNormalizado.split(` ${forma} `).length - 1),
    0,
  );
}
