import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const httpLogger = new Logger('HTTP');

  app.setGlobalPrefix('api');

  // HTTP Request Logging Middleware: Logs every incoming API request with method, url, status, and duration
  app.use((req: any, res: any, next: () => void) => {
    const start = Date.now();
    const { method, originalUrl } = req;
    res.on('finish', () => {
      const { statusCode } = res;
      const duration = Date.now() - start;
      httpLogger.log(`${method} ${originalUrl} ${statusCode} - ${duration}ms`);
    });
    next();
  });

  const configuredFrontend = config.get<string>(
    'FRONTEND_URL',
    'http://localhost:5173',
  );
  app.enableCors({
    origin: (origin, callback) => {
      if (
        !origin ||
        origin === configuredFrontend ||
        /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
      ) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
  console.log(`Vibelearn Backend running on port ${port} with prefix /api`);
}
void bootstrap();
