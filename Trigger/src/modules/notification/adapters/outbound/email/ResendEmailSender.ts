import { sendEmail } from '@infra/email/resend.config'
import { IEmailSender } from '../../../domain/ports'

export class ResendEmailSender implements IEmailSender {
  async send(opts: { to: string; subject: string; html: string }): Promise<void> {
    await sendEmail(opts)
  }
}
