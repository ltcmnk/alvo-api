import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { apararTexto } from '../../common/transformers/aparar-texto.js';

// Com stopAtFirstError o class-validator roda os decorators de baixo para cima;
// por isso @IsNotEmpty fica por último: campo ausente mostra "é obrigatório".

/** Uma experiência profissional enviada dentro do currículo. */
export class ExperienciaDto {
  @Transform(apararTexto)
  @IsString()
  @IsNotEmpty({ message: 'Informe o cargo da experiência' })
  cargo: string;

  @Transform(apararTexto)
  @IsString()
  @IsNotEmpty({ message: 'Informe a empresa da experiência' })
  empresa: string;

  @Transform(apararTexto)
  @IsOptional()
  @IsString()
  periodo?: string;

  @Transform(apararTexto)
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'A descrição da experiência pode ter até 1000 caracteres' })
  descricao?: string;
}

/** Corpo esperado em POST /api/curriculos. Só `nome` e `cargoAlvo` são obrigatórios. */
export class CreateCurriculoDto {
  @Transform(apararTexto)
  @IsString({ message: 'O campo nome deve ser um texto' })
  @MaxLength(120, { message: 'O nome pode ter até 120 caracteres' })
  @IsNotEmpty({ message: 'O campo nome é obrigatório' })
  nome: string;

  @Transform(apararTexto)
  @IsString({ message: 'O campo cargoAlvo deve ser um texto' })
  @MaxLength(120, { message: 'O cargo-alvo pode ter até 120 caracteres' })
  @IsNotEmpty({ message: 'O campo cargoAlvo é obrigatório' })
  cargoAlvo: string;

  @Transform(apararTexto)
  @IsOptional()
  @IsEmail({}, { message: 'Informe um e-mail válido' })
  email?: string;

  @Transform(apararTexto)
  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'O resumo pode ter até 2000 caracteres' })
  resumo?: string;

  @Transform(apararTexto)
  @IsOptional()
  @IsString()
  formacao?: string;

  @IsOptional()
  @IsArray({ message: 'experiencias deve ser uma lista' })
  @ArrayMaxSize(20, { message: 'Envie no máximo 20 experiências' })
  @ValidateNested({ each: true })
  @Type(() => ExperienciaDto)
  experiencias?: ExperienciaDto[];

  @IsOptional()
  @IsArray({ message: 'habilidades deve ser uma lista' })
  @IsString({ each: true, message: 'Cada habilidade deve ser um texto' })
  habilidades?: string[];
}
