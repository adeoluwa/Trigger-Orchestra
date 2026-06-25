import { Redis } from 'ioredis'

// Matches the 10-minute log-streaming window + buffer
const LOCK_TTL_SECONDS = 720

export class DeploymentLock {
  constructor(private readonly redis: Redis) {}

  /**
   * Atomically acquire the lock for an environment.
   * Returns true if acquired, false if another deployment already holds it.
   */
  async acquire(environmentId: string): Promise<boolean> {
    const result = await this.redis.set(
      `lock:deploy:${environmentId}`,
      '1',
      'EX',
      LOCK_TTL_SECONDS,
      'NX'
    )
    return result === 'OK'
  }

  async release(environmentId: string): Promise<void> {
    await this.redis.del(`lock:deploy:${environmentId}`)
  }
}
