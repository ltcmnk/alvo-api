import { Body, Controller, HttpCode, HttpStatus, Post, StreamableFile } from '@nestjs/common';
import { montarDocumento } from '../ats/documento.js';
import { completarConteudo } from '../curriculos/curriculos.service.js';
import { ExportarDto, OrtografiaDto } from './dto/documentos.dto.js';
import { TIPOS_MIME, gerarDocx, gerarLatex, gerarPdf, nomeArquivo } from './exportacao.js';
import { revisarOrtografia } from './ortografia.js';
import type { Correcao } from './ortografia.js';

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

  /** POST /api/documentos/ortografia — erros de ortografia e gramática nos campos editados. */
  @Post('ortografia')
  @HttpCode(HttpStatus.OK)
  async ortografia(@Body() dados: OrtografiaDto): Promise<{ correcoes: Correcao[] }> {
    const campos = dados.campos.filter((campo) => campo.texto.trim());
    return { correcoes: campos.length ? await revisarOrtografia(campos) : [] };
  }
}
