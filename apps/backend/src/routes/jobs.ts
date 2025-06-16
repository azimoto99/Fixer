import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { jobs, users, applications, workerProfiles } from '../db/schema';
import { validateRequest } from '../middleware/validation';
import { authMiddleware } from '../middleware/auth';
import { jobCreateRequestSchema, jobUpdateRequestSchema } from '@fixer/shared';
import { eq, and, desc, asc, sql, or, ilike } from 'drizzle-orm';

const router = Router();

// ============================================================================
// JOB ROUTES
// ============================================================================

/**
 * GET /jobs
 * Get jobs with filtering and pagination
 */
const jobSearchSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
  category: z.string().optional(),
  status: z.enum(['open', 'assigned', 'in_progress', 'completed', 'cancelled']).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radius: z.coerce.number().min(1).max(100).default(25), // km
  skills: z.string().optional(), // comma-separated
  search: z.string().optional(),
  sortBy: z.enum(['created_at', 'price', 'distance']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

router.get('/', validateRequest(jobSearchSchema, 'query'), async (req: Request, res: Response) => {
  try {
    const {
      page,
      limit,
      category,
      status,
      minPrice,
      maxPrice,
      lat,
      lng,
      radius,
      skills,
      search,
      sortBy,
      sortOrder
    } = req.query as any;

    const offset = (page - 1) * limit;

    // Build query conditions
    let whereConditions = [];

    if (category) {
      whereConditions.push(eq(jobs.category, category));
    }

    if (status) {
      whereConditions.push(eq(jobs.status, status));
    }

    if (minPrice) {
      whereConditions.push(sql`${jobs.price} >= ${minPrice}`);
    }

    if (maxPrice) {
      whereConditions.push(sql`${jobs.price} <= ${maxPrice}`);
    }

    if (search) {
      whereConditions.push(
        or(
          ilike(jobs.title, `%${search}%`),
          ilike(jobs.description, `%${search}%`)
        )
      );
    }

    if (skills) {
      const skillsArray = skills.split(',').map((s: string) => s.trim());
      whereConditions.push(sql`${jobs.requiredSkills} && ${skillsArray}`);
    }

    // Location-based filtering
    let distanceSelect = sql`0`.as('distance');
    if (lat && lng) {
      distanceSelect = sql`
        (6371 * acos(
          cos(radians(${lat})) * 
          cos(radians(${jobs.locationLat})) * 
          cos(radians(${jobs.locationLng}) - radians(${lng})) + 
          sin(radians(${lat})) * 
          sin(radians(${jobs.locationLat}))
        ))
      `.as('distance');

      whereConditions.push(sql`
        (6371 * acos(
          cos(radians(${lat})) * 
          cos(radians(${jobs.locationLat})) * 
          cos(radians(${jobs.locationLng}) - radians(${lng})) + 
          sin(radians(${lat})) * 
          sin(radians(${jobs.locationLat}))
        )) <= ${radius}
      `);
    }

    // Build order by clause
    let orderBy;
    if (sortBy === 'price') {
      orderBy = sortOrder === 'asc' ? asc(jobs.price) : desc(jobs.price);
    } else if (sortBy === 'distance' && lat && lng) {
      orderBy = asc(distanceSelect);
    } else {
      orderBy = sortOrder === 'asc' ? asc(jobs.createdAt) : desc(jobs.createdAt);
    }

    // Execute query
    const jobsQuery = db
      .select({
        id: jobs.id,
        posterId: jobs.posterId,
        title: jobs.title,
        description: jobs.description,
        category: jobs.category,
        locationAddress: jobs.locationAddress,
        locationLat: jobs.locationLat,
        locationLng: jobs.locationLng,
        locationCity: jobs.locationCity,
        locationState: jobs.locationState,
        locationZip: jobs.locationZip,
        price: jobs.price,
        priceType: jobs.priceType,
        requiredSkills: jobs.requiredSkills,
        status: jobs.status,
        urgency: jobs.urgency,
        estimatedDurationHours: jobs.estimatedDurationHours,
        scheduledStart: jobs.scheduledStart,
        createdAt: jobs.createdAt,
        updatedAt: jobs.updatedAt,
        distance: distanceSelect,
        poster: {
          id: users.id,
          fullName: users.fullName,
          avatarUrl: users.avatarUrl,
        }
      })
      .from(jobs)
      .leftJoin(users, eq(jobs.posterId, users.id))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    const jobsList = await jobsQuery;

    // Get total count for pagination
    const countQuery = db
      .select({ count: sql`count(*)`.as('count') })
      .from(jobs)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    const [{ count }] = await countQuery;
    const totalCount = Number(count);
    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      data: jobsList,
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
    console.error('Get jobs error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get jobs',
      }
    });
  }
});

