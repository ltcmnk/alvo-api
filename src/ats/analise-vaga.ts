import { DICIONARIO, contarOcorrencias, contemTermo, normalizar } from './palavras-chave.js';
import type { Categoria } from './palavras-chave.js';

export type Importancia = 'alta' | 'media' | 'baixa';

export interface PalavraChaveVaga {
  termo: string;
  categoria: Categoria | 'Outros termos da vaga';
  importancia: Importancia;
}

export interface RequisitoVaga {
  texto: string;
  tipo: 'obrigatorio' | 'desejavel';
}

export interface AnaliseVaga {
  cargo?: string;
  senioridade?: string;
  /** Área de atuação que mais aparece nos termos da vaga (ex.: Dados, Finanças). */
  area?: string;
  requisitos: RequisitoVaga[];
  palavrasChave: PalavraChaveVaga[];
}

type Bloco = 'obrigatorio' | 'desejavel' | 'outro';

// Cabeçalhos comuns em anúncios brasileiros (Gupy, LinkedIn, Catho...)
const CABECALHO_OBRIGATORIO =
  /requisito|qualifica|o que (voce precisa|buscamos|esperamos)|necessari|exigid|voce (tem|possui)|pre-requisito|perfil/;
const CABECALHO_DESEJAVEL =
  /diferencia|desejave|seria (legal|otimo)|plus|bonus|nice to have|sera um/;
const CABECALHO_OUTRO =
  /atividade|responsabilidade|o que voce (vai|ira) fazer|beneficio|sobre (a|nos)|local|jornada|salario|como sera/;

const SENIORIDADES: [RegExp, string][] = [
  [/\bestagi/, 'Estágio'],
  [/\btrainee\b/, 'Trainee'],
  [/\baprendiz\b/, 'Jovem aprendiz'],
  [/\bjunior\b|\bjr\b/, 'Júnior'],
  [/\bpleno\b|\bpl\b/, 'Pleno'],
  [/\bsenior\b|\bsr\b/, 'Sênior'],
  [/\bespecialista\b/, 'Especialista'],
  [/\b(coordenador|coordenadora|gerente|head)\b/, 'Liderança'],
];

/** Linha curta sem marcador e terminada em ":" (ou só texto curto) costuma ser cabeçalho de seção. */
function classificarCabecalho(linha: string): Bloco | null {
  const normal = normalizar(linha);
  const pareceCabecalho = linha.length <= 60 && !/^[-•*·▪●]/.test(linha);
  if (!pareceCabecalho) return null;
  if (CABECALHO_DESEJAVEL.test(normal)) return 'desejavel';
  if (CABECALHO_OBRIGATORIO.test(normal)) return 'obrigatorio';
  if (CABECALHO_OUTRO.test(normal) || linha.endsWith(':')) return 'outro';
  return null;
}

/** Itens de lista dentro dos blocos de requisitos e diferenciais. */
export function extrairRequisitos(descricao: string): RequisitoVaga[] {
  const requisitos: RequisitoVaga[] = [];
  let bloco: Bloco = 'outro';
  for (const bruta of descricao.split(/\r?\n/)) {
    const linha = bruta.trim();
    if (!linha) continue;
    const cabecalho = classificarCabecalho(linha);
    if (cabecalho) {
      bloco = cabecalho;
      continue;
    }
    const texto = linha.replace(/^[-•*·▪●\d.)\s]+/, '').trim();
    if (bloco !== 'outro' && texto.length >= 4) requisitos.push({ texto, tipo: bloco });
  }
  return requisitos.slice(0, 25);
}

/** Primeira linha curta costuma ser o título da vaga. */
function extrairCargo(descricao: string): string | undefined {
  const primeira = descricao.trim().split(/\r?\n/)[0]?.trim() ?? '';
  return primeira.length > 0 && primeira.length <= 80 ? primeira.replace(/[:.]$/, '') : undefined;
}

