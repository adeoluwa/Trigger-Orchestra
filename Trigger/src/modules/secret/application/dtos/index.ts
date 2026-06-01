import { z } from 'zod'

export const StoreSecretSchema = z.object({
  environmentId: z.uuid(),
  projectId: z.uuid(),
  key: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[A-Z0-9_]+$/, 'Key must be uppercase with underscores'),
  value: z.string().min(1),
})

export type StoreSecretDto = z.infer<typeof StoreSecretSchema>
