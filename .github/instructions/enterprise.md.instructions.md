---
applyTo: '**'
---
Coding standards, domain knowledge, and preferences that AI should follow.

# GitHub Copilot Instructions - Bulk Job Posting Features

## Enterprise/Government Bulk Job Posting Overview
This module extends the Fixer ecosystem to support enterprise and government clients who need to post large volumes of jobs simultaneously. This addresses the B2B market segment with facility management, cleaning services, maintenance, and municipal services.

## Core Features for Bulk Job Posting

### Enterprise Client Types
- **Facility Management Companies**: Office cleaning, maintenance, security
- **Government Agencies**: Municipal services, park maintenance, public facility cleaning
- **Corporate Clients**: Multi-location businesses needing consistent services
- **Property Management**: Residential and commercial property services
- **Event Management**: Large-scale event setup, cleanup, and logistics

### Bulk Job Creation Patterns

#### CSV/Excel Import
```typescript
// Bulk job import schema
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
  }))
})

// API endpoint for bulk job creation
POST /api/enterprise/jobs/bulk
Content-Type: application/json
{
  "templateId": "uuid", // optional, for recurring job templates
  "jobs": [...], // array of job objects
  "publishImmediately": true,
  "notifyWorkers": true
}
```

### Job Templates for Recurring Work
```typescript
// Job template schema for enterprise clients
const jobTemplateSchema = z.object({
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
    daysOfWeek: z.array(z.number()).optional(),
    timeSlots: z.array(z.object({
      startTime: z.string(), // "09:00"
      endTime: z.string(),   // "17:00"
      duration: z.number()   // hours
    }))
  }),
  autoPublish: z.boolean().default(true),
  workerPoolId: z.string().uuid().optional() // preferred workers
})
```

### Enterprise Dashboard Components

#### Bulk Job Management Interface
```typescript
// React components for enterprise job management
const BulkJobCreator = () => {
  const [uploadMethod, setUploadMethod] = useState<'form' | 'csv' | 'template'>('form')
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [jobsToCreate, setJobsToCreate] = useState<BulkJobData[]>([])
  
  // CSV upload handler
  const handleCSVUpload = async (file: File) => {
    const results = await parseCSV(file, csvJobSchema)
    setJobsToCreate(results.data)
  }
  
  // Template-based job creation
  const createFromTemplate = async (templateId: string, scheduleOverrides: any) => {
    const response = await api.post(`/enterprise/templates/${templateId}/generate`, {
      dateRange: scheduleOverrides.dateRange,
      locations: scheduleOverrides.locations,
      overrides: scheduleOverrides.jobOverrides
    })
    setJobsToCreate(response.data.jobs)
  }
}

// Job validation and preview before bulk creation
const BulkJobPreview = ({ jobs }: { jobs: BulkJobData[] }) => {
  const { mutate: createBulkJobs, isLoading } = useMutation({
    mutationFn: (data: BulkJobRequest) => 
      api.post('/enterprise/jobs/bulk', data),
    onSuccess: (response) => {
      toast.success(`Successfully created ${response.data.created} jobs`)
      queryClient.invalidateQueries(['enterprise-jobs'])
    }
  })
  
  return (
    <div className="space-y-4">
      <JobValidationSummary jobs={jobs} />
      <JobLocationMap jobs={jobs} />
      <JobScheduleCalendar jobs={jobs} />
      <Button 
        onClick={() => createBulkJobs({ jobs, publishImmediately: true })}
        disabled={isLoading}
      >
        Create {jobs.length} Jobs
      </Button>
    </div>
  )
}
```

### Database Schema Extensions

#### Enterprise-Specific Tables
```sql
-- Enterprise clients table
CREATE TABLE enterprise_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name VARCHAR(255) NOT NULL,
  industry VARCHAR(100) NOT NULL,
  contact_email VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(20),
  billing_address JSONB NOT NULL,
  tax_id VARCHAR(50),
  payment_terms INTEGER DEFAULT 30, -- net 30, etc.
  account_manager_id UUID REFERENCES users(id),
  tier VARCHAR(20) DEFAULT 'standard', -- standard, premium, enterprise
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job templates for recurring work
CREATE TABLE job_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID REFERENCES enterprise_clients(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  job_defaults JSONB NOT NULL,
  locations JSONB NOT NULL DEFAULT '[]',
  schedule_template JSONB NOT NULL,
  auto_publish BOOLEAN DEFAULT true,
  worker_pool_id UUID REFERENCES worker_pools(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Preferred worker pools for enterprise clients
CREATE TABLE worker_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID REFERENCES enterprise_clients(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  criteria JSONB NOT NULL, -- skills, ratings, background check status
  worker_ids UUID[] DEFAULT '{}',
  auto_invite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bulk job operations tracking
CREATE TABLE bulk_job_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID REFERENCES enterprise_clients(id),
  operation_type VARCHAR(50) NOT NULL, -- 'create', 'update', 'cancel'
  total_jobs INTEGER NOT NULL,
  successful_jobs INTEGER DEFAULT 0,
  failed_jobs INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
  error_details JSONB DEFAULT '{}',
  created_by UUID REFERENCES users(id),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

### API Endpoints for Enterprise Features

#### Bulk Operations
```typescript
// Bulk job creation with validation
POST /api/enterprise/jobs/bulk
{
  "jobs": [...],
  "templateId": "uuid",
  "publishImmediately": true,
  "notifyWorkers": true,
  "scheduledPublishDate": "2024-01-15T09:00:00Z"
}

