/*
 * Montagem do currículo final, em formato único para todas as saídas:
 * PDF, DOCX, LaTeX e a prévia de "como o ATS lê". Uma coluna, títulos padronizados,
 * datas consistentes e nada de ícones, tabelas ou gráficos (padrão do master prompt da IA).
 */
import type {
  ConteudoCurriculo,
  Experiencia,
} from '../curriculos/interfaces/curriculo.interface.js';
import { buscarNoDicionario, termosNoTexto } from './palavras-chave.js';

export type IdSecao =
  | 'resumo'
  | 'experiencia'
  | 'projetos'
  | 'formacao'
  | 'competencias'
  | 'certificacoes'
  | 'idiomas'
  | 'atividades';

/** Um item da seção. Os campos "direita" ficam alinhados à direita no PDF, DOCX e LaTeX. */
export interface Bloco {
  titulo?: string;
  direita?: string;
  subtitulo?: string;
  subdireita?: string;
  linhas?: string[];
  bullets?: string[];
}

export interface Secao {
  id: IdSecao;
  titulo: string;
  blocos: Bloco[];
}

export interface Documento {
  nome: string;
  /** Cidade, telefone e e-mail. */
  contatos: string[];
  /** LinkedIn, GitHub e portfólio, com texto limpo e URL para o link. */
  links: { texto: string; url: string }[];
  ordem: { secoes: IdSecao[]; motivo: string };
  secoes: Secao[];
}

const TITULOS: Record<IdSecao, string> = {
  resumo: 'Resumo',
  experiencia: 'Experiência Profissional',
  projetos: 'Projetos',
  formacao: 'Formação Acadêmica',
  competencias: 'Competências',
  certificacoes: 'Certificações',
  idiomas: 'Idiomas',
  atividades: 'Atividades Complementares',
};

const NIVEIS: Record<string, string> = {
  basico: 'Básico',
  intermediario: 'Intermediário',
  avancado: 'Avançado',
  fluente: 'Fluente',
  nativo: 'Nativo',
};

const CONTEXTOS: Record<string, string> = {
  academico: 'Projeto acadêmico',
  pessoal: 'Projeto pessoal',
  voluntario: 'Trabalho voluntário',
  profissional: 'Projeto profissional',
};

const MESES_INICIO_CARREIRA = 12;

/** "2021-02" vira "02/2021" (formato que os ATS leem com mais segurança); "2021" fica "2021". */
export function formatarMes(mes?: string): string {
  if (!mes) return '';
  const [ano, numero] = mes.split('-');
  return numero ? `${numero}/${ano}` : ano;
}

function periodo(inicio?: string, fim?: string, atual?: boolean): string {
  const final = atual ? 'Atual' : formatarMes(fim);
  if (!inicio) return final;
  return `${formatarMes(inicio)} – ${final || 'Atual'}`;
}

function anos(inicio?: string, fim?: string): string {
  const [a, b] = [inicio?.slice(0, 4), fim?.slice(0, 4)];
  if (a && b) return `${a} – ${b}`;
  return a ?? b ?? '';
}

/** Meses entre início e fim (ou hoje, se for o emprego atual). */
export function mesesDeExperiencia(experiencias: Experiencia[], hoje = new Date()): number {
  // Só o ano ("2021") conta a partir de janeiro
  const paraMeses = (mes: string) =>
    Number(mes.slice(0, 4)) * 12 + (Number(mes.slice(5, 7)) || 1) - 1;
  const mesAtual = hoje.getFullYear() * 12 + hoje.getMonth();
  return experiencias.reduce((total, item) => {
    if (!item.inicio) return total;
    const fim = item.atual || !item.fim ? mesAtual : paraMeses(item.fim);
    return total + Math.max(0, fim - paraMeses(item.inicio) + 1);
  }, 0);
}

/**
 * Decide a ordem das seções para posicionar melhor o candidato.
 * Início de carreira: formação e projetos primeiro (é o que o recrutador avalia nesse perfil).
 * Com experiência: o que a pessoa já entregou vem primeiro.
 */
