import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Environment validation schema
const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  API_VERSION: z.string().default('v1'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Supabase
  SUPABASE_URL: z.string().url('Invalid SUPABASE_URL'),
  SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),

  // Authentication
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  // Stripe
  STRIPE_SECRET_KEY: z.string().min(1, 'STRIPE_SECRET_KEY is required'),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, 'STRIPE_WEBHOOK_SECRET is required'),
  STRIPE_CONNECT_CLIENT_ID: z.string().optional(),

  // Security
  CORS_ORIGINS: z.string().default('http://localhost:5173,http://localhost:5174,https://fixer.gg,https://www.fixer.gg'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),

  // Email
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  FROM_EMAIL: z.string().email().optional(),
  FROM_NAME: z.string().optional(),

  // File Storage
  STORAGE_BUCKET_AVATARS: z.string().default('avatars'),
  STORAGE_BUCKET_JOB_IMAGES: z.string().default('job-images'),
  STORAGE_BUCKET_DOCUMENTS: z.string().default('documents'),
  MAX_FILE_SIZE_MB: z.coerce.number().default(10),

  // Frontend URLs
  FIXER_POST_URL: z.string().url().default('http://localhost:5173'),
  FIXER_WORK_URL: z.string().url().default('http://localhost:5174'),
  FRONTEND_RESET_PASSWORD_URL: z.string().url().optional(),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FORMAT: z.string().default('combined'),

  // Development
  DEBUG: z.coerce.boolean().default(false),
  ENABLE_SWAGGER: z.coerce.boolean().default(true),
  ENABLE_MORGAN_LOGGING: z.coerce.boolean().default(true),

  // External Services
  MAPBOX_ACCESS_TOKEN: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  REDIS_URL: z.string().optional(),
});

// Validate environment variables
const envValidation = envSchema.safeParse(process.env);

if (!envValidation.success) {
  console.error('❌ Invalid environment variables:');
  envValidation.error.errors.forEach((error) => {
    console.error(`  ${error.path.join('.')}: ${error.message}`);
  });
  process.exit(1);
}

export const config = envValidation.data;

// Helper functions
export const isDevelopment = config.NODE_ENV === 'development';
export const isProduction = config.NODE_ENV === 'production';
export const isTest = config.NODE_ENV === 'test';

// CORS origins array
export const corsOrigins = config.CORS_ORIGINS.split(',').map(origin => origin.trim());

// Log configuration on startup
if (isDevelopment) {
  console.log('🔧 Environment Configuration:');
  console.log(`  NODE_ENV: ${config.NODE_ENV}`);
  console.log(`  PORT: ${config.PORT}`);
  console.log(`  API_VERSION: ${config.API_VERSION}`);
  console.log(`  DEBUG: ${config.DEBUG}`);
  console.log(`  CORS_ORIGINS: ${corsOrigins.join(', ')}`);
}
