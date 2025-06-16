import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { 
  jobs, 
  enterpriseClients, 
  jobTemplates, 
  workerPools, 
  bulkJobOperations 
} from '../db/schema';
import { validateRequest } from '../middleware/validation';
import { authMiddleware } from '../middleware/auth';
import { eq, and, desc, inArray, sql } from 'drizzle-orm';

const router = Router();

// All enterprise routes require authentication
router.use(authMiddleware);

// Helper function to get enterprise for user
async function getEnterpriseForUser(userId: string) {
  const enterprise = await db.select()
    .from(enterpriseClients)
    .where(eq(enterpriseClients.contactUserId, userId))
    .limit(1);
  
  return enterprise.length > 0 ? enterprise[0] : null;
}

// Helper function to verify authentication and get user ID
function getUserId(req: Request): string | null {
  return req.user?.id || null;
}

// ============================================================================
// BULK JOB OPERATIONS
// ============================================================================

/**
 * Bulk job import schema
 */
const bulkJobSchema = z.object({
  jobs: z.array(z.object({
    title: z.string().min(5).max(100),
    description: z.string().min(20).max(2000),
    location: z.object({
      address: z.string(),
      latitude: z.number(),
      longitude: z.number(),
      city: z.string(),
      state: z.string(),
      zipCode: z.string()
    }),
    category: z.enum(['cleaning', 'maintenance', 'security', 'landscaping', 'moving']),
    payRate: z.object({
      type: z.enum(['hourly', 'fixed']),
      amount: z.number().positive(),
      currency: z.literal('USD')
    }),
    schedule: z.object({
      startDate: z.string().datetime(),
      endDate: z.string().datetime().optional(),
      recurring: z.boolean().default(false),
      frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
      daysOfWeek: z.array(z.number().min(0).max(6)).optional()
    }),
    requirements: z.array(z.string()).default([]),
    urgency: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
    workerCount: z.number().min(1).max(50).default(1),
    estimatedDuration: z.number().positive(), // in hours
    clientNotes: z.string().optional(),
    backgroundCheckRequired: z.boolean().default(false),
    equipmentProvided: z.boolean().default(false),
    parkingAvailable: z.boolean().default(false)
  })),
  templateId: z.string().uuid().optional(),
  publishImmediately: z.boolean().default(true),
  notifyWorkers: z.boolean().default(true),
  scheduledPublishDate: z.string().datetime().optional()
});

/**
 * POST /enterprise/jobs/bulk
 * Create multiple jobs at once
 */
router.post('/jobs/bulk', validateRequest(bulkJobSchema), async (req: Request, res: Response) => {
  try {
    const { jobs: jobsData, publishImmediately } = req.body;
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    // Verify user has enterprise access
    const enterprise = await getEnterpriseForUser(userId);
    if (!enterprise) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Enterprise access required'
      });
    }

    const enterpriseId = enterprise.id;

    // Create bulk operation record
    const [bulkOperation] = await db.insert(bulkJobOperations).values({
      enterpriseId,
      operationType: 'create',
      totalJobs: jobsData.length,
      status: 'processing',
      createdBy: userId
    }).returning();

    const createdJobs = [];
    const failedJobs = [];

    // Process each job
    for (const jobData of jobsData) {
      try {
        const [newJob] = await db.insert(jobs).values({
          posterId: userId,
          enterpriseId,
          title: jobData.title,
          description: jobData.description,
          category: jobData.category,
          price: jobData.payRate.amount.toString(),
          priceType: jobData.payRate.type,
          locationAddress: jobData.location.address,
          locationLat: jobData.location.latitude.toString(),
          locationLng: jobData.location.longitude.toString(),
          locationCity: jobData.location.city,
          locationState: jobData.location.state,
          locationZip: jobData.location.zipCode,
          requiredSkills: jobData.requirements,
          urgency: jobData.urgency as any,
          estimatedDurationHours: jobData.estimatedDuration,
          status: publishImmediately ? 'open' : 'open', // Note: 'draft' may not be in enum
          scheduledStart: new Date(jobData.schedule.startDate)
        }).returning();

        createdJobs.push(newJob);
      } catch (error) {
        failedJobs.push({
          jobData,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Update bulk operation status
    await db.update(bulkJobOperations)
      .set({
        successfulJobs: createdJobs.length,
        failedJobs: failedJobs.length,
        status: failedJobs.length === 0 ? 'completed' : 'partial',
        completedAt: new Date(),
        errorDetails: failedJobs.length > 0 ? { failures: failedJobs } : undefined
      })
      .where(eq(bulkJobOperations.id, bulkOperation.id));

    res.status(201).json({
      success: true,
      operationId: bulkOperation.id,
      created: createdJobs.length,
      failed: failedJobs.length,
      jobs: createdJobs,
      failures: failedJobs
    });

  } catch (error) {
    console.error('Bulk job creation error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create bulk jobs'
    });
  }
});

/**
 * PUT /enterprise/jobs/bulk
 * Update multiple jobs at once
 */
