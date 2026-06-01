import { Request, Response, NextFunction } from "express";
import { AuthenticatedRequest } from "@shared/guards/auth.guard";
import { ProjectService } from "@modules/project/application/services/project.service";
import { CreateProjectSchema, ParseConfigSchema, UpdateProjectSchema } from "@modules/project/application/dto";
import { ValidationError } from "@shared/errors";
import { HttpStatus, successResponse } from "@shared/http/ApiResponse";

export class ProjectController {
  constructor(private readonly projectService: ProjectService){}

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