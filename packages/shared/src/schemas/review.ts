import { z } from 'zod';

// Review type schema
export const reviewTypeSchema = z.enum(['worker_to_poster', 'poster_to_worker']);

// Review schemas
export const reviewSchema = z.object({
  id: z.string().uuid(),
  jobId: z.string().uuid(),
  reviewerId: z.string().uuid(),
  revieweeId: z.string().uuid(),
  rating: z.number().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
  comment: z.string().max(1000, 'Comment too long').optional(),
  reviewType: reviewTypeSchema,
  isPublic: z.boolean().default(true),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createReviewRequestSchema = z.object({
  jobId: z.string().uuid(),
  revieweeId: z.string().uuid(),
  rating: z.number().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
  comment: z.string().max(1000, 'Comment too long').optional(),
  reviewType: reviewTypeSchema,
  isPublic: z.boolean().default(true).optional(),
});

export const updateReviewRequestSchema = z.object({
  rating: z.number().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5').optional(),
  comment: z.string().max(1000, 'Comment too long').optional(),
  isPublic: z.boolean().optional(),
});

export const reviewStatsSchema = z.object({
  averageRating: z.number().min(0).max(5),
  totalReviews: z.number().min(0),
  ratingDistribution: z.object({
    1: z.number().min(0),
    2: z.number().min(0),
    3: z.number().min(0),
    4: z.number().min(0),
    5: z.number().min(0),
  }),
  recentReviews: z.array(reviewSchema),
});

export const reviewFiltersSchema = z.object({
  rating: z.number().min(1).max(5).optional(),
  reviewType: reviewTypeSchema.optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
  isPublic: z.boolean().optional(),
});

export const reviewSearchRequestSchema = z.object({
  userId: z.string().uuid(),
  filters: reviewFiltersSchema.optional(),
  page: z.number().min(1).default(1).optional(),
  limit: z.number().min(1).max(50).default(20).optional(),
  sortBy: z.enum(['date', 'rating']).default('date').optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc').optional(),
});
