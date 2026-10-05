import { Transform } from 'class-transformer';
import { IsIn, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
import { apararTexto } from '../../common/transformers/aparar-texto.js';
import { STATUS_VAGA } from '../interfaces/vaga.interface.js';
import type { StatusVaga } from '../interfaces/vaga.interface.js';

// Com stopAtFirstError o class-validator roda os decorators de baixo para cima;
// por isso @IsNotEmpty fica por último: campo ausente mostra "é obrigatório".

/** Corpo esperado em POST /api/vagas. Só `empresa` e `cargo` são obrigatórios. */
export class CreateVagaDto {
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
  @MaxLength(5000, { message: 'A descrição pode ter até 5000 caracteres' })
  descricao?: string;
}
