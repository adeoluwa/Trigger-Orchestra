import { NotificationJobData, NotificationEventType } from '@shared/queue/QueueNames'
import { IEmailSender } from '../../domain/ports'
import { logger } from '@infra/logger/logger'

export class NotificationService {
  constructor(private readonly emailSender: IEmailSender) {}

  async processNotification(data: NotificationJobData): Promise<void> {
    const { subject, html } = this.buildEmail(data)
    await this.emailSender.send({ to: data.userEmail, subject, html })
    logger.info({ deploymentId: data.deploymentId, type: data.type, to: data.userEmail }, 'Notification sent')
  }

  private buildEmail(data: NotificationJobData): { subject: string; html: string } {
    switch (data.type) {
      case 'deployment_success':
        return {
          subject: `✅ Deployment succeeded — ${data.projectName} / ${data.environmentName}`,
          html: this.template(data, {
            icon: '✅',
            headline: 'Deployment succeeded',
            colour: '#16a34a',
            body: `Your deployment to <strong>${data.environmentName}</strong> on <strong>${data.platform}</strong> completed successfully.`,
          }),
        }

      case 'deployment_failed':
        return {
          subject: `❌ Deployment failed — ${data.projectName} / ${data.environmentName}`,
          html: this.template(data, {
            icon: '❌',
            headline: 'Deployment failed',
            colour: '#dc2626',
            body: `The deployment to <strong>${data.environmentName}</strong> on <strong>${data.platform}</strong> failed. Check the deployment logs for details.`,
          }),
        }

      case 'rollback_success':
        return {
          subject: `⚠️ Rolled back — ${data.projectName} / ${data.environmentName}`,
          html: this.template(data, {
            icon: '⚠️',
            headline: 'Deployment failed — environment rolled back',
            colour: '#d97706',
            body: `The deployment failed but the environment was automatically rolled back to commit <code>${data.rollbackCommitSha?.slice(0, 7) ?? 'unknown'}</code>.`,
          }),
        }

      case 'rollback_failed':
        return {
          subject: `🚨 Deployment & rollback failed — ${data.projectName} / ${data.environmentName}`,
          html: this.template(data, {
            icon: '🚨',
            headline: 'Deployment failed — rollback also failed',
            colour: '#dc2626',
            body: `The deployment failed and the automatic rollback also failed. <strong>The environment is in a degraded state and requires manual intervention.</strong>`,
          }),
        }
    }
  }

  private template(
    data: NotificationJobData,
    opts: { icon: string; headline: string; colour: string; body: string }
  ): string {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">

    <div style="background:${opts.colour};padding:24px 32px">
      <p style="margin:0;font-size:28px">${opts.icon}</p>
      <h1 style="margin:8px 0 0;font-size:20px;color:#fff;font-weight:600">${opts.headline}</h1>
    </div>

    <div style="padding:28px 32px">
      <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.5">Hi ${data.username},</p>
      <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.5">${opts.body}</p>

      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr style="border-bottom:1px solid #e5e7eb">
          <td style="padding:10px 0;color:#6b7280;width:130px">Project</td>
          <td style="padding:10px 0;color:#111827;font-weight:500">${data.projectName}</td>
        </tr>
        <tr style="border-bottom:1px solid #e5e7eb">
          <td style="padding:10px 0;color:#6b7280">Environment</td>
          <td style="padding:10px 0;color:#111827;font-weight:500">${data.environmentName}</td>
        </tr>
        <tr style="border-bottom:1px solid #e5e7eb">
          <td style="padding:10px 0;color:#6b7280">Platform</td>
          <td style="padding:10px 0;color:#111827;font-weight:500">${data.platform}</td>
        </tr>
        <tr style="border-bottom:1px solid #e5e7eb">
          <td style="padding:10px 0;color:#6b7280">Commit</td>
          <td style="padding:10px 0;font-family:monospace;color:#111827">${data.commitSha.slice(0, 7)}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#6b7280">Message</td>
          <td style="padding:10px 0;color:#111827">${data.commitMessage}</td>
        </tr>
      </table>
    </div>

    <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb">
      <p style="margin:0;font-size:12px;color:#9ca3af">Trigger Orchestra · Deployment ID: ${data.deploymentId}</p>
    </div>
  </div>
</body>
</html>`
  }
}
