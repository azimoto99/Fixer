import { z } from 'zod';
import { locationSchema } from './user';

// Job category and type schemas
export const jobCategorySchema = z.enum([
  'home_repair',
  'cleaning',
  'moving',
  'delivery',
  'assembly',
  'gardening',
  'painting',
  'electrical',
  'plumbing',
  'handyman',
  'tech_support',
  'tutoring',
  'pet_care',
  'event_help',
  'other',
]);

export const jobTypeSchema = z.enum(['one_time', 'recurring', 'project']);

export const jobUrgencySchema = z.enum(['low', 'medium', 'high', 'urgent']);

export const jobStatusSchema = z.enum([
  'draft',
  'open',
  'assigned',
  'in_progress',
  'completed',
  'cancelled',
  'disputed',
]);

export const applicationStatusSchema = z.enum([
  'pending',
  'accepted',
  'rejected',
  'withdrawn',
]);

// Job budget schema
export const jobBudgetSchema = z.object({
  type: z.enum(['fixed', 'hourly', 'negotiable']),
  amount: z.number().min(0, 'Amount must be positive').optional(),
  minAmount: z.number().min(0, 'Minimum amount must be positive').optional(),
  maxAmount: z.number().min(0, 'Maximum amount must be positive').optional(),
  currency: z.string().length(3, 'Currency must be 3 characters').default('USD'),
}).refine((data) => {
  if (data.type === 'fixed' && !data.amount) {
    return false;
  }
  if (data.type === 'negotiable' && (!data.minAmount || !data.maxAmount)) {
    return false;
  }
  if (data.minAmount && data.maxAmount && data.minAmount > data.maxAmount) {
    return false;
  }
  return true;
}, {
  message: 'Invalid budget configuration',
});

// Job schemas
export const jobSchema = z.object({
  id: z.string().uuid(),
  posterId: z.string().uuid(),
  title: z.string().min(5, 'Title must be at least 5 characters').max(100, 'Title too long'),
  description: z.string().min(20, 'Description must be at least 20 characters').max(2000, 'Description too long'),
  category: jobCategorySchema,
  subcategory: z.string().max(50, 'Subcategory too long').optional(),
  location: locationSchema,
  jobType: jobTypeSchema,
  urgency: jobUrgencySchema,
  estimatedDuration: z.string().min(1, 'Estimated duration is required'),
  budget: jobBudgetSchema,
  requiredSkills: z.array(z.string()).max(10, 'Too many required skills'),
  images: z.array(z.string().url()).max(5, 'Too many images').optional(),
  status: jobStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  scheduledFor: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
});

export const jobCreateRequestSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(100, 'Title too long'),
  description: z.string().min(20, 'Description must be at least 20 characters').max(2000, 'Description too long'),
  category: jobCategorySchema,
  subcategory: z.string().max(50, 'Subcategory too long').optional(),
  location: locationSchema,
  jobType: jobTypeSchema,
  urgency: jobUrgencySchema,
  estimatedDuration: z.string().min(1, 'Estimated duration is required'),
  budget: jobBudgetSchema,
  requiredSkills: z.array(z.string()).max(10, 'Too many required skills'),
  images: z.array(z.string().url()).max(5, 'Too many images').optional(),
  scheduledFor: z.string().datetime().optional(),
});

export const jobUpdateRequestSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(100, 'Title too long').optional(),
  description: z.string().min(20, 'Description must be at least 20 characters').max(2000, 'Description too long').optional(),
  category: jobCategorySchema.optional(),
  subcategory: z.string().max(50, 'Subcategory too long').optional(),
  location: locationSchema.optional(),
  jobType: jobTypeSchema.optional(),
  urgency: jobUrgencySchema.optional(),
  estimatedDuration: z.string().min(1, 'Estimated duration is required').optional(),
  budget: jobBudgetSchema.optional(),
  requiredSkills: z.array(z.string()).max(10, 'Too many required skills').optional(),
  images: z.array(z.string().url()).max(5, 'Too many images').optional(),
  scheduledFor: z.string().datetime().optional(),
  status: jobStatusSchema.optional(),
});

// Job application schemas
export const jobApplicationSchema = z.object({
  id: z.string().uuid(),
  jobId: z.string().uuid(),
  workerId: z.string().uuid(),
  message: z.string().min(10, 'Message must be at least 10 characters').max(1000, 'Message too long'),
  proposedRate: z.number().min(0, 'Proposed rate must be positive').optional(),
  estimatedDuration: z.string().optional(),
  availableFrom: z.string().datetime(),
  status: applicationStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const jobApplicationCreateRequestSchema = z.object({
  jobId: z.string().uuid(),
  message: z.string().min(10, 'Message must be at least 10 characters').max(1000, 'Message too long'),
  proposedRate: z.number().min(0, 'Proposed rate must be positive').optional(),
  estimatedDuration: z.string().optional(),
  availableFrom: z.string().datetime(),
});

export const jobApplicationUpdateRequestSchema = z.object({
  message: z.string().min(10, 'Message must be at least 10 characters').max(1000, 'Message too long').optional(),
  proposedRate: z.number().min(0, 'Proposed rate must be positive').optional(),
  estimatedDuration: z.string().optional(),
  availableFrom: z.string().datetime().optional(),
  status: applicationStatusSchema.optional(),
});

// Job search schemas
export const jobSearchFiltersSchema = z.object({
  category: jobCategorySchema.optional(),
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    radius: z.number().min(1).max(100), // in miles
  }).optional(),
  budgetMin: z.number().min(0).optional(),
  budgetMax: z.number().min(0).optional(),
  jobType: jobTypeSchema.optional(),
  urgency: jobUrgencySchema.optional(),
  skills: z.array(z.string()).optional(),
  datePosted: z.enum(['today', 'week', 'month']).optional(),
});

export const jobSearchRequestSchema = z.object({
  query: z.string().max(100, 'Search query too long').optional(),
  filters: jobSearchFiltersSchema.optional(),
  page: z.number().min(1).default(1).optional(),
  limit: z.number().min(1).max(50).default(20).optional(),
  sortBy: z.enum(['date', 'budget', 'distance', 'urgency']).default('date').optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc').optional(),
});
