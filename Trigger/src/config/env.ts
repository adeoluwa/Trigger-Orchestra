import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  APP_URL: z.url().default('http://localhost:3000'),
  FRONTEND_URL: z.url().default('http://localhost:3001'),
  DOCS_ENABLED: z.coerce.boolean().default(true),
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().default(5432),
  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),

  REDIS_HOST: z.string().min(1),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),

  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  ENCRYPTION_KEY: z.string().length(32),

  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
  GITHUB_CALLBACK_URL: z.url(),
  GITHUB_WEBHOOK_SECRET: z.string().min(1),

  RAILWAY_API_URL: z.url().default('https://backboard.railway.com/graphql/v2'),
  RAILWAY_API_TOKEN: z.string().min(1),

  RENDER_API_URL: z.url().default('https://api.render.com/v1'),
  RENDER_API_TOKEN: z.string().min(1),

  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.email().default('noreply@trigger.dev'),
})

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);

  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;