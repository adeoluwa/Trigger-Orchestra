import { z } from 'zod';

export const TriggerDeploymentSchema = z.object({
  environmentId: z.uuid(),
  projectId: z.uuid()
});

export type TriggerDeploymentDto = z.infer<typeof TriggerDeploymentSchema>