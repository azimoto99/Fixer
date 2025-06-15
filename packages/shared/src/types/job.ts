import { LocationData, User } from './user';

export interface Job {
  id: string;
  posterId: string;
  title: string;
  description: string;
  category: JobCategory;
  subcategory?: string;
  location: LocationData;
  jobType: JobType;
  urgency: JobUrgency;
  estimatedDuration: string;
  budget: JobBudget;
  requiredSkills: string[];
  images?: string[];
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  scheduledFor?: string;
  completedAt?: string;
  poster?: User;
  assignedWorker?: User;
  applicationsCount?: number;
}

export interface JobBudget {
  type: 'fixed' | 'hourly' | 'negotiable';
  amount?: number;
  minAmount?: number;
  maxAmount?: number;
  currency: string;
}

export type JobCategory = 
  | 'home_repair'
  | 'cleaning'
  | 'moving'
  | 'delivery'
  | 'assembly'
  | 'gardening'
  | 'painting'
  | 'electrical'
  | 'plumbing'
  | 'handyman'
  | 'tech_support'
  | 'tutoring'
  | 'pet_care'
  | 'event_help'
  | 'other';

export type JobType = 'one_time' | 'recurring' | 'project';

export type JobUrgency = 'low' | 'medium' | 'high' | 'urgent';

export type JobStatus = 
  | 'draft'
  | 'open'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'disputed';

export interface JobApplication {
  id: string;
  jobId: string;
  workerId: string;
  message: string;
  proposedRate?: number;
  estimatedDuration?: string;
  availableFrom: string;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
  job?: Job;
  worker?: User;
}

export type ApplicationStatus = 
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'withdrawn';

export interface JobCreateRequest {
  title: string;
  description: string;
  category: JobCategory;
  subcategory?: string;
  location: LocationData;
  jobType: JobType;
  urgency: JobUrgency;
  estimatedDuration: string;
  budget: JobBudget;
  requiredSkills: string[];
  images?: string[];
  scheduledFor?: string;
}

export interface JobUpdateRequest {
  title?: string;
  description?: string;
  category?: JobCategory;
  subcategory?: string;
  location?: LocationData;
  jobType?: JobType;
  urgency?: JobUrgency;
  estimatedDuration?: string;
  budget?: JobBudget;
  requiredSkills?: string[];
  images?: string[];
  scheduledFor?: string;
  status?: JobStatus;
}

export interface JobSearchFilters {
  category?: JobCategory;
  location?: {
    latitude: number;
    longitude: number;
    radius: number; // in miles
  };
  budgetMin?: number;
  budgetMax?: number;
  jobType?: JobType;
  urgency?: JobUrgency;
  skills?: string[];
  datePosted?: 'today' | 'week' | 'month';
}

export interface JobSearchRequest {
  query?: string;
  filters?: JobSearchFilters;
  page?: number;
  limit?: number;
  sortBy?: 'date' | 'budget' | 'distance' | 'urgency';
  sortOrder?: 'asc' | 'desc';
}
