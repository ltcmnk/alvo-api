/*
 * Nota ATS de 0 a 100, calculada por regras (não pela IA) para ser estável e explicável:
 * o mesmo currículo sempre recebe a mesma nota, e o "antes → depois" da otimização é comparável.
 * As dicas nunca pedem para inventar: números e resultados só se forem reais.
 */
import type { ConteudoCurriculo } from '../curriculos/interfaces/curriculo.interface.js';
import type { PalavraChaveVaga } from './analise-vaga.js';
import { paraBullets } from './documento.js';
import { normalizar, termosNoTexto } from './palavras-chave.js';

export interface Criterio {
  id: 'secoes' | 'palavrasChave' | 'impacto' | 'formatacao';
  nome: string;
  /** Nota do critério, de 0 a 100. */
  nota: number;
  /** Peso na nota final (soma 100). */
  peso: number;
  dicas: string[];
}

export interface PontuacaoAts {
  total: number;
  criterios: Criterio[];
}

// Verbos que abrem bullets fortes, em várias conjugações comuns em currículos brasileiros
const VERBOS_ACAO =
  /^(desenvolv|implement|estrutur|automatiz|model|integr|otimiz|projet|analis|coorden|configur|document|mant|apoi|cri|lider|gerenci|planej|reduz|aument|melhor|conduz|organiz|elabor|atend|negoci|vend|prospect|treina|capacit|ensin|supervision|executa|execut|realiz|produz|redig|escrev|pesquis|test|entreg|lanç|lanc|migr|constru|administr|control|acompanh|coord|propus|propo|monitor|padroniz|mapea|mape|facilit|ger)/;

function nota(acertos: number, total: number): number {
  return total === 0 ? 0 : Math.round((acertos / total) * 100);
}

function criterioSecoes(c: ConteudoCurriculo): Criterio {
  const checagens: [boolean, string][] = [
    [Boolean(c.email && c.telefone), 'Inclua e-mail e telefone no cabeçalho.'],
    [
      (c.resumo?.length ?? 0) >= 150,
      'Escreva um resumo de 3 a 5 linhas com área, principais competências e objetivo.',
    ],
    [
      c.experiencias.length + c.projetos.length > 0,
      'Adicione experiências ou projetos: estágios, freelas e projetos acadêmicos contam.',
    ],
    [c.formacoes.length > 0, 'Adicione sua formação (curso, instituição e período).'],
    [c.habilidades.length >= 5, 'Liste pelo menos 5 competências técnicas que você realmente usa.'],
  ];
  return {
    id: 'secoes',
    nome: 'Seções essenciais',
    nota: nota(checagens.filter(([ok]) => ok).length, checagens.length),
    peso: 25,
    dicas: checagens.filter(([ok]) => !ok).map(([, dica]) => dica),
  };
}

/** Texto inteiro do currículo, para buscar palavras-chave onde quer que estejam. */
export function textoDoCurriculo(c: ConteudoCurriculo): string {
  return [
    c.cargoAlvo,
    c.resumo,
    ...c.habilidades,
    ...c.competencias,
    ...c.experiencias.flatMap((e) => [e.cargo, e.descricao]),
    ...c.projetos.flatMap((p) => [p.nome, p.descricao, ...(p.tecnologias ?? [])]),
    ...c.formacoes.map((f) => f.curso),
    ...c.certificacoes.map((cert) => cert.nome),
    ...c.idiomas.map((i) => i.idioma),
    ...c.atividades,
  ]
    .filter(Boolean)
    .join('\n');
}

