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
  Patch,
  Post,
} from '@nestjs/common';
import { CreateVagaDto, UpdateVagaDto } from './dto/create-vaga.dto.js';
import type { Vaga } from './interfaces/vaga.interface.js';
import { VagasService } from './vagas.service.js';

// Mensagem em português para id inválido (o padrão do Nest é em inglês)
const idValido = new ParseIntPipe({
  exceptionFactory: () => new BadRequestException('O id deve ser um número inteiro'),
});

@Controller('vagas')
export class VagasController {
  constructor(private readonly vagasService: VagasService) {}

  /** GET /api/vagas — 200 com a lista de candidaturas. */
  @Get()
  listar(): Vaga[] {
    return this.vagasService.listar();
  }

  /** POST /api/vagas — 201 com a vaga criada, 400 se faltar empresa ou cargo. */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  criar(@Body() dados: CreateVagaDto): Vaga {
    return this.vagasService.criar(dados);
  }

  /** PATCH /api/vagas/:id — 200 com a vaga alterada (ex.: nova etapa), 404 se não existir. */
  @Patch(':id')
  atualizar(@Param('id', idValido) id: number, @Body() dados: UpdateVagaDto): Vaga {
    return this.vagasService.atualizar(id, dados);
  }

  /** DELETE /api/vagas/:id — 204 sem corpo, 404 se não existir. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remover(@Param('id', idValido) id: number): void {
    this.vagasService.remover(id);
  }
}
