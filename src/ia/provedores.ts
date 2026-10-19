/*
 * Cliente único para os três provedores de IA que o usuário pode escolher.
 * Cada um recebe o mesmo prompt e o mesmo schema zod e devolve JSON já validado.
 * As chaves ficam só no .env da API, nunca no navegador.
 */
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { GoogleGenAI } from '@google/genai';
import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { semNulos } from './schemas.js';

export const IDS_PROVEDOR = ['anthropic', 'openai', 'google'] as const;
export type IdProvedor = (typeof IDS_PROVEDOR)[number];

export interface Provedor {
  id: IdProvedor;
  nome: string;
  modelo: string;
  /** false quando a chave não está no .env: o frontend mostra a opção desabilitada. */
  disponivel: boolean;
}

interface Pedido<T> {
  sistema: string;
  usuario: string;
  schema: z.ZodType<T>;
  /** Nome curto do formato (a OpenAI exige um). */
  nome: string;
}

// Modelos padrão; dá para trocar no .env sem mexer no código
const CONFIG: Record<IdProvedor, { nome: string; chave: string; modelo: string; padrao: string }> =
  {
    anthropic: {
      nome: 'Anthropic (Claude)',
      chave: 'ANTHROPIC_API_KEY',
      modelo: 'ANTHROPIC_MODEL',
      padrao: 'claude-opus-5-5',
    },
    openai: {
      nome: 'OpenAI (GPT)',
      chave: 'OPENAI_API_KEY',
      modelo: 'OPENAI_MODEL',
      padrao: 'gpt-5.5',
    },
    google: {
      nome: 'Google (Gemini)',
      chave: 'GEMINI_API_KEY',
      modelo: 'GEMINI_MODEL',
      padrao: 'gemini-flash-latest',
    },
  };

/** Lista os provedores e diz quais têm chave configurada. */
export function listarProvedores(): Provedor[] {
  return IDS_PROVEDOR.map((id) => ({
    id,
    nome: CONFIG[id].nome,
    modelo: process.env[CONFIG[id].modelo] || CONFIG[id].padrao,
    disponivel: Boolean(process.env[CONFIG[id].chave]),
  }));
}

async function chamarAnthropic<T>(modelo: string, pedido: Pedido<T>): Promise<T> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  // fallbacks "default": se o modelo recusar por engano (falso positivo de segurança),
  // a própria API refaz o pedido em outro modelo dentro da mesma chamada
  const resposta = await client.beta.messages.parse({
    model: modelo,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    max_tokens: 16000,
    system: pedido.sistema,
    messages: [{ role: 'user', content: pedido.usuario }],
    output_config: { format: zodOutputFormat(pedido.schema), effort: 'medium' },
  });
  if (resposta.stop_reason === 'refusal') {
    throw new BadRequestException(
      'O provedor recusou o pedido. Revise o texto enviado e tente de novo.',
    );
  }
  if (resposta.stop_reason === 'max_tokens' || !resposta.parsed_output) {
    throw new BadGatewayException(
      'A resposta da IA veio incompleta. Tente de novo ou use um currículo mais curto.',
    );
  }
  return resposta.parsed_output as T;
}

async function chamarOpenAi<T>(modelo: string, pedido: Pedido<T>): Promise<T> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const resposta = await client.responses.parse({
    model: modelo,
    instructions: pedido.sistema,
    input: pedido.usuario,
    text: { format: zodTextFormat(pedido.schema, pedido.nome) },
  });
  if (!resposta.output_parsed) {
    throw new BadGatewayException('A resposta da IA veio incompleta. Tente de novo.');
  }
  return resposta.output_parsed as T;
}

async function chamarGoogle<T>(modelo: string, pedido: Pedido<T>): Promise<T> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const resposta = await ai.models.generateContent({
    model: modelo,
    contents: pedido.usuario,
    config: {
      systemInstruction: pedido.sistema,
      responseMimeType: 'application/json',
      responseJsonSchema: z.toJSONSchema(pedido.schema),
    },
  });
  // O Gemini não valida o schema no servidor com a mesma garantia: valida aqui
  return pedido.schema.parse(JSON.parse(resposta.text ?? ''));
}

const CHAMADAS = { anthropic: chamarAnthropic, openai: chamarOpenAi, google: chamarGoogle };

/** Converte falhas dos SDKs em erros HTTP com mensagem em português. */
function traduzirErro(nome: string, erro: unknown): HttpException {
  if (erro instanceof HttpException) return erro;
  if (erro instanceof z.ZodError || erro instanceof SyntaxError) {
    return new BadGatewayException(`${nome} devolveu uma resposta fora do formato. Tente de novo.`);
  }
  // Os três SDKs expõem o código HTTP do provedor em `status`
  const status = (erro as { status?: number })?.status;
  if (status === 401 || status === 403) {
    return new BadGatewayException(
      `A chave de ${nome} foi recusada. Confira a variável no .env da API.`,
    );
  }
  if (status === 429) {
    return new HttpException(
      `Limite de uso de ${nome} atingido. Aguarde um pouco ou escolha outro provedor.`,
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
  return new BadGatewayException(`${nome} não respondeu. Tente de novo ou escolha outro provedor.`);
}

/**
 * Pede à IA uma resposta no formato do schema.
 * @throws ServiceUnavailableException se o provedor não tiver chave configurada.
 */
export async function gerarJson<T>(id: IdProvedor, pedido: Pedido<T>): Promise<T> {
  const provedor = listarProvedores().find((item) => item.id === id);
  if (!provedor?.disponivel) {
    throw new ServiceUnavailableException(
      `${CONFIG[id].nome} não está configurado: falta ${CONFIG[id].chave} no .env da API.`,
    );
  }
  try {
    return semNulos(await CHAMADAS[id](provedor.modelo, pedido));
  } catch (erro) {
    throw traduzirErro(provedor.nome, erro);
  }
}
