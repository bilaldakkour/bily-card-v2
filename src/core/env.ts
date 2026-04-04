import { z } from 'zod'

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    DATABASE_PROVIDER: z.enum(['mongo', 'supabase']).default('mongo'),
    MONGODB_URI: z.string().min(1).optional(),
    AUTH_SECRET: z.string().min(32).default('dev_only_secret_change_me_32_chars_minimum'),
    DAILY_CARD_BASE_URL: z.string().url().optional(),
    DAILY_CARD_API_KEY: z.string().optional(),
    DAILY_CARD_API_SECRET: z.string().optional(),
    NEXTAUTH_URL: z.string().url().optional(),
    NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
    SMTP_HOST: z.string().min(1).optional(),
    SMTP_PORT: z.coerce.number().int().positive().optional(),
    SMTP_USER: z.string().min(1).optional(),
    SMTP_PASS: z.string().min(1).optional(),
    SMTP_FROM: z.string().min(1).optional(),
  })
  .superRefine((values, ctx) => {
    if (values.DATABASE_PROVIDER === 'mongo' && !values.MONGODB_URI) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['MONGODB_URI'],
        message: 'MONGODB_URI is required when DATABASE_PROVIDER=mongo',
      })
    }

    if (values.DATABASE_PROVIDER === 'supabase') {
      if (!values.NEXT_PUBLIC_SUPABASE_URL) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['NEXT_PUBLIC_SUPABASE_URL'],
          message: 'NEXT_PUBLIC_SUPABASE_URL is required when DATABASE_PROVIDER=supabase',
        })
      }

      if (!values.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['NEXT_PUBLIC_SUPABASE_ANON_KEY'],
          message: 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required when DATABASE_PROVIDER=supabase',
        })
      }

      if (!values.SUPABASE_SERVICE_ROLE_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['SUPABASE_SERVICE_ROLE_KEY'],
          message: 'SUPABASE_SERVICE_ROLE_KEY is required when DATABASE_PROVIDER=supabase',
        })
      }
    }
  })

export const env = envSchema.parse(process.env)
export const isProd = env.NODE_ENV === 'production'
