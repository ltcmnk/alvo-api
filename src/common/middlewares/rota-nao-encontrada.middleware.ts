import type { Request, Response } from 'express';

/**
 * Responde 404 em JSON para caminhos fora de /api (ex.: GET /).
 * Rotas dentro de /api já caem no HttpExceptionFilter; estas não passam pelo Nest,
 * e sem este handler o Express devolveria uma página HTML.
 */
export function rotaNaoEncontrada(requisicao: Request, resposta: Response): void {
  resposta.status(404).json({
    statusCode: 404,
    error: 'Rota não encontrada',
    path: requisicao.originalUrl,
    timestamp: new Date().toISOString(),
  });
}
