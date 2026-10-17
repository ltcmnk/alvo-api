import { Body, Controller, HttpCode, HttpStatus, Post, StreamableFile } from '@nestjs/common';
import { montarDocumento } from '../ats/documento.js';
import { completarConteudo } from '../curriculos/curriculos.service.js';
import { ExportarDto } from './dto/documentos.dto.js';
import { TIPOS_MIME, gerarDocx, gerarLatex, gerarPdf, nomeArquivo } from './exportacao.js';

@Controller('documentos')
export class DocumentosController {
  /** POST /api/documentos/exportar — baixa o currículo em PDF, DOCX ou LaTeX (.tex). */
  @Post('exportar')
  @HttpCode(HttpStatus.OK)
  async exportar(@Body() dados: ExportarDto): Promise<StreamableFile> {
    const documento = montarDocumento(completarConteudo(dados.curriculo));
    const geradores = {
      pdf: gerarPdf,
      docx: gerarDocx,
      tex: async () => Buffer.from(gerarLatex(documento), 'utf8'),
    };
    const arquivo = await geradores[dados.formato](documento);
    return new StreamableFile(arquivo, {
      type: TIPOS_MIME[dados.formato],
      disposition: `attachment; filename="${nomeArquivo(documento.nome, dados.formato)}"`,
    });
  }
}
