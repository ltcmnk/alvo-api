import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { apararTexto } from '../../common/transformers/aparar-texto.js';
import {
  CONTEXTOS_PROJETO,
  NIVEIS_IDIOMA,
  SITUACOES_FORMACAO,
  TIPOS_CURRICULO,
} from '../interfaces/curriculo.interface.js';
import type { TipoCurriculo } from '../interfaces/curriculo.interface.js';

// Com stopAtFirstError o class-validator roda os decorators de baixo para cima;
// por isso @IsNotEmpty fica por último: campo ausente mostra "é obrigatório".

// Formato do <input type="month"> (AAAA-MM). Só o ano (AAAA) também vale: currículos lidos de
// arquivo às vezes não têm o mês, e completar com um mês qualquer seria inventar informação.
const MES_ANO = /^\d{4}(-(0[1-9]|1[0-2]))?$/;
const MENSAGEM_MES = 'Use o formato AAAA-MM (ou só AAAA) nas datas';

/** Texto opcional: aparado, vazio vira "não informado" e respeita um tamanho máximo. */
function TextoOpcional(maximo: number, campo: string): PropertyDecorator {
  return (alvo, chave) => {
    Transform(apararTexto)(alvo, chave);
    IsOptional()(alvo, chave);
    IsString({ message: `${campo} deve ser um texto` })(alvo, chave);
    MaxLength(maximo, { message: `${campo} pode ter até ${maximo} caracteres` })(alvo, chave);
  };
}

/** Texto obrigatório com mensagem de "é obrigatório" quando ausente. */
function TextoObrigatorio(maximo: number, mensagem: string): PropertyDecorator {
  return (alvo, chave) => {
    Transform(apararTexto)(alvo, chave);
    IsString({ message: mensagem })(alvo, chave);
    MaxLength(maximo, { message: `O campo pode ter até ${maximo} caracteres` })(alvo, chave);
    IsNotEmpty({ message: mensagem })(alvo, chave);
  };
}

/** Lista opcional de objetos validados um a um. */
function ListaDe(classe: new () => object, maximo: number, campo: string): PropertyDecorator {
  return (alvo, chave) => {
    IsOptional()(alvo, chave);
    IsArray({ message: `${campo} deve ser uma lista` })(alvo, chave);
    ArrayMaxSize(maximo, { message: `Envie no máximo ${maximo} itens em ${campo}` })(alvo, chave);
    ValidateNested({ each: true })(alvo, chave);
    Type(() => classe)(alvo, chave);
  };
}

/** Lista opcional de textos curtos (habilidades, competências, tecnologias). */
function ListaDeTextos(maximo: number, campo: string): PropertyDecorator {
  return (alvo, chave) => {
    IsOptional()(alvo, chave);
    IsArray({ message: `${campo} deve ser uma lista` })(alvo, chave);
    ArrayMaxSize(maximo, { message: `Envie no máximo ${maximo} itens em ${campo}` })(alvo, chave);
    IsString({ each: true, message: `Cada item de ${campo} deve ser um texto` })(alvo, chave);
  };
}

export class ExperienciaDto {
  @TextoObrigatorio(120, 'Informe o cargo da experiência')
  cargo: string;

  @TextoObrigatorio(120, 'Informe a empresa da experiência')
  empresa: string;

  @TextoOpcional(120, 'O local')
  local?: string;

  @IsOptional()
  @Matches(MES_ANO, { message: MENSAGEM_MES })
  inicio?: string;

  @IsOptional()
  @Matches(MES_ANO, { message: MENSAGEM_MES })
  fim?: string;

  @IsOptional()
  @IsBoolean({ message: 'atual deve ser verdadeiro ou falso' })
  atual?: boolean;

  @TextoOpcional(2000, 'A descrição da experiência')
  descricao?: string;
}

export class FormacaoDto {
  @TextoObrigatorio(160, 'Informe o curso da formação')
  curso: string;

  @TextoObrigatorio(160, 'Informe a instituição da formação')
  instituicao: string;

  @IsOptional()
  @Matches(MES_ANO, { message: MENSAGEM_MES })
  inicio?: string;

  @IsOptional()
  @Matches(MES_ANO, { message: MENSAGEM_MES })
  fim?: string;

  @IsOptional()
  @IsIn(SITUACOES_FORMACAO, { message: `situacao deve ser: ${SITUACOES_FORMACAO.join(', ')}` })
  situacao?: (typeof SITUACOES_FORMACAO)[number];
}

