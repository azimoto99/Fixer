import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  decimal,
  integer,
  boolean,
  jsonb,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

// ============================================================================
// ENUMS
// ============================================================================

export const userRoleEnum = pgEnum('user_role', ['poster', 'worker']);

export const stripeStatusEnum = pgEnum('stripe_status', [
  'not_connected',
  'pending',
  'verified',
  'restricted',
]);

export const priceTypeEnum = pgEnum('price_type_enum', ['fixed', 'hourly']);

export const jobStatusEnum = pgEnum('job_status', [
  'open',
  'assigned',
  'in_progress',
  'completed',
  'cancelled',
  'disputed',
]);

export const urgencyLevelEnum = pgEnum('urgency_level', [
  'low',
  'normal',
  'high',
  'urgent',
]);

export const applicationStatusEnum = pgEnum('application_status', [
  'pending',
  'accepted',
  'rejected',
  'withdrawn',
]);

export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'authorized',
  'captured',
  'failed',
  'refunded',
  'disputed',
]);

export const notificationTypeEnum = pgEnum('notification_type', [
  'job_posted',
  'application_received',
  'application_accepted',
  'application_rejected',
  'job_assigned',
  'job_started',
  'job_completed',
  'payment_received',
  'rating_received',
]);

// ============================================================================
// TABLES
// ============================================================================

// Users table (extends Supabase auth.users)
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey(), // References auth.users(id)
    role: userRoleEnum('role').notNull(),
    fullName: text('full_name').notNull(),
    avatarUrl: text('avatar_url'),
    phone: text('phone'),
    email: text('email').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    roleIdx: index('idx_users_role').on(table.role),
    emailIdx: index('idx_users_email').on(table.email),
  })
);

// Worker profiles table
export const workerProfiles = pgTable(
  'worker_profiles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
    bio: text('bio'),
    skills: text('skills').array().default(sql`'{}'`),
    hourlyRate: decimal('hourly_rate', { precision: 10, scale: 2 }),
    serviceRadiusKm: integer('service_radius_km').default(25),
    locationLat: decimal('location_lat', { precision: 10, scale: 8 }),
    locationLng: decimal('location_lng', { precision: 11, scale: 8 }),
    stripeAccountId: text('stripe_account_id'),
    stripeAccountStatus: stripeStatusEnum('stripe_account_status').default('not_connected'),
    availabilitySchedule: jsonb('availability_schedule'), // Store weekly availability
    isAvailable: boolean('is_available').default(true),
    ratingAverage: decimal('rating_average', { precision: 3, scale: 2 }).default('0'),
    ratingCount: integer('rating_count').default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('idx_worker_profiles_user_id').on(table.userId),
    locationIdx: index('idx_worker_profiles_location').on(table.locationLat, table.locationLng),
    skillsIdx: index('idx_worker_profiles_skills').on(table.skills),
  })
);

