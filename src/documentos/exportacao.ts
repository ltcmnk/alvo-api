/*
 * Exportação do currículo em PDF, DOCX e LaTeX (Overleaf).
 * As três saídas partem do mesmo Documento (src/ats/documento.ts): uma coluna, títulos padrão,
 * texto selecionável e nada de ícones, tabelas ou imagens, para o ATS ler sem perder nada.
 */
import {
  AlignmentType,
  BorderStyle,
  Document as Docx,
  Packer,
  Paragraph,
  TabStopPosition,
  TabStopType,
  TextRun,
} from 'docx';
import PDFDocument from 'pdfkit';
import type { Bloco, Documento } from '../ats/documento.js';

export const FORMATOS = ['pdf', 'docx', 'tex'] as const;
export type Formato = (typeof FORMATOS)[number];

export const TIPOS_MIME: Record<Formato, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  tex: 'application/x-tex; charset=utf-8',
};

/** "Júlia Ferreira" → "curriculo-julia-ferreira" para o nome do arquivo baixado. */
export function nomeArquivo(nome: string, formato: Formato): string {
  const slug = nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `curriculo-${slug || 'alvo'}.${formato}`;
}

// ---------- PDF ----------

// Margens de ~1,6 cm, como no modelo LaTeX do master prompt
const MARGEM = 45;
const FONTE = 'Helvetica';
const NEGRITO = 'Helvetica-Bold';

// As fontes padrão do PDF não têm emojis e símbolos fora do Latin-1: sairiam como lixo
const foraDoLatin1 = /[^\s -ÿ–—‘’“”•…]/g;
const limpar = (texto: string) => texto.replace(foraDoLatin1, '');

/** Escreve texto à esquerda e, na mesma linha, texto alinhado à direita. */
function linhaDupla(
  pdf: PDFKit.PDFDocument,
  esquerda: string,
  direita: string | undefined,
  fonte: string,
): void {
  const largura = pdf.page.width - MARGEM * 2;
  const y = pdf.y;
  const larguraDireita = direita ? pdf.font(FONTE).widthOfString(limpar(direita)) + 8 : 0;
  pdf.font(fonte).text(limpar(esquerda), MARGEM, y, { width: largura - larguraDireita });
  const fimEsquerda = pdf.y;
  if (direita) pdf.font(FONTE).text(limpar(direita), MARGEM, y, { width: largura, align: 'right' });
  pdf.y = Math.max(fimEsquerda, pdf.y);
}

function blocoPdf(pdf: PDFKit.PDFDocument, bloco: Bloco): void {
  if (bloco.titulo) linhaDupla(pdf, bloco.titulo, bloco.direita, NEGRITO);
  if (bloco.subtitulo || bloco.subdireita)
    linhaDupla(pdf, bloco.subtitulo ?? '', bloco.subdireita, FONTE);
  pdf.font(FONTE);
  bloco.linhas?.forEach((linha) => pdf.text(limpar(linha), MARGEM, pdf.y, { align: 'left' }));
  bloco.bullets?.forEach((bullet) =>
    pdf.text(`–  ${limpar(bullet)}`, MARGEM + 8, pdf.y, { width: pdf.page.width - MARGEM * 2 - 8 }),
  );
  pdf.moveDown(0.4);
}

export function gerarPdf(documento: Documento): Promise<Buffer> {
  const pdf = new PDFDocument({
    size: 'A4',
    margin: MARGEM,
    info: { Title: `${documento.nome} — Currículo`, Author: documento.nome },
  });
  const partes: Buffer[] = [];
  pdf.on('data', (parte: Buffer) => partes.push(parte));
  const pronto = new Promise<Buffer>((resolve) =>
    pdf.on('end', () => resolve(Buffer.concat(partes))),
  );

  pdf.font(NEGRITO).fontSize(16).text(limpar(documento.nome), { align: 'center' });
  pdf.font(FONTE).fontSize(9.5);
  if (documento.contatos.length)
    pdf.text(limpar(documento.contatos.join('  |  ')), { align: 'center' });
  if (documento.links.length)
    pdf.text(documento.links.map((l) => l.texto).join('  |  '), { align: 'center' });
  pdf.fontSize(10);

  documento.secoes.forEach((secao) => {
    pdf.moveDown(0.6);
    pdf.font(NEGRITO).fontSize(11.5).text(secao.titulo, MARGEM, pdf.y);
    const y = pdf.y + 1;
    pdf
      .moveTo(MARGEM, y)
      .lineTo(pdf.page.width - MARGEM, y)
      .lineWidth(0.6)
      .stroke('#555555');
    pdf.y = y + 4;
    pdf.fontSize(10);
    secao.blocos.forEach((bloco) => blocoPdf(pdf, bloco));
  });
  pdf.end();
  return pronto;
}

// ---------- DOCX ----------

const TAB_DIREITA = [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }];

function paragrafoDuplo(
  esquerda: string,
  direita: string | undefined,
  negrito: boolean,
): Paragraph {
  return new Paragraph({
    tabStops: TAB_DIREITA,
    children: [
      new TextRun({ text: esquerda, bold: negrito }),
      ...(direita ? [new TextRun({ text: `\t${direita}` })] : []),
    ],
  });
}

