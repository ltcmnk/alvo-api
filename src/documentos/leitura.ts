/*
 * Leitura de currículo existente (PDF ou DOCX). O arquivo é lido em memória e descartado:
 * nada é salvo, o usuário só aproveita o conteúdo para preencher o formulário.
 */
import { BadRequestException } from '@nestjs/common';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import { normalizar } from '../ats/palavras-chave.js';
import type {
  ConteudoCurriculo,
  Experiencia,
  Formacao,
  Idioma,
} from '../curriculos/interfaces/curriculo.interface.js';

/** Arquivo como chega do multer (em memória). */
export interface ArquivoRecebido {
  originalname: string;
  buffer: Buffer;
  size: number;
}

// Abaixo disso o PDF provavelmente é uma imagem escaneada, sem texto selecionável
const MINIMO_TEXTO = 80;

/** Confere o tipo pelo conteúdo (assinatura do arquivo), não só pela extensão. */
function tipoDoArquivo(arquivo: ArquivoRecebido): 'pdf' | 'docx' {
  const inicio = arquivo.buffer.subarray(0, 4).toString('latin1');
  if (inicio === '%PDF') return 'pdf';
  if (inicio.startsWith('PK') && /\.docx$/i.test(arquivo.originalname)) return 'docx';
  throw new BadRequestException(
    'Envie um arquivo PDF ou DOCX. Arquivos .doc antigos: salve como .docx no Word.',
  );
}