/** Siglas e nomes próprios da vaga que o dicionário não conhece (ex.: "Gupy", "SAP B1"). */
function termosDesconhecidos(descricao: string, conhecidos: Set<string>): string[] {
  const candidatos = descricao.match(/\b([A-Z]{2,6}|[A-Z][a-z]+[A-Z][A-Za-z]+)\b/g) ?? [];
  const unicos = [...new Set(candidatos)];
  return (
    unicos
      // "BI" sozinho é pedaço de "Power BI": não conta como termo novo
      .filter((termo) => {
        const forma = normalizar(termo).trim();
        return ![...conhecidos].some((conhecido) => conhecido.split(' ').includes(forma));
      })
      .filter(
        (termo) => !/^(CLT|PJ|VR|VA|PLR|CNH|LGBT|PCD|RH|CV|SP|RJ|MG|PR|RS|SC|BA|PE)$/.test(termo),
      )
      .slice(0, 8)
  );
}

function definirImportancia(
  ocorrencias: number,
  emRequisito: boolean,
  emDiferencial: boolean,
): Importancia {
  if (emRequisito || ocorrencias >= 2) return 'alta';
  if (emDiferencial) return 'baixa';
  return 'media';
}

/**
 * Análise automática da descrição da vaga, sem IA: é instantânea e roda a cada digitação.
 * A IA, quando escolhida, aprofunda esta análise no relatório de compatibilidade.
 */
export function analisarVaga(descricao: string): AnaliseVaga {
  const normalizado = normalizar(descricao);
  const requisitos = extrairRequisitos(descricao);
  const textoObrigatorio = normalizar(
    requisitos
      .filter((r) => r.tipo === 'obrigatorio')
      .map((r) => r.texto)
      .join(' '),
  );
  const textoDesejavel = normalizar(
    requisitos
      .filter((r) => r.tipo === 'desejavel')
      .map((r) => r.texto)
      .join(' '),
  );

  const todos = DICIONARIO.filter((termo) => contemTermo(normalizado, termo));
  // "Excel" some quando "Excel avançado" também aparece: o termo mais específico já cobre o geral
  const contido = (curto: string, longo: string) =>
    curto !== longo && ` ${longo} `.includes(` ${curto} `);
  const encontrados = todos.filter(
    (termo) =>
      !todos.some((outro) =>
        outro.formas.some((longa) => termo.formas.some((curta) => contido(curta, longa))),
      ),
  );
  const palavrasChave: PalavraChaveVaga[] = encontrados.map((termo) => ({
    termo: termo.nome,
    categoria: termo.categoria,
    importancia: definirImportancia(
      contarOcorrencias(normalizado, termo),
      contemTermo(textoObrigatorio, termo),
      contemTermo(textoDesejavel, termo),
    ),
  }));
  const conhecidos = new Set(encontrados.flatMap((termo) => termo.formas));
  termosDesconhecidos(descricao, conhecidos).forEach((termo) =>
    palavrasChave.push({ termo, categoria: 'Outros termos da vaga', importancia: 'media' }),
  );

  const ordem: Record<Importancia, number> = { alta: 0, media: 1, baixa: 2 };
  palavrasChave.sort((a, b) => ordem[a.importancia] - ordem[b.importancia]);

  return {
    cargo: extrairCargo(descricao),
    senioridade: SENIORIDADES.find(([padrao]) => padrao.test(normalizado))?.[1],
    area: areaPredominante(palavrasChave),
    requisitos,
    palavrasChave,
  };
}

// Categoria do dicionário → área de atuação (ferramentas, métodos e soft skills não definem a área)
const AREAS: Partial<Record<string, string>> = {
  Linguagens: 'Tecnologia',
  'Frameworks e Bibliotecas': 'Tecnologia',
  'Cloud e Infraestrutura': 'Tecnologia',
  Automação: 'Tecnologia',
  Dados: 'Dados',
  'Banco de Dados': 'Dados',
  Design: 'Design',
  'Marketing e Vendas': 'Marketing e vendas',
  'Gestão e Negócios': 'Gestão e negócios',
  'Finanças e Contabilidade': 'Finanças',
  'Pessoas e RH': 'Recursos humanos',
  'Saúde, Educação e Jurídico': 'Saúde, educação ou jurídico',
};

/** Área com mais termos na vaga. */
function areaPredominante(palavras: PalavraChaveVaga[]): string | undefined {
  const contagem = new Map<string, number>();
  palavras.forEach((p) => {
    const area = AREAS[p.categoria];
    if (area) contagem.set(area, (contagem.get(area) ?? 0) + 1);
  });
  return [...contagem.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}
