// Export all middleware
export * from './auth';
export * from './validation';
export * from './error';
export * from './security';

// Re-export commonly used middleware
export {
  authenticateToken,
  optionalAuth,
  requireRole,
  requireAdmin,
  requireWorker,
  requirePoster,
  requireWorkerOrPoster,
  requireOwnership,
} from './auth';

export {
  validateRequest,
  validateBody,
  validateQuery,
  validateParams,
  validateMultiple,
  validateFileUpload,
  sanitizeInput,
  commonParamSchemas,
  commonQuerySchemas,
} from './validation';

export {
  AppError,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  createError,
  sendErrorResponse,
  sendSuccessResponse,
} from './error';

export {
  createRateLimit,
  generalRateLimit,
  authRateLimit,
  uploadRateLimit,
  corsOptions,
  helmetOptions,
  compressionOptions,
  requestSizeLimit,
  ipWhitelist,
  validateApiKey,
  requestLogger,
  healthCheckBypass,
} from './security';
