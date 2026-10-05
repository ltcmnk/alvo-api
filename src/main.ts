import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';

const PORTA_PADRAO = 3001;
const FRONTEND_PADRAO = 'http://localhost:5173';

/**
 * Sobe a API (no modelo Express do requisito, equivale ao server.js).
 * O Nest roda sobre o Express; o tipo NestExpressApplication deixa isso explícito.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  // Todas as rotas ficam sob /api, que é a base que o frontend usa
  app.setGlobalPrefix('api');

  // Só o endereço do frontend pode chamar a API pelo navegador
  app.enableCors({
    origin: config.get<string>('FRONTEND_URL', FRONTEND_PADRAO),
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  });

  // whitelist descarta campos fora do DTO; stopAtFirstError devolve uma mensagem por campo
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, stopAtFirstError: true }),
  );

  const porta = Number(config.get('PORT', PORTA_PADRAO));
  await app.listen(porta);
  Logger.log(`API rodando em http://localhost:${porta}/api`, 'Bootstrap');
}

await bootstrap();