function blocoDocx(bloco: Bloco): Paragraph[] {
  return [
    ...(bloco.titulo ? [paragrafoDuplo(bloco.titulo, bloco.direita, true)] : []),
    ...(bloco.subtitulo || bloco.subdireita
      ? [paragrafoDuplo(bloco.subtitulo ?? '', bloco.subdireita, false)]
      : []),
    ...(bloco.linhas ?? []).map((linha) => new Paragraph({ text: linha })),
    ...(bloco.bullets ?? []).map((bullet) => new Paragraph({ text: bullet, bullet: { level: 0 } })),
    new Paragraph({ spacing: { after: 60 } }),
  ];
}

export function gerarDocx(documento: Documento): Promise<Buffer> {
  const centralizado = (text: string, tamanho?: number, bold = false) =>
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text, size: tamanho, bold })],
    });
  const docx = new Docx({
    creator: documento.nome,
    title: `${documento.nome} — Currículo`,
    styles: { default: { document: { run: { font: 'Calibri', size: 21 } } } },
    sections: [
      {
        properties: { page: { margin: { top: 794, bottom: 794, left: 907, right: 907 } } },
        children: [
          centralizado(documento.nome, 32, true),
          ...(documento.contatos.length ? [centralizado(documento.contatos.join(' | '))] : []),
          ...(documento.links.length
            ? [centralizado(documento.links.map((l) => l.texto).join(' | '))]
            : []),
          ...documento.secoes.flatMap((secao) => [
            new Paragraph({
              spacing: { before: 200, after: 80 },
              border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '555555', space: 1 } },
              children: [new TextRun({ text: secao.titulo, bold: true, size: 24 })],
            }),
            ...secao.blocos.flatMap(blocoDocx),
          ]),
        ],
      },
    ],
  });
  return Packer.toBuffer(docx);
}

// ---------- LaTeX (Overleaf) ----------

/** Escapa os caracteres especiais do LaTeX em texto comum. */
export function escaparLatex(texto: string): string {
  return texto
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/([&%$#_{}])/g, '\\$1')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

/** Na URL do \href só % e # precisam de escape; acentos já vêm codificados (encodeURI). */
const urlLatex = (url: string) => url.replace(/([%#])/g, '\\$1');

const PREAMBULO = String.raw`\documentclass[10pt,a4paper]{article}

\usepackage[utf8]{inputenc}
\usepackage[T1]{fontenc}
\usepackage[brazil]{babel}
\usepackage{geometry}
\usepackage{enumitem}
\usepackage[hidelinks]{hyperref}
\usepackage{titlesec}
\usepackage{microtype}

\geometry{left=1.6cm, right=1.6cm, top=1.4cm, bottom=1.4cm}

\setlength{\parindent}{0pt}
\setlength{\parskip}{2pt}

\titleformat{\section}{\large\bfseries}{}{0em}{}[\vspace{-4pt}]
\titlespacing*{\section}{0pt}{8pt}{4pt}

\setlist[itemize]{leftmargin=1.2em, itemsep=2pt, topsep=2pt, parsep=0pt}
\renewcommand\labelitemi{--}

\begin{document}
`;

function linhaLatex(
  esquerda: string | undefined,
  direita: string | undefined,
  negrito: boolean,
): string {
  const texto = esquerda
    ? negrito
      ? `\\textbf{${escaparLatex(esquerda)}}`
      : escaparLatex(esquerda)
    : '';
  return direita ? `${texto} \\hfill ${escaparLatex(direita).replace(/ – /g, ' -- ')}` : texto;
}

function blocoLatex(bloco: Bloco): string {
  const linhas = [
    bloco.titulo ? linhaLatex(bloco.titulo, bloco.direita, true) : '',
    bloco.subtitulo || bloco.subdireita ? linhaLatex(bloco.subtitulo, bloco.subdireita, false) : '',
    ...(bloco.linhas ?? []).map(escaparLatex),
  ].filter(Boolean);
  const bullets = bloco.bullets?.length
    ? `\n\\begin{itemize}\n${bloco.bullets.map((b) => `    \\item ${escaparLatex(b)}`).join('\n')}\n\\end{itemize}`
    : '';
  return `${linhas.join('\\\\\n')}${bullets}\n`;
}

export function gerarLatex(documento: Documento): string {
  const contatos = documento.contatos.map(escaparLatex).join(' \\,|\\, ');
  const links = documento.links
    .map((l) => `\\href{${urlLatex(l.url)}}{${escaparLatex(l.texto)}}`)
    .join(' \\,|\\, ');
  const cabecalho = [
    `    {\\Large \\textbf{${escaparLatex(documento.nome)}}}`,
    contatos && `    ${contatos}`,
    links && `    ${links}`,
  ]
    .filter(Boolean)
    .join('\\\\\n');
  const secoes = documento.secoes
    .map((secao) => `\\section*{${secao.titulo}}\n\n${secao.blocos.map(blocoLatex).join('\n')}`)
    .join('\n');
  return `${PREAMBULO}\n\\begin{center}\n${cabecalho}\n\\end{center}\n\n\\vspace{-4pt}\n\n${secoes}\n\\end{document}\n`;
}
