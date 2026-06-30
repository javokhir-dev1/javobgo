import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, Logger } from '@nestjs/common';
import { join } from 'path';
import { AppModule } from './app.module';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const cookieParser = require('cookie-parser');

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  app.use((_req: any, res: any, next: any) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    next();
  });

  app.use(cookieParser());

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: false,
    transform: true,
  }));

  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  // CORS: faqat ro'yxatdagi originlarga ruxsat
  const rawOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

  // Electron / desktop app originlari har doim ruxsat etiladi
  const electronOrigins = ['app://localhost', 'file://'];

  app.enableCors({
    origin: (origin, callback) => {
      // Origin yo'q bo'lsa (server-to-server, curl) — ruxsat
      if (!origin) return callback(null, true);
      // Electron desktop app
      if (electronOrigins.some(e => origin.startsWith(e))) return callback(null, true);
      if (rawOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS: ruxsat etilmagan origin: ${origin}`), false);
    },
    credentials: true,
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  Logger.log(`Backend ishga tushdi: http://localhost:${port}`, 'Bootstrap');
}

bootstrap();
