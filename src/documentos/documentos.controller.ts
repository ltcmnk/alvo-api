import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { montarDocumento } from '../ats/documento.js';
import { completarConteudo } from '../curriculos/curriculos.service.js';
import type { ConteudoCurriculo } from '../curriculos/interfaces/curriculo.interface.js';
import { IaService } from '../ia/ia.service.js';
import { ExportarDto, LerDocumentoDto, OrtografiaDto } from './dto/documentos.dto.js';
import { TIPOS_MIME, gerarDocx, gerarLatex, gerarPdf, nomeArquivo } from './exportacao.js';
import { estruturarPorRegras, extrairTexto } from './leitura.js';
import type { ArquivoRecebido } from './leitura.js';
import { revisarOrtografia } from './ortografia.js';
import type { Correcao } from './ortografia.js';

const TAMANHO_MAXIMO = 5 * 1024 * 1024; // 5 MB: currículo de verdade fica bem abaixo disso

interface Leitura {
  nomeArquivo: string;
  texto: string;
  curriculo: ConteudoCurriculo;
  modo: 'ia' | 'regras';
  avisos: string[];
}

@Controller('documentos')
export class DocumentosController {
  constructor(private readonly iaService: IaService) {}

  /**
   * POST /api/documentos/ler — lê um currículo existente (PDF ou DOCX, até 5 MB) e devolve o texto
   * e os campos para preencher o formulário. O arquivo fica só na memória e não é salvo.
   */
  @Post('ler')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('arquivo', { limits: { fileSize: TAMANHO_MAXIMO } }))
  async ler(
    @UploadedFile() arquivo: ArquivoRecebido | undefined,
    @Body() dados: LerDocumentoDto,
  ): Promise<Leitura> {
    if (!arquivo) throw new BadRequestException('Envie o arquivo no campo "arquivo".');
    const texto = await extrairTexto(arquivo);
    const curriculo = dados.provedor
      ? await this.iaService.estruturar(texto, dados.provedor)
      : estruturarPorRegras(texto);
    return {
      nomeArquivo: arquivo.originalname,
      texto,
      curriculo,
      modo: dados.provedor ? 'ia' : 'regras',
      avisos: [
        'Confira cada campo antes de salvar: a leitura automática pode errar a separação das seções.',
        ...(curriculo.cargoAlvo ? [] : ['Informe o cargo que você busca.']),
      ],
    };
  }

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