// Jobs table
export const jobs = pgTable(
  'jobs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    posterId: uuid('poster_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    workerId: uuid('worker_id').references(() => users.id, { onDelete: 'set null' }),
    enterpriseId: uuid('enterprise_id').references(() => enterpriseClients.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    description: text('description').notNull(),
    category: text('category').notNull(),
    locationAddress: text('location_address').notNull(),
    locationLat: decimal('location_lat', { precision: 10, scale: 8 }).notNull(),
    locationLng: decimal('location_lng', { precision: 11, scale: 8 }).notNull(),
    locationCity: text('location_city'),
    locationState: text('location_state'),
    locationZip: text('location_zip'),
    price: decimal('price', { precision: 10, scale: 2 }).notNull(),
    priceType: priceTypeEnum('price_type').notNull(),
    requiredSkills: text('required_skills').array().default(sql`'{}'`),
    status: jobStatusEnum('status').default('open').notNull(),
    urgency: urgencyLevelEnum('urgency').default('normal'),
    estimatedDurationHours: integer('estimated_duration_hours'),
    scheduledStart: timestamp('scheduled_start', { withTimezone: true }),
    actualStart: timestamp('actual_start', { withTimezone: true }),
    actualEnd: timestamp('actual_end', { withTimezone: true }),
    completionNotes: text('completion_notes'),
    posterRating: integer('poster_rating'),
    workerRating: integer('worker_rating'),
    posterReview: text('poster_review'),
    workerReview: text('worker_review'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    posterIdIdx: index('idx_jobs_poster_id').on(table.posterId),
    workerIdIdx: index('idx_jobs_worker_id').on(table.workerId),
    statusIdx: index('idx_jobs_status').on(table.status),
    locationIdx: index('idx_jobs_location').on(table.locationLat, table.locationLng),
    categoryIdx: index('idx_jobs_category').on(table.category),
    skillsIdx: index('idx_jobs_skills').on(table.requiredSkills),
    createdAtIdx: index('idx_jobs_created_at').on(table.createdAt),
    posterRatingCheck: check('poster_rating_check',
      sql`poster_rating >= 1 AND poster_rating <= 5`),
    workerRatingCheck: check('worker_rating_check',
      sql`worker_rating >= 1 AND worker_rating <= 5`),
  })
);

// Applications table
export const applications = pgTable(
  'applications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    jobId: uuid('job_id').references(() => jobs.id, { onDelete: 'cascade' }).notNull(),
    workerId: uuid('worker_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    message: text('message'),
    proposedPrice: decimal('proposed_price', { precision: 10, scale: 2 }),
    estimatedCompletionTime: integer('estimated_completion_time'), // in hours
    status: applicationStatusEnum('status').default('pending').notNull(),
    appliedAt: timestamp('applied_at', { withTimezone: true }).defaultNow().notNull(),
    respondedAt: timestamp('responded_at', { withTimezone: true }),
  },
  (table) => ({
    jobIdIdx: index('idx_applications_job_id').on(table.jobId),
    workerIdIdx: index('idx_applications_worker_id').on(table.workerId),
    statusIdx: index('idx_applications_status').on(table.status),
    uniqueJobWorker: uniqueIndex('unique_job_worker').on(table.jobId, table.workerId),
  })
);

// Payments table
export const payments = pgTable(
  'payments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    jobId: uuid('job_id').references(() => jobs.id, { onDelete: 'cascade' }).notNull(),
    posterId: uuid('poster_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    workerId: uuid('worker_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
    platformFee: decimal('platform_fee', { precision: 10, scale: 2 }).notNull(),
    workerAmount: decimal('worker_amount', { precision: 10, scale: 2 }).notNull(),
    currency: text('currency').default('usd').notNull(),
    description: text('description'),
    stripePaymentIntentId: text('stripe_payment_intent_id').unique(),
    stripeTransferId: text('stripe_transfer_id'),
    paymentMethodId: text('payment_method_id'),
    status: paymentStatusEnum('status').default('pending').notNull(),
    authorizedAt: timestamp('authorized_at', { withTimezone: true }),
    capturedAt: timestamp('captured_at', { withTimezone: true }),
    failedAt: timestamp('failed_at', { withTimezone: true }),
    failureReason: text('failure_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    jobIdIdx: index('idx_payments_job_id').on(table.jobId),
    posterIdIdx: index('idx_payments_poster_id').on(table.posterId),
    workerIdIdx: index('idx_payments_worker_id').on(table.workerId),
    statusIdx: index('idx_payments_status').on(table.status),
    stripePaymentIntentIdx: index('idx_payments_stripe_payment_intent').on(table.stripePaymentIntentId),
  })
);

// Notifications table
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    title: text('title').notNull(),
    message: text('message').notNull(),
    type: notificationTypeEnum('type').notNull(),
    data: jsonb('data'), // Additional context data
    read: boolean('read').default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('idx_notifications_user_id').on(table.userId),
    readIdx: index('idx_notifications_read').on(table.read),
    createdAtIdx: index('idx_notifications_created_at').on(table.createdAt),
  })
);

// ============================================================================
// ENTERPRISE TABLES
// ============================================================================