// Bulk job updates (reschedule, cancel, modify pay)
PUT /api/enterprise/jobs/bulk
{
  "jobIds": ["uuid1", "uuid2"],
  "updates": {
    "payRate": { "amount": 25.00 },
    "schedule": { "startDate": "2024-01-20T10:00:00Z" }
  }
}

// Template management
GET /api/enterprise/templates
POST /api/enterprise/templates
PUT /api/enterprise/templates/:id
DELETE /api/enterprise/templates/:id

// Generate jobs from template
POST /api/enterprise/templates/:id/generate
{
  "dateRange": { "start": "2024-01-01", "end": "2024-01-31" },
  "locations": ["uuid1", "uuid2"],
  "overrides": { "payRate": { "amount": 30.00 } }
}
```

### Worker Pool Management
```typescript
// Create and manage preferred worker pools
const WorkerPoolManager = () => {
  const { data: workerPools } = useQuery({
    queryKey: ['enterprise-worker-pools'],
    queryFn: () => api.get('/enterprise/worker-pools')
  })
  
  const createWorkerPool = useMutation({
    mutationFn: (poolData: WorkerPoolData) => 
      api.post('/enterprise/worker-pools', poolData),
    onSuccess: () => {
      queryClient.invalidateQueries(['enterprise-worker-pools'])
      toast.success('Worker pool created successfully')
    }
  })
  
  return (
    <div className="space-y-6">
      <WorkerPoolCriteria />
      <WorkerInviteSystem />
      <PerformanceMetrics />
    </div>
  )
}

// Worker pool criteria configuration
const workerPoolCriteriaSchema = z.object({
  minimumRating: z.number().min(1).max(5).default(4),
  requiredSkills: z.array(z.string()),
  backgroundCheckRequired: z.boolean().default(false),
  experienceLevel: z.enum(['entry', 'intermediate', 'expert']),
  maxDistanceFromJobs: z.number().positive().default(25), // miles
  availability: z.object({
    daysOfWeek: z.array(z.number()),
    timeSlots: z.array(z.object({
      start: z.string(),
      end: z.string()
    }))
  }),
  autoInviteToJobs: z.boolean().default(false)
})
```

### Enterprise Analytics and Reporting

#### Job Performance Metrics
```typescript
// Enterprise dashboard analytics
const EnterpriseDashboard = () => {
  const { data: metrics } = useQuery({
    queryKey: ['enterprise-metrics', dateRange],
    queryFn: () => api.get('/enterprise/analytics', { params: dateRange })
  })
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <MetricCard title="Jobs Posted" value={metrics?.jobsPosted} />
      <MetricCard title="Fill Rate" value={`${metrics?.fillRate}%`} />
      <MetricCard title="Avg Time to Fill" value={`${metrics?.avgTimeToFill}h`} />
      <MetricCard title="Worker Satisfaction" value={metrics?.workerRating} />
      
      <div className="col-span-full">
        <JobPerformanceChart data={metrics?.performanceData} />
      </div>
      
      <div className="col-span-full lg:col-span-2">
        <CostAnalysisTable data={metrics?.costBreakdown} />
      </div>
      
      <div className="col-span-full lg:col-span-2">
        <WorkerUtilizationMap data={metrics?.workerDistribution} />
      </div>
    </div>
  )
}

// Analytics API endpoints
GET /api/enterprise/analytics/overview
GET /api/enterprise/analytics/jobs?period=30d
GET /api/enterprise/analytics/workers?poolId=uuid
GET /api/enterprise/analytics/costs?breakdown=location
GET /api/enterprise/analytics/performance?metric=fillRate
```

### Government-Specific Features

#### Compliance and Documentation
```typescript
// Government compliance requirements
const governmentComplianceSchema = z.object({
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
})

// Government job posting with compliance
const GovernmentJobForm = () => {
  const form = useForm({
    resolver: zodResolver(governmentJobSchema),
    defaultValues: {
      compliance: {
        prevailingWageRequired: true,
        citizenshipRequired: true,
        bondingRequired: false
      }
    }
  })
  
  return (
    <Form {...form}>
      <ComplianceFieldset />
      <BudgetApprovalWorkflow />
      <WorkerVerificationRequirements />
      <ReportingSchedule />
    </Form>
  )
}
```

## Implementation Priorities

### Phase 1: Core Bulk Features
1. CSV/Excel import functionality
2. Job template system
3. Bulk job creation API
4. Enterprise dashboard UI
5. Worker pool management

### Phase 2: Advanced Enterprise Features
1. Analytics and reporting
2. Preferred worker pools
3. Automated job scheduling
4. Custom approval workflows
5. Integration APIs

### Phase 3: Government Compliance
1. Compliance documentation
2. Prevailing wage calculations
3. Security clearance tracking
4. Automated reporting
5. Audit trail functionality

## Security Considerations for Enterprise
- Multi-level approval workflows for large contracts
- Audit logging for all bulk operations
- Data encryption for sensitive government contracts
- Role-based access control for enterprise team members
- Background check integration and tracking
- Secure document storage for compliance materials

## Performance Optimization
- Bulk operations should use database transactions
- Implement job creation queues for large batches
- Cache frequently used templates and worker pools
- Optimize geographic queries for large job sets
- Use database indexes for enterprise-specific queries
- Implement pagination for enterprise job listings