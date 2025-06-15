import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase';
import { db } from '../db';
import { users } from '../db/schema';
import { validateRequest } from '../middleware/validation';
import { authMiddleware } from '../middleware/auth';
import { 
  loginRequestSchema, 
  registerRequestSchema,
  updateProfileRequestSchema 
} from '@fixer/shared';
import { eq } from 'drizzle-orm';

const router = Router();

// ============================================================================
// AUTHENTICATION ROUTES
// ============================================================================

/**
 * POST /auth/register
 * Register a new user
 */
router.post('/register', validateRequest(registerRequestSchema), async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, role, phone } = req.body;

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          role,
          phone,
        }
      }
    });

    if (authError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: authError.message,
        }
      });
    }

    if (!authData.user) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'REGISTRATION_FAILED',
          message: 'Failed to create user account',
        }
      });
    }

    // Create user profile in our database
    const [userProfile] = await db.insert(users).values({
      id: authData.user.id,
      role: role as 'poster' | 'worker',
      fullName: `${firstName} ${lastName}`,
      email,
      phone,
    }).returning();

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: userProfile.id,
          email: userProfile.email,
          fullName: userProfile.fullName,
          role: userProfile.role,
          phone: userProfile.phone,
          createdAt: userProfile.createdAt,
        },
        session: authData.session,
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Registration failed',
      }
    });
  }
});

/**
 * POST /auth/login
 * Login user
 */
router.post('/login', validateRequest(loginRequestSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Authenticate with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        }
      });
    }

    if (!authData.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'LOGIN_FAILED',
          message: 'Login failed',
        }
      });
    }

    // Get user profile from our database
    const [userProfile] = await db
      .select()
      .from(users)
      .where(eq(users.id, authData.user.id))
      .limit(1);

    if (!userProfile) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User profile not found',
        }
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: userProfile.id,
          email: userProfile.email,
          fullName: userProfile.fullName,
          role: userProfile.role,
          phone: userProfile.phone,
          avatarUrl: userProfile.avatarUrl,
          createdAt: userProfile.createdAt,
        },
        session: authData.session,
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Login failed',
      }
    });
  }
});

/**
 * POST /auth/logout
 * Logout user
 */
router.post('/logout', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'LOGOUT_ERROR',
          message: error.message,
        }
      });
    }

    res.json({
      success: true,
      message: 'Logged out successfully',
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Logout failed',
      }
    });
  }
});

/**
 * GET /auth/me
 * Get current user profile
 */
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        }
      });
    }

    const [userProfile] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!userProfile) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User profile not found',
        }
      });
    }

    res.json({
      success: true,
      data: {
        id: userProfile.id,
        email: userProfile.email,
        fullName: userProfile.fullName,
        role: userProfile.role,
        phone: userProfile.phone,
        avatarUrl: userProfile.avatarUrl,
        createdAt: userProfile.createdAt,
        updatedAt: userProfile.updatedAt,
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get user profile',
      }
    });
  }
});

/**
 * POST /auth/refresh
 * Refresh authentication token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_REFRESH_TOKEN',
          message: 'Refresh token is required',
        }
      });
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token,
    });

    if (error) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Invalid or expired refresh token',
        }
      });
    }

    res.json({
      success: true,
      data: {
        session: data.session,
      }
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Token refresh failed',
      }
    });
  }
});

export default router;
