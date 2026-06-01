import { Queue, Worker, QueueEvents } from 'bullmq'
import { getRedis } from '@infra/cache/redis.config'
import { QueueName } from '@shared/queue/QueueNames'
import { logger } from '@infra/logger/logger'

const connection = { connection: getRedis() }

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
  const worker = new Worker<T>(queueName, processor, { ...connection, concurrency })

  worker.on('error', (err) => logger.error({ err }, `Worker error in ${queueName}`))

  return worker
}
