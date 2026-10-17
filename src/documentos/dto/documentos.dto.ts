import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
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

export class CampoTextoDto {
  @IsString()
  @MaxLength(80)
  id: string;

  @IsString()
  @MaxLength(4000, { message: 'Cada campo pode ter até 4000 caracteres' })
  texto: string;
}

/** Corpo de POST /api/documentos/ortografia: só os campos que o usuário editou. */
export class OrtografiaDto {
  @IsArray({ message: 'campos deve ser uma lista' })
  @ArrayMaxSize(40, { message: 'Envie no máximo 40 campos por revisão' })
  @ValidateNested({ each: true })
  @Type(() => CampoTextoDto)
  campos: CampoTextoDto[];
}
