import { eq, and, or, desc, sql, count, avg } from 'drizzle-orm';
import { db, withTransaction } from '../config/database';
import * as schema from './schema';
import type { 
  User, 
  NewUser, 
  Job, 
  NewJob, 
  Application, 
  NewApplication,
  Payment,
  NewPayment,
  WorkerProfile,
  NewWorkerProfile,
  Notification,
  NewNotification
} from './schema';

// ============================================================================
// QUERY HELPERS
// ============================================================================

/**
 * Generic query builder for pagination
 */
export function buildPaginationQuery<T>(
  query: T,
  page: number = 1,
  limit: number = 20
) {
  const offset = (page - 1) * limit;
  return {
    query,
    offset,
    limit: Math.min(limit, 100), // Cap at 100 items per page
  };
}

/**
 * Distance calculation helper for job searches
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// ============================================================================
// USER OPERATIONS
// ============================================================================

export const userQueries = {
  /**
   * Find user by ID with optional worker profile
   */
  async findById(id: string, includeWorkerProfile = false) {
    const query = db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id));

    if (includeWorkerProfile) {
      return await db
        .select()
        .from(schema.users)
        .leftJoin(schema.workerProfiles, eq(schema.users.id, schema.workerProfiles.userId))
        .where(eq(schema.users.id, id))
        .then(rows => rows[0] || null);
    }

    return await query.then(rows => rows[0] || null);
  },

  /**
   * Find user by email
   */
  async findByEmail(email: string) {
    return await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .then(rows => rows[0] || null);
  },

  /**
   * Create new user
   */
  async create(userData: NewUser): Promise<User> {
    return await db
      .insert(schema.users)
      .values(userData)
      .returning()
      .then(rows => rows[0]);
  },

  /**
   * Update user
   */
  async update(id: string, userData: Partial<NewUser>): Promise<User | null> {
    return await db
      .update(schema.users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(schema.users.id, id))
      .returning()
      .then(rows => rows[0] || null);
  },

  /**
   * Delete user
   */
  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(schema.users)
      .where(eq(schema.users.id, id));
    return result.length > 0;
  },
};

// ============================================================================
// WORKER PROFILE OPERATIONS
// ============================================================================

export const workerProfileQueries = {
  /**
   * Find worker profile by user ID
   */
  async findByUserId(userId: string) {
    return await db
      .select()
      .from(schema.workerProfiles)
      .where(eq(schema.workerProfiles.userId, userId))
      .then(rows => rows[0] || null);
  },

  /**
   * Search workers within radius
   */
  async searchWithinRadius(
    lat: number,
    lng: number,
    radiusKm: number = 25,
    skills?: string[]
  ) {
    const conditions = [
      eq(schema.workerProfiles.isAvailable, true),
      sql`calculate_distance_km(${lat}, ${lng}, ${schema.workerProfiles.locationLat}, ${schema.workerProfiles.locationLng}) <= ${radiusKm}`
    ];

    if (skills && skills.length > 0) {
      conditions.push(sql`${schema.workerProfiles.skills} && ${skills}`);
    }

    return await db
      .select({
        profile: schema.workerProfiles,
        user: schema.users,
        distance: sql<number>`calculate_distance_km(${lat}, ${lng}, ${schema.workerProfiles.locationLat}, ${schema.workerProfiles.locationLng})`,
      })
      .from(schema.workerProfiles)
      .innerJoin(schema.users, eq(schema.workerProfiles.userId, schema.users.id))
      .where(and(...conditions))
      .orderBy(sql`distance`);
  },

  /**
   * Create worker profile
   */
  async create(profileData: NewWorkerProfile): Promise<WorkerProfile> {
    return await db
      .insert(schema.workerProfiles)
      .values(profileData)
      .returning()
      .then(rows => rows[0]);
  },

  /**
   * Update worker profile
   */
  async update(userId: string, profileData: Partial<NewWorkerProfile>): Promise<WorkerProfile | null> {
    return await db
      .update(schema.workerProfiles)
      .set({ ...profileData, updatedAt: new Date() })
      .where(eq(schema.workerProfiles.userId, userId))
      .returning()
      .then(rows => rows[0] || null);
  },

  /**
   * Update worker rating
   */
  async updateRating(userId: string): Promise<void> {
    await db.execute(sql`SELECT update_worker_rating(${userId})`);
  },
};

