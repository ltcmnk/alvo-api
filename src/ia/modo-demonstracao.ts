/*
 * Modo demonstração: usado quando nenhuma chave de IA está no .env.
 * Devolve o mesmo formato da IA usando só regras, para o app funcionar em qualquer
 * máquina (inclusive na do professor). Segue a mesma regra da IA: não inventa nada.
 * Ele reorganiza e aponta caminhos; reescrever com qualidade é trabalho da IA.
 */
import { analisarVaga } from '../ats/analise-vaga.js';
import type { AnaliseVaga } from '../ats/analise-vaga.js';
import { paraBullets } from '../ats/documento.js';
import { normalizar, termosNoTexto } from '../ats/palavras-chave.js';
import { pontuarAts, textoDoCurriculo } from '../ats/pontuacao.js';
import type { ConteudoCurriculo } from '../curriculos/interfaces/curriculo.interface.js';
import type { OtimizacaoIa, RelatorioCompatibilidadeIa } from './schemas.js';

type Requisito = RelatorioCompatibilidadeIa['requisitos'][number];

function avaliarRequisito(
  texto: string,
  tipo: Requisito['tipo'],
  curriculoNormal: string,
): Requisito {
  const termos = termosNoTexto(texto);
  const tem = termos.filter((t) => t.formas.some((f) => curriculoNormal.includes(` ${f} `)));
  const faltam = termos.filter((t) => !tem.includes(t)).map((t) => t.nome);
  if (termos.length === 0) {
    return {
      requisito: texto,
      tipo,
      status: 'parcial',
      evidencia: null,
      comoPreencher:
        'Requisito sem termo técnico reconhecido: confira se o seu currículo mostra isso com um exemplo concreto.',
    } as Requisito;
  }
  // "Power BI ou Tableau": basta ter uma das opções
  const alternativas = / ou |\//.test(normalizar(texto));
  const status =
    faltam.length === 0 || (alternativas && tem.length > 0)
      ? 'atende'
      : tem.length > 0
        ? 'parcial'
        : 'nao_atende';
  return {
    requisito: texto,
    tipo,
    status,
    evidencia: tem.length ? `O currículo cita: ${tem.map((t) => t.nome).join(', ')}.` : null,
    comoPreencher:
      status !== 'atende'
        ? `Se você já usou ${faltam.join(', ')}, diga em qual experiência ou projeto. Se não usou, este é um gap real: um curso ou projeto prático com ${faltam[0]} ajuda a fechá-lo.`
        : null,
  } as Requisito;
}

/** Requisitos da vaga; se o anúncio não tem lista, cada palavra-chave importante vira um requisito. */
function requisitosDaVaga(analise: AnaliseVaga): { texto: string; tipo: Requisito['tipo'] }[] {
  if (analise.requisitos.length > 0) return analise.requisitos;
  return analise.palavrasChave
    .filter((p) => p.importancia !== 'baixa' && p.categoria !== 'Outros termos da vaga')
    .slice(0, 10)
    .map((p) => ({
      texto: `Conhecimento em ${p.termo}`,
      tipo: p.importancia === 'alta' ? 'obrigatorio' : 'desejavel',
    }));
}

function projetosComoExperiencia(
  c: ConteudoCurriculo,
  analise: AnaliseVaga,
): RelatorioCompatibilidadeIa['projetosComoExperiencia'] {
  const termosVaga = new Set(analise.palavrasChave.map((p) => normalizar(p.termo).trim()));
  return c.projetos
    .filter((p) => p.contexto !== 'profissional')
    .map((p) => {
      const emComum = (p.tecnologias ?? []).filter((t) => termosVaga.has(normalizar(t).trim()));
      const base = paraBullets(p.descricao);
      return {
        projeto: p.nome,
        porqueConta: emComum.length
          ? `Mostra prática com ${emComum.join(', ')}, que a vaga pede.`
          : 'Mostra iniciativa e prática aplicada, o que conta como experiência para quem está começando.',
        reescritaSugerida: [
          ...(p.tecnologias?.length
            ? [`Desenvolvi o projeto "${p.nome}" utilizando ${p.tecnologias.join(', ')}.`]
            : []),
          ...base,
        ],
      };
    });
}