const bulkJobUpdateSchema = z.object({
  jobIds: z.array(z.string().uuid()),
  updates: z.object({
    payRate: z.object({
      amount: z.number().positive()
    }).optional(),
    schedule: z.object({
      startDate: z.string().datetime()
    }).optional(),
    status: z.enum(['open', 'assigned', 'in_progress', 'completed', 'cancelled']).optional()
  })
});

router.put('/jobs/bulk', validateRequest(bulkJobUpdateSchema), async (req: Request, res: Response) => {
  try {
    const { jobIds, updates } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    // Verify user owns these jobs or has enterprise access
    const userJobs = await db.select()
      .from(jobs)
      .where(and(
        inArray(jobs.id, jobIds),
        eq(jobs.posterId, userId)
      ));

    if (userJobs.length !== jobIds.length) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only update your own jobs'
      });
    }

    // Build update object
    const updateData: any = {};
    if (updates.payRate) {
      updateData.price = updates.payRate.amount.toString();
    }
    if (updates.schedule) {
      updateData.scheduledStart = new Date(updates.schedule.startDate);
    }
    if (updates.status) {
      updateData.status = updates.status;
    }

    // Perform bulk update
    const updatedJobs = await db.update(jobs)
      .set(updateData)
      .where(inArray(jobs.id, jobIds))
      .returning();

    res.json({
      success: true,
      updated: updatedJobs.length,
      jobs: updatedJobs
    });

  } catch (error) {
    console.error('Bulk job update error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update bulk jobs'
    });
  }
});

// ============================================================================
// JOB TEMPLATES
// ============================================================================

/**
 * Job template schema
 */
const jobTemplateSchema = z.object({
  name: z.string().min(5).max(100),
  description: z.string().optional(),
  jobDefaults: z.object({
    category: z.string(),
    payRate: z.object({
      type: z.enum(['hourly', 'fixed']),
      amount: z.number().positive()
    }),
    estimatedDuration: z.number().positive(),
    requirements: z.array(z.string()),
    backgroundCheckRequired: z.boolean().default(false),
    equipmentProvided: z.boolean().default(false)
  }),
  locations: z.array(z.object({
    name: z.string(),
    address: z.string(),
    coordinates: z.object({ lat: z.number(), lng: z.number() }),
    accessInstructions: z.string().optional(),
    contactPerson: z.string().optional(),
    contactPhone: z.string().optional()
  })),
  scheduleTemplate: z.object({
    frequency: z.enum(['daily', 'weekly', 'monthly']),
    daysOfWeek: z.array(z.number()).optional(),
    timeSlots: z.array(z.object({
      startTime: z.string(),
      endTime: z.string(),
      duration: z.number()
    }))
  }),
  autoPublish: z.boolean().default(true),
  workerPoolId: z.string().uuid().optional()
});

/**
 * GET /enterprise/templates
 * Get all job templates for the enterprise
 */
router.get('/templates', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const enterprise = await getEnterpriseForUser(userId);
    if (!enterprise) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Enterprise access required'
      });
    }

    const templates = await db.select()
      .from(jobTemplates)
      .where(eq(jobTemplates.enterpriseId, enterprise.id))
      .orderBy(desc(jobTemplates.createdAt));

    res.json({
      success: true,
      templates
    });

  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve templates'
    });
  }
});

/**
 * POST /enterprise/templates
 * Create a new job template
 */
router.post('/templates', validateRequest(jobTemplateSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const templateData = req.body;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const enterprise = await getEnterpriseForUser(userId);
    if (!enterprise) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Enterprise access required'
      });
    }

    const [template] = await db.insert(jobTemplates).values({
      enterpriseId: enterprise.id,
      name: templateData.name,
      description: templateData.description,
      jobDefaults: templateData.jobDefaults,
      locations: templateData.locations,
      scheduleTemplate: templateData.scheduleTemplate,
      autoPublish: templateData.autoPublish,
      workerPoolId: templateData.workerPoolId
    }).returning();

    res.status(201).json({
      success: true,
      template
    });

  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create template'
    });
  }
});

/**
 * POST /enterprise/templates/:id/generate
 * Generate jobs from template
 */
const generateJobsSchema = z.object({
  dateRange: z.object({
    start: z.string(),
    end: z.string()
  }),
  locations: z.array(z.string()).optional(),
  overrides: z.object({
    payRate: z.object({
      amount: z.number().positive()
    }).optional()
  }).optional()
});

router.post('/templates/:id/generate', validateRequest(generateJobsSchema), async (req: Request, res: Response) => {
  try {
    const templateId = req.params.id;
    const { dateRange, overrides } = req.body;
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    // Get template
    const template = await db.select()
      .from(jobTemplates)
      .where(eq(jobTemplates.id, templateId))
      .limit(1);

    if (!template.length) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Template not found'
      });
    }

    const templateData = template[0];

    // For now, return a simple response - template generation would need proper typing
    res.json({
      success: true,
      message: 'Template generation feature in development',
      template: {
        id: templateData.id,
        name: templateData.name,
        description: templateData.description
      },
      dateRange,
      overrides
    });

  } catch (error) {
    console.error('Generate jobs error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate jobs from template'
    });
  }
});