/**
 * GET /jobs/:id
 * Get job by ID with details
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_JOB_ID',
          message: 'Job ID is required',
        }
      });
    }

    const [job] = await db
      .select({
        id: jobs.id,
        posterId: jobs.posterId,
        workerId: jobs.workerId,
        title: jobs.title,
        description: jobs.description,
        category: jobs.category,
        locationAddress: jobs.locationAddress,
        locationLat: jobs.locationLat,
        locationLng: jobs.locationLng,
        locationCity: jobs.locationCity,
        locationState: jobs.locationState,
        locationZip: jobs.locationZip,
        price: jobs.price,
        priceType: jobs.priceType,
        requiredSkills: jobs.requiredSkills,
        status: jobs.status,
        urgency: jobs.urgency,
        estimatedDurationHours: jobs.estimatedDurationHours,
        scheduledStart: jobs.scheduledStart,
        actualStart: jobs.actualStart,
        actualEnd: jobs.actualEnd,
        completionNotes: jobs.completionNotes,
        posterRating: jobs.posterRating,
        workerRating: jobs.workerRating,
        posterReview: jobs.posterReview,
        workerReview: jobs.workerReview,
        createdAt: jobs.createdAt,
        updatedAt: jobs.updatedAt,
        poster: {
          id: users.id,
          fullName: users.fullName,
          avatarUrl: users.avatarUrl,
        }
      })
      .from(jobs)
      .leftJoin(users, eq(jobs.posterId, users.id))
      .where(eq(jobs.id, id))
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

    // Get assigned worker if exists
    let assignedWorker = null;
    if (job.workerId) {
      const [worker] = await db
        .select({
          id: users.id,
          fullName: users.fullName,
          avatarUrl: users.avatarUrl,
          workerProfile: {
            ratingAverage: workerProfiles.ratingAverage,
            ratingCount: workerProfiles.ratingCount,
          }
        })
        .from(users)
        .leftJoin(workerProfiles, eq(users.id, workerProfiles.userId))
        .where(eq(users.id, job.workerId))
        .limit(1);

      assignedWorker = worker || null;
    }

    // Get applications count
    const [{ applicationsCount }] = await db
      .select({ applicationsCount: sql`count(*)`.as('applicationsCount') })
      .from(applications)
      .where(eq(applications.jobId, id));

    res.json({
      success: true,
      data: {
        ...job,
        assignedWorker,
        applicationsCount: Number(applicationsCount),
      }
    });

  } catch (error) {
    console.error('Get job by ID error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get job',
      }
    });
  }
});

/**
 * POST /jobs
 * Create a new job
 */
