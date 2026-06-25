import crypto from 'crypto'
import { Request, Response } from 'express'
import { ProjectRepository } from '@modules/project/domain/ports'
import { DeploymentService } from '@modules/deployment/application/services/deployment.service'
import { env } from '@config/env'
import { logger } from '@infra/logger/logger'

export class WebhookController {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly deploymentService: DeploymentService,
  ) {}

  handleGithubPush = async (req: Request, res: Response): Promise<void> => {
    const signature = req.headers['x-hub-signature-256'] as string | undefined

    if (!this.verifySignature(req.rawBody, signature)) {
      res.status(401).json({ error: 'Invalid signature' })
      return
    }

    const event = req.headers['x-github-event']
    if (event !== 'push') {
      res.status(200).json({ message: 'Event ignored' })
      return
    }

    const payload = req.body
    const repoUrl: string = payload.repository?.html_url
    const ref: string = payload.ref
    const branch = ref?.replace('refs/heads/', '')

    if (!repoUrl || !branch) {
      res.status(400).json({ error: 'Missing repo or branch in payload' })
      return
    }

    const project = await this.projectRepository.findByRepoUrl(repoUrl)
    if (!project) {
      res.status(200).json({ message: 'No project found for this repo' })
      return
    }

    const matchingEnv = project.environments?.find((e) => e.branch === branch)
    if (!matchingEnv) {
      res.status(200).json({ message: 'No environment matches this branch' })
      return
    }

    try {
      await this.deploymentService.triggerDeployment(
        { environmentId: matchingEnv.id, projectId: project.id },
        project.ownerId
      )
      logger.info({ projectId: project.id, environmentId: matchingEnv.id, branch }, 'Webhook triggered deployment')
      res.status(200).json({ message: 'Deployment queued' })
    } catch (err) {
      logger.error({ err }, 'Webhook failed to trigger deployment')
      res.status(500).json({ error: 'Failed to trigger deployment' })
    }
  }

  private verifySignature(rawBody: Buffer | undefined, signature: string | undefined): boolean {
    if (!rawBody || !signature) return false
    const digest = 'sha256=' + crypto.createHmac('sha256', env.GITHUB_WEBHOOK_SECRET).update(rawBody).digest('hex')
    try {
      return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature))
    } catch {
      return false
    }
  }
}
