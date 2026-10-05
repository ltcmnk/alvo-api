/**
 * Configuração do banco de dados.
 *
 * Na Semana 1 a API trabalha só com dados mock em memória, como o requisito pede
 * ("Use mock data nas rotas por enquanto"). Este arquivo reserva o lugar da conexão
 * que entra no MVP, para que ninguém espalhe leitura de DATABASE_URL pelo código.
 */
export interface ConfiguracaoBanco {
  url: string;
  habilitado: boolean;
}

/**
 * Lê a configuração do banco a partir do ambiente.
 * @returns Configuração com `habilitado: false` enquanto não houver banco.
 */
export function obterConfiguracaoBanco(): ConfiguracaoBanco {
  const url = process.env.DATABASE_URL ?? '';
  return { url, habilitado: false };
}