router.post('/', authMiddleware, validateRequest(jobCreateRequestSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const jobData = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        }
      });
    }

    // Check if user is a poster
    const [user] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user || user.role !== 'poster') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only job posters can create jobs',
        }
      });
    }

    // Create job
    const [newJob] = await db
      .insert(jobs)
      .values({
        posterId: userId,
        title: jobData.title,
        description: jobData.description,
        category: jobData.category,
        locationAddress: jobData.location.address,
        locationLat: jobData.location.latitude?.toString(),
        locationLng: jobData.location.longitude?.toString(),
        locationCity: jobData.location.city,
        locationState: jobData.location.state,
        locationZip: jobData.location.zipCode,
        price: jobData.budget.amount?.toString(),
        priceType: jobData.budget.type === 'fixed' ? 'fixed' : 'hourly',
        requiredSkills: jobData.requiredSkills || [],
        urgency: jobData.urgency,
        estimatedDurationHours: jobData.estimatedDuration ? parseInt(jobData.estimatedDuration) : null,
        scheduledStart: jobData.scheduledFor ? new Date(jobData.scheduledFor) : null,
      })
      .returning();

    res.status(201).json({
      success: true,
      data: newJob,
    });

  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create job',
      }
    });
  }
});

/**
 * PUT /jobs/:id
 * Update job
 */
router.put('/:id', authMiddleware, validateRequest(jobUpdateRequestSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
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

    // Check if job exists and user owns it
    const [existingJob] = await db
      .select({ posterId: jobs.posterId, status: jobs.status })
      .from(jobs)
      .where(eq(jobs.id, id))
      .limit(1);

    if (!existingJob) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'JOB_NOT_FOUND',
          message: 'Job not found',
        }
      });
    }

    if (existingJob.posterId !== userId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only update your own jobs',
        }
      });
    }

    // Prepare update data
    const updateFields: any = {
      updatedAt: new Date(),
    };

    if (updateData.title) updateFields.title = updateData.title;
    if (updateData.description) updateFields.description = updateData.description;
    if (updateData.category) updateFields.category = updateData.category;
    if (updateData.location) {
      updateFields.locationAddress = updateData.location.address;
      updateFields.locationLat = updateData.location.latitude?.toString();
      updateFields.locationLng = updateData.location.longitude?.toString();
      updateFields.locationCity = updateData.location.city;
      updateFields.locationState = updateData.location.state;
      updateFields.locationZip = updateData.location.zipCode;
    }
    if (updateData.budget) {
      updateFields.price = updateData.budget.amount?.toString();
      updateFields.priceType = updateData.budget.type === 'fixed' ? 'fixed' : 'hourly';
    }
    if (updateData.requiredSkills) updateFields.requiredSkills = updateData.requiredSkills;
    if (updateData.urgency) updateFields.urgency = updateData.urgency;
    if (updateData.estimatedDuration) updateFields.estimatedDurationHours = parseInt(updateData.estimatedDuration);
    if (updateData.scheduledFor) updateFields.scheduledStart = new Date(updateData.scheduledFor);
    if (updateData.status) updateFields.status = updateData.status;

    // Update job
    const [updatedJob] = await db
      .update(jobs)
      .set(updateFields)
      .where(eq(jobs.id, id))
      .returning();

    res.json({
      success: true,
      data: updatedJob,
    });

  } catch (error) {
    console.error('Update job error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update job',
      }
    });
  }
});

/**
 * DELETE /jobs/:id
 * Delete job
 */
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
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

    // Check if job exists and user owns it
    const [existingJob] = await db
      .select({ posterId: jobs.posterId, status: jobs.status })
      .from(jobs)
      .where(eq(jobs.id, id))
      .limit(1);

    if (!existingJob) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'JOB_NOT_FOUND',
          message: 'Job not found',
        }
      });
    }

    if (existingJob.posterId !== userId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only delete your own jobs',
        }
      });
    }

    // Only allow deletion of open or draft jobs
    if (!['open', 'draft'].includes(existingJob.status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: 'Only open or draft jobs can be deleted',
        }
      });
    }

    // Delete job (cascade will handle applications)
    await db.delete(jobs).where(eq(jobs.id, id));

    res.json({
      success: true,
      message: 'Job deleted successfully',
    });

  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete job',
      }
    });
  }
});

export default router;