export class ProjetoDto {
  @TextoObrigatorio(160, 'Informe o nome do projeto')
  nome: string;

  @IsOptional()
  @IsIn(CONTEXTOS_PROJETO, { message: `contexto deve ser: ${CONTEXTOS_PROJETO.join(', ')}` })
  contexto?: (typeof CONTEXTOS_PROJETO)[number];

  @TextoOpcional(2000, 'A descrição do projeto')
  descricao?: string;

  @ListaDeTextos(20, 'tecnologias')
  tecnologias?: string[];

  @Transform(apararTexto)
  @IsOptional()
  @IsUrl(
    {},
    { message: 'Informe um link de projeto válido (ex.: https://github.com/voce/projeto)' },
  )
  link?: string;
}

export class IdiomaDto {
  @TextoObrigatorio(60, 'Informe o idioma')
  idioma: string;

  @IsOptional()
  @IsIn(NIVEIS_IDIOMA, { message: `nivel deve ser: ${NIVEIS_IDIOMA.join(', ')}` })
  nivel?: (typeof NIVEIS_IDIOMA)[number];
}

export class CertificacaoDto {
  @TextoObrigatorio(160, 'Informe o nome da certificação')
  nome: string;

  @TextoOpcional(160, 'A instituição')
  instituicao?: string;

  @IsOptional()
  @Matches(/^\d{4}$/, { message: 'O ano da certificação deve ter 4 dígitos' })
  ano?: string;
}

export class VagaAlvoDto {
  @TextoOpcional(120, 'A empresa da vaga')
  empresa?: string;

  @TextoOpcional(120, 'O cargo da vaga')
  cargo?: string;

  @IsOptional()
  @IsInt({ message: 'compatibilidade deve ser um número inteiro' })
  @Min(0)
  @Max(100)
  compatibilidade?: number;
}

/** Corpo esperado em POST e PUT /api/curriculos. Só `nome` e `cargoAlvo` são obrigatórios. */
export class CreateCurriculoDto {
  @TextoObrigatorio(120, 'O campo nome é obrigatório')
  nome: string;

  @TextoObrigatorio(120, 'O campo cargoAlvo é obrigatório')
  cargoAlvo: string;

  @Transform(apararTexto)
  @IsOptional()
  @IsEmail({}, { message: 'Informe um e-mail válido' })
  email?: string;

  @TextoOpcional(30, 'O telefone')
  telefone?: string;

  @TextoOpcional(120, 'A cidade')
  cidade?: string;

  @Transform(apararTexto)
  @IsOptional()
  @IsUrl({}, { message: 'Informe um link do LinkedIn válido' })
  linkedin?: string;

  @Transform(apararTexto)
  @IsOptional()
  @IsUrl({}, { message: 'Informe um link do GitHub válido' })
  github?: string;

  @Transform(apararTexto)
  @IsOptional()
  @IsUrl({}, { message: 'Informe um link de portfólio válido' })
  portfolio?: string;

  @TextoOpcional(2000, 'O resumo')
  resumo?: string;

  @ListaDe(ExperienciaDto, 20, 'experiencias')
  experiencias?: ExperienciaDto[];

  @ListaDe(FormacaoDto, 10, 'formacoes')
  formacoes?: FormacaoDto[];

  @ListaDe(ProjetoDto, 15, 'projetos')
  projetos?: ProjetoDto[];

  @ListaDeTextos(40, 'habilidades')
  habilidades?: string[];

  @ListaDeTextos(20, 'competencias')
  competencias?: string[];

  @ListaDe(IdiomaDto, 10, 'idiomas')
  idiomas?: IdiomaDto[];

  @ListaDe(CertificacaoDto, 20, 'certificacoes')
  certificacoes?: CertificacaoDto[];

  @ListaDeTextos(15, 'atividades')
  atividades?: string[];

  @IsOptional()
  @IsIn(TIPOS_CURRICULO, { message: `tipo deve ser: ${TIPOS_CURRICULO.join(', ')}` })
  tipo?: TipoCurriculo;

  @IsOptional()
  @ValidateNested()
  @Type(() => VagaAlvoDto)
  vagaAlvo?: VagaAlvoDto;

  @IsOptional()
  @IsInt({ message: 'origemId deve ser um número inteiro' })
  origemId?: number;
}
