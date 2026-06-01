import { z } from 'zod'
import { ConfigParsePort } from '@modules/project/domain/ports'
import { ParsedConfig, ValidationResult } from '@shared/types'
import { parseYaml } from '@utils/yaml.parser'

const DockerSchema = z.object({
  enabled: z.boolean().default(false),
  dockerfilePath: z.string().default('./Dockerfile'),
  composePath: z.string().nullable().optional(),
  buildArgs: z.record(z.string(), z.string()).default({}),
})

const EnvConfigSchema = z.object({
  branch: z.string().min(1),
  platform: z.enum(['railway', 'render', 'local']),
  docker: DockerSchema.partial().optional(),
  featureFlags: z.record(z.string(), z.boolean()).optional(),
  rateLimit: z
    .object({
      requestsPerMinute: z.number().int().positive(),
      burstLimit: z.number().int().positive().nullable().optional(),
    })
    .partial()
    .optional(),
  env: z.record(z.string(), z.string()).optional(),
})

const TriggerConfigSchema = z.object({
  project: z.string().min(1),
  repo: z.url(),
  docker: DockerSchema.partial().optional(),
  environments: z.record(z.string(), EnvConfigSchema).refine((e) => Object.keys(e).length > 0, {
    message: 'At least one environment must be defined',
  }),
})

export class YamlConfigParser implements ConfigParsePort {
  async parse(rawConfig: string): Promise<ParsedConfig> {
    const raw = parseYaml<unknown>(rawConfig);
    const result = TriggerConfigSchema.parse(raw);
    return result as ParsedConfig;
  }

  async validate(config: ParsedConfig): Promise<ValidationResult> {
    const errors: string[] = [];

    const result = TriggerConfigSchema.safeParse(config);

    if (!result.success) {
      result.error.issues.forEach((element: any) => {
        errors.push(`${element.path.join('.')}: ${element.message}`);
      });
    }

    const envEntries = Object.entries(config.environments);

    const hasProd = envEntries.some(([name]) => ['production', 'prod'].includes(name.toLowerCase()));

    if (hasProd) errors.push('No Production environment definded');

    envEntries.forEach(([name, envConfig]) => {
      if (name !== 'local' && envConfig.platform === 'local') {
        errors.push(`Environment "${name}" cannot use platform "local"`)
      }
    })

    return { valid: errors.length === 0, errors}
  }
}
