import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { users, workerProfiles } from '../db/schema';
import { validateRequest } from '../middleware/validation';
import { authMiddleware } from '../middleware/auth';
import { updateProfileRequestSchema } from '@fixer/shared';
import { eq } from 'drizzle-orm';

const router = Router();

// ============================================================================
// USER ROUTES
// ============================================================================

/**
 * GET /users/profile
 * Get current user's profile
 */
router.get('/profile', authMiddleware, async (req: Request, res: Response) => {
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

    // Get user profile with worker profile if exists
    const userQuery = db
      .select({
        id: users.id,
        role: users.role,
        fullName: users.fullName,
        avatarUrl: users.avatarUrl,
        phone: users.phone,
        email: users.email,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        // Worker profile fields
        workerProfile: {
          id: workerProfiles.id,
          bio: workerProfiles.bio,
          skills: workerProfiles.skills,
          hourlyRate: workerProfiles.hourlyRate,
          serviceRadiusKm: workerProfiles.serviceRadiusKm,
          locationLat: workerProfiles.locationLat,
          locationLng: workerProfiles.locationLng,
          stripeAccountId: workerProfiles.stripeAccountId,
          stripeAccountStatus: workerProfiles.stripeAccountStatus,
          availabilitySchedule: workerProfiles.availabilitySchedule,
          isAvailable: workerProfiles.isAvailable,
          ratingAverage: workerProfiles.ratingAverage,
          ratingCount: workerProfiles.ratingCount,
        }
      })
      .from(users)
      .leftJoin(workerProfiles, eq(users.id, workerProfiles.userId))
      .where(eq(users.id, userId))
      .limit(1);

    const [userProfile] = await userQuery;

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
        role: userProfile.role,
        fullName: userProfile.fullName,
        avatarUrl: userProfile.avatarUrl,
        phone: userProfile.phone,
        email: userProfile.email,
        createdAt: userProfile.createdAt,
        updatedAt: userProfile.updatedAt,
        workerProfile: userProfile.workerProfile?.id ? userProfile.workerProfile : null,
      }
    });

  } catch (error) {
    console.error('Get user profile error:', error);
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
 * PUT /users/profile
 * Update current user's profile
 */
router.put('/profile', authMiddleware, validateRequest(updateProfileRequestSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const updateData = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        }
      });
    }

    // Update user profile
    const [updatedUser] = await db
      .update(users)
      .set({
        fullName: updateData.fullName,
        avatarUrl: updateData.avatarUrl,
        phone: updateData.phone,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        }
      });
    }

    res.json({
      success: true,
      data: {
        id: updatedUser.id,
        role: updatedUser.role,
        fullName: updatedUser.fullName,
        avatarUrl: updatedUser.avatarUrl,
        phone: updatedUser.phone,
        email: updatedUser.email,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      }
    });

  } catch (error) {
    console.error('Update user profile error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update user profile',
      }
    });
  }
});

/**
 * GET /users/:id
 * Get public user profile by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_USER_ID',
          message: 'User ID is required',
        }
      });
    }

    // Get public user profile
    const [userProfile] = await db
      .select({
        id: users.id,
        role: users.role,
        fullName: users.fullName,
        avatarUrl: users.avatarUrl,
        createdAt: users.createdAt,
        // Public worker profile fields only
        workerProfile: {
          id: workerProfiles.id,
          bio: workerProfiles.bio,
          skills: workerProfiles.skills,
          hourlyRate: workerProfiles.hourlyRate,
          serviceRadiusKm: workerProfiles.serviceRadiusKm,
          isAvailable: workerProfiles.isAvailable,
          ratingAverage: workerProfiles.ratingAverage,
          ratingCount: workerProfiles.ratingCount,
        }
      })
      .from(users)
      .leftJoin(workerProfiles, eq(users.id, workerProfiles.userId))
      .where(eq(users.id, id))
      .limit(1);

    if (!userProfile) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        }
      });
    }

    res.json({
      success: true,
      data: {
        id: userProfile.id,
        role: userProfile.role,
        fullName: userProfile.fullName,
        avatarUrl: userProfile.avatarUrl,
        createdAt: userProfile.createdAt,
        workerProfile: userProfile.workerProfile?.id ? userProfile.workerProfile : null,
      }
    });

  } catch (error) {
    console.error('Get user by ID error:', error);
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
 * POST /users/worker-profile
 * Create or update worker profile
 */
const workerProfileSchema = z.object({
  bio: z.string().max(1000).optional(),
  skills: z.array(z.string()).max(20).optional(),
  hourlyRate: z.number().min(0).max(1000).optional(),
  serviceRadiusKm: z.number().min(1).max(100).optional(),
  locationLat: z.number().min(-90).max(90).optional(),
  locationLng: z.number().min(-180).max(180).optional(),
  availabilitySchedule: z.record(z.any()).optional(),
  isAvailable: z.boolean().optional(),
});

router.post('/worker-profile', authMiddleware, validateRequest(workerProfileSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const profileData = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        }
      });
    }

    // Check if user is a worker
    const [user] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user || user.role !== 'worker') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only workers can create worker profiles',
        }
      });
    }

    // Check if worker profile already exists
    const [existingProfile] = await db
      .select({ id: workerProfiles.id })
      .from(workerProfiles)
      .where(eq(workerProfiles.userId, userId))
      .limit(1);

    let workerProfile;

    if (existingProfile) {
      // Update existing profile
      [workerProfile] = await db
        .update(workerProfiles)
        .set({
          ...profileData,
          updatedAt: new Date(),
        })
        .where(eq(workerProfiles.userId, userId))
        .returning();
    } else {
      // Create new profile
      [workerProfile] = await db
        .insert(workerProfiles)
        .values({
          userId,
          ...profileData,
        })
        .returning();
    }

    res.json({
      success: true,
      data: workerProfile,
    });

  } catch (error) {
    console.error('Create/update worker profile error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create/update worker profile',
      }
    });
  }
});

export default router;
