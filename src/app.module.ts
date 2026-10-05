import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

/**
 * Módulo raiz da API (no modelo Express do requisito, equivale ao src/app.js).
 * Cada funcionalidade vive no próprio módulo e é registrada em `imports`.
 */
@Module({
  imports: [
    // isGlobal: qualquer módulo lê o .env sem precisar importar o ConfigModule de novo
    ConfigModule.forRoot({ isGlobal: true }),
  ],
})
export class AppModule {}
