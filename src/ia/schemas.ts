/*
 * Formato exato das respostas da IA (structured outputs).
 * O mesmo schema zod vai para os três provedores e valida o que volta.
 *
 * Campos opcionais são `nullable` e não `optional`: a OpenAI exige que todo campo
 * esteja em "required" no modo estrito. `semNulos` converte null em "não informado" depois.
 */
import { z } from 'zod';

const textoOpcional = z.string().nullable();
const mesAno = z
  .string()
  .nullable()
  .describe('Formato AAAA-MM, ou AAAA se o mês não estiver no currículo');

export const conteudoCurriculoSchema = z.object({
  nome: z.string(),
  cargoAlvo: z.string(),
  email: textoOpcional,
  telefone: textoOpcional,
  cidade: textoOpcional.describe('Cidade, UF'),
  linkedin: textoOpcional.describe('URL completa com https://'),
  github: textoOpcional.describe('URL completa com https://'),
  portfolio: textoOpcional.describe('URL completa com https://'),
  resumo: textoOpcional,
  experiencias: z.array(
    z.object({
      cargo: z.string(),
      empresa: z.string(),
      local: textoOpcional,
      inicio: mesAno,
      fim: mesAno,
      atual: z.boolean(),
      descricao: textoOpcional.describe('Um bullet por linha, separados por \\n, sem marcadores'),
    }),
  ),
  formacoes: z.array(
    z.object({
      curso: z.string(),
      instituicao: z.string(),
      inicio: mesAno,
      fim: mesAno,
      situacao: z.enum(['concluido', 'cursando', 'trancado']).nullable(),
    }),
  ),
  projetos: z.array(
    z.object({
      nome: z.string(),
      contexto: z.enum(['academico', 'pessoal', 'voluntario', 'profissional']).nullable(),
      descricao: textoOpcional.describe('Um bullet por linha, separados por \\n, sem marcadores'),
      tecnologias: z.array(z.string()),
      link: textoOpcional,
    }),
  ),
  habilidades: z.array(z.string()).describe('Competências técnicas da área do candidato'),
  competencias: z
    .array(z.string())
    .describe('Competências comportamentais com evidência no currículo'),
  idiomas: z.array(
    z.object({
      idioma: z.string(),
      nivel: z.enum(['basico', 'intermediario', 'avancado', 'fluente', 'nativo']).nullable(),
    }),
  ),
  certificacoes: z.array(
    z.object({ nome: z.string(), instituicao: textoOpcional, ano: textoOpcional }),
  ),
  atividades: z.array(z.string()),
});

export const relatorioCompatibilidadeSchema = z.object({
  resumo: z.string().describe('2 a 3 frases sobre o encaixe do candidato na vaga'),
  requisitos: z.array(
    z.object({
      requisito: z.string(),
      tipo: z.enum(['obrigatorio', 'desejavel']),
      status: z.enum(['atende', 'parcial', 'nao_atende']),
      evidencia: textoOpcional.describe(
        'Onde o currículo comprova (seção e trecho); null se não comprova',
      ),
      comoPreencher: textoOpcional.describe('Como fechar o gap sem inventar; null se já atende'),
    }),
  ),
  palavrasChave: z.array(
    z.object({
      termo: z.string(),
      categoria: z.string(),
      presente: z.boolean(),
      sugestao: textoOpcional.describe('Onde e como citar, só se o candidato tiver a experiência'),
    }),
  ),
  projetosComoExperiencia: z.array(
    z.object({
      projeto: z.string(),
      porqueConta: z.string(),
      reescritaSugerida: z
        .array(z.string())
        .describe('Bullets reescritos como experiência prática'),
    }),
  ),
  pontosFortes: z.array(z.string()),
});

export const otimizacaoSchema = z.object({
  curriculo: conteudoCurriculoSchema,
  mudancas: z.array(z.string()).describe('3 a 6 frases curtas: o que foi ajustado'),
  analiseMelhorias: z.object({
    reorganizado: z.string(),
    destaque: z.string(),
    descricoesFortalecidas: z.string(),
    leituraAts: z.string(),
    leituraHumana: z.string(),
    omitido: z.string().describe('Seções omitidas por falta de informação; "Nada" se nenhuma'),
  }),
  palavrasChave: z.array(z.object({ categoria: z.string(), termos: z.array(z.string()) })),
  sugestoesFuturas: z.array(z.string()),
  aderencia: z.array(
    z.object({
      tipoVaga: z.string(),
      faixa: z.string().describe('Ex.: 85%–90%'),
      nivel: z.enum(['alta', 'media-alta', 'media', 'baixa']),
      motivo: z.string(),
    }),
  ),
  riscos: z.array(z.string()).describe('Lacunas ou riscos do currículo'),
});

export type ConteudoCurriculoIa = z.infer<typeof conteudoCurriculoSchema>;
export type RelatorioCompatibilidadeIa = z.infer<typeof relatorioCompatibilidadeSchema>;
export type OtimizacaoIa = z.infer<typeof otimizacaoSchema>;

/** Troca null por undefined em qualquer profundidade (null é só exigência do schema estrito). */
export function semNulos<T>(valor: T): T {
  if (Array.isArray(valor)) return valor.map(semNulos) as T;
  if (valor && typeof valor === 'object') {
    return Object.fromEntries(
      Object.entries(valor)
        .filter(([, item]) => item !== null)
        .map(([chave, item]) => [chave, semNulos(item)]),
    ) as T;
  }
  return valor;
}
