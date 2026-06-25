import { Request, Response, NextFunction } from "express";
import axios from "axios";
import { AuthenticatedRequest } from "@shared/guards/auth.guard";
import { ProjectService } from "@modules/project/application/services/project.service";
import { CreateProjectSchema, ParseConfigSchema, UpdateProjectSchema } from "@modules/project/application/dto";
import { AppError, ValidationError, ExternalServiceError } from "@shared/errors";
import { HttpStatus, successResponse } from "@shared/http/ApiResponse";
import { env } from "@config/env";

export class ProjectController {
  constructor(private readonly projectService: ProjectService){}

  // Map raw axios/GraphQL failures from Railway into a clear 502 instead of a generic 500.
  private railwayError(error: unknown): AppError {
    if (
      axios.isAxiosError(error) &&
      ['ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT', 'EAI_AGAIN'].includes(error.code ?? '')
    ) {
      return new ExternalServiceError(
        'Railway',
        `Could not reach the Railway API (${error.code}). Check your network connection and try again.`
      )
    }
    const message = error instanceof Error ? error.message : String(error)
    if (/not authorized|unauthorized|unauthenticated/i.test(message)) {
      return new ExternalServiceError(
        'Railway',
        'Not authorized — RAILWAY_API_TOKEN is invalid, expired, or not an account-level token. Create a personal token at railway.com/account/tokens and restart the API.'
      )
    }
    return new ExternalServiceError('Railway', message)
  }

  // Map raw axios failures from Render into a clear 502 instead of a generic 500.
  private renderError(error: unknown): AppError {
    if (axios.isAxiosError(error)) {
      if (['ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT', 'EAI_AGAIN'].includes(error.code ?? '')) {
        return new ExternalServiceError(
          'Render',
          `Could not reach the Render API (${error.code}). Check your network connection and try again.`
        )
      }
      const status = error.response?.status
      if (status === 401 || status === 403) {
        return new ExternalServiceError(
          'Render',
          'Not authorized — RENDER_API_TOKEN is invalid or expired. Create a new API key at dashboard.render.com/u/settings#api-keys and restart the API.'
        )
      }
      const body = error.response?.data as { message?: string; error?: string } | undefined
      return new ExternalServiceError('Render', body?.message ?? body?.error ?? error.message)
    }
    return new ExternalServiceError('Render', error instanceof Error ? error.message : String(error))
  }

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const parsed = CreateProjectSchema.safeParse(req.body);

      if (!parsed.success) throw new ValidationError('Invalid input', parsed.error.flatten().fieldErrors as any);

      const result = await this.projectService.createProject(parsed.data, authReq.user.id);