export function definirOrdem(curriculo: ConteudoCurriculo): Documento['ordem'] {
  const meses = mesesDeExperiencia(curriculo.experiencias);
  const vagaDeEntrada = /estagi|trainee|aprendiz|primeiro emprego/i.test(
    curriculo.cargoAlvo.normalize('NFD').replace(/[̀-ͯ]/g, ''),
  );
  const cursando = curriculo.formacoes.some((formacao) => formacao.situacao === 'cursando');
  const inicioDeCarreira =
    vagaDeEntrada || meses < MESES_INICIO_CARREIRA || (cursando && meses < 24);
  const finais: IdSecao[] = ['competencias', 'certificacoes', 'idiomas', 'atividades'];

  if (inicioDeCarreira) {
    return {
      secoes: ['resumo', 'formacao', 'projetos', 'experiencia', ...finais],
      motivo:
        'Formação e projetos antes da experiência: para quem está no início da carreira, é o que o recrutador avalia primeiro.',
    };
  }
  return {
    secoes: ['resumo', 'experiencia', 'projetos', 'formacao', ...finais],
    motivo: `Experiência antes da formação: com ${Math.floor(meses / 12)} ano(s) de experiência, o que você já entregou pesa mais.`,
  };
}

/** Texto da descrição vira bullets: uma linha por bullet, sem marcadores repetidos. */
export function paraBullets(texto?: string): string[] {
  return (texto ?? '')
    .split(/\r?\n/)
    .map((linha) => linha.replace(/^[-–•*·▪●]\s*/, '').trim())
    .filter(Boolean);
}

/** "https://www.linkedin.com/in/fulano/" vira "linkedin.com/in/fulano", sem acentos no texto visível. */
export function linkVisivel(url: string): string {
  let texto = url
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '');
  try {
    texto = decodeURIComponent(texto);
  } catch {
    // URL com "%" solto: mantém como veio
  }
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Agrupa as habilidades pelas categorias do dicionário; o que ele não conhece vai para "Outras". */
export function agruparHabilidades(
  habilidades: string[],
): { categoria: string; itens: string[] }[] {
  const grupos = new Map<string, string[]>();
  habilidades.forEach((habilidade) => {
    const categoria = buscarNoDicionario(habilidade)?.categoria ?? 'Outras';
    grupos.set(categoria, [...(grupos.get(categoria) ?? []), habilidade]);
  });
  const outras = grupos.get('Outras');
  grupos.delete('Outras');
  const lista = [...grupos.entries()].map(([categoria, itens]) => ({ categoria, itens }));
  return outras ? [...lista, { categoria: 'Outras', itens: outras }] : lista;
}

function blocosCompetencias(curriculo: ConteudoCurriculo): Bloco[] {
  const grupos = agruparHabilidades(curriculo.habilidades);
  const linhas =
    grupos.length === 1
      ? [`Técnicas: ${grupos[0].itens.join(', ')}`]
      : grupos.map((grupo) => `${grupo.categoria}: ${grupo.itens.join(', ')}`);
  if (curriculo.competencias.length > 0) {
    linhas.push(`Comportamentais: ${curriculo.competencias.join(', ')}`);
  }
  return linhas.length > 0 ? [{ linhas }] : [];
}