/** Relatório de compatibilidade por regras: requisitos × termos encontrados no currículo. */
export function relatorioDemonstracao(
  c: ConteudoCurriculo,
  descricaoVaga: string,
): RelatorioCompatibilidadeIa {
  const analise = analisarVaga(descricaoVaga);
  const curriculoNormal = normalizar(textoDoCurriculo(c));
  const requisitos = requisitosDaVaga(analise).map((r) =>
    avaliarRequisito(r.texto, r.tipo, curriculoNormal),
  );
  const palavrasChave = analise.palavrasChave.map((p) => {
    const presente = curriculoNormal.includes(` ${normalizar(p.termo).trim()} `);
    return {
      termo: p.termo,
      categoria: p.categoria,
      presente,
      sugestao: presente
        ? null
        : `Se você tem experiência com ${p.termo}, cite onde usou (experiência, projeto ou curso).`,
    };
  });
  return {
    resumo:
      'Comparação por palavras-chave. Escolha um provedor de IA para uma análise que entende o contexto da vaga.',
    requisitos,
    palavrasChave,
    projetosComoExperiencia: projetosComoExperiencia(c, analise),
    pontosFortes: palavrasChave
      .filter((p) => p.presente)
      .slice(0, 5)
      .map((p) => `Já cita ${p.termo}, pedido na vaga.`),
  } as RelatorioCompatibilidadeIa;
}

/** Resumo montado só com fatos do currículo, quando ele não tem um. */
function resumoFactual(c: ConteudoCurriculo): string | undefined {
  if (c.resumo) return c.resumo;
  const recente = c.experiencias.find((e) => e.atual) ?? c.experiencias[0];
  const formacao = c.formacoes[0];
  const partes = [
    recente
      ? `${recente.cargo} na ${recente.empresa}`
      : formacao
        ? `${formacao.curso} (${formacao.instituicao})`
        : null,
    c.habilidades.length ? `com conhecimento em ${c.habilidades.slice(0, 5).join(', ')}` : null,
  ].filter(Boolean);
  return partes.length ? `${partes.join(', ')}.` : undefined;
}

/** Otimização por regras: ordena competências pela vaga, organiza bullets e completa o resumo com fatos. */
export function otimizacaoDemonstracao(c: ConteudoCurriculo, descricaoVaga?: string): OtimizacaoIa {
  const termosVaga = descricaoVaga
    ? analisarVaga(descricaoVaga).palavrasChave.map((p) => normalizar(p.termo).trim())
    : [];
  const pesoVaga = (h: string) => (termosVaga.includes(normalizar(h).trim()) ? 0 : 1);
  const habilidades = [...new Set(c.habilidades)].sort((a, b) => pesoVaga(a) - pesoVaga(b));
  // Frases separadas por ponto viram um bullet por linha (formato que o ATS e o recrutador leem melhor)
  const emBullets = (texto?: string) => texto?.split(/(?<=\.)\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ])/).join('\n');
  const curriculo: ConteudoCurriculo = {
    ...c,
    resumo: resumoFactual(c),
    habilidades,
    experiencias: c.experiencias.map((e) => ({ ...e, descricao: emBullets(e.descricao) })),
    projetos: c.projetos.map((p) => ({ ...p, descricao: emBullets(p.descricao) })),
  };
  const dicas = pontuarAts(curriculo).criterios.flatMap((criterio) => criterio.dicas);
  const grupos = new Map<string, string[]>();
  termosNoTexto(textoDoCurriculo(c)).forEach((t) =>
    grupos.set(t.categoria, [...(grupos.get(t.categoria) ?? []), t.nome]),
  );

  return {
    curriculo,
    mudancas: [
      'Colocou primeiro as competências que a vaga pede.',
      'Separou as descrições em um item por linha.',
      ...(c.resumo ? [] : ['Montou um resumo com os dados que já estavam no currículo.']),
      'Organizou as seções na ordem que melhor posiciona o seu perfil.',
    ],
    analiseMelhorias: {
      reorganizado:
        'Ordem das seções ajustada ao seu momento de carreira e competências ordenadas pela vaga.',
      destaque: 'Competências pedidas na vaga aparecem primeiro.',
      descricoesFortalecidas:
        'Modo demonstração não reescreve textos. Escolha um provedor de IA para fortalecer as descrições.',
      leituraAts: 'Uma coluna, títulos padronizados, datas no formato MM/AAAA e um item por linha.',
      leituraHumana: 'Itens curtos e seções na ordem em que o recrutador procura.',
      omitido: 'Seções sem conteúdo não aparecem no documento.',
    },
    palavrasChave: [...grupos.entries()].map(([categoria, termos]) => ({ categoria, termos })),
    sugestoesFuturas: dicas.length
      ? dicas
      : ['Mantenha uma versão do currículo para cada tipo de vaga.'],
    aderencia: [],
    riscos: [
      'Análise feita por regras (modo demonstração): sem leitura de contexto como a IA faria.',
    ],
  } as OtimizacaoIa;
}
