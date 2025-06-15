// API Constants
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    VERIFY_EMAIL: '/auth/verify-email',
  },
  
  // Users
  USERS: {
    PROFILE: '/users/profile',
    UPDATE_PROFILE: '/users/profile',
    CHANGE_PASSWORD: '/users/change-password',
    UPLOAD_AVATAR: '/users/avatar',
    VERIFICATION_DOCUMENTS: '/users/verification-documents',
  },
  
  // Jobs
  JOBS: {
    LIST: '/jobs',
    CREATE: '/jobs',
    DETAIL: '/jobs/:id',
    UPDATE: '/jobs/:id',
    DELETE: '/jobs/:id',
    SEARCH: '/jobs/search',
    MY_JOBS: '/jobs/my-jobs',
    APPLICATIONS: '/jobs/:id/applications',
    ASSIGN: '/jobs/:id/assign',
    COMPLETE: '/jobs/:id/complete',
    CANCEL: '/jobs/:id/cancel',
  },
  
  // Applications
  APPLICATIONS: {
    LIST: '/applications',
    CREATE: '/applications',
    DETAIL: '/applications/:id',
    UPDATE: '/applications/:id',
    WITHDRAW: '/applications/:id/withdraw',
    ACCEPT: '/applications/:id/accept',
    REJECT: '/applications/:id/reject',
  },
  
  // Payments
  PAYMENTS: {
    CREATE_INTENT: '/payments/create-intent',
    CONFIRM: '/payments/confirm',
    REFUND: '/payments/:id/refund',
    HISTORY: '/payments/history',
    METHODS: '/payments/methods',
    ADD_METHOD: '/payments/methods',
    DELETE_METHOD: '/payments/methods/:id',
    WEBHOOKS: '/payments/webhooks',
  },
  
  // Reviews
  REVIEWS: {
    LIST: '/reviews',
    CREATE: '/reviews',
    DETAIL: '/reviews/:id',
    UPDATE: '/reviews/:id',
    DELETE: '/reviews/:id',
    USER_REVIEWS: '/reviews/user/:userId',
    STATS: '/reviews/stats/:userId',
  },
  
  // Files
  FILES: {
    UPLOAD: '/files/upload',
    DELETE: '/files/:path',
  },
  
  // Health
  HEALTH: '/health',
} as const;

// Job Categories
export const JOB_CATEGORIES = {
  HOME_REPAIR: 'home_repair',
  CLEANING: 'cleaning',
  MOVING: 'moving',
  DELIVERY: 'delivery',
  ASSEMBLY: 'assembly',
  GARDENING: 'gardening',
  PAINTING: 'painting',
  ELECTRICAL: 'electrical',
  PLUMBING: 'plumbing',
  HANDYMAN: 'handyman',
  TECH_SUPPORT: 'tech_support',
  TUTORING: 'tutoring',
  PET_CARE: 'pet_care',
  EVENT_HELP: 'event_help',
  OTHER: 'other',
} as const;

export const JOB_CATEGORY_LABELS = {
  [JOB_CATEGORIES.HOME_REPAIR]: 'Home Repair',
  [JOB_CATEGORIES.CLEANING]: 'Cleaning',
  [JOB_CATEGORIES.MOVING]: 'Moving',
  [JOB_CATEGORIES.DELIVERY]: 'Delivery',
  [JOB_CATEGORIES.ASSEMBLY]: 'Assembly',
  [JOB_CATEGORIES.GARDENING]: 'Gardening',
  [JOB_CATEGORIES.PAINTING]: 'Painting',
  [JOB_CATEGORIES.ELECTRICAL]: 'Electrical',
  [JOB_CATEGORIES.PLUMBING]: 'Plumbing',
  [JOB_CATEGORIES.HANDYMAN]: 'Handyman',
  [JOB_CATEGORIES.TECH_SUPPORT]: 'Tech Support',
  [JOB_CATEGORIES.TUTORING]: 'Tutoring',
  [JOB_CATEGORIES.PET_CARE]: 'Pet Care',
  [JOB_CATEGORIES.EVENT_HELP]: 'Event Help',
  [JOB_CATEGORIES.OTHER]: 'Other',
} as const;

// Job Types
export const JOB_TYPES = {
  ONE_TIME: 'one_time',
  RECURRING: 'recurring',
  PROJECT: 'project',
} as const;

export const JOB_TYPE_LABELS = {
  [JOB_TYPES.ONE_TIME]: 'One-time',
  [JOB_TYPES.RECURRING]: 'Recurring',
  [JOB_TYPES.PROJECT]: 'Project',
} as const;

// Job Urgency
export const JOB_URGENCY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

export const JOB_URGENCY_LABELS = {
  [JOB_URGENCY.LOW]: 'Low',
  [JOB_URGENCY.MEDIUM]: 'Medium',
  [JOB_URGENCY.HIGH]: 'High',
  [JOB_URGENCY.URGENT]: 'Urgent',
} as const;

