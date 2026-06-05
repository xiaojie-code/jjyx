import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import * as express from 'express';
import { AppModule } from './app.module';
import { AllExceptionFilter } from './common/filters/all-exception.filter';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 3000);
  const corsOrigin = configService.get<string>('app.corsOrigin', '*');

  // Global prefix
  app.setGlobalPrefix('api');

  // CORS
  app.enableCors({ origin: corsOrigin, credentials: true });

  // Uploaded chat/media files (with CORS headers for cross-origin audio/video playback)
  app.use('/uploads', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  }, express.static(join(process.cwd(), 'uploads'), {
    fallthrough: false,
    setHeaders: (res, filePath) => {
      // Unity WebGL gzip 压缩文件需要正确的 Content-Encoding
      if (filePath.endsWith('.framework.js.unityweb')) {
        res.setHeader('Content-Encoding', 'gzip');
        res.setHeader('Content-Type', 'application/javascript');
      } else if (filePath.endsWith('.wasm.unityweb')) {
        res.setHeader('Content-Encoding', 'gzip');
        res.setHeader('Content-Type', 'application/wasm');
      } else if (filePath.endsWith('.data.unityweb')) {
        res.setHeader('Content-Encoding', 'gzip');
        res.setHeader('Content-Type', 'application/octet-stream');
      } else if (filePath.endsWith('.js.gz')) {
        res.setHeader('Content-Encoding', 'gzip');
        res.setHeader('Content-Type', 'application/javascript');
      } else if (filePath.endsWith('.wasm.gz')) {
        res.setHeader('Content-Encoding', 'gzip');
        res.setHeader('Content-Type', 'application/wasm');
      } else if (filePath.endsWith('.data.gz')) {
        res.setHeader('Content-Encoding', 'gzip');
        res.setHeader('Content-Type', 'application/octet-stream');
      } else if (filePath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
      } else if (filePath.endsWith('.json')) {
        res.setHeader('Content-Type', 'application/json');
      } else if (filePath.endsWith('.m4a')) {
        res.setHeader('Content-Type', 'audio/mp4');
      } else if (filePath.endsWith('.webm')) {
        res.setHeader('Content-Type', 'audio/webm');
      } else if (filePath.endsWith('.ogg')) {
        res.setHeader('Content-Type', 'audio/ogg');
      } else if (filePath.endsWith('.wav')) {
        res.setHeader('Content-Type', 'audio/wav');
      } else if (filePath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css');
      } else if (filePath.endsWith('.png')) {
        res.setHeader('Content-Type', 'image/png');
      } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
        res.setHeader('Content-Type', 'image/jpeg');
      } else if (filePath.endsWith('.wasm')) {
        res.setHeader('Content-Type', 'application/wasm');
      }
    },
  }));

  // Global filters (AllExceptionFilter first as fallback, HttpExceptionFilter second for specifics)
  app.useGlobalFilters(
    new AllExceptionFilter(),
    new HttpExceptionFilter(),
  );

  // Global interceptors
  app.useGlobalInterceptors(new TransformInterceptor());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(port, '0.0.0.0');
  console.log(`Server running on http://0.0.0.0:${port}`);
}
bootstrap();