// ============================================================================
// JOB OPERATIONS
// ============================================================================

export const jobQueries = {
  /**
   * Find job by ID with relations
   */
  async findById(id: string, includeRelations = false) {
    if (includeRelations) {
      return await db
        .select()
        .from(schema.jobs)
        .leftJoin(schema.users, eq(schema.jobs.posterId, schema.users.id))
        .leftJoin(schema.workerProfiles, eq(schema.jobs.workerId, schema.workerProfiles.userId))
        .where(eq(schema.jobs.id, id))
        .then(rows => rows[0] || null);
    }

    return await db
      .select()
      .from(schema.jobs)
      .where(eq(schema.jobs.id, id))
      .then(rows => rows[0] || null);
  },

  /**
   * Search jobs with filters
   */
  async search(filters: {
    lat?: number;
    lng?: number;
    radiusKm?: number;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    skills?: string[];
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const conditions = [];

    if (filters.status) {
      conditions.push(eq(schema.jobs.status, filters.status as any));
    }

    if (filters.category) {
      conditions.push(eq(schema.jobs.category, filters.category));
    }

    if (filters.minPrice) {
      conditions.push(sql`${schema.jobs.price} >= ${filters.minPrice}`);
    }

    if (filters.maxPrice) {
      conditions.push(sql`${schema.jobs.price} <= ${filters.maxPrice}`);
    }

    if (filters.skills && filters.skills.length > 0) {
      conditions.push(sql`${schema.jobs.requiredSkills} && ${filters.skills}`);
    }

    if (filters.lat && filters.lng && filters.radiusKm) {
      conditions.push(
        sql`calculate_distance_km(${filters.lat}, ${filters.lng}, ${schema.jobs.locationLat}, ${schema.jobs.locationLng}) <= ${filters.radiusKm}`
      );
    }

    // Add pagination
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const offset = (page - 1) * limit;

    // Build the complete query based on conditions
    if (conditions.length > 0) {
      if (filters.lat && filters.lng) {
        return await db
          .select({
            job: schema.jobs,
            poster: schema.users,
            distance: sql<number>`calculate_distance_km(${filters.lat}, ${filters.lng}, ${schema.jobs.locationLat}, ${schema.jobs.locationLng})`,
          })
          .from(schema.jobs)
          .innerJoin(schema.users, eq(schema.jobs.posterId, schema.users.id))
          .where(and(...conditions))
          .orderBy(sql`distance`)
          .limit(limit)
          .offset(offset);
      } else {
        return await db
          .select({
            job: schema.jobs,
            poster: schema.users,
            distance: sql<number>`0`,
          })
          .from(schema.jobs)
          .innerJoin(schema.users, eq(schema.jobs.posterId, schema.users.id))
          .where(and(...conditions))
          .orderBy(desc(schema.jobs.createdAt))
          .limit(limit)
          .offset(offset);
      }
    } else {
      if (filters.lat && filters.lng) {
        return await db
          .select({
            job: schema.jobs,
            poster: schema.users,
            distance: sql<number>`calculate_distance_km(${filters.lat}, ${filters.lng}, ${schema.jobs.locationLat}, ${schema.jobs.locationLng})`,
          })
          .from(schema.jobs)
          .innerJoin(schema.users, eq(schema.jobs.posterId, schema.users.id))
          .orderBy(sql`distance`)
          .limit(limit)
          .offset(offset);
      } else {
        return await db
          .select({
            job: schema.jobs,
            poster: schema.users,
            distance: sql<number>`0`,
          })
          .from(schema.jobs)
          .innerJoin(schema.users, eq(schema.jobs.posterId, schema.users.id))
          .orderBy(desc(schema.jobs.createdAt))
          .limit(limit)
          .offset(offset);
      }
    }
  },

  /**
   * Find jobs by poster ID
   */
  async findByPosterId(posterId: string, status?: string) {
    const conditions = [eq(schema.jobs.posterId, posterId)];
    
    if (status) {
      conditions.push(eq(schema.jobs.status, status as any));
    }

    return await db
      .select()
      .from(schema.jobs)
      .where(and(...conditions))
      .orderBy(desc(schema.jobs.createdAt));
  },

  /**
   * Find jobs by worker ID
   */
  async findByWorkerId(workerId: string, status?: string) {
    const conditions = [eq(schema.jobs.workerId, workerId)];
    
    if (status) {
      conditions.push(eq(schema.jobs.status, status as any));
    }

    return await db
      .select()
      .from(schema.jobs)
      .where(and(...conditions))
      .orderBy(desc(schema.jobs.createdAt));
  },

  /**
   * Create new job
   */
  async create(jobData: NewJob): Promise<Job> {
    return await db
      .insert(schema.jobs)
      .values(jobData)
      .returning()
      .then(rows => rows[0]);
  },

  /**
   * Update job
   */
  async update(id: string, jobData: Partial<NewJob>): Promise<Job | null> {
    return await db
      .update(schema.jobs)
      .set({ ...jobData, updatedAt: new Date() })
      .where(eq(schema.jobs.id, id))
      .returning()
      .then(rows => rows[0] || null);
  },

  /**
   * Delete job
   */
  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(schema.jobs)
      .where(eq(schema.jobs.id, id));
    return result.length > 0;
  },

  /**
   * Get job statistics
   */
  async getStats(posterId?: string) {
    if (posterId) {
      return await db
        .select({
          total: count(),
          avgPrice: avg(schema.jobs.price),
          statusCounts: sql<Record<string, number>>`
            json_object_agg(
              status, 
              count(*)
            )
          `,
        })
        .from(schema.jobs)
        .where(eq(schema.jobs.posterId, posterId))
        .then(rows => rows[0]);
    } else {
      return await db
        .select({
          total: count(),
          avgPrice: avg(schema.jobs.price),
          statusCounts: sql<Record<string, number>>`
            json_object_agg(
              status, 
              count(*)
            )
          `,
        })
        .from(schema.jobs)
        .then(rows => rows[0]);
    }
  },
};

