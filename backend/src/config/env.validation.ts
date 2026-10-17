import { z } from 'zod';

const booleanCoerce = z
  .union([z.boolean(), z.string()])
  .optional()
  .transform((val) => {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') return val.trim().toLowerCase() === 'true';
    return false;
  });

const numberCoerce = (defaultValue: number) =>
  z
    .union([z.number(), z.string()])
    .optional()
    .transform((val) => {
      if (val === undefined || val === null || val === '') return defaultValue;
      const n = Number(val);
      return isNaN(n) ? defaultValue : n;
    });

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: numberCoerce(3000),
  FRONTEND_URL: z
    .string()
    .optional()
    .transform((val) =>
      !val || val.trim() === '' ? 'http://localhost:5173' : val,
    )
    .pipe(z.string().url('FRONTEND_URL must be a valid URL')),
  DATABASE_URL: z
    .string()
    .optional()
    .transform((val) => (!val || val.trim() === '' ? undefined : val)),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: numberCoerce(5433),
  DB_USERNAME: z.string().default('vibelearn'),
  DB_PASSWORD: z.string().default('vibelearn_password'),
  DB_NAME: z.string().default('vibelearn_db'),
  DB_SSL: booleanCoerce,
  DB_SYNCHRONIZE: booleanCoerce,
  DB_LOGGING: booleanCoerce,
  CLERK_SECRET_KEY: z
    .string({ message: 'CLERK_SECRET_KEY is required' })
    .min(1, 'CLERK_SECRET_KEY cannot be empty'),
  CLERK_PUBLISHABLE_KEY: z.string().optional(),

  // Cloudinary (Optional Media Storage)
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // Role-Based Access Control
  ADMIN_EMAILS: z.string().optional(),
});

export type EnvironmentVariables = z.infer<typeof envSchema>;

export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const parsed = envSchema.safeParse(config);

  if (!parsed.success) {
    const formattedErrors = JSON.stringify(
      parsed.error.flatten().fieldErrors,
      null,
      2,
    );
    throw new Error(`❌ Configuration validation error:\n${formattedErrors}`);
  }

  return parsed.data;
}
