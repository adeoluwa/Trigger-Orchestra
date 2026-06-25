import { Job } from 'bullmq'
import { createWorker } from '@infra/queue/bullmq.config'
import { QueueName, NotificationJobName, NotificationJobData } from '@shared/queue/QueueNames'
import { NotificationService } from '@modules/notification/application/services/NotificationService'
import { ResendEmailSender } from '@modules/notification/adapters/outbound/email/ResendEmailSender'
import { logger } from '@infra/logger/logger'

export function startNotificationWorker(): void {
  const emailSender = new ResendEmailSender()
  const notificationService = new NotificationService(emailSender)

  createWorker<NotificationJobData>(
    QueueName.NOTIFICATION,
    async (job: Job<NotificationJobData>) => {
      if (job.name === NotificationJobName.SEND_NOTIFICATION) {
        logger.info({ jobId: job.id, type: job.data.type }, 'Processing notification job')
        await notificationService.processNotification(job.data)
      }
    },
    5
  )

  logger.info('Notification worker started')
}
