import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CreateVagaDto } from './dto/create-vaga.dto.js';
import type { Vaga } from './interfaces/vaga.interface.js';
import { VagasService } from './vagas.service.js';

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
}
