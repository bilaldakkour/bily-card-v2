import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  MONGODB_URI: z.string().min(1),
  AUTH_SECRET: z.string().min(32).default('dev_only_secret_change_me_32_chars_minimum'),
  DAILY_CARD_BASE_URL: z.string().url().optional(),
  DAILY_CARD_API_KEY: z.string().optional(),
  DAILY_CARD_API_SECRET: z.string().optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASS: z.string().min(1).optional(),
  SMTP_FROM: z.string().min(1).optional(),
})

export const env = envSchema.parse(process.env)
export const isProd = env.NODE_ENV === 'production'

