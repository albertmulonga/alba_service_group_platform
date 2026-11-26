import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ── Security Headers ──
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));

  // ── CORS ──
  const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000').split(',').filter(Boolean);
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 86400,
  });

  // ── Global prefix ──
  app.setGlobalPrefix('api');

  // ── Trust proxy for rate limiting ──
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  await app.listen(process.env.PORT ?? 4000);
  console.log(`🚀 ALBA API running on http://localhost:${process.env.PORT ?? 4000}/api`);
}
bootstrap();