// ============================================================================
// APPLICATION OPERATIONS
// ============================================================================

export const applicationQueries = {
  /**
   * Find application by ID
   */
  async findById(id: string) {
    return await db
      .select()
      .from(schema.applications)
      .where(eq(schema.applications.id, id))
      .then(rows => rows[0] || null);
  },

  /**
   * Find applications by job ID
   */
  async findByJobId(jobId: string) {
    return await db
      .select({
        application: schema.applications,
        worker: schema.users,
        workerProfile: schema.workerProfiles,
      })
      .from(schema.applications)
      .innerJoin(schema.users, eq(schema.applications.workerId, schema.users.id))
      .leftJoin(schema.workerProfiles, eq(schema.applications.workerId, schema.workerProfiles.userId))
      .where(eq(schema.applications.jobId, jobId))
      .orderBy(desc(schema.applications.appliedAt));
  },

  /**
   * Find applications by worker ID
   */
  async findByWorkerId(workerId: string, status?: string) {
    const conditions = [eq(schema.applications.workerId, workerId)];
    
    if (status) {
      conditions.push(eq(schema.applications.status, status as any));
    }

    return await db
      .select({
        application: schema.applications,
        job: schema.jobs,
        poster: schema.users,
      })
      .from(schema.applications)
      .innerJoin(schema.jobs, eq(schema.applications.jobId, schema.jobs.id))
      .innerJoin(schema.users, eq(schema.jobs.posterId, schema.users.id))
      .where(and(...conditions))
      .orderBy(desc(schema.applications.appliedAt));
  },

  /**
   * Check if worker already applied to job
   */
  async hasApplied(jobId: string, workerId: string): Promise<boolean> {
    const result = await db
      .select({ id: schema.applications.id })
      .from(schema.applications)
      .where(
        and(
          eq(schema.applications.jobId, jobId),
          eq(schema.applications.workerId, workerId)
        )
      )
      .limit(1);

    return result.length > 0;
  },

  /**
   * Create new application
   */
  async create(applicationData: NewApplication): Promise<Application> {
    return await db
      .insert(schema.applications)
      .values(applicationData)
      .returning()
      .then(rows => rows[0]);
  },

  /**
   * Update application
   */
  async update(id: string, applicationData: Partial<NewApplication>): Promise<Application | null> {
    return await db
      .update(schema.applications)
      .set(applicationData)
      .where(eq(schema.applications.id, id))
      .returning()
      .then(rows => rows[0] || null);
  },

  /**
   * Accept application and reject others
   */
  async acceptApplication(applicationId: string): Promise<void> {
    await withTransaction(async (tx) => {
      // Get the application details
      const application = await tx
        .select()
        .from(schema.applications)
        .where(eq(schema.applications.id, applicationId))
        .then(rows => rows[0]);

      if (!application) {
        throw new Error('Application not found');
      }

      // Accept the selected application
      await tx
        .update(schema.applications)
        .set({
          status: 'accepted',
          respondedAt: new Date()
        })
        .where(eq(schema.applications.id, applicationId));

      // Reject all other applications for the same job
      await tx
        .update(schema.applications)
        .set({
          status: 'rejected',
          respondedAt: new Date()
        })
        .where(
          and(
            eq(schema.applications.jobId, application.jobId),
            sql`id != ${applicationId}`,
            eq(schema.applications.status, 'pending')
          )
        );

      // Update job status to assigned
      await tx
        .update(schema.jobs)
        .set({
          status: 'assigned',
          workerId: application.workerId,
          updatedAt: new Date()
        })
        .where(eq(schema.jobs.id, application.jobId));
    });
  },

  /**
   * Get application statistics
   */
  async getStats(workerId?: string) {
    if (workerId) {
      return await db
        .select({
          total: count(),
          statusCounts: sql<Record<string, number>>`
            json_object_agg(
              status,
              count(*)
            )
          `,
        })
        .from(schema.applications)
        .where(eq(schema.applications.workerId, workerId))
        .then(rows => rows[0]);
    } else {
      return await db
        .select({
          total: count(),
          statusCounts: sql<Record<string, number>>`
            json_object_agg(
              status,
              count(*)
            )
          `,
        })
        .from(schema.applications)
        .then(rows => rows[0]);
    }
  },
};

