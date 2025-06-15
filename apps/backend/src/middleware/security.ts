import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { config, corsOrigins } from '../config';
import { ErrorCode, HttpStatus } from '@fixer/shared';

// Rate limiting middleware
export const createRateLimit = (options?: {
  windowMs?: number;
  max?: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
}) => {
  return rateLimit({
    windowMs: options?.windowMs || config.RATE_LIMIT_WINDOW_MS,
    max: options?.max || config.RATE_LIMIT_MAX_REQUESTS,
    message: {
      success: false,
      error: {
        code: ErrorCode.QUOTA_EXCEEDED,
        message: options?.message || 'Too many requests, please try again later',
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: options?.skipSuccessfulRequests || false,
  });
};

// General rate limit
export const generalRateLimit = createRateLimit();

// Strict rate limit for auth endpoints
export const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many authentication attempts, please try again later',
});

// File upload rate limit
export const uploadRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 uploads per minute
  message: 'Too many file uploads, please try again later',
});

// CORS configuration
export const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (corsOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-API-Key',
  ],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400, // 24 hours
};

// Security headers configuration
export const helmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.stripe.com"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
};

// Compression configuration
export const compressionOptions = {
  filter: (req: Request, res: Response) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  threshold: 1024, // Only compress responses larger than 1KB
};

// Request size limit middleware
export function requestSizeLimit(limit: string = '10mb') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = req.get('content-length');
    
    if (contentLength) {
      const sizeInBytes = parseInt(contentLength, 10);
      const limitInBytes = parseSize(limit);
      
      if (sizeInBytes > limitInBytes) {
        res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: `Request size exceeds limit of ${limit}`,
          },
        });
        return;
      }
    }
    
    next();
  };
}

// Helper function to parse size strings
function parseSize(size: string): number {
  const units: Record<string, number> = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };
  
  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/);
  
  if (!match) {
    throw new Error(`Invalid size format: ${size}`);
  }
  
  const value = parseFloat(match[1]);
  const unit = match[2] || 'b';
  
  return value * units[unit];
}

// IP whitelist middleware
export function ipWhitelist(allowedIPs: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (!clientIP || !allowedIPs.includes(clientIP)) {
      res.status(HttpStatus.FORBIDDEN).json({
        success: false,
        error: {
          code: ErrorCode.FORBIDDEN,
          message: 'IP address not allowed',
        },
      });
      return;
    }
    
    next();
  };
}

// API key validation middleware
export function validateApiKey(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!apiKey) {
    res.status(HttpStatus.UNAUTHORIZED).json({
      success: false,
      error: {
        code: ErrorCode.UNAUTHORIZED,
        message: 'API key is required',
      },
    });
    return;
  }
  
  // In a real application, you would validate the API key against a database
  // For now, we'll just check if it's not empty
  if (apiKey.length < 32) {
    res.status(HttpStatus.UNAUTHORIZED).json({
      success: false,
      error: {
        code: ErrorCode.UNAUTHORIZED,
        message: 'Invalid API key',
      },
    });
    return;
  }
  
  next();
}

// Request logging middleware
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id,
    };
    
    console.log('Request:', logData);
  });
  
  next();
}

// Health check bypass middleware
export function healthCheckBypass(req: Request, res: Response, next: NextFunction): void {
  if (req.path === '/health' || req.path === '/api/health') {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
    });
    return;
  }
  
  next();
}