function criterioPalavrasChave(c: ConteudoCurriculo, vaga?: PalavraChaveVaga[]): Criterio {
  const texto = normalizar(textoDoCurriculo(c));
  if (vaga && vaga.length > 0) {
    // Termos de importância alta valem o dobro: são os que o recrutador filtra no ATS
    const peso = (p: PalavraChaveVaga) => (p.importancia === 'alta' ? 2 : 1);
    const presente = (p: PalavraChaveVaga) => texto.includes(` ${normalizar(p.termo).trim()} `);
    const faltam = vaga
      .filter((p) => !presente(p) && p.importancia !== 'baixa')
      .map((p) => p.termo);
    const total = vaga.reduce((soma, p) => soma + peso(p), 0);
    const atingido = vaga.filter(presente).reduce((soma, p) => soma + peso(p), 0);
    return {
      id: 'palavrasChave',
      nome: 'Palavras-chave da vaga',
      nota: nota(atingido, total),
      peso: 30,
      dicas: faltam.length
        ? [
            `Se fizer parte da sua experiência, cite onde você usou: ${faltam.slice(0, 6).join(', ')}.`,
          ]
        : [],
    };
  }
  const reconhecidas = termosNoTexto(texto).length;
  return {
    id: 'palavrasChave',
    nome: 'Palavras-chave da área',
    nota: Math.min(100, reconhecidas * 10),
    peso: 30,
    dicas:
      reconhecidas < 10
        ? [
            'Use os nomes padrão das ferramentas e métodos que você domina (ex.: "Excel avançado", "Power BI", "Scrum").',
          ]
        : [],
  };
}

function criterioImpacto(c: ConteudoCurriculo): Criterio {
  const bullets = [...c.experiencias, ...c.projetos].flatMap((item) => paraBullets(item.descricao));
  if (bullets.length === 0) {
    return {
      id: 'impacto',
      nome: 'Impacto das descrições',
      nota: 0,
      peso: 25,
      dicas: ['Descreva o que você fez em cada experiência ou projeto, uma ação por linha.'],
    };
  }
  const comVerbo = bullets.filter((b) => VERBOS_ACAO.test(normalizar(b).trim())).length;
  const comResultado = bullets.filter((b) => /\d/.test(b)).length;
  const dicas: string[] = [];
  if (comVerbo < bullets.length)
    dicas.push(
      'Comece cada linha com um verbo de ação: desenvolvi, implementei, organizei, atendi, analisei.',
    );
  if (comResultado === 0)
    dicas.push(
      'Se houver números reais (prazos, volume, %, R$), inclua-os. Não estime o que não foi medido.',
    );
  return {
    id: 'impacto',
    nome: 'Impacto das descrições',
    // Verbo de ação pesa mais: resultado numérico nem sempre existe, e não pode ser inventado
    nota: Math.round(
      nota(comVerbo, bullets.length) * 0.7 +
        Math.min(100, nota(comResultado, bullets.length) * 2) * 0.3,
    ),
    peso: 25,
    dicas,
  };
}

function criterioFormatacao(c: ConteudoCurriculo): Criterio {
  const datadas = [...c.experiencias, ...c.formacoes];
  const bullets = [...c.experiencias, ...c.projetos].flatMap((item) => paraBullets(item.descricao));
  const checagens: [boolean, string][] = [
    [
      datadas.every((item) => item.inicio || item.fim),
      'Informe as datas de todas as experiências e formações.',
    ],
    [
      bullets.every((b) => b.length <= 300),
      'Quebre descrições longas em linhas curtas (até 2 linhas cada).',
    ],
    [(c.resumo?.length ?? 0) <= 800, 'Encurte o resumo para 3 a 5 linhas.'],
    [
      !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}★☆]/u.test(textoDoCurriculo(c)),
      'Remova emojis e símbolos decorativos.',
    ],
  ];
  return {
    id: 'formatacao',
    nome: 'Formatação e legibilidade',
    nota: nota(checagens.filter(([ok]) => ok).length, checagens.length),
    peso: 20,
    dicas: checagens.filter(([ok]) => !ok).map(([, dica]) => dica),
  };
}

/**
 * Pontua o currículo para leitura por ATS.
 * @param curriculo - Conteúdo do currículo.
 * @param palavrasVaga - Palavras-chave da vaga, quando houver; sem elas, mede termos da área.
 */
export function pontuarAts(
  curriculo: ConteudoCurriculo,
  palavrasVaga?: PalavraChaveVaga[],
): PontuacaoAts {
  const criterios = [
    criterioSecoes(curriculo),
    criterioPalavrasChave(curriculo, palavrasVaga),
    criterioImpacto(curriculo),
    criterioFormatacao(curriculo),
  ];
  const total = Math.round(criterios.reduce((soma, c) => soma + (c.nota * c.peso) / 100, 0));
  return { total, criterios };
}
