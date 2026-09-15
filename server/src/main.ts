import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
async function bootstrap() {
  // rawBody is required by Stripe's signature verifier; JSON parsing still
  // populates @Body() for every other endpoint.
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.setGlobalPrefix('');
  app.enableCors({ origin: (process.env.CORS_ORIGINS || '*').split(','), credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: false, transform: true }));
  await app.listen(Number(process.env.PORT || 4242), process.env.HOST || '0.0.0.0');
}
bootstrap();
