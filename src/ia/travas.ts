/*
 * Trava de fatos: confere o currículo devolvido pela IA contra o original.
 * O prompt já proíbe inventar, mas modelos às vezes "completam" informação.
 * Aqui o código garante o que dá para garantir e avisa o resto.
 */
import { normalizar } from '../ats/palavras-chave.js';
import { textoDoCurriculo } from '../ats/pontuacao.js';
import type { ConteudoCurriculo } from '../curriculos/interfaces/curriculo.interface.js';

export interface ResultadoTrava {
  curriculo: ConteudoCurriculo;
  /** O que foi descartado por não existir no original. */
  removidos: string[];
  /** Números que não aparecem no original: o usuário precisa conferir no editor. */
  numerosParaConferir: string[];
}

const mesmo = (a: string, b: string) => {
  const [x, y] = [normalizar(a).trim(), normalizar(b).trim()];
  return x.includes(y) || y.includes(x);
};

function numeros(texto: string): string[] {
  return texto.match(/\d+(?:[.,]\d+)?\s?%?/g)?.map((n) => n.trim()) ?? [];
}

/**
 * Aplica as travas:
 * - contatos, idiomas, certificações, formações e atividades voltam a ser os do original;
 * - empresas e projetos que não existem no original são descartados;
 * - competências sem nenhuma menção no original são descartadas;
 * - números novos nas descrições são listados para o usuário conferir.
 */
export function aplicarTravas(
  original: ConteudoCurriculo,
  gerado: ConteudoCurriculo,
): ResultadoTrava {
  const removidos: string[] = [];
  const textoOriginal = normalizar(textoDoCurriculo(original));
  const descartar = <T>(lista: T[], existe: (item: T) => boolean, rotulo: (item: T) => string) =>
    lista.filter((item) => existe(item) || (removidos.push(rotulo(item)), false));

  const presente = (termo: string) => textoOriginal.includes(` ${normalizar(termo).trim()} `);
  // A IA reescreve só as descrições: cargo, empresa, datas, local e link voltam a ser os originais
  const experiencias = descartar(
    gerado.experiencias,
    (e) => original.experiencias.some((o) => mesmo(o.empresa, e.empresa)),
    (e) => `experiência em ${e.empresa}`,
  ).map((e) => {
    const o = original.experiencias.find((item) => mesmo(item.empresa, e.empresa))!;
    return { ...o, descricao: e.descricao };
  });
  const projetos = descartar(
    gerado.projetos,
    (p) => original.projetos.some((o) => mesmo(o.nome, p.nome)),
    (p) => `projeto ${p.nome}`,
  ).map((p) => {
    const o = original.projetos.find((item) => mesmo(item.nome, p.nome))!;
    return { ...o, descricao: p.descricao, tecnologias: (p.tecnologias ?? []).filter(presente) };
  });
  const habilidades = descartar(gerado.habilidades, presente, (h) => `competência ${h}`);
  const competencias = descartar(
    gerado.competencias,
    (c) => original.competencias.includes(c) || presente(c),
    (c) => `competência ${c}`,
  );

  const numerosOriginais = new Set(
    numeros(textoDoCurriculo(original)).map((n) => n.replace(/\s/g, '')),
  );
  const numerosParaConferir = [
    ...new Set(
      numeros(
        [
          gerado.resumo,
          ...experiencias.map((e) => e.descricao),
          ...projetos.map((p) => p.descricao),
        ].join(' '),
      )
        .map((n) => n.replace(/\s/g, ''))
        .filter((n) => !numerosOriginais.has(n)),
    ),
  ];

  return {
    curriculo: {
      ...gerado,
      nome: original.nome,
      email: original.email,
      telefone: original.telefone,
      cidade: original.cidade,
      linkedin: original.linkedin,
      github: original.github,
      portfolio: original.portfolio,
      experiencias,
      projetos,
      habilidades,
      competencias,
      formacoes: original.formacoes,
      idiomas: original.idiomas,
      certificacoes: original.certificacoes,
      atividades: original.atividades,
    },
    removidos,
    numerosParaConferir,
  };
}
