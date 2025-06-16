export interface EnterpriseClient {
  id: string;
  companyName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  industry: string;
  logo?: string;
  description?: string;
  website?: string;
  taxId?: string;
  billingAddress?: string;
  settings: {
    autoApprove: boolean;
    requireBackgroundCheck: boolean;
    complianceLevel: 'basic' | 'standard' | 'premium';
    preferredPaymentTerms: 'immediate' | 'net_15' | 'net_30';
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface JobTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  defaultDuration: number;
  defaultBudget: number;
  requiredSkills: string[];
  template: {
    title: string;
    description: string;
    requirements: string[];
    deliverables: string[];
    timeline: string;
  };
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkerPool {
  id: string;
  name: string;
  description: string;
  skills: string[];
  experienceLevel: 'entry' | 'intermediate' | 'senior' | 'expert';
  location?: {
    city: string;
    state: string;
    radius: number;
  };
  workerIds: string[];
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BulkJobOperation {
  id: string;
  type: 'import' | 'export' | 'update' | 'delete';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalJobs: number;
  processedJobs: number;
  failedJobs: number;
  errors: Array<{
    row: number;
    field: string;
    message: string;
  }>;
  metadata: {
    filename?: string;
    source: string;
    template?: string;
  };
  startedAt: Date;
  completedAt?: Date;
  createdBy: string;
}
