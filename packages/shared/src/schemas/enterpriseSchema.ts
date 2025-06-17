import { z } from 'zod';

// Bulk job import schema
export const bulkJobSchema = z.object({
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
      daysOfWeek: z.array(z.number().min(0).max(6)).optional() // 0 for Sunday, 6 for Saturday
    }),
    requirements: z.array(z.string()).default([]),
    urgency: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
    workerCount: z.number().min(1).max(50).default(1),
    estimatedDuration: z.number().positive(), // in hours
    clientNotes: z.string().optional(),
    backgroundCheckRequired: z.boolean().default(false),
    equipmentProvided: z.boolean().default(false),
    parkingAvailable: z.boolean().default(false)
  }))
});

export type BulkJobData = z.infer<typeof bulkJobSchema>;
export type SingleJobData = BulkJobData['jobs'][number];

// Job template schema for enterprise clients
export const jobTemplateSchema = z.object({
  id: z.string().uuid(),
  enterpriseId: z.string().uuid(),
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
    name: z.string(), // "Downtown Office", "Warehouse #3"
    address: z.string(),
    coordinates: z.object({ lat: z.number(), lng: z.number() }),
    accessInstructions: z.string().optional(),
    contactPerson: z.string().optional(),
    contactPhone: z.string().optional()
  })),
  scheduleTemplate: z.object({
    frequency: z.enum(['daily', 'weekly', 'monthly']),
    daysOfWeek: z.array(z.number().min(0).max(6)).optional(), // 0 for Sunday, 6 for Saturday
    timeSlots: z.array(z.object({
      startTime: z.string(), // "09:00"
      endTime: z.string(),   // "17:00"
      duration: z.number()   // hours
    }))
  }),
  autoPublish: z.boolean().default(true),
  workerPoolId: z.string().uuid().optional() // preferred workers
});

export type JobTemplateData = z.infer<typeof jobTemplateSchema>;

// Worker pool criteria configuration
export const workerPoolCriteriaSchema = z.object({
  minimumRating: z.number().min(1).max(5).default(4),
  requiredSkills: z.array(z.string()),
  backgroundCheckRequired: z.boolean().default(false),
  experienceLevel: z.enum(['entry', 'intermediate', 'expert']),
  maxDistanceFromJobs: z.number().positive().default(25), // miles
  availability: z.object({
    daysOfWeek: z.array(z.number().min(0).max(6)), // 0 for Sunday, 6 for Saturday
    timeSlots: z.array(z.object({
      start: z.string(), // "HH:mm"
      end: z.string()    // "HH:mm"
    }))
  }),
  autoInviteToJobs: z.boolean().default(false)
});

export type WorkerPoolCriteriaData = z.infer<typeof workerPoolCriteriaSchema>;

// Government compliance requirements
export const governmentComplianceSchema = z.object({
  contractNumber: z.string().optional(),
  budgetCode: z.string().optional(),
  departmentApproval: z.boolean().default(false),
  prevailingWageRequired: z.boolean().default(false),
  unionRequirements: z.string().optional(),
  securityClearanceLevel: z.enum(['none', 'basic', 'secret', 'top-secret']).default('none'),
  citizenshipRequired: z.boolean().default(false),
  bondingRequired: z.boolean().default(false),
  insuranceMinimum: z.number().optional(),
  reportingRequirements: z.array(z.string()).default([])
});

export type GovernmentComplianceData = z.infer<typeof governmentComplianceSchema>;