      res.status(HttpStatus.CREATED).json(successResponse(result));
    } catch (error) {
      next(error);
    }
  }

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const projects = await this.projectService.listProjects((req as AuthenticatedRequest).user.id);

      res.status(HttpStatus.OK).json(successResponse(projects));
    } catch (error) {
      next(error);
    }
  }

  getOne = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      const project = await this.projectService.getProject(projectId, (req as AuthenticatedRequest).user.id);

      res.status(HttpStatus.OK).json(successResponse(project));
    } catch (error) {
      next(error);
    }
  }

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const parsed = UpdateProjectSchema.safeParse(req.body);

      if (!parsed.success) throw new ValidationError('Invalid input', parsed.error.flatten().fieldErrors as any);

      const project = await this.projectService.updateProject(projectId, (req as AuthenticatedRequest).user.id, parsed.data);

      res.status(HttpStatus.OK).json(successResponse(project));
    } catch (error) {
      next(error);
    }
  }

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      await this.projectService.deleteProject(projectId, (req as AuthenticatedRequest).user.id);

      res.status(HttpStatus.NO_CONTENT).send();
    } catch (error) {
      next(error);
    }
  }

  provisionEnvironment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, platformAccountId, buildCommand, startCommand } = req.body as {
        name: string; platformAccountId: string; buildCommand?: string; startCommand?: string
      }
      if (!name || !platformAccountId) {
        res.status(HttpStatus.BAD_REQUEST).json({ error: 'name and platformAccountId are required' })
        return
      }
      const envId = Array.isArray(req.params.envId) ? req.params.envId[0] : req.params.envId
      const environment = await this.projectService.provisionEnvironment(
        envId,
        (req as AuthenticatedRequest).user.id,
        { name, platformAccountId, buildCommand, startCommand }
      )
      res.status(HttpStatus.CREATED).json(successResponse(environment))
    } catch (error) {
      next(error)
    }
  }

  listRenderOwners = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const response = await axios.get('https://api.render.com/v1/owners?limit=100', {
        headers: { Authorization: `Bearer ${env.RENDER_API_TOKEN}`, Accept: 'application/json' },
      })
      const owners = (response.data as any[]).map((item: any) => {
        const id = item.owner?.id ?? item.id
        const rawName = item.owner?.name ?? item.name ?? id
        const type = item.owner?.type ?? item.type
        const label = type === 'team' ? `${rawName} (workspace)` : rawName
        return { id, name: label }
      })
      res.status(HttpStatus.OK).json(successResponse(owners))
    } catch (error) {
      next(this.renderError(error))
    }
  }

  listRailwayProjects = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const response = await axios.post(
        'https://backboard.railway.com/graphql/v2',
        { query: `query { me { projects { edges { node { id name } } } } }` },
        { headers: { Authorization: `Bearer ${env.RAILWAY_API_TOKEN}`, 'Content-Type': 'application/json' } }
      )
      if (response.data?.errors) {
        throw new Error(response.data.errors[0]?.message ?? 'Railway GraphQL error')
      }
      const projects = (response.data?.data?.me?.projects?.edges ?? []).map(({ node }: any) => ({
        id: node.id,
        name: node.name,
      }))
      res.status(HttpStatus.OK).json(successResponse(projects))
    } catch (error) {
      next(this.railwayError(error))
    }
  }

  listRenderServices = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const response = await axios.get('https://api.render.com/v1/services?limit=100&type=web_service', {
        headers: { Authorization: `Bearer ${env.RENDER_API_TOKEN}`, Accept: 'application/json' },
      })
      const services = (response.data as any[]).map((item: any) => ({
        id: item.service?.id ?? item.id,
        name: item.service?.name ?? item.name,
        status: item.service?.suspended ?? null,
      }))
      res.status(HttpStatus.OK).json(successResponse(services))
    } catch (error) {
      next(this.renderError(error))
    }
  }

  listRailwayServices = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const response = await axios.post(
        'https://backboard.railway.com/graphql/v2',
        {
          query: `query {
            me {
              projects {
                edges {
                  node {
                    id
                    name
                    services {
                      edges {
                        node {
                          id
                          name
                        }
                      }
                    }
                  }
                }
              }
            }
          }`,
        },
        { headers: { Authorization: `Bearer ${env.RAILWAY_API_TOKEN}`, 'Content-Type': 'application/json' } }
      )

      if (response.data?.errors) {
        throw new Error(response.data.errors[0]?.message ?? 'Railway GraphQL error')
      }

      const projects = response.data?.data?.me?.projects?.edges ?? []
      const services: { id: string; name: string; projectName: string }[] = []
      for (const { node: project } of projects) {
        for (const { node: svc } of (project.services?.edges ?? [])) {
          services.push({ id: svc.id, name: svc.name, projectName: project.name })
        }
      }
      res.status(HttpStatus.OK).json(successResponse(services))
    } catch (error) {
      next(this.railwayError(error))
    }
  }

  updateEnvironment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platformServiceId, branch } = req.body as { platformServiceId?: string; branch?: string }
      const envId = Array.isArray(req.params.envId) ? req.params.envId[0] : req.params.envId
      const environment = await this.projectService.updateEnvironment(
        envId,
        (req as AuthenticatedRequest).user.id,
        { platformServiceId: platformServiceId ?? null, branch }
      )
      res.status(HttpStatus.OK).json(successResponse(environment))
    } catch (error) {
      next(error)
    }
  }

  parseConfig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = ParseConfigSchema.safeParse(req.body);

      if (!parsed.success) throw new ValidationError('Invalid input', parsed.error.flatten().fieldErrors as any);

      const result = await this.projectService.parseConfigPreview(parsed.data);

      res.status(HttpStatus.OK).json(successResponse(result));
    } catch (error) {
      next(error)
    }
  }
}