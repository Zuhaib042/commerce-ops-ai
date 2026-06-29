import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './modules/app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
  );

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: process.env.API_CORS_ORIGIN?.split(',') ?? true,
  });

  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
