import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validateData, createValidationErrorResponse } from '@fixer/shared';
import { HttpStatus } from '@fixer/shared';

// Generic validation middleware factory
export function validateRequest<T>(schema: z.ZodSchema<T>, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const data = req[source];
    const validation = validateData(schema, data);

    if (!validation.success) {
      res.status(HttpStatus.BAD_REQUEST).json(
        createValidationErrorResponse(validation.errors)
      );
      return;
    }

    // Replace the original data with validated data
    req[source] = validation.data;
    next();
  };
}

// Validate request body
export function validateBody<T>(schema: z.ZodSchema<T>) {
  return validateRequest(schema, 'body');
}

// Validate query parameters
export function validateQuery<T>(schema: z.ZodSchema<T>) {
  return validateRequest(schema, 'query');
}

// Validate route parameters
export function validateParams<T>(schema: z.ZodSchema<T>) {
  return validateRequest(schema, 'params');
}

// Validate multiple parts of the request
export function validateMultiple(schemas: {
  body?: z.ZodSchema<any>;
  query?: z.ZodSchema<any>;
  params?: z.ZodSchema<any>;
}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: Record<string, any> = {};

    // Validate body
    if (schemas.body) {
      const bodyValidation = validateData(schemas.body, req.body);
      if (!bodyValidation.success) {
        errors.body = bodyValidation.errors.errors;
      } else {
        req.body = bodyValidation.data;
      }
    }

    // Validate query
    if (schemas.query) {
      const queryValidation = validateData(schemas.query, req.query);
      if (!queryValidation.success) {
        errors.query = queryValidation.errors.errors;
      } else {
        req.query = queryValidation.data;
      }
    }

    // Validate params
    if (schemas.params) {
      const paramsValidation = validateData(schemas.params, req.params);
      if (!paramsValidation.success) {
        errors.params = paramsValidation.errors.errors;
      } else {
        req.params = paramsValidation.data;
      }
    }

    // If there are any validation errors, return them
    if (Object.keys(errors).length > 0) {
      res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: errors,
        },
      });
      return;
    }

    next();
  };
}

// Common validation schemas for route parameters
export const commonParamSchemas = {
  id: z.object({
    id: z.string().uuid('Invalid ID format'),
  }),
  
  slug: z.object({
    slug: z.string().min(1, 'Slug is required'),
  }),
};

// Common validation schemas for query parameters
export const commonQuerySchemas = {
  pagination: z.object({
    page: z.coerce.number().min(1).default(1).optional(),
    limit: z.coerce.number().min(1).max(100).default(20).optional(),
  }),
  
  search: z.object({
    q: z.string().optional(),
    page: z.coerce.number().min(1).default(1).optional(),
    limit: z.coerce.number().min(1).max(100).default(20).optional(),
    sort: z.string().optional(),
    order: z.enum(['asc', 'desc']).default('desc').optional(),
  }),
  
  dateRange: z.object({
    startDate: z.string().date().optional(),
    endDate: z.string().date().optional(),
  }),
};

// File upload validation
export function validateFileUpload(options: {
  maxSize?: number; // in bytes
  allowedTypes?: string[];
  required?: boolean;
}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const file = req.file;
    const { maxSize = 10 * 1024 * 1024, allowedTypes, required = true } = options;

    if (required && !file) {
      res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'File is required',
        },
      });
      return;
    }

    if (file) {
      // Check file size
      if (file.size > maxSize) {
        res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `File size exceeds maximum allowed size of ${maxSize / (1024 * 1024)}MB`,
          },
        });
        return;
      }

      // Check file type
      if (allowedTypes && allowedTypes.length > 0) {
        const fileExtension = file.originalname.split('.').pop()?.toLowerCase();
        if (!fileExtension || !allowedTypes.includes(fileExtension)) {
          res.status(HttpStatus.BAD_REQUEST).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`,
            },
          });
          return;
        }
      }
    }

    next();
  };
}

// Sanitize input middleware
export function sanitizeInput(req: Request, _res: Response, next: NextFunction): void {
  // Recursively sanitize object
  function sanitizeObject(obj: any): any {
    if (typeof obj === 'string') {
      return obj.trim();
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeObject(value);
      }
      return sanitized;
    }
    
    return obj;
  }

  // Sanitize body, query, and params
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
}
