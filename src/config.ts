import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  CALENDAR_MODE: z.enum(['mock', 'google']).default('mock'),
  BUSINESS_TIMEZONE: z.string().default('America/Los_Angeles'),
  GOOGLE_CALENDAR_ID: z.string().default('primary'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional(),
  GOOGLE_REFRESH_TOKEN: z.string().optional(),
  VAPI_WEBHOOK_TOKEN: z.string().optional()
});

export const config = schema.parse(process.env);