// ============================================================================
// WORKER POOLS
// ============================================================================

/**
 * Worker pool criteria schema
 */
const workerPoolCriteriaSchema = z.object({
  minimumRating: z.number().min(1).max(5).default(4),
  requiredSkills: z.array(z.string()),
  backgroundCheckRequired: z.boolean().default(false),
  experienceLevel: z.enum(['entry', 'intermediate', 'expert']),
  maxDistanceFromJobs: z.number().positive().default(25),
  availability: z.object({
    daysOfWeek: z.array(z.number()),
    timeSlots: z.array(z.object({
      start: z.string(),
      end: z.string()
    }))
  }),
  autoInviteToJobs: z.boolean().default(false)
});

const workerPoolSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  criteria: workerPoolCriteriaSchema,
  workerIds: z.array(z.string().uuid()).default([]),
  autoInvite: z.boolean().default(false)
});

/**
 * GET /enterprise/worker-pools
 * Get all worker pools for the enterprise
 */
router.get('/worker-pools', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const enterprise = await getEnterpriseForUser(userId);
    if (!enterprise) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Enterprise access required'
      });
    }

    const pools = await db.select()
      .from(workerPools)
      .where(eq(workerPools.enterpriseId, enterprise.id))
      .orderBy(desc(workerPools.createdAt));

    res.json({
      success: true,
      workerPools: pools
    });

  } catch (error) {
    console.error('Get worker pools error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve worker pools'
    });
  }
});

/**
 * POST /enterprise/worker-pools
 * Create a new worker pool
 */
router.post('/worker-pools', validateRequest(workerPoolSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const poolData = req.body;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const enterprise = await getEnterpriseForUser(userId);
    if (!enterprise) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Enterprise access required'
      });
    }

    const [pool] = await db.insert(workerPools).values({
      enterpriseId: enterprise.id,
      name: poolData.name,
      description: poolData.description,
      criteria: poolData.criteria,
      workerIds: poolData.workerIds,
      autoInvite: poolData.autoInvite
    }).returning();

    res.status(201).json({
      success: true,
      workerPool: pool
    });

  } catch (error) {
    console.error('Create worker pool error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create worker pool'
    });
  }
});

// ============================================================================
// BULK OPERATIONS TRACKING
// ============================================================================

/**
 * GET /enterprise/bulk-operations
 * Get historical bulk job operations
 */
router.get('/bulk-operations', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const enterprise = await getEnterpriseForUser(userId);
    if (!enterprise) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Enterprise access required'
      });
    }

    const operations = await db.select()
      .from(bulkJobOperations)
      .where(eq(bulkJobOperations.enterpriseId, enterprise.id))
      .orderBy(desc(bulkJobOperations.createdAt))
      .limit(20);

    res.json({
      success: true,
      operations
    });

  } catch (error) {
    console.error('Bulk operations fetch error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve bulk operations'
    });
  }
});

/**
 * GET /enterprise/bulk-operations/:id
 * Get specific bulk operation details
 */
router.get('/bulk-operations/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const enterprise = await getEnterpriseForUser(userId);
    if (!enterprise) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Enterprise access required'
      });
    }

    const operation = await db.select()
      .from(bulkJobOperations)
      .where(and(
        eq(bulkJobOperations.id, id),
        eq(bulkJobOperations.enterpriseId, enterprise.id)
      ))
      .limit(1);

    if (operation.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Bulk operation not found'
      });
    }

    res.json({
      success: true,
      operation: operation[0]
    });

  } catch (error) {
    console.error('Bulk operation fetch error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve bulk operation'
    });
  }
});

// ============================================================================
// ANALYTICS
// ============================================================================

/**
 * GET /enterprise/analytics/overview
 * Get enterprise analytics overview
 */
router.get('/analytics/overview', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { period = '30d' } = req.query;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const enterprise = await getEnterpriseForUser(userId);
    if (!enterprise) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Enterprise access required'
      });
    }

    const enterpriseId = enterprise.id;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - (period === '30d' ? 30 : 7));

    // Get job statistics - simplified for now
    const jobStats = await db.select({
      totalJobs: sql`COUNT(*)::integer`,
      completedJobs: sql`COUNT(CASE WHEN status = 'completed' THEN 1 END)::integer`,
    })
    .from(jobs)
    .where(and(
      eq(jobs.enterpriseId, enterpriseId),
      sql`created_at >= ${startDate}`
    ));

    const stats = jobStats[0];
    const totalJobs = Number(stats.totalJobs) || 0;
    const completedJobs = Number(stats.completedJobs) || 0;
    const fillRate = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0;

    res.json({
      success: true,
      metrics: {
        jobsPosted: totalJobs,
        fillRate,
        avgTimeToFill: 0, // Simplified for now
        totalPayout: 0, // Simplified for now
        period
      }
    });

  } catch (error) {
    console.error('Analytics overview error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve analytics'
    });
  }
});

export default router;
