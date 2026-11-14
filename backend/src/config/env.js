import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('127.0.0.1'),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.string().default('info'),
  CORS_ORIGIN: z.string().url().default('http://localhost:5173'),

  DATABASE_URL: z.string().url(),
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, 'must be at least 32 characters')
    .refine((value) => !/[<>\s]/.test(value), {
      message: 'looks like a placeholder. Generate one with: openssl rand -hex 48',
    }),
  JWT_ACCESS_EXPIRES_IN: z.string().default('12h'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;