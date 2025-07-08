import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // CORS configuration dengan support local network & production
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      console.log(`🔍 CORS request from origin: ${origin}`);

      // Allowed origins list
      const allowedOrigins = [
        // Local development
        'http://localhost:3001',
        'http://localhost:3000',
        'http://127.0.0.1:3001',
        'http://127.0.0.1:3000',
        'http://172.20.10.4:3001',
        // Vercel production
        'https://fe-pos-kasir.vercel.app',
        'https://frontend-pos-kasir.vercel.app',
      ];

      // Check exact match
      if (allowedOrigins.includes(origin)) {
        console.log(`✅ Allowed origin: ${origin}`);
        return callback(null, true);
      }

      // Check patterns for local networks
      const localNetworkPatterns = [
        /^http:\/\/192\.168\.\d+\.\d+:(3000|3001)$/,
        /^http:\/\/10\.\d+\.\d+\.\d+:(3000|3001)$/,
        /^http:\/\/172\.\d+\.\d+\.\d+:(3000|3001)$/,
      ];

      const isLocalNetwork = localNetworkPatterns.some((pattern) =>
        pattern.test(origin),
      );
      if (isLocalNetwork) {
        console.log(`✅ Local network allowed: ${origin}`);
        return callback(null, true);
      }

      // Check for Vercel apps (any subdomain)
      if (origin.endsWith('.vercel.app')) {
        console.log(`✅ Vercel domain allowed: ${origin}`);
        return callback(null, true);
      }

      // Check for Railway apps
      if (origin.endsWith('.railway.app')) {
        console.log(`✅ Railway domain allowed: ${origin}`);
        return callback(null, true);
      }

      // Log and block unrecognized origins
      console.log(`🚫 CORS blocked origin: ${origin}`);
      callback(new Error(`Not allowed by CORS: ${origin}`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Static files
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // PORT configuration untuk Railway
  const port = process.env.PORT || 3000;

  // CRITICAL: Bind to 0.0.0.0 instead of localhost
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Backend running on port ${port}`);
  console.log(`🌐 Application listening on 0.0.0.0:${port}`);
}

bootstrap();