// Job Status
export const JOB_STATUS = {
  DRAFT: 'draft',
  OPEN: 'open',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  DISPUTED: 'disputed',
} as const;

export const JOB_STATUS_LABELS = {
  [JOB_STATUS.DRAFT]: 'Draft',
  [JOB_STATUS.OPEN]: 'Open',
  [JOB_STATUS.ASSIGNED]: 'Assigned',
  [JOB_STATUS.IN_PROGRESS]: 'In Progress',
  [JOB_STATUS.COMPLETED]: 'Completed',
  [JOB_STATUS.CANCELLED]: 'Cancelled',
  [JOB_STATUS.DISPUTED]: 'Disputed',
} as const;

// Application Status
export const APPLICATION_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn',
} as const;

export const APPLICATION_STATUS_LABELS = {
  [APPLICATION_STATUS.PENDING]: 'Pending',
  [APPLICATION_STATUS.ACCEPTED]: 'Accepted',
  [APPLICATION_STATUS.REJECTED]: 'Rejected',
  [APPLICATION_STATUS.WITHDRAWN]: 'Withdrawn',
} as const;

// Payment Status
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
  DISPUTED: 'disputed',
} as const;

export const PAYMENT_STATUS_LABELS = {
  [PAYMENT_STATUS.PENDING]: 'Pending',
  [PAYMENT_STATUS.PROCESSING]: 'Processing',
  [PAYMENT_STATUS.SUCCEEDED]: 'Succeeded',
  [PAYMENT_STATUS.FAILED]: 'Failed',
  [PAYMENT_STATUS.CANCELLED]: 'Cancelled',
  [PAYMENT_STATUS.REFUNDED]: 'Refunded',
  [PAYMENT_STATUS.DISPUTED]: 'Disputed',
} as const;

// User Roles
export const USER_ROLES = {
  POSTER: 'poster',
  WORKER: 'worker',
  ADMIN: 'admin',
} as const;

export const USER_ROLE_LABELS = {
  [USER_ROLES.POSTER]: 'Job Poster',
  [USER_ROLES.WORKER]: 'Worker',
  [USER_ROLES.ADMIN]: 'Administrator',
} as const;

// Availability Status
export const AVAILABILITY_STATUS = {
  AVAILABLE: 'available',
  BUSY: 'busy',
  UNAVAILABLE: 'unavailable',
} as const;

export const AVAILABILITY_STATUS_LABELS = {
  [AVAILABILITY_STATUS.AVAILABLE]: 'Available',
  [AVAILABILITY_STATUS.BUSY]: 'Busy',
  [AVAILABILITY_STATUS.UNAVAILABLE]: 'Unavailable',
} as const;

// File Upload Constants
export const FILE_UPLOAD = {
  MAX_SIZE_MB: 10,
  ALLOWED_IMAGE_TYPES: ['jpg', 'jpeg', 'png', 'webp'],
  ALLOWED_DOCUMENT_TYPES: ['pdf', 'doc', 'docx'],
  BUCKETS: {
    AVATARS: 'avatars',
    JOB_IMAGES: 'job-images',
    DOCUMENTS: 'documents',
  },
} as const;

// Pagination Constants
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// Validation Constants
export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 8,
  NAME_MAX_LENGTH: 50,
  BIO_MAX_LENGTH: 500,
  JOB_TITLE_MIN_LENGTH: 5,
  JOB_TITLE_MAX_LENGTH: 100,
  JOB_DESCRIPTION_MIN_LENGTH: 20,
  JOB_DESCRIPTION_MAX_LENGTH: 2000,
  REVIEW_COMMENT_MAX_LENGTH: 1000,
  MAX_SKILLS: 20,
  MAX_JOB_IMAGES: 5,
  MIN_HOURLY_RATE: 0,
  MAX_HOURLY_RATE: 1000,
  MIN_PAYMENT_AMOUNT: 0.5,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'You are not authorized to perform this action',
  FORBIDDEN: 'Access denied',
  NOT_FOUND: 'Resource not found',
  VALIDATION_ERROR: 'Validation failed',
  INTERNAL_ERROR: 'An internal error occurred',
  NETWORK_ERROR: 'Network error occurred',
  PAYMENT_FAILED: 'Payment processing failed',
  EMAIL_SEND_FAILED: 'Failed to send email',
  FILE_UPLOAD_FAILED: 'File upload failed',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Successfully logged in',
  LOGOUT_SUCCESS: 'Successfully logged out',
  REGISTER_SUCCESS: 'Account created successfully',
  PROFILE_UPDATED: 'Profile updated successfully',
  PASSWORD_CHANGED: 'Password changed successfully',
  JOB_CREATED: 'Job posted successfully',
  JOB_UPDATED: 'Job updated successfully',
  JOB_DELETED: 'Job deleted successfully',
  APPLICATION_SUBMITTED: 'Application submitted successfully',
  PAYMENT_SUCCESS: 'Payment processed successfully',
  REVIEW_SUBMITTED: 'Review submitted successfully',
} as const;
