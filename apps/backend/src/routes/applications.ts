import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { applications, jobs, users, workerProfiles } from '../db/schema';
import { validateRequest } from '../middleware/validation';
import { authMiddleware } from '../middleware/auth';
import { jobApplicationCreateRequestSchema } from '@fixer/shared';
import { eq, and, desc, sql } from 'drizzle-orm';

const router = Router();

// ============================================================================
// APPLICATION ROUTES
// ============================================================================

/**
 * GET /applications
 * Get applications for current user (as worker or poster)
 */
const applicationsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
  status: z.enum(['pending', 'accepted', 'rejected', 'withdrawn']).optional(),
  jobId: z.string().uuid().optional(),
  role: z.enum(['worker', 'poster']).optional(), // Filter by user role
});

router.get('/', authMiddleware, validateRequest(applicationsQuerySchema, 'query'), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { page, limit, status, jobId, role } = req.query as any;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        }
      });
    }

    const offset = (page - 1) * limit;

    // Build where conditions
    let whereConditions = [];

    if (role === 'worker') {
      // Get applications made by this worker
      whereConditions.push(eq(applications.workerId, userId));
    } else if (role === 'poster') {
      // Get applications for jobs posted by this user
      whereConditions.push(eq(jobs.posterId, userId));
    } else {
      // Get all applications related to this user (as worker or poster)
      whereConditions.push(
        sql`(${applications.workerId} = ${userId} OR ${jobs.posterId} = ${userId})`
      );
    }

    if (status) {
      whereConditions.push(eq(applications.status, status));
    }

    if (jobId) {
      whereConditions.push(eq(applications.jobId, jobId));
    }

    // Get applications with job and user details
    const applicationsQuery = db
      .select({
        id: applications.id,
        jobId: applications.jobId,
        workerId: applications.workerId,
        message: applications.message,
        proposedPrice: applications.proposedPrice,
        estimatedCompletionTime: applications.estimatedCompletionTime,
        status: applications.status,
        appliedAt: applications.appliedAt,
        respondedAt: applications.respondedAt,
        job: {
          id: jobs.id,
          title: jobs.title,
          description: jobs.description,
          category: jobs.category,
          locationAddress: jobs.locationAddress,
          price: jobs.price,
          priceType: jobs.priceType,
          status: jobs.status,
          createdAt: jobs.createdAt,
        },
        worker: {
          id: users.id,
          fullName: users.fullName,
          avatarUrl: users.avatarUrl,
        },
        workerProfile: {
          ratingAverage: workerProfiles.ratingAverage,
          ratingCount: workerProfiles.ratingCount,
          hourlyRate: workerProfiles.hourlyRate,
          skills: workerProfiles.skills,
        }
      })
      .from(applications)
      .leftJoin(jobs, eq(applications.jobId, jobs.id))
      .leftJoin(users, eq(applications.workerId, users.id))
      .leftJoin(workerProfiles, eq(applications.workerId, workerProfiles.userId))
      .where(and(...whereConditions))
      .orderBy(desc(applications.appliedAt))
      .limit(limit)
      .offset(offset);

    const applicationsList = await applicationsQuery;

    // Get total count
    const countQuery = db
      .select({ count: sql`count(*)`.as('count') })
      .from(applications)
      .leftJoin(jobs, eq(applications.jobId, jobs.id))
      .where(and(...whereConditions));

    const [{ count }] = await countQuery;
    const totalCount = Number(count);
    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      data: applicationsList,
      meta: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      }
    });

  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get applications',
      }
    });
  }
});

/**
 * GET /applications/:id
 * Get application by ID
 */
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        }
      });
    }

    const [application] = await db
      .select({
        id: applications.id,
        jobId: applications.jobId,
        workerId: applications.workerId,
        message: applications.message,
        proposedPrice: applications.proposedPrice,
        estimatedCompletionTime: applications.estimatedCompletionTime,
        status: applications.status,
        appliedAt: applications.appliedAt,
        respondedAt: applications.respondedAt,
        job: {
          id: jobs.id,
          posterId: jobs.posterId,
          title: jobs.title,
          description: jobs.description,
          category: jobs.category,
          locationAddress: jobs.locationAddress,
          price: jobs.price,
          priceType: jobs.priceType,
          status: jobs.status,
          createdAt: jobs.createdAt,
        },
        worker: {
          id: users.id,
          fullName: users.fullName,
          avatarUrl: users.avatarUrl,
        },
        workerProfile: {
          ratingAverage: workerProfiles.ratingAverage,
          ratingCount: workerProfiles.ratingCount,
          hourlyRate: workerProfiles.hourlyRate,
          skills: workerProfiles.skills,
          bio: workerProfiles.bio,
        }
      })
      .from(applications)
      .leftJoin(jobs, eq(applications.jobId, jobs.id))
      .leftJoin(users, eq(applications.workerId, users.id))
      .leftJoin(workerProfiles, eq(applications.workerId, workerProfiles.userId))
      .where(eq(applications.id, id))
      .limit(1);

    if (!application) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'APPLICATION_NOT_FOUND',
          message: 'Application not found',
        }
      });
    }

    // Check if user has access to this application
    const hasAccess = application.workerId === userId || application.job?.posterId === userId;

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have access to this application',
        }
      });
    }

    res.json({
      success: true,
      data: application,
    });

  } catch (error) {
    console.error('Get application by ID error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get application',
      }
    });
  }
});

/**
 * POST /applications
 * Create a new job application
 */
