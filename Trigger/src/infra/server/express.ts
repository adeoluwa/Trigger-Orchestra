import 'reflect-metadata'
import express, { Application } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { errorMiddleware } from '@shared/http/error.midleware'
import { logger } from '@infra/logger/logger';
import { registerRoutes } from '@infra/server/routes'
import { setupSwagger } from '@infra/server/swagger'
import { setupBullBoard } from '@infra/server/bullboard'


export function createExpressApp(): Application {
  const app = express()

  app.use(helmet())
  app.use(cors({ origin: process.env.ALLOWED_ORIGIN?.split(',') || '*', credentials: true}));

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 200,
      standardHeaders: true,
      legacyHeaders: false
    })
  );

  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ extended: true }))

  app.use((req, _res, next ) => {
    logger.debug({ method: req.method, path: req.path }, 'Incoming request')
    next()
  });

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  });

  registerRoutes(app);
  setupSwagger(app);
  setupBullBoard(app);

  app.use(errorMiddleware);

  return app;
}