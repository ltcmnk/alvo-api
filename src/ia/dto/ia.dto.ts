import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { apararTexto } from '../../common/transformers/aparar-texto.js';
import { CreateCurriculoDto } from '../../curriculos/dto/create-curriculo.dto.js';
import { IDS_PROVEDOR } from '../provedores.js';
import type { IdProvedor } from '../provedores.js';

// Abaixo disso o anúncio não tem requisitos suficientes para uma comparação útil
const MINIMO_VAGA = 80;

/** Corpo de POST /api/ia/analisar-vaga (análise automática, sem IA). */
export class AnalisarVagaDto {
  @Transform(apararTexto)
  @IsString({ message: 'descricaoVaga deve ser um texto' })
  @MaxLength(8000, { message: 'A descrição da vaga pode ter até 8000 caracteres' })
  @IsNotEmpty({ message: 'Cole a descrição da vaga' })
  descricaoVaga: string;
}

/** Campos comuns: o currículo a analisar e o provedor escolhido (vazio = modo demonstração). */
class PedidoComCurriculoDto {
  @ValidateNested()
  @Type(() => CreateCurriculoDto)
  @IsNotEmpty({ message: 'Envie o currículo' })
  curriculo: CreateCurriculoDto;

  @IsOptional()
  @IsIn(IDS_PROVEDOR, { message: `provedor deve ser: ${IDS_PROVEDOR.join(', ')}` })
  provedor?: IdProvedor;
}

/** Corpo de POST /api/ia/compatibilidade. A vaga é obrigatória. */
export class RelatorioDto extends PedidoComCurriculoDto {
  @Transform(apararTexto)
  @IsString({ message: 'descricaoVaga deve ser um texto' })
  @MaxLength(8000, { message: 'A descrição da vaga pode ter até 8000 caracteres' })
  @MinLength(MINIMO_VAGA, {
    message: `Cole a descrição completa da vaga (mínimo de ${MINIMO_VAGA} caracteres)`,
  })
  @IsNotEmpty({ message: 'Cole a descrição da vaga' })
  descricaoVaga: string;
}

/** Corpo de POST /api/ia/otimizar. Sem vaga, a otimização é só para ATS. */
export class OtimizarDto extends PedidoComCurriculoDto {
  @Transform(apararTexto)
  @IsOptional()
  @IsString({ message: 'descricaoVaga deve ser um texto' })
  @MaxLength(8000, { message: 'A descrição da vaga pode ter até 8000 caracteres' })
  descricaoVaga?: string;
}
