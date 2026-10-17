import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { analisarLeituraAts, montarDocumento } from '../ats/documento.js';
import type { Documento, LeituraAts } from '../ats/documento.js';
import { pontuarAts } from '../ats/pontuacao.js';
import type { PontuacaoAts } from '../ats/pontuacao.js';
import { CurriculosService, completarConteudo } from './curriculos.service.js';
import { CreateCurriculoDto } from './dto/create-curriculo.dto.js';
import type { Curriculo } from './interfaces/curriculo.interface.js';

// Mensagem em português para id inválido (o padrão do Nest é em inglês)
const idValido = new ParseIntPipe({
  exceptionFactory: () => new BadRequestException('O id deve ser um número inteiro'),
});

@Controller('curriculos')
export class CurriculosController {
  constructor(private readonly curriculosService: CurriculosService) {}

  /** GET /api/curriculos — 200 com a lista de currículos. */
  @Get()
  listar(): Curriculo[] {
    return this.curriculosService.listar();
  }

  /** GET /api/curriculos/:id — 200 com o currículo, 400 se o id não for número, 404 se não existir. */
  @Get(':id')
  buscarPorId(@Param('id', idValido) id: number): Curriculo {
    return this.curriculosService.buscarPorId(id);
  }

  /** POST /api/curriculos — 201 com o currículo criado, 400 se faltar nome ou cargoAlvo. */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  criar(@Body() dados: CreateCurriculoDto): Curriculo {
    return this.curriculosService.criar(dados);
  }

  /**
   * POST /api/curriculos/previa-ats — prévia do documento final, como um ATS o lê e a nota ATS.
   * Não salva nada: recebe o currículo no corpo porque o formulário mostra a prévia enquanto você digita.
   */
  @Post('previa-ats')
  @HttpCode(HttpStatus.OK)
  previaAts(
    @Body() dados: CreateCurriculoDto,
  ): LeituraAts & { documento: Documento; pontuacao: PontuacaoAts } {
    const conteudo = completarConteudo(dados);
    return {
      ...analisarLeituraAts(conteudo),
      documento: montarDocumento(conteudo),
      pontuacao: pontuarAts(conteudo),
    };
  }

  /** PUT /api/curriculos/:id — 200 com o currículo atualizado, 404 se não existir. */
  @Put(':id')
  atualizar(@Param('id', idValido) id: number, @Body() dados: CreateCurriculoDto): Curriculo {
    return this.curriculosService.atualizar(id, dados);
  }

  /** DELETE /api/curriculos/:id — 204 sem corpo, 404 se não existir. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remover(@Param('id', idValido) id: number): void {
    this.curriculosService.remover(id);
  }
}
