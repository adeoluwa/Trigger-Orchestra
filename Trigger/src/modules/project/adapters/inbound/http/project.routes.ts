import { Router } from "express";
import { ProjectController } from "@modules/project/adapters/inbound/http/project.controller";
import { authGuard } from "@shared/guards/auth.guard";

export const createProjectRouter = (controller: ProjectController): Router => {
  const router = Router();

  router.use(authGuard);

  router.post('/', controller.create);
  router.get('/', controller.list);
  router.get('/:id', controller.getOne);
  router.patch('/:id', controller.update);
  router.delete('/:id', controller.delete);
  router.post('/parse-config', controller.parseConfig);

  return router;
}