export const enterpriseClients = pgTable(
  'enterprise_clients',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyName: text('company_name').notNull(),
    industry: text('industry').notNull(),
    contactEmail: text('contact_email').notNull(),
    contactPhone: text('contact_phone'),
    billingAddress: jsonb('billing_address').notNull(),
    taxId: text('tax_id'),
    paymentTerms: integer('payment_terms').default(30), // net 30, etc.
    accountManagerId: uuid('account_manager_id').references(() => users.id),
    tier: text('tier').default('standard'), // standard, premium, enterprise
    settings: jsonb('settings').default(sql`'{}'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table: any) => ({
    companyNameIdx: index('idx_enterprise_clients_company_name').on(table.companyName),
    industryIdx: index('idx_enterprise_clients_industry').on(table.industry),
  })
);

// Job templates for recurring work
export const jobTemplates = pgTable(
  'job_templates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    enterpriseId: uuid('enterprise_id').references(() => enterpriseClients.id, { onDelete: 'cascade' }).notNull(),
    name: text('name').notNull(),
    description: text('description'),
    jobDefaults: jsonb('job_defaults').notNull(),
    locations: jsonb('locations').default(sql`'[]'::jsonb`).notNull(),
    scheduleTemplate: jsonb('schedule_template').notNull(),
    autoPublish: boolean('auto_publish').default(true),
    workerPoolId: uuid('worker_pool_id').references(() => workerPools.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table: any) => ({
    enterpriseIdIdx: index('idx_job_templates_enterprise_id').on(table.enterpriseId),
    nameIdx: index('idx_job_templates_name').on(table.name),
  })
);

// Preferred worker pools for enterprise clients
export const workerPools = pgTable(
  'worker_pools',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    enterpriseId: uuid('enterprise_id').references(() => enterpriseClients.id, { onDelete: 'cascade' }).notNull(),
    name: text('name').notNull(),
    description: text('description'),
    criteria: jsonb('criteria').notNull(), // skills, ratings, background check status
    workerIds: uuid('worker_ids').array().default(sql`'{}'::uuid[]`),
    autoInvite: boolean('auto_invite').default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table: any) => ({
    enterpriseIdIdx: index('idx_worker_pools_enterprise_id').on(table.enterpriseId),
  })
);

// Bulk job operations tracking
export const bulkJobOperations = pgTable(
  'bulk_job_operations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    enterpriseId: uuid('enterprise_id').references(() => enterpriseClients.id, { onDelete: 'cascade' }),
    operationType: text('operation_type').notNull(), // 'create', 'update', 'cancel'
    totalJobs: integer('total_jobs').notNull(),
    successfulJobs: integer('successful_jobs').default(0),
    failedJobs: integer('failed_jobs').default(0),
    status: text('status').default('pending'), // pending, processing, completed, failed
    errorDetails: jsonb('error_details').default(sql`'{}'::jsonb`),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    startedAt: timestamp('started_at', { withTimezone: true }).defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table: any) => ({
    enterpriseIdIdx: index('idx_bulk_job_operations_enterprise_id').on(table.enterpriseId),
    statusIdx: index('idx_bulk_job_operations_status').on(table.status),
    operationTypeIdx: index('idx_bulk_job_operations_operation_type').on(table.operationType),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const usersRelations = relations(users,
  ({ one, many }: any) => ({
    workerProfile: one(workerProfiles, {
      fields: [users.id],
      references: [workerProfiles.userId],
    }),
    postedJobs: many(jobs, { relationName: 'poster' }),
    assignedJobs: many(jobs, { relationName: 'worker' }),
    applications: many(applications),
    paymentsAsPoster: many(payments, { relationName: 'poster' }),
    paymentsAsWorker: many(payments, { relationName: 'worker' }),
    notifications: many(notifications),
  })
);

export const workerProfilesRelations = relations(workerProfiles,
  ({ one }: any) => ({
    user: one(users, {
      fields: [workerProfiles.userId],
      references: [users.id],
    }),
  })
);

export const jobsRelations = relations(jobs,
  ({ one, many }: any) => ({
    poster: one(users, {
      fields: [jobs.posterId],
      references: [users.id],
      relationName: 'poster',
    }),
    worker: one(users, {
      fields: [jobs.workerId],
      references: [users.id],
      relationName: 'worker',
    }),
    enterprise: one(enterpriseClients, {
      fields: [jobs.enterpriseId],
      references: [enterpriseClients.id],
    }),
    applications: many(applications),
    payments: many(payments),
  })
);

export const applicationsRelations = relations(applications,
  ({ one }: any) => ({
    job: one(jobs, {
      fields: [applications.jobId],
      references: [jobs.id],
    }),
    worker: one(users, {
      fields: [applications.workerId],
      references: [users.id],
    }),
  })
);

export const paymentsRelations = relations(payments,
  ({ one }: any) => ({
    job: one(jobs, {
      fields: [payments.jobId],
      references: [jobs.id],
    }),
    poster: one(users, {
      fields: [payments.posterId],
      references: [users.id],
      relationName: 'poster',
    }),
    worker: one(users, {
      fields: [payments.workerId],
      references: [users.id],
      relationName: 'worker',
    }),
  })
);

export const notificationsRelations = relations(notifications,
  ({ one }: any) => ({
    user: one(users, {
      fields: [notifications.userId],
      references: [users.id],
    }),
  })
);

export const enterpriseClientsRelations = relations(enterpriseClients,
  ({ one, many }: any) => ({
    accountManager: one(users, {
      fields: [enterpriseClients.accountManagerId],
      references: [users.id],
    }),
    jobTemplates: many(jobTemplates),
    workerPools: many(workerPools),
    bulkJobOperations: many(bulkJobOperations),
  })
);

export const jobTemplatesRelations = relations(jobTemplates,
  ({ one }: any) => ({
    enterprise: one(enterpriseClients, {
      fields: [jobTemplates.enterpriseId],
      references: [enterpriseClients.id],
    }),
    workerPool: one(workerPools, {
      fields: [jobTemplates.workerPoolId],
      references: [workerPools.id],
    }),
  })
);

export const workerPoolsRelations = relations(workerPools,
  ({ one }: any) => ({
    enterprise: one(enterpriseClients, {
      fields: [workerPools.enterpriseId],
      references: [enterpriseClients.id],
    }),
  })
);

export const bulkJobOperationsRelations = relations(bulkJobOperations,
  ({ one }: any) => ({
    enterprise: one(enterpriseClients, {
      fields: [bulkJobOperations.enterpriseId],
      references: [enterpriseClients.id],
    }),
    createdBy: one(users, {
      fields: [bulkJobOperations.createdBy],
      references: [users.id],
    }),
  })
);

// ============================================================================
// ZOD SCHEMAS FOR VALIDATION
// ============================================================================

// User schemas
export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email(),
  fullName: z.string().min(1).max(100),
  phone: z.string().regex(/^\+?[\d\s\-\(\)]+$/).optional(),
});

export const selectUserSchema = createSelectSchema(users);

// Worker profile schemas
export const insertWorkerProfileSchema = createInsertSchema(workerProfiles, {
  bio: z.string().max(1000).optional(),
  skills: z.array(z.string()).max(20).optional(),
  hourlyRate: z.number().min(0).max(1000).optional(),
  serviceRadiusKm: z.number().min(1).max(100).optional(),
  locationLat: z.number().min(-90).max(90).optional(),
  locationLng: z.number().min(-180).max(180).optional(),
  availabilitySchedule: z.record(z.any()).optional(),
});

export const selectWorkerProfileSchema = createSelectSchema(workerProfiles);

// Job schemas
export const insertJobSchema = createInsertSchema(jobs, {
  title: z.string().min(5).max(100),
  description: z.string().min(20).max(2000),
  category: z.string().min(1),
  locationAddress: z.string().min(1),
  locationLat: z.number().min(-90).max(90),
  locationLng: z.number().min(-180).max(180),
  price: z.number().min(0),
  requiredSkills: z.array(z.string()).max(10).optional(),
  estimatedDurationHours: z.number().min(1).max(168).optional(), // Max 1 week
});

export const selectJobSchema = createSelectSchema(jobs);

// Application schemas
export const insertApplicationSchema = createInsertSchema(applications, {
  message: z.string().max(1000).optional(),
  proposedPrice: z.number().min(0).optional(),
  estimatedCompletionTime: z.number().min(1).max(168).optional(),
});

export const selectApplicationSchema = createSelectSchema(applications);

// Payment schemas
export const insertPaymentSchema = createInsertSchema(payments, {
  amount: z.number().min(0.5),
  platformFee: z.number().min(0),
  workerAmount: z.number().min(0),
});

export const selectPaymentSchema = createSelectSchema(payments);

// Notification schemas
export const insertNotificationSchema = createInsertSchema(notifications, {
  title: z.string().min(1).max(100),
  message: z.string().min(1).max(500),
  data: z.record(z.any()).optional(),
});

export const selectNotificationSchema = createSelectSchema(notifications);

// Enterprise schemas
export const insertEnterpriseClientSchema = createInsertSchema(enterpriseClients, {
  companyName: z.string().min(1).max(255),
  industry: z.string().min(1).max(255),
  contactEmail: z.string().email(),
  contactPhone: z.string().regex(/^\+?[\d\s\-\(\)]+$/),
  billingAddress: z.record(z.any()),
  taxId: z.string().max(50).optional(),
  paymentTerms: z.number().min(1).max(365).optional(),
  accountManagerId: z.string().uuid().optional(),
  tier: z.enum(['standard', 'premium', 'enterprise']).optional(),
  settings: z.record(z.any()).optional(),
});

export const selectEnterpriseClientSchema = createSelectSchema(enterpriseClients);

export const insertJobTemplateSchema = createInsertSchema(jobTemplates, {
  enterpriseId: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  jobDefaults: z.record(z.any()),
  locations: z.array(z.record(z.any())),
  scheduleTemplate: z.record(z.any()),
  autoPublish: z.boolean().optional(),
  workerPoolId: z.string().uuid().optional(),
});

export const selectJobTemplateSchema = createSelectSchema(jobTemplates);

export const insertWorkerPoolSchema = createInsertSchema(workerPools, {
  enterpriseId: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  criteria: z.record(z.any()),
  workerIds: z.array(z.string().uuid()).optional(),
  autoInvite: z.boolean().optional(),
});

export const selectWorkerPoolSchema = createSelectSchema(workerPools);

export const insertBulkJobOperationSchema = createInsertSchema(bulkJobOperations, {
  enterpriseId: z.string().uuid().optional(),
  operationType: z.enum(['create', 'update', 'cancel']),
  totalJobs: z.number().min(1),
  successfulJobs: z.number().optional(),
  failedJobs: z.number().optional(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
  errorDetails: z.record(z.any()).optional(),
  createdBy: z.string().uuid().optional(),
});

export const selectBulkJobOperationSchema = createSelectSchema(bulkJobOperations);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type WorkerProfile = typeof workerProfiles.$inferSelect;
export type NewWorkerProfile = typeof workerProfiles.$inferInsert;

export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;

export type Application = typeof applications.$inferSelect;
export type NewApplication = typeof applications.$inferInsert;

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

export type EnterpriseClient = typeof enterpriseClients.$inferSelect;
export type NewEnterpriseClient = typeof enterpriseClients.$inferInsert;

export type JobTemplate = typeof jobTemplates.$inferSelect;
export type NewJobTemplate = typeof jobTemplates.$inferInsert;

export type WorkerPool = typeof workerPools.$inferSelect;
export type NewWorkerPool = typeof workerPools.$inferInsert;

export type BulkJobOperation = typeof bulkJobOperations.$inferSelect;
export type NewBulkJobOperation = typeof bulkJobOperations.$inferInsert;


