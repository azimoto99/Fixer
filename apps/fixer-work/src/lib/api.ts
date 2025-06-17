const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';
const USE_MOCK_DATA = !import.meta.env.VITE_API_URL; // Use mock data when no API URL is configured

// Mock data for development
const MOCK_JOBS = [
  {
    id: '1',
    title: 'House Cleaning Service',
    description: 'Need a thorough cleaning of a 3-bedroom house. All supplies provided.',
    category: 'cleaning',
    status: 'active',
    location: {
      address: '123 Main St, Seattle, WA 98101',
      city: 'Seattle',
      state: 'WA',
      latitude: 47.6062,
      longitude: -122.3321,
    },
    payRate: {
      type: 'hourly',
      amount: 25,
      currency: 'USD',
    },
    estimatedDuration: 4,
    urgency: 'medium',
    requirements: ['Experience with residential cleaning', 'Own transportation'],
    postedAt: '2024-01-15T10:00:00Z',
    startsAt: '2024-01-20T09:00:00Z',
    applicationCount: 5,
    poster: {
      id: 'poster1',
      firstName: 'Sarah',
      lastName: 'Johnson',
      rating: 4.8,
    },
  },
  {
    id: '2',
    title: 'Furniture Assembly',
    description: 'Need help assembling IKEA furniture for a new apartment. About 6 pieces.',
    category: 'maintenance',
    status: 'active',
    location: {
      address: '456 Pine Ave, Seattle, WA 98102',
      city: 'Seattle',
      state: 'WA',
      latitude: 47.6205,
      longitude: -122.3493,
    },
    payRate: {
      type: 'fixed',
      amount: 150,
      currency: 'USD',
    },
    estimatedDuration: 3,
    urgency: 'high',
    requirements: ['Experience with furniture assembly', 'Own tools'],
    postedAt: '2024-01-14T14:30:00Z',
    startsAt: '2024-01-18T10:00:00Z',
    applicationCount: 3,
    poster: {
      id: 'poster2',
      firstName: 'Mike',
      lastName: 'Chen',
      rating: 4.9,
    },
  },
  {
    id: '3',
    title: 'Garden Maintenance',
    description: 'Weekly garden maintenance including pruning, weeding, and watering.',
    category: 'landscaping',
    status: 'active',
    location: {
      address: '789 Oak Dr, Bellevue, WA 98004',
      city: 'Bellevue',
      state: 'WA',
      latitude: 47.6101,
      longitude: -122.2015,
    },
    payRate: {
      type: 'hourly',
      amount: 20,
      currency: 'USD',
    },
    estimatedDuration: 2,
    urgency: 'low',
    requirements: ['Basic gardening knowledge', 'Reliable schedule'],
    postedAt: '2024-01-13T08:00:00Z',
    startsAt: '2024-01-19T08:00:00Z',
    applicationCount: 8,
    poster: {
      id: 'poster3',
      firstName: 'Lisa',
      lastName: 'Williams',
      rating: 4.7,
    },
  },
];

