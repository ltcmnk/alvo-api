/*
 * Revisão ortográfica e gramatical das edições do usuário, via LanguageTool (pt-BR).
 * Por padrão usa a API pública e gratuita (limite de ~20 pedidos por minuto);
 * LANGUAGETOOL_URL permite apontar para um servidor próprio, se a equipe quiser.
 */
import { BadGatewayException } from '@nestjs/common';

export interface CampoTexto {
  /** Identificador do campo no formulário (ex.: "resumo", "experiencias.0.descricao"). */
  id: string;
  texto: string;
}

export interface Correcao {
  campoId: string;
  /** Posição do erro dentro do texto do campo. */
  inicio: number;
  tamanho: number;
  trecho: string;
  mensagem: string;
  sugestoes: string[];
}

interface RespostaLanguageTool {
  matches: {
    offset: number;
    length: number;
    message: string;
    replacements: { value: string }[];
    rule: { issueType: string };
  }[];
}

// Estilo e redundância geram falsos positivos em currículo (frases curtas, sem verbo de ligação)
const TIPOS_ACEITOS = new Set(['misspelling', 'grammar', 'typographical', 'duplication']);
const SEPARADOR = '\n\n';
const TEMPO_LIMITE_MS = 10_000;

/**
 * Revisa vários campos com um só pedido: junta os textos, guarda onde cada um começa
 * e devolve cada correção com a posição relativa ao próprio campo.
 */
export async function revisarOrtografia(campos: CampoTexto[]): Promise<Correcao[]> {
  const inicios: number[] = [];
  let texto = '';
  campos.forEach((campo) => {
    inicios.push(texto.length);
    texto += campo.texto + SEPARADOR;
  });

  const url = `${process.env.LANGUAGETOOL_URL || 'https://api.languagetool.org/v2'}/check`;
  let resposta: Response;
  try {
    resposta = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ text: texto, language: 'pt-BR' }),
      signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
    });
  } catch {
    throw new BadGatewayException(
      'O serviço de ortografia não respondeu. Confira sua conexão e tente de novo.',
    );
  }
  if (!resposta.ok) {
    throw new BadGatewayException(
      resposta.status === 429
        ? 'Muitas revisões seguidas. Aguarde um minuto e tente de novo.'
        : 'O serviço de ortografia está indisponível agora.',
    );
  }

  const { matches } = (await resposta.json()) as RespostaLanguageTool;
  return matches
    .filter((erro) => TIPOS_ACEITOS.has(erro.rule.issueType))
    .map((erro) => {
      // O campo do erro é o último que começa antes da posição dele
      const indice = inicios.findLastIndex((inicio) => inicio <= erro.offset);
      const inicio = erro.offset - inicios[indice];
      return {
        campoId: campos[indice].id,
        inicio,
        tamanho: erro.length,
        trecho: campos[indice].texto.slice(inicio, inicio + erro.length),
        mensagem: erro.message,
        sugestoes: erro.replacements.slice(0, 4).map((r) => r.value),
      };
    });
}