/** Monta os blocos de cada seção; seção sem conteúdo devolve lista vazia e é omitida. */
function montarBlocos(id: IdSecao, c: ConteudoCurriculo): Bloco[] {
  switch (id) {
    case 'resumo':
      return c.resumo ? [{ linhas: [c.resumo] }] : [];
    case 'experiencia':
      return c.experiencias.map((e) => ({
        titulo: e.empresa,
        direita: e.local,
        subtitulo: e.cargo,
        subdireita: periodo(e.inicio, e.fim, e.atual),
        bullets: paraBullets(e.descricao),
      }));
    case 'projetos':
      return c.projetos.map((p) => ({
        titulo: p.link ? `${p.nome} — ${linkVisivel(p.link)}` : p.nome,
        direita: p.contexto ? CONTEXTOS[p.contexto] : undefined,
        subtitulo: p.tecnologias?.length ? p.tecnologias.join(', ') : undefined,
        bullets: paraBullets(p.descricao),
      }));
    case 'formacao':
      return c.formacoes.map((f) => ({
        titulo: f.instituicao,
        subtitulo:
          f.situacao && f.situacao !== 'concluido'
            ? `${f.curso} (${f.situacao === 'cursando' ? 'em andamento' : 'trancado'})`
            : f.curso,
        subdireita: anos(f.inicio, f.fim),
      }));
    case 'competencias':
      return blocosCompetencias(c);
    case 'certificacoes':
      return c.certificacoes.length
        ? [
            {
              linhas: c.certificacoes.map((cert) =>
                [cert.nome, [cert.instituicao, cert.ano].filter(Boolean).join(', ')]
                  .filter(Boolean)
                  .join(' — '),
              ),
            },
          ]
        : [];
    case 'idiomas':
      return c.idiomas.length
        ? [
            {
              linhas: c.idiomas.map((i) =>
                i.nivel ? `${i.idioma}: ${NIVEIS[i.nivel]}` : i.idioma,
              ),
            },
          ]
        : [];
    case 'atividades':
      return c.atividades.length ? [{ bullets: c.atividades }] : [];
  }
}

/** Currículo pronto para exportar: cabeçalho, ordem decidida e só as seções com conteúdo. */
export function montarDocumento(curriculo: ConteudoCurriculo): Documento {
  const ordem = definirOrdem(curriculo);
  const links = [curriculo.linkedin, curriculo.github, curriculo.portfolio]
    .filter((url): url is string => Boolean(url))
    .map((url) => ({ texto: linkVisivel(url), url: encodeURI(decodeURI(url)) }));

  return {
    nome: curriculo.nome,
    contatos: [curriculo.cidade, curriculo.telefone, curriculo.email].filter(
      (item): item is string => Boolean(item),
    ),
    links,
    ordem,
    secoes: ordem.secoes
      .map((id) => ({ id, titulo: TITULOS[id], blocos: montarBlocos(id, curriculo) }))
      .filter((secao) => secao.blocos.length > 0),
  };
}

/** Texto puro, na ordem em que um ATS lê o documento: é também o "copiar texto". */
export function textoPuro(documento: Documento): string {
  const linhas = [
    documento.nome,
    documento.contatos.join(' | '),
    documento.links.map((l) => l.texto).join(' | '),
  ];
  documento.secoes.forEach((secao) => {
    linhas.push('', secao.titulo.toUpperCase());
    secao.blocos.forEach((bloco) => {
      if (bloco.titulo) linhas.push([bloco.titulo, bloco.direita].filter(Boolean).join(' — '));
      if (bloco.subtitulo || bloco.subdireita)
        linhas.push([bloco.subtitulo, bloco.subdireita].filter(Boolean).join(' — '));
      bloco.linhas?.forEach((linha) => linhas.push(linha));
      bloco.bullets?.forEach((bullet) => linhas.push(`- ${bullet}`));
    });
  });
  return linhas
    .filter((linha, i) => linha !== '' || i > 2)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
}

export interface CampoLido {
  campo: string;
  valor?: string;
  status: 'ok' | 'atencao' | 'ausente';
}

export interface LeituraAts {
  texto: string;
  ordem: Documento['ordem'];
  campos: CampoLido[];
  alertas: string[];
}

function campo(
  nome: string,
  valor: string | undefined,
  faltando: CampoLido['status'] = 'ausente',
): CampoLido {
  return valor ? { campo: nome, valor, status: 'ok' } : { campo: nome, status: faltando };
}

