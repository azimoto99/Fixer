// Export all types
export * from './types';

// Export all schemas
export * from './schemas';

// Export all utilities
export * from './utils';

// Main exports for convenience
export type {
  // User types
  User,
  UserProfile,
  AuthUser,
  LocationData,
  UserRole,
  AvailabilityStatus,
  LoginRequest,
  RegisterRequest,
  UpdateProfileRequest,
  
  // Job types
  Job,
  JobApplication,
  JobBudget,
  JobCategory,
  JobType,
  JobUrgency,
  JobStatus,
  ApplicationStatus,
  JobCreateRequest,
  JobUpdateRequest,
  JobSearchRequest,
  JobSearchFilters,
  
  // Payment types
  Payment,
  PaymentMethod,
  PaymentStatus,
  PayoutStatus,
  CreatePaymentIntentRequest,
  ConfirmPaymentRequest,
  RefundRequest,
  PaymentHistory,
  
  // Review types
  Review,
  ReviewStats,
  ReviewType,
  CreateReviewRequest,
  UpdateReviewRequest,
  
  // API types
  ApiResponse,
  ApiError,
  ResponseMeta,
  PaginationRequest,
  SortRequest,
  SearchRequest,
  HttpStatus,
  ErrorCode,
} from './types';

// Main schema exports
export {
  // User schemas
  userSchema,
  userProfileSchema,
  loginRequestSchema,
  registerRequestSchema,
  updateProfileRequestSchema,
  locationSchema,
  
  // Job schemas
  jobSchema,
  jobCreateRequestSchema,
  jobUpdateRequestSchema,
  jobApplicationSchema,
  jobApplicationCreateRequestSchema,
  jobSearchRequestSchema,
  jobBudgetSchema,
  
  // Payment schemas
  paymentSchema,
  createPaymentIntentRequestSchema,
  confirmPaymentRequestSchema,
  refundRequestSchema,
  
  // Review schemas
  reviewSchema,
  createReviewRequestSchema,
  updateReviewRequestSchema,
  
  // API schemas
  apiResponseSchema,
  paginationRequestSchema,
  searchRequestSchema,
  errorResponseSchema,
  successResponseSchema,
} from './schemas';

// Main utility exports
export {
  // Validation utilities
  validateData,
  safeValidate,
  formatValidationErrors,
  createValidationErrorResponse,
  
  // Formatting utilities
  formatCurrency,
  formatDate,
  formatDateTime,
  formatRelativeTime,
  formatUserName,
  formatAddress,
  
  // Constants
  API_ENDPOINTS,
  JOB_CATEGORIES,
  JOB_CATEGORY_LABELS,
  JOB_STATUS,
  JOB_STATUS_LABELS,
  USER_ROLES,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
} from './utils';
