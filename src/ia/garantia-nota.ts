/*
 * Garantia de nota: a versão otimizada nunca sai com nota ATS menor que a original.
 * A IA reescreve o texto, mas quem decide se a mudança fica é a mesma regra que dá a nota.
 * Se uma seção reescrita derrubar a nota (geral ou da vaga), ela volta ao texto original.
 */
import type { PalavraChaveVaga } from '../ats/analise-vaga.js';
import { pontuarAts } from '../ats/pontuacao.js';
import type { ConteudoCurriculo } from '../curriculos/interfaces/curriculo.interface.js';

// Seções que a IA pode reescrever; o resto já volta ao original na trava de fatos
const SECOES = {
  resumo: 'resumo',
  experiencias: 'experiências',
  projetos: 'projetos',
  habilidades: 'competências técnicas',
  competencias: 'competências comportamentais',
} as const;

export interface ResultadoGarantia {
  curriculo: ConteudoCurriculo;
  /** Seções que voltaram ao texto original porque a versão da IA baixava a nota. */
  restaurados: string[];
}

/**
 * Garante nota depois ≥ nota antes, tanto na nota geral (a que fica salva no currículo)
 * quanto na nota com as palavras-chave da vaga (a que aparece no "antes → depois").
 * @param original - Currículo enviado pelo usuário.
 * @param gerado - Currículo devolvido pela IA, já com a trava de fatos aplicada.
 * @param palavrasVaga - Palavras-chave da vaga, quando houver.
 */
export function garantirNota(
  original: ConteudoCurriculo,
  gerado: ConteudoCurriculo,
  palavrasVaga?: PalavraChaveVaga[],
): ResultadoGarantia {
  const notas = (c: ConteudoCurriculo) => [pontuarAts(c).total, pontuarAts(c, palavrasVaga).total];
  const minimo = notas(original);
  // Quantos pontos faltam para voltar à nota original (0 = nenhuma das duas caiu)
  const perda = (c: ConteudoCurriculo) =>
    notas(c).reduce((soma, nota, i) => soma + Math.max(0, minimo[i] - nota), 0);

  let atual = gerado;
  const restaurados: string[] = [];
  for (const [secao, nome] of Object.entries(SECOES)) {
    if (perda(atual) === 0) break;
    const teste = { ...atual, [secao]: original[secao as keyof typeof SECOES] };
    if (perda(teste) < perda(atual)) {
      atual = teste;
      restaurados.push(nome);
    }
  }
  // ponytail: troca seção inteira, não item a item; se ainda assim cair, devolve o original
  if (perda(atual) > 0) return { curriculo: original, restaurados: Object.values(SECOES) };
  return { curriculo: atual, restaurados };
}
