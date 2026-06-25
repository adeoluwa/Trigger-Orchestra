export interface IEmailSender {
  send(opts: { to: string; subject: string; html: string }): Promise<void>
}
