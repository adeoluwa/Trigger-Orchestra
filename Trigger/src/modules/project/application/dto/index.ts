import { z } from 'zod'

export const CreateProjectSchema = z.object({
  name: z.string().min(2).max(100),
  repoUrl: z.string().url(),
  configPath: z.string().default('trigger.yml'),
})
export type CreateProjectDto = z.infer<typeof CreateProjectSchema>

export const UpdateProjectSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  configPath: z.string().optional(),
}).refine(data => Object.keys(data).length > 0, { message: 'At least one field must be provided' })
export type UpdateProjectDto = z.infer<typeof UpdateProjectSchema>

export const ParseConfigSchema = z.object({
  rawYaml: z.string().min(1),
})
export type ParseConfigDto = z.infer<typeof ParseConfigSchema>