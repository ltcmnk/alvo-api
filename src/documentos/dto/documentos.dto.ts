import { Type } from 'class-transformer';
import { IsIn, IsNotEmpty, ValidateNested } from 'class-validator';
import { CreateCurriculoDto } from '../../curriculos/dto/create-curriculo.dto.js';
import { FORMATOS } from '../exportacao.js';
import type { Formato } from '../exportacao.js';

/** Corpo de POST /api/documentos/exportar. O currículo vai no corpo: dá para exportar antes de salvar. */
export class ExportarDto {
  @IsIn(FORMATOS, { message: `formato deve ser: ${FORMATOS.join(', ')}` })
  formato: Formato;

  @ValidateNested()
  @Type(() => CreateCurriculoDto)
  @IsNotEmpty({ message: 'Envie o currículo' })
  curriculo: CreateCurriculoDto;
}
