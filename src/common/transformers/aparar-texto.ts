import type { TransformFnParams } from 'class-transformer';

/**
 * Remove espaços nas pontas e trata texto vazio como "não informado".
 * Sem isso, um campo obrigatório preenchido só com espaços passaria na validação.
 * @param params - Parâmetros do class-transformer; só `value` é usado.
 * @returns O texto aparado, ou `undefined` se ficar vazio.
 */
export function apararTexto({ value }: TransformFnParams): unknown {
  if (typeof value !== 'string') return value;
  const aparado = value.trim();
  return aparado === '' ? undefined : aparado;
}
