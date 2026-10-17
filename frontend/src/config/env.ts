import { z } from 'zod';

const envSchema = z.object({
  VITE_CLERK_PUBLISHABLE_KEY: z
    .string({ message: 'VITE_CLERK_PUBLISHABLE_KEY is required' })
    .min(1, 'VITE_CLERK_PUBLISHABLE_KEY cannot be empty')
    .startsWith('pk_', 'VITE_CLERK_PUBLISHABLE_KEY must start with "pk_"'),
  VITE_API_URL: z
    .string()
    .optional()
    .transform((val) => (!val || val.trim() === '' ? 'http://localhost:3000/api' : val))
    .pipe(z.string().url('VITE_API_URL must be a valid URL')),
  VITE_DEMO_ADMIN_EMAIL: z.string().optional(),
  VITE_DEMO_ADMIN_PASSWORD: z.string().optional(),
  MODE: z.enum(['development', 'production', 'test']).default('development'),
  BASE_URL: z.string().default('/'),
});

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  const formattedErrors = JSON.stringify(parsed.error.flatten().fieldErrors, null, 2);
  console.error(
    `❌ [Frontend Env Validation Error] Missing or invalid environment variables:\n${formattedErrors}`
  );
  throw new Error(
    `Invalid frontend environment variables. Check your .env file:\n${formattedErrors}`
  );
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