/** Extrai o texto puro do arquivo. */
export async function extrairTexto(arquivo: ArquivoRecebido): Promise<string> {
  let texto: string;
  if (tipoDoArquivo(arquivo) === 'pdf') {
    const parser = new PDFParse({ data: arquivo.buffer });
    try {
      texto = (await parser.getText()).text;
    } finally {
      await parser.destroy();
    }
  } else {
    texto = (await mammoth.extractRawText({ buffer: arquivo.buffer })).value;
  }
  // Remove marcadores de página do pdf-parse ("-- 1 of 2 --") e espaços sobrando
  texto = texto
    .replace(/^-- \d+ of \d+ --$/gm, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (texto.length < MINIMO_TEXTO) {
    throw new BadRequestException(
      'Não encontramos texto no arquivo. Se for uma imagem escaneada, cole o texto ou preencha o formulário.',
    );
  }
  return texto;
}

type IdBloco =
  | 'resumo'
  | 'experiencias'
  | 'formacoes'
  | 'habilidades'
  | 'idiomas'
  | 'certificacoes'
  | 'projetos'
  | 'atividades';

const TITULOS_SECAO: [RegExp, IdBloco][] = [
  [/^(resumo|perfil|objetivo|sobre mim|apresentacao)/, 'resumo'],
  [/^(experiencia|historico profissional|atuacao profissional)/, 'experiencias'],
  [/^(formacao|educacao|escolaridade)/, 'formacoes'],
  [/^(habilidades|competencias|conhecimentos|skills|ferramentas|tecnologias)/, 'habilidades'],
  [/^(idiomas|linguas)/, 'idiomas'],
  [/^(certifica|cursos)/, 'certificacoes'],
  [/^projetos/, 'projetos'],
  [/^(atividades|voluntari|informacoes adicionais)/, 'atividades'],
];

const DATA =
  /(\d{2}\/\d{4}|\d{4})\s*(?:-|–|—|a|até)\s*(\d{2}\/\d{4}|\d{4}|atual|o momento|presente|hoje)/i;
// Formação costuma ter só o ano de conclusão no fim da linha ("Administração 2018")
const DATA_UNICA = /\s(\d{2}\/\d{4}|\d{4})$/;
const MARCADOR = /^[-–—•*·▪●]\s*/;

/** Divide o texto em blocos pelos títulos de seção mais comuns em currículos. */
function separarBlocos(linhas: string[]): { topo: string[]; blocos: Map<IdBloco, string[]> } {
  const blocos = new Map<IdBloco, string[]>();
  const topo: string[] = [];
  let atual: IdBloco | null = null;
  linhas.forEach((linha) => {
    // "Ferramentas: Excel" é conteúdo, não título: título não tem texto depois dos dois-pontos
    const titulo =
      linha.length <= 40 && !/:\s*\S/.test(linha)
        ? TITULOS_SECAO.find(([padrao]) => padrao.test(normalizar(linha).trim()))?.[1]
        : undefined;
    if (titulo) {
      atual = titulo;
      blocos.set(titulo, blocos.get(titulo) ?? []);
    } else if (atual) {
      blocos.get(atual)!.push(linha);
    } else {
      topo.push(linha);
    }
  });
  return { topo, blocos };
}

/** "03/2021" → "2021-03"; "2021" → "2021". */
function paraMesAno(data: string): string {
  const [mes, ano] = data.split('/');
  return ano ? `${ano}-${mes}` : mes;
}

interface ItemDatado {
  /** Linhas antes da linha com data (ex.: empresa e cidade). */
  anteriores: string[];
  /** Texto da própria linha da data, sem a data (ex.: cargo). */
  daLinha: string;
  inicio?: string;
  fim?: string;
  atual: boolean;
  descricao: string[];
}

/** Lê a data de uma linha: intervalo ("03/2019 – Atual") ou, se permitido, um ano só no fim. */
function lerData(
  linha: string,
  aceitaUnica: boolean,
): Omit<ItemDatado, 'anteriores' | 'descricao'> | null {
  const intervalo = linha.match(DATA);
  if (intervalo) {
    const atual = /atual|momento|presente|hoje/i.test(intervalo[2]);
    return {
      daLinha: linha
        .replace(DATA, '')
        .replace(/[|·,–—-]\s*$/, '')
        .trim(),
      inicio: paraMesAno(intervalo[1]),
      fim: atual ? undefined : paraMesAno(intervalo[2]),
      atual,
    };
  }
  const unica = aceitaUnica ? linha.match(DATA_UNICA) : null;
  return unica
    ? { daLinha: linha.replace(DATA_UNICA, '').trim(), fim: paraMesAno(unica[1]), atual: false }
    : null;
}

/** Itens que têm uma linha de datas: o que vem antes é cabeçalho, o que vem depois é descrição. */
function itensComDatas(linhas: string[], aceitaUnica = false): ItemDatado[] {
  const itens: ItemDatado[] = [];
  let pendente: string[] = [];
  linhas.forEach((linha) => {
    const data = lerData(linha, aceitaUnica);
    if (data) {
      itens.push({ ...data, anteriores: pendente, descricao: [] });
      pendente = [];
    } else if (itens.length && (MARCADOR.test(linha) || linha.length > 60)) {
      itens[itens.length - 1].descricao.push(linha.replace(MARCADOR, ''));
    } else {
      pendente.push(linha);
    }
  });
  return itens;
}

/** "Cargo — Empresa" ou "Empresa | Cidade": separa as partes mais comuns. */
function partes(texto: string): string[] {
  return texto
    .split(/\s+(?:\||—|–|-|@|em)\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * Dois layouts comuns: "Empresa — Cidade" numa linha e "Cargo — datas" na seguinte (padrão do Alvo),
 * ou tudo numa linha só: "Cargo — Empresa — datas".
 */
function lerExperiencias(linhas: string[]): Experiencia[] {
  return itensComDatas(linhas).map((item) => {
    const descricao = item.descricao.join('\n') || undefined;
    const datas = { inicio: item.inicio, fim: item.fim, atual: item.atual, descricao };
    if (item.anteriores.length) {
      const [empresa = 'Empresa', local] = partes(item.anteriores.join(' | '));
      return { cargo: item.daLinha || 'Cargo', empresa, local, ...datas };
    }
    const [cargo = 'Cargo', empresa = 'Empresa', local] = partes(item.daLinha);
    return { cargo, empresa, local, ...datas };
  });
}

function lerFormacoes(linhas: string[]): Formacao[] {
  return itensComDatas(linhas, true).map((item) => {
    const cursando = /andamento|cursando/i.test(item.daLinha) || item.atual;
    const curso = item.daLinha.replace(/\((em andamento|cursando|trancado)\)/i, '').trim();
    const [instituicao = 'Instituição'] = item.anteriores.length
      ? partes(item.anteriores.join(' | '))
      : partes(curso).slice(1);
    return {
      curso: (item.anteriores.length ? curso : partes(curso)[0]) || 'Curso',
      instituicao,
      // Curso em andamento com um ano só: esse ano é o de início
      inicio: item.inicio ?? (cursando ? item.fim : undefined),
      fim: item.inicio || !cursando ? item.fim : undefined,
      situacao: cursando ? 'cursando' : 'concluido',
    };
  });
}

const NIVEL: [RegExp, Idioma['nivel']][] = [
  [/nativ/, 'nativo'],
  [/fluente|c2|c1/, 'fluente'],
  [/avancad|b2/, 'avancado'],
  [/intermediari|b1/, 'intermediario'],
  [/basic|a1|a2/, 'basico'],
];

function lerIdiomas(linhas: string[]): Idioma[] {
  return linhas.map((linha) => {
    const normal = normalizar(linha);
    return {
      idioma: linha.split(/[-–:(|]/)[0].trim(),
      nivel: NIVEL.find(([padrao]) => padrao.test(normal))?.[1],
    };
  });
}

/** Lista separada por vírgula, ponto e vírgula, barra ou marcador, sem prefixo "Categoria:". */
function lerLista(linhas: string[]): string[] {
  const itens = linhas.flatMap((l) => l.replace(/^[^:]{2,30}:\s*/, '').split(/[,;|•·]/));
  return [
    ...new Set(
      itens
        .map((i) => i.replace(MARCADOR, '').trim())
        .filter((i) => i.length > 1 && i.length <= 60),
    ),
  ];
}

/** Linhas "Comportamentais: ..." ou "Soft skills: ..." viram competências comportamentais. */
const ehComportamental = (linha: string) =>
  linha.includes(':') &&
  /^(comportamentais|soft skills|competencias comportamentais)$/.test(
    normalizar(linha.split(':')[0]).trim(),
  );

/**
 * Organiza o texto extraído nos campos do currículo usando só regras (sem IA).
 * Acerta contatos e seções na maioria dos currículos de uma coluna; o usuário confere no formulário.
 */
export function estruturarPorRegras(texto: string): ConteudoCurriculo {
  const linhas = texto
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const { topo, blocos } = separarBlocos(linhas);
  const url = (padrao: RegExp) => texto.match(padrao)?.[0].replace(/^(?!https?:\/\/)/, 'https://');
  const experiencias = lerExperiencias(blocos.get('experiencias') ?? []);

  return {
    nome: topo.find((l) => !/[@\d|]/.test(l)) ?? '',
    cargoAlvo: experiencias[0]?.cargo ?? '',
    email: texto.match(/[\w.+-]+@[\w-]+\.[\w.]+/)?.[0],
    telefone: texto.match(/\(?\d{2}\)?\s?9?\d{4}[-\s]?\d{4}/)?.[0],
    linkedin: url(/(https?:\/\/)?(www\.)?linkedin\.com\/in\/[\w%-]+\/?/i),
    github: url(/(https?:\/\/)?(www\.)?github\.com\/[\w-]+\/?/i),
    resumo: blocos.get('resumo')?.join(' '),
    experiencias,
    formacoes: lerFormacoes(blocos.get('formacoes') ?? []),
    projetos: (blocos.get('projetos') ?? []).length
      ? [{ nome: 'Projetos (confira e separe)', descricao: blocos.get('projetos')!.join('\n') }]
      : [],
    habilidades: lerLista((blocos.get('habilidades') ?? []).filter((l) => !ehComportamental(l))),
    competencias: lerLista((blocos.get('habilidades') ?? []).filter(ehComportamental)),
    idiomas: lerIdiomas(blocos.get('idiomas') ?? []),
    certificacoes: (blocos.get('certificacoes') ?? []).map((nome) => ({ nome })),
    atividades: (blocos.get('atividades') ?? []).map((l) => l.replace(MARCADOR, '')),
  };
}
