import Redis from 'ioredis'
import { env } from '@config/env'
import { logger } from '@infra/logger/logger'

let instance: Redis | null = null

export function getRedis(): Redis {
  if (!instance) {
    instance = new Redis({
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      password: env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null,
      retryStrategy: (times) => {
        if (times > 10) return null

        return Math.min(times * 100, 3000)
      },
    })

    instance.on('connect', () => logger.info('Redis connected'))
    instance.on('error', (err) => logger.error({ err }, 'Redis error'))
  }

  return instance
}