// ============================================================================
// PAYMENT OPERATIONS
// ============================================================================

export const paymentQueries = {
  /**
   * Find payment by ID
   */
  async findById(id: string) {
    return await db
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.id, id))
      .then(rows => rows[0] || null);
  },

  /**
   * Find payment by Stripe payment intent ID
   */
  async findByStripePaymentIntentId(stripePaymentIntentId: string) {
    return await db
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.stripePaymentIntentId, stripePaymentIntentId))
      .then(rows => rows[0] || null);
  },

  /**
   * Find payments by job ID
   */
  async findByJobId(jobId: string) {
    return await db
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.jobId, jobId))
      .orderBy(desc(schema.payments.createdAt));
  },

  /**
   * Find payments by user ID (as poster or worker)
   */
  async findByUserId(userId: string, role: 'poster' | 'worker' | 'both' = 'both') {
    let whereCondition;
    
    if (role === 'poster') {
      whereCondition = eq(schema.payments.posterId, userId);
    } else if (role === 'worker') {
      whereCondition = eq(schema.payments.workerId, userId);
    } else {
      whereCondition = or(
        eq(schema.payments.posterId, userId),
        eq(schema.payments.workerId, userId)
      );
    }

    return await db
      .select({
        payment: schema.payments,
        job: schema.jobs,
      })
      .from(schema.payments)
      .innerJoin(schema.jobs, eq(schema.payments.jobId, schema.jobs.id))
      .where(whereCondition)
      .orderBy(desc(schema.payments.createdAt));
  },

  /**
   * Create new payment
   */
  async create(paymentData: NewPayment): Promise<Payment> {
    return await db
      .insert(schema.payments)
      .values(paymentData)
      .returning()
      .then(rows => rows[0]);
  },

  /**
   * Update payment
   */
  async update(id: string, paymentData: Partial<NewPayment>): Promise<Payment | null> {
    return await db
      .update(schema.payments)
      .set({ ...paymentData, updatedAt: new Date() })
      .where(eq(schema.payments.id, id))
      .returning()
      .then(rows => rows[0] || null);
  },

  /**
   * Get payment statistics
   */
  async getStats(userId?: string, role?: 'poster' | 'worker') {
    if (userId && role) {
      const whereCondition = role === 'poster' 
        ? eq(schema.payments.posterId, userId)
        : eq(schema.payments.workerId, userId);
        
      return await db
        .select({
          total: count(),
          totalAmount: sql<number>`COALESCE(SUM(amount), 0)`,
          avgAmount: avg(schema.payments.amount),
          statusCounts: sql<Record<string, number>>`
            json_object_agg(
              status,
              count(*)
            )
          `,
        })
        .from(schema.payments)
        .where(whereCondition)
        .then(rows => rows[0]);
    } else {
      return await db
        .select({
          total: count(),
          totalAmount: sql<number>`COALESCE(SUM(amount), 0)`,
          avgAmount: avg(schema.payments.amount),
          statusCounts: sql<Record<string, number>>`
            json_object_agg(
              status,
              count(*)
            )
          `,
        })
        .from(schema.payments)
        .then(rows => rows[0]);
    }
  },
};

