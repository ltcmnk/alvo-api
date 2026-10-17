import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { apararTexto } from '../../common/transformers/aparar-texto.js';
import { STATUS_VAGA } from '../interfaces/vaga.interface.js';
import type { StatusVaga } from '../interfaces/vaga.interface.js';

// Com stopAtFirstError o class-validator roda os decorators de baixo para cima;
// por isso @IsNotEmpty fica por último: campo ausente mostra "é obrigatório".

/** Campos opcionais comuns ao cadastro e à edição da candidatura. */
export class CamposOpcionaisVagaDto {
  @Transform(apararTexto)
  @IsOptional()
  @IsIn(STATUS_VAGA, { message: `status deve ser um destes: ${STATUS_VAGA.join(', ')}` })
  status?: StatusVaga;

  @Transform(apararTexto)
  @IsOptional()
  @IsUrl({}, { message: 'Informe um link válido (ex.: https://empresa.com/vaga)' })
  link?: string;

  @Transform(apararTexto)
  @IsOptional()
  @IsString()
  @MaxLength(8000, { message: 'A descrição pode ter até 8000 caracteres' })
  descricao?: string;

  @IsOptional()
  @IsInt({ message: 'curriculoId deve ser um número inteiro' })
  curriculoId?: number;

  @IsOptional()
  @IsInt({ message: 'compatibilidade deve ser um número inteiro' })
  @Min(0, { message: 'compatibilidade vai de 0 a 100' })
  @Max(100, { message: 'compatibilidade vai de 0 a 100' })
  compatibilidade?: number;

  @Transform(apararTexto)
  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'As notas podem ter até 2000 caracteres' })
  notas?: string;
}

/** Corpo esperado em POST /api/vagas. Só `empresa` e `cargo` são obrigatórios. */
export class CreateVagaDto extends CamposOpcionaisVagaDto {
  @Transform(apararTexto)
  @IsString({ message: 'O campo empresa deve ser um texto' })
  @MaxLength(120, { message: 'A empresa pode ter até 120 caracteres' })
  @IsNotEmpty({ message: 'O campo empresa é obrigatório' })
  empresa: string;

  @Transform(apararTexto)
  @IsString({ message: 'O campo cargo deve ser um texto' })
  @MaxLength(120, { message: 'O cargo pode ter até 120 caracteres' })
  @IsNotEmpty({ message: 'O campo cargo é obrigatório' })
  cargo: string;
}

/** Corpo de PATCH /api/vagas/:id: qualquer campo, inclusive só o status (mover no quadro). */
export class UpdateVagaDto extends CamposOpcionaisVagaDto {
  @Transform(apararTexto)
  @IsOptional()
  @IsString()
  @MaxLength(120, { message: 'A empresa pode ter até 120 caracteres' })
  empresa?: string;

  @Transform(apararTexto)
  @IsOptional()
  @IsString()
  @MaxLength(120, { message: 'O cargo pode ter até 120 caracteres' })
  cargo?: string;
}