// API endpoints for the fixer-work app
const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
  },
  JOBS: {
    LIST: '/jobs',
    SEARCH: '/jobs/search',
    NEARBY: '/jobs/nearby',
    DETAIL: '/jobs/:id',
    CREATE: '/jobs',
    APPLY: '/jobs/:id/applications',
  },
  APPLICATIONS: {
    LIST: '/applications',
    MY_APPLICATIONS: '/applications/my-applications',
    DETAIL: '/applications/:id',
    CREATE: '/applications',
    ACCEPT: '/applications/:id/accept',
    REJECT: '/applications/:id/reject',
    WITHDRAW: '/applications/:id/withdraw',
  },
  USERS: {
    PROFILE: '/users/profile',
    WORKER_PROFILE: '/users/worker-profile',
    UPDATE_PROFILE: '/users/profile',
  },
  STRIPE: {
    ONBOARD: '/stripe/onboard',
    REFRESH_STATUS: '/stripe/refresh-status',
  },
};

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('auth_token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      (headers as Record<string, string>).Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  // Auth methods
  async login(email: string, password: string) {
    return this.request(API_ENDPOINTS.AUTH.LOGIN, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(userData: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    role: 'worker' | 'poster';
  }) {
    return this.request(API_ENDPOINTS.AUTH.REGISTER, {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async logout() {
    const result = await this.request(API_ENDPOINTS.AUTH.LOGOUT, {
      method: 'POST',
    });
    localStorage.removeItem('auth_token');
    this.token = null;
    return result;
  }

  // Jobs methods
  async getJobs(params: {
    page?: number;
    limit?: number;
    category?: string;
    status?: string;
    minPrice?: number;
    maxPrice?: number;
    lat?: number;
    lng?: number;
    radius?: number;
    skills?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  } = {}) {
    // Use mock data when API is not configured
    if (USE_MOCK_DATA) {
      // Simple filtering for mock data
      let filteredJobs = [...MOCK_JOBS];
      
      if (params.category) {
        filteredJobs = filteredJobs.filter(job => job.category === params.category);
      }
      
      if (params.search) {
        const searchTerm = params.search.toLowerCase();
        filteredJobs = filteredJobs.filter(job => 
          job.title.toLowerCase().includes(searchTerm) ||
          job.description.toLowerCase().includes(searchTerm)
        );
      }

      // Simulate API response structure
      return Promise.resolve({
        success: true,
        data: filteredJobs,
        meta: {
          page: params.page || 1,
          limit: params.limit || 20,
          totalCount: filteredJobs.length,
          totalPages: Math.ceil(filteredJobs.length / (params.limit || 20)),
        }
      });
    }

    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value.toString());
      }
    });

    return this.request(`${API_ENDPOINTS.JOBS.LIST}?${searchParams.toString()}`);
  }

  async getJob(id: string) {
    // Use mock data when API is not configured
    if (USE_MOCK_DATA) {
      const job = MOCK_JOBS.find(j => j.id === id);
      if (job) {
        return Promise.resolve({
          success: true,
          data: job
        });
      } else {
        return Promise.resolve({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Job not found'
          }
        });
      }
    }

    return this.request(API_ENDPOINTS.JOBS.DETAIL.replace(':id', id));
  }

  async createJob(jobData: any) {
    return this.request(API_ENDPOINTS.JOBS.CREATE, {
      method: 'POST',
      body: JSON.stringify(jobData),
    });
  }

  // Applications methods
  async getApplications(params: {
    page?: number;
    limit?: number;
    status?: string;
    jobId?: string;
    role?: 'worker' | 'poster';
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value.toString());
      }
    });

    return this.request(`${API_ENDPOINTS.APPLICATIONS.LIST}?${searchParams.toString()}`);
  }

  async createApplication(applicationData: {
    jobId: string;
    message: string;
    proposedPrice?: number;
    estimatedCompletionTime?: number;
  }) {
    return this.request(API_ENDPOINTS.APPLICATIONS.CREATE, {
      method: 'POST',
      body: JSON.stringify(applicationData),
    });
  }

  async acceptApplication(id: string) {
    return this.request(API_ENDPOINTS.APPLICATIONS.ACCEPT.replace(':id', id), {
      method: 'PUT',
    });
  }

  async rejectApplication(id: string) {
    return this.request(API_ENDPOINTS.APPLICATIONS.REJECT.replace(':id', id), {
      method: 'PUT',
    });
  }

  async withdrawApplication(id: string) {
    return this.request(API_ENDPOINTS.APPLICATIONS.WITHDRAW.replace(':id', id), {
      method: 'PUT',
    });
  }

  // User profile methods
  async getUserProfile() {
    return this.request(API_ENDPOINTS.USERS.PROFILE);
  }

  async updateUserProfile(profileData: any) {
    return this.request(API_ENDPOINTS.USERS.UPDATE_PROFILE, {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  async createWorkerProfile(profileData: {
    bio?: string;
    skills?: string[];
    hourlyRate?: number;
    serviceRadiusKm?: number;
    locationLat?: number;
    locationLng?: number;
    availabilitySchedule?: any;
    isAvailable?: boolean;
  }) {
    return this.request('/users/worker-profile', {
      method: 'POST',
      body: JSON.stringify(profileData),
    });
  }

  // Set auth token
  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  // Clear auth token
  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  async refreshStripeStatus() {
    return this.request(API_ENDPOINTS.STRIPE.REFRESH_STATUS, {
      method: 'POST',
    });
  }

  async createStripeOnboardingLink() {
    return this.request(API_ENDPOINTS.STRIPE.ONBOARD, {
      method: 'POST',
    });
  }
}

export const api = new ApiClient(API_BASE_URL);
export type { ApiResponse };
