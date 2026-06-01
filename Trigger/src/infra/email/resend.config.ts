import { Resend } from 'resend'
import { env } from '@config/env'
import { logger } from '@infra/logger/logger'

const resend = new Resend(env.RESEND_API_KEY)

export interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  try {
    await resend.emails.send({
      from: env.EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
    })
  } catch (error) {
    logger.error({ error, to: options.to }, 'Failed to send email')
    throw error
  }
}
