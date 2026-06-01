import 'reflect-metadata'
import { createExpressApp } from '@infra/server/express'
import { initDatabase } from '@infra/database/typeorm.config'
import { logger } from '@infra/logger/logger'
import { env } from '@config/env'
import { startDeploymentWorker } from '@modules/deployment/adapters/inbound/queue/deployment.consumer'
// import { startDeploymentWorker } from '@modules/deployment/adapters/inbound/queue/deployment.consumer'

async function bootstrap(): Promise<void> {
  await initDatabase();
  logger.info('Database connected')

  const app = createExpressApp()

  startDeploymentWorker();

  app.listen(env.PORT, () => {
    logger.info(`Trigger running on port ${env.PORT}`)
    logger.info(`Docs at ${env.APP_URL}/api/docs`)
    logger.info(`Queue board at ${env.APP_URL}/admin/queues`)
  });
};

bootstrap().catch((err) => {
  logger.error({ err }, 'Failed to start server')
  process.exit();
})