router.post('/', authMiddleware, validateRequest(jobApplicationCreateRequestSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { jobId, message, proposedPrice, estimatedCompletionTime } = req.body;

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
          message: 'Only workers can apply to jobs',
        }
      });
    }

    // Check if job exists and is open
    const [job] = await db
      .select({ 
        id: jobs.id, 
        posterId: jobs.posterId, 
        status: jobs.status 
      })
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .limit(1);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'JOB_NOT_FOUND',
          message: 'Job not found',
        }
      });
    }

    if (job.status !== 'open') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'JOB_NOT_AVAILABLE',
          message: 'Job is not available for applications',
        }
      });
    }

    // Check if worker already applied
    const [existingApplication] = await db
      .select({ id: applications.id })
      .from(applications)
      .where(and(
        eq(applications.jobId, jobId),
        eq(applications.workerId, userId)
      ))
      .limit(1);

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ALREADY_APPLIED',
          message: 'You have already applied to this job',
        }
      });
    }

    // Create application
    const [newApplication] = await db
      .insert(applications)
      .values({
        jobId,
        workerId: userId,
        message,
        proposedPrice: proposedPrice?.toString(),
        estimatedCompletionTime,
      })
      .returning();

    res.status(201).json({
      success: true,
      data: newApplication,
    });

  } catch (error) {
    console.error('Create application error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create application',
      }
    });
  }
});

/**
 * PUT /applications/:id/accept
 * Accept an application (job poster only)
 */
router.put('/:id/accept', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        }
      });
    }

    // Get application with job details
    const [application] = await db
      .select({
        id: applications.id,
        jobId: applications.jobId,
        workerId: applications.workerId,
        status: applications.status,
        job: {
          id: jobs.id,
          posterId: jobs.posterId,
          status: jobs.status,
        }
      })
      .from(applications)
      .leftJoin(jobs, eq(applications.jobId, jobs.id))
      .where(eq(applications.id, id))
      .limit(1);

    if (!application) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'APPLICATION_NOT_FOUND',
          message: 'Application not found',
        }
      });
    }

    // Check if user is the job poster
    if (application.job?.posterId !== userId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only job posters can accept applications',
        }
      });
    }

    // Check if application is pending
    if (application.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: 'Only pending applications can be accepted',
        }
      });
    }

    // Check if job is still open
    if (application.job?.status !== 'open') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'JOB_NOT_AVAILABLE',
          message: 'Job is no longer available',
        }
      });
    }

    // Start transaction to accept application and update job
    await db.transaction(async (tx) => {
      // Accept the application
      await tx
        .update(applications)
        .set({
          status: 'accepted',
          respondedAt: new Date(),
        })
        .where(eq(applications.id, id));

      // Assign worker to job and update status
      await tx
        .update(jobs)
        .set({
          workerId: application.workerId,
          status: 'assigned',
          updatedAt: new Date(),
        })
        .where(eq(jobs.id, application.jobId));

      // Reject all other pending applications for this job
      await tx
        .update(applications)
        .set({
          status: 'rejected',
          respondedAt: new Date(),
        })
        .where(and(
          eq(applications.jobId, application.jobId),
          eq(applications.status, 'pending'),
          sql`${applications.id} != ${id}`
        ));
    });

    res.json({
      success: true,
      message: 'Application accepted successfully',
    });

  } catch (error) {
    console.error('Accept application error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to accept application',
      }
    });
  }
});

/**
 * PUT /applications/:id/reject
 * Reject an application (job poster only)
 */
router.put('/:id/reject', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        }
      });
    }

    // Get application with job details
    const [application] = await db
      .select({
        id: applications.id,
        status: applications.status,
        job: {
          posterId: jobs.posterId,
        }
      })
      .from(applications)
      .leftJoin(jobs, eq(applications.jobId, jobs.id))
      .where(eq(applications.id, id))
      .limit(1);

    if (!application) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'APPLICATION_NOT_FOUND',
          message: 'Application not found',
        }
      });
    }

    // Check if user is the job poster
    if (application.job?.posterId !== userId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only job posters can reject applications',
        }
      });
    }

    // Check if application is pending
    if (application.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: 'Only pending applications can be rejected',
        }
      });
    }

    // Reject the application
    await db
      .update(applications)
      .set({
        status: 'rejected',
        respondedAt: new Date(),
      })
      .where(eq(applications.id, id));

    res.json({
      success: true,
      message: 'Application rejected successfully',
    });

  } catch (error) {
    console.error('Reject application error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to reject application',
      }
    });
  }
});

/**
 * PUT /applications/:id/withdraw
 * Withdraw an application (worker only)
 */
router.put('/:id/withdraw', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        }
      });
    }

    // Get application
    const [application] = await db
      .select({
        id: applications.id,
        workerId: applications.workerId,
        status: applications.status,
      })
      .from(applications)
      .where(eq(applications.id, id))
      .limit(1);

    if (!application) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'APPLICATION_NOT_FOUND',
          message: 'Application not found',
        }
      });
    }

    // Check if user is the applicant
    if (application.workerId !== userId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only withdraw your own applications',
        }
      });
    }

    // Check if application is pending
    if (application.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: 'Only pending applications can be withdrawn',
        }
      });
    }

    // Withdraw the application
    await db
      .update(applications)
      .set({
        status: 'withdrawn',
        respondedAt: new Date(),
      })
      .where(eq(applications.id, id));

    res.json({
      success: true,
      message: 'Application withdrawn successfully',
    });

  } catch (error) {
    console.error('Withdraw application error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to withdraw application',
      }
    });
  }
});

export default router;
