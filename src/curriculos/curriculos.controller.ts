import { BadRequestException, Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { CurriculosService } from './curriculos.service.js';
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
}
