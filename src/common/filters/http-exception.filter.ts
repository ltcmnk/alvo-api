import { Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { Request, Response } from 'express';

/**
 * Troca o caminho técnico de itens de lista por um texto legível.
 * Ex.: "experiencias.0.Informe o cargo" vira "Item 1: Informe o cargo".
 */
function formatarDetalhe(detalhe: string): string {
  return detalhe.replace(
    /^\w+\.(\d+)\./,
    (_trecho, indice: string) => `Item ${Number(indice) + 1}: `,
  );
}

interface CorpoErro {
  error: string;
  detalhes?: string[];
}

/**
 * Tratamento global de erros (no modelo Express do requisito, equivale ao
 * middlewares/errorHandler.js). Toda falha sai no formato { error, detalhes? },
 * em português, para o frontend exibir a mensagem sem conhecer o formato do Nest.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const contexto = host.switchToHttp();
    const resposta = contexto.getResponse<Response>();
    const requisicao = contexto.getRequest<Request>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    // Só erros do servidor vão para o log; 4xx são erros esperados do cliente
    if (status >= 500) this.logger.error(exception);

    resposta.status(status).json({
      statusCode: status,
      ...this.montarCorpo(exception, status),
      path: requisicao.originalUrl,
      timestamp: new Date().toISOString(),
    });
  }

  private montarCorpo(exception: unknown, status: number): CorpoErro {
    if (!(exception instanceof HttpException)) {
      return { error: 'Erro interno no servidor' };
    }
    const mensagem = this.extrairMensagem(exception.getResponse());
    if (Array.isArray(mensagem)) {
      return { error: 'Dados inválidos', detalhes: mensagem.map(formatarDetalhe) };
    }
    // Para caminhos inexistentes o Nest gera "Cannot GET /rota"
    if (status === HttpStatus.NOT_FOUND && mensagem.startsWith('Cannot ')) {
      return { error: 'Rota não encontrada' };
    }
    // Corpo com JSON malformado chega aqui com a mensagem técnica do parser, em inglês
    if (status === HttpStatus.BAD_REQUEST && mensagem.includes('JSON')) {
      return { error: 'O corpo da requisição não é um JSON válido' };
    }
    return { error: mensagem };
  }

  private extrairMensagem(corpo: string | object): string | string[] {
    if (typeof corpo === 'string') return corpo;
    const { message } = corpo as { message?: string | string[] };
    return message ?? 'Erro na requisição';
  }
}
