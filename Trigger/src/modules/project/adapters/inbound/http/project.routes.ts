import { Router } from "express";
import { ProjectController } from "@modules/project/adapters/inbound/http/project.controller";
import { authGuard } from "@shared/guards/auth.guard";

export const createProjectRouter = (controller: ProjectController): Router => {
  const router = Router();

  router.use(authGuard);

  router.post('/parse-config', controller.parseConfig);
  router.patch('/environments/:envId', controller.updateEnvironment);
  router.post('/environments/:envId/provision', controller.provisionEnvironment);
  router.get('/integrations/render/owners', controller.listRenderOwners);
  router.get('/integrations/render/services', controller.listRenderServices);
  router.get('/integrations/railway/projects', controller.listRailwayProjects);
  router.get('/integrations/railway/services', controller.listRailwayServices);
  router.post('/', controller.create);
  router.get('/', controller.list);
  router.get('/:id', controller.getOne);
  router.patch('/:id', controller.update);
  router.delete('/:id', controller.delete);

  return router;
}