function camposLidos(c: ConteudoCurriculo): CampoLido[] {
  const meses = mesesDeExperiencia(c.experiencias);
  const recente = c.experiencias.find((e) => e.atual) ?? c.experiencias[0];
  const formacao = c.formacoes[0];
  const reconhecidas = termosNoTexto(
    [
      c.resumo,
      ...c.habilidades,
      ...c.experiencias.map((e) => e.descricao),
      ...c.projetos.map((p) => p.descricao),
    ].join(' '),
  );
  return [
    campo('Nome', c.nome),
    campo('E-mail', c.email),
    campo('Telefone', c.telefone),
    campo('Localização', c.cidade, 'atencao'),
    campo('LinkedIn', c.linkedin ? linkVisivel(c.linkedin) : undefined, 'atencao'),
    campo(
      'Cargo mais recente',
      recente ? `${recente.cargo} — ${recente.empresa}` : undefined,
      'atencao',
    ),
    campo(
      'Experiência total',
      meses > 0 ? `${Math.floor(meses / 12)} ano(s) e ${meses % 12} mês(es)` : undefined,
      'atencao',
    ),
    campo('Formação', formacao ? `${formacao.curso} — ${formacao.instituicao}` : undefined),
    campo(
      'Palavras-chave reconhecidas',
      reconhecidas.length ? reconhecidas.map((t) => t.nome).join(', ') : undefined,
    ),
    campo(
      'Idiomas',
      c.idiomas.length ? c.idiomas.map((i) => i.idioma).join(', ') : undefined,
      'atencao',
    ),
  ];
}

const DECORATIVOS = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}★☆✓✔➜→]/u;

function alertasLeitura(c: ConteudoCurriculo, texto: string): string[] {
  const alertas: string[] = [];
  c.experiencias.forEach((e) => {
    if (!e.inicio)
      alertas.push(
        `A experiência "${e.cargo}" está sem data de início: o ATS não consegue calcular seu tempo de experiência.`,
      );
    if (e.inicio && e.fim && !e.atual && e.fim < e.inicio)
      alertas.push(`Em "${e.cargo}" a data de fim é anterior à de início.`);
    if (!e.descricao)
      alertas.push(
        `A experiência "${e.cargo}" não tem descrição: o ATS só encontra palavras-chave no texto.`,
      );
  });
  const bulletsLongos = [...c.experiencias, ...c.projetos]
    .flatMap((item) => paraBullets(item.descricao))
    .filter((b) => b.length > 300);
  if (bulletsLongos.length)
    alertas.push(
      `${bulletsLongos.length} item(ns) com mais de 300 caracteres: quebre em frases curtas, uma por linha.`,
    );
  if ((c.resumo?.length ?? 0) > 800)
    alertas.push('O resumo está longo: 3 a 5 linhas são lidas com mais atenção.');
  if (DECORATIVOS.test(texto))
    alertas.push('Há emojis ou símbolos decorativos: alguns ATS trocam esses caracteres por "?".');
  const palavras = texto.split(/\s+/).length;
  if (palavras > 1100)
    alertas.push(
      `O currículo tem cerca de ${palavras} palavras (mais de 2 páginas): priorize o que é mais aderente à vaga.`,
    );
  const desconhecidas = c.habilidades.filter((h) => !buscarNoDicionario(h));
  if (desconhecidas.length) {
    alertas.push(
      `Confira a grafia de: ${desconhecidas.join(', ')}. O ATS compara o texto exato com a vaga.`,
    );
  }
  return alertas;
}

/** Prévia de "como o ATS lê": texto puro, campos que ele extrai e o que pode dar problema. */
export function analisarLeituraAts(curriculo: ConteudoCurriculo): LeituraAts {
  const documento = montarDocumento(curriculo);
  const texto = textoPuro(documento);
  return {
    texto,
    ordem: documento.ordem,
    campos: camposLidos(curriculo),
    alertas: alertasLeitura(curriculo, texto),
  };
}
