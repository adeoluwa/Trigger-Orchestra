import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { ExpressAdapter } from '@bull-board/express'
import { Application } from 'express'
import { deploymentQueue, notificationQueue } from '@infra/queue/bullmq.config'
import { authGuard } from '@shared/guards/auth.guard'
import { env } from '@config/env'

export function setupBullBoard(app: Application): void {
  if (env.NODE_ENV === 'production') return

  const serverAdapter = new ExpressAdapter()
  serverAdapter.setBasePath('/admin/queues')

  createBullBoard({
    queues: [
      new BullMQAdapter(deploymentQueue),
      new BullMQAdapter(notificationQueue),
    ],
    serverAdapter,
  })

  app.use('/admin/queues', authGuard, serverAdapter.getRouter())
}
