import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  FRONTEND_ORIGIN: z.string().default('http://localhost:3000'),

  DATABASE_URL: z
    .string()
    .default('postgresql://postgres:postgres@localhost:5432/reachinbox_scheduler?schema=public'),

  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional().default(''),

  ETHEREAL_HOST: z.string().default('smtp.ethereal.email'),
  ETHEREAL_PORT: z.coerce.number().default(587),
  ETHEREAL_SECURE: z
    .string()
    .transform((val) => val === 'true' || val === '1')
    .or(z.boolean())
    .default(false),
  ETHEREAL_USER: z.string().optional().default(''),
  ETHEREAL_PASS: z.string().optional().default(''),

  EMAIL_WORKER_CONCURRENCY: z.coerce.number().min(1).max(50).default(5),
  EMAIL_MAX_ATTEMPTS: z.coerce.number().min(1).max(10).default(3),
});

export type Env = z.infer<typeof envSchema>;

let parsedEnv: Env;

try {
  parsedEnv = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Environment validation failed:');
    error.errors.forEach((err) => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
  } else {
    console.error('❌ Unknown error loading environment variables:', error);
  }
  // Fall back to defaults in non-production environments to avoid hard crash during early build/testing
  parsedEnv = envSchema.parse({});
}

export const env = parsedEnv;
