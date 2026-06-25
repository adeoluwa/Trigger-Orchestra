import { Queue, Worker, QueueEvents } from 'bullmq'
import { QueueName } from '@shared/queue/QueueNames'
import { logger } from '@infra/logger/logger'
import { env } from '@config/env'

// Pass raw connection options so BullMQ creates its own ioredis client.
// Passing a Redis *instance* causes a TS error because the project uses
// ioredis@5.11.0 while BullMQ's peer dep resolves to ioredis@5.10.1 —
// two structurally-incompatible class types under strict pnpm deduplication.
const connection = {
  connection: {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
  },
}

export const deploymentQueue = new Queue(QueueName.DEPLOYMENT, {
  ...connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 },
  },
})

export const notificationQueue = new Queue(QueueName.NOTIFICATION, {
  ...connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 200 },
  },
})

export const deploymentQueueEvents = new QueueEvents(QueueName.DEPLOYMENT, connection)

deploymentQueueEvents.on('completed', ({ jobId }) => {
  logger.info({ jobId }, 'Deployment job completed')
})

deploymentQueueEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error({ jobId, failedReason }, 'Deployment job failed')
})

export function createWorker<T>(
  queueName: QueueName,
  processor: (job: any) => Promise<void>,
  concurrency = 5
): Worker {
  const worker = new Worker<T>(queueName, processor, {
    ...connection,
    concurrency,
    // Allow at most 10 job starts per 5 s window — absorbs burst traffic without queue starvation
    limiter: {
      max: 10,
      duration: 5000,
    },
  })

  worker.on('error', (err) => logger.error({ err }, `Worker error in ${queueName}`))

  return worker
}
