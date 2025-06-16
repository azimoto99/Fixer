import { Request, Response, NextFunction } from 'express';
import { ErrorCode, HttpStatus } from '@fixer/shared';
import { isDevelopment } from '../config';

// Custom error class
export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR,
    code: string = ErrorCode.INTERNAL_ERROR,
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Error handling middleware
export function errorHandler(
  error: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
  let code = ErrorCode.INTERNAL_ERROR;
  let message = 'An unexpected error occurred';

  // Handle custom AppError
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    code = error.code as ErrorCode;
    message = error.message;
  }
  // Handle JWT errors
  else if (error.name === 'JsonWebTokenError') {
    statusCode = HttpStatus.UNAUTHORIZED;
    code = ErrorCode.TOKEN_INVALID;
    message = 'Invalid token';
  }
  else if (error.name === 'TokenExpiredError') {
    statusCode = HttpStatus.UNAUTHORIZED;
    code = ErrorCode.TOKEN_EXPIRED;
    message = 'Token expired';
  }
  // Handle validation errors
  else if (error.name === 'ValidationError') {
    statusCode = HttpStatus.BAD_REQUEST;
    code = ErrorCode.VALIDATION_ERROR;
    message = error.message;
  }
  // Handle database errors
  else if (error.message.includes('duplicate key')) {
    statusCode = HttpStatus.CONFLICT;
    code = ErrorCode.RESOURCE_ALREADY_EXISTS;
    message = 'Resource already exists';
  }
  else if (error.message.includes('foreign key')) {
    statusCode = HttpStatus.BAD_REQUEST;
    code = ErrorCode.VALIDATION_ERROR;
    message = 'Invalid reference to related resource';
  }
  // Handle Stripe errors
  else if (error.name === 'StripeError') {
    statusCode = HttpStatus.BAD_REQUEST;
    code = ErrorCode.PAYMENT_FAILED;
    message = 'Payment processing failed';
  }

  // Log error
  console.error('Error:', {
    message: error.message,
    stack: error.stack,
    statusCode,
    code,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
  });

  // Send error response
  const errorResponse: any = {
    success: false,
    error: {
      code,
      message,
    },
  };

  // Include stack trace in development
  if (isDevelopment && error.stack) {
    errorResponse.error.stack = error.stack;
  }

  res.status(statusCode).json(errorResponse);
}

// 404 handler
export function notFoundHandler(req: Request, res: Response): void {
  res.status(HttpStatus.NOT_FOUND).json({
    success: false,
    error: {
      code: ErrorCode.RESOURCE_NOT_FOUND,
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
}

// Async error wrapper
export function asyncHandler<T extends Request, U extends Response>(
  fn: (req: T, res: U, next: NextFunction) => Promise<any>
) {
  return (req: T, res: U, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Common error creators
export const createError = {
  badRequest: (message: string) => 
    new AppError(message, HttpStatus.BAD_REQUEST, ErrorCode.VALIDATION_ERROR),
  
  unauthorized: (message: string = 'Unauthorized') => 
    new AppError(message, HttpStatus.UNAUTHORIZED, ErrorCode.UNAUTHORIZED),
  
  forbidden: (message: string = 'Forbidden') => 
    new AppError(message, HttpStatus.FORBIDDEN, ErrorCode.FORBIDDEN),
  
  notFound: (message: string = 'Resource not found') => 
    new AppError(message, HttpStatus.NOT_FOUND, ErrorCode.RESOURCE_NOT_FOUND),
  
  conflict: (message: string = 'Resource already exists') => 
    new AppError(message, HttpStatus.CONFLICT, ErrorCode.RESOURCE_ALREADY_EXISTS),
  
  internal: (message: string = 'Internal server error') => 
    new AppError(message, HttpStatus.INTERNAL_SERVER_ERROR, ErrorCode.INTERNAL_ERROR),
  
  paymentFailed: (message: string = 'Payment processing failed') => 
    new AppError(message, HttpStatus.BAD_REQUEST, ErrorCode.PAYMENT_FAILED),
  
  serviceUnavailable: (message: string = 'Service temporarily unavailable') => 
    new AppError(message, HttpStatus.SERVICE_UNAVAILABLE, ErrorCode.SERVICE_UNAVAILABLE),
};

// Error response helper
export function sendErrorResponse(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: any
): void {
  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
  });
}

// Success response helper
export function sendSuccessResponse(
  res: Response,
  data?: any,
  message?: string,
  meta?: any
): void {
  res.json({
    success: true,
    ...(data !== undefined && { data }),
    ...(message && { message }),
    ...(meta && { meta }),
  });
}
