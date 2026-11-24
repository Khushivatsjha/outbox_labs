import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { env } from './config/env';
import { emailRoutes } from './modules/emails/email.routes';
import { notFoundHandler } from './middleware/not-found';
import { errorHandler } from './middleware/error-handler';
import { prisma } from './db/prisma';
import { createRedisConnection } from './queue/redis';

export const createApp = (): Express => {
  const app = express();

  // CORS configuration
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or Postman)
        if (!origin) return callback(null, true);

        const allowed = [
          env.FRONTEND_ORIGIN,
          'http://localhost:3000',
          'http://127.0.0.1:3000',
        ];

        if (allowed.includes(origin) || env.NODE_ENV === 'development') {
          return callback(null, true);
        }

        return callback(new Error(`CORS blocked for origin: ${origin}`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Body parser with size limits
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Health endpoint
  app.get('/api/health', async (_req: Request, res: Response) => {
    let dbStatus = 'healthy';
    let redisStatus = 'healthy';

    try {
      await Promise.race([
        prisma.$queryRaw`SELECT 1`,
        new Promise((_, reject) => setTimeout(() => reject(new Error('DB Timeout')), 1000)),
      ]);
    } catch {
      dbStatus = 'unreachable';
    }

    try {
      const redis = createRedisConnection();
      await Promise.race([
        redis.ping(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Redis Timeout')), 1000)),
      ]);
      redis.disconnect();
    } catch {
      redisStatus = 'unreachable';
    }

    const isHealthy = dbStatus === 'healthy' && redisStatus === 'healthy';

    res.status(isHealthy ? 200 : 207).json({
      status: isHealthy ? 'healthy' : 'degraded',
      service: 'reachinbox-scheduler-api',
      timestamp: new Date().toISOString(),
      dependencies: {
        database: dbStatus,
        redis: redisStatus,
        smtp: 'configured',
      },
      environment: env.NODE_ENV,
    });
  });

  // REST API Routes
  app.use('/api/emails', emailRoutes);

  // 404 Handler
  app.use(notFoundHandler);

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
};
