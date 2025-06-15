import { z } from 'zod';

// Common API schemas
export const apiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.any()).optional(),
    field: z.string().optional(),
  }).optional(),
  message: z.string().optional(),
  meta: z.object({
    page: z.number().min(1).optional(),
    limit: z.number().min(1).optional(),
    total: z.number().min(0).optional(),
    totalPages: z.number().min(0).optional(),
    hasNext: z.boolean().optional(),
    hasPrev: z.boolean().optional(),
  }).optional(),
});

export const paginationRequestSchema = z.object({
  page: z.number().min(1).default(1).optional(),
  limit: z.number().min(1).max(100).default(20).optional(),
});

export const sortRequestSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc').optional(),
});

export const searchRequestSchema = paginationRequestSchema.extend({
  query: z.string().max(100, 'Search query too long').optional(),
}).merge(sortRequestSchema);

// File upload schemas
export const fileUploadRequestSchema = z.object({
  bucket: z.string().min(1, 'Bucket is required'),
  path: z.string().optional(),
  isPublic: z.boolean().default(false).optional(),
});

export const fileUploadResponseSchema = z.object({
  url: z.string().url(),
  path: z.string(),
  size: z.number().min(0),
  mimeType: z.string(),
  uploadedAt: z.string().datetime(),
});

// Health check schema
export const healthCheckResponseSchema = z.object({
  status: z.enum(['healthy', 'unhealthy']),
  timestamp: z.string().datetime(),
  version: z.string(),
  services: z.object({
    database: z.enum(['healthy', 'unhealthy']),
    stripe: z.enum(['healthy', 'unhealthy']),
    supabase: z.enum(['healthy', 'unhealthy']),
  }),
});

// Validation helpers
export const uuidSchema = z.string().uuid('Invalid UUID format');
export const emailSchema = z.string().email('Invalid email format');
export const phoneSchema = z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format');
export const urlSchema = z.string().url('Invalid URL format');
export const dateSchema = z.string().date('Invalid date format');
export const datetimeSchema = z.string().datetime('Invalid datetime format');

// Common field schemas
export const idParamSchema = z.object({
  id: uuidSchema,
});

export const slugParamSchema = z.object({
  slug: z.string().min(1, 'Slug is required'),
});

export const queryParamsSchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().min(1).default(1).optional(),
  limit: z.coerce.number().min(1).max(100).default(20).optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc').optional(),
});

// Error response schema
export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.any()).optional(),
    field: z.string().optional(),
  }),
});

// Success response schema
export const successResponseSchema = z.object({
  success: z.literal(true),
  data: z.any().optional(),
  message: z.string().optional(),
  meta: z.object({
    page: z.number().min(1).optional(),
    limit: z.number().min(1).optional(),
    total: z.number().min(0).optional(),
    totalPages: z.number().min(0).optional(),
    hasNext: z.boolean().optional(),
    hasPrev: z.boolean().optional(),
  }).optional(),
});
