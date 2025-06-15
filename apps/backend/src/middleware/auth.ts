import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { verifySupabaseToken } from '../config/supabase';
import { ErrorCode, HttpStatus } from '@fixer/shared';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

// Authentication middleware
export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        error: {
          code: ErrorCode.UNAUTHORIZED,
          message: 'Access token is required',
        },
      });
      return;
    }

    // First try to verify with Supabase
    const supabaseUser = await verifySupabaseToken(token);
    
    if (supabaseUser) {
      req.user = {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        role: supabaseUser.user_metadata?.role || 'worker',
      };
      next();
      return;
    }

    // Fallback to JWT verification
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET) as any;
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
      };
      next();
    } catch (jwtError) {
      res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        error: {
          code: ErrorCode.TOKEN_INVALID,
          message: 'Invalid or expired token',
        },
      });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Authentication failed',
      },
    });
  }
}

// Optional authentication middleware (doesn't fail if no token)
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      next();
      return;
    }

    // Try to verify with Supabase
    const supabaseUser = await verifySupabaseToken(token);
    
    if (supabaseUser) {
      req.user = {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        role: supabaseUser.user_metadata?.role || 'worker',
      };
    } else {
      // Try JWT verification
      try {
        const decoded = jwt.verify(token, config.JWT_SECRET) as any;
        req.user = {
          id: decoded.id,
          email: decoded.email,
          role: decoded.role,
        };
      } catch {
        // Ignore JWT errors in optional auth
      }
    }

    next();
  } catch (error) {
    // Ignore errors in optional auth
    next();
  }
}

// Role-based authorization middleware
export function requireRole(roles: string | string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        error: {
          code: ErrorCode.UNAUTHORIZED,
          message: 'Authentication required',
        },
      });
      return;
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(req.user.role)) {
      res.status(HttpStatus.FORBIDDEN).json({
        success: false,
        error: {
          code: ErrorCode.FORBIDDEN,
          message: 'Insufficient permissions',
        },
      });
      return;
    }

    next();
  };
}

// Admin only middleware
export const requireAdmin = requireRole('admin');

// Worker only middleware
export const requireWorker = requireRole('worker');

// Poster only middleware
export const requirePoster = requireRole('poster');

// Worker or Poster middleware
export const requireWorkerOrPoster = requireRole(['worker', 'poster']);

// Resource ownership middleware
export function requireOwnership(getResourceUserId: (req: Request) => string | Promise<string>) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(HttpStatus.UNAUTHORIZED).json({
          success: false,
          error: {
            code: ErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
          },
        });
        return;
      }

      const resourceUserId = await getResourceUserId(req);
      
      if (req.user.id !== resourceUserId && req.user.role !== 'admin') {
        res.status(HttpStatus.FORBIDDEN).json({
          success: false,
          error: {
            code: ErrorCode.FORBIDDEN,
            message: 'You can only access your own resources',
          },
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to verify resource ownership',
        },
      });
    }
  };
}
