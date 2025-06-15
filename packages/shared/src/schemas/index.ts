// Export all schemas from individual modules
export * from './user';
export * from './job';
export * from './payment';
export * from './review';
export * from './api';

// Re-export commonly used schemas for convenience
export {
  userSchema,
  userProfileSchema,
  loginRequestSchema,
  registerRequestSchema,
  updateProfileRequestSchema,
  locationSchema,
  userRoleSchema,
  availabilityStatusSchema,
} from './user';

export {
  jobSchema,
  jobCreateRequestSchema,
  jobUpdateRequestSchema,
  jobApplicationSchema,
  jobApplicationCreateRequestSchema,
  jobSearchRequestSchema,
  jobCategorySchema,
  jobTypeSchema,
  jobUrgencySchema,
  jobStatusSchema,
  applicationStatusSchema,
  jobBudgetSchema,
} from './job';

export {
  paymentSchema,
  createPaymentIntentRequestSchema,
  confirmPaymentRequestSchema,
  refundRequestSchema,
  paymentStatusSchema,
  payoutStatusSchema,
  stripeAccountSchema,
  createStripeAccountRequestSchema,
} from './payment';

export {
  reviewSchema,
  createReviewRequestSchema,
  updateReviewRequestSchema,
  reviewStatsSchema,
  reviewTypeSchema,
} from './review';

export {
  apiResponseSchema,
  paginationRequestSchema,
  sortRequestSchema,
  searchRequestSchema,
  fileUploadRequestSchema,
  fileUploadResponseSchema,
  healthCheckResponseSchema,
  errorResponseSchema,
  successResponseSchema,
  uuidSchema,
  emailSchema,
  phoneSchema,
  urlSchema,
  dateSchema,
  datetimeSchema,
} from './api';