// ============================================================================
// NOTIFICATION OPERATIONS
// ============================================================================

export const notificationQueries = {
  /**
   * Find notifications by user ID
   */
  async findByUserId(userId: string, unreadOnly = false) {
    const conditions = [eq(schema.notifications.userId, userId)];
    
    if (unreadOnly) {
      conditions.push(eq(schema.notifications.read, false));
    }

    return await db
      .select()
      .from(schema.notifications)
      .where(and(...conditions))
      .orderBy(desc(schema.notifications.createdAt));
  },

  /**
   * Create new notification
   */
  async create(notificationData: NewNotification): Promise<Notification> {
    return await db
      .insert(schema.notifications)
      .values(notificationData)
      .returning()
      .then(rows => rows[0]);
  },

  /**
   * Mark notification as read
   */
  async markAsRead(id: string): Promise<boolean> {
    const result = await db
      .update(schema.notifications)
      .set({ read: true })
      .where(eq(schema.notifications.id, id));

    return result.length > 0;
  },

  /**
   * Mark all notifications as read for user
   */
  async markAllAsRead(userId: string): Promise<number> {
    const result = await db
      .update(schema.notifications)
      .set({ read: true })
      .where(
        and(
          eq(schema.notifications.userId, userId),
          eq(schema.notifications.read, false)
        )
      );

    return result.length;
  },

  /**
   * Delete notification
   */
  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(schema.notifications)
      .where(eq(schema.notifications.id, id));

    return result.length > 0;
  },

  /**
   * Get unread count for user
   */
  async getUnreadCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(schema.notifications)
      .where(
        and(
          eq(schema.notifications.userId, userId),
          eq(schema.notifications.read, false)
        )
      );

    return result[0]?.count || 0;
  },

  /**
   * Clean up old read notifications
   */
  async cleanup(): Promise<number> {
    const result = await db.execute(sql`SELECT cleanup_old_notifications()`);
    return (result[0] as any)?.cleanup_old_notifications || 0;
  },
};

// ============================================================================
// EXPORT ALL QUERIES
// ============================================================================

export const queries = {
  users: userQueries,
  workerProfiles: workerProfileQueries,
  jobs: jobQueries,
  applications: applicationQueries,
  payments: paymentQueries,
  notifications: notificationQueries,
};

// Export database instance and schema
export { db, schema };
export * from './schema';
