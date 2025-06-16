import { API_ENDPOINTS } from '@fixer/shared';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

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
      headers.Authorization = `Bearer ${this.token}`;
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
  async getMyJobs(params: {
    page?: number;
    limit?: number;
    status?: string;
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value.toString());
      }
    });

    return this.request(`${API_ENDPOINTS.JOBS.MY_JOBS}?${searchParams.toString()}`);
  }

  async getJob(id: string) {
    return this.request(API_ENDPOINTS.JOBS.DETAIL.replace(':id', id));
  }

  async createJob(jobData: any) {
    return this.request(API_ENDPOINTS.JOBS.CREATE, {
      method: 'POST',
      body: JSON.stringify(jobData),
    });
  }

  async updateJob(id: string, jobData: any) {
    return this.request(API_ENDPOINTS.JOBS.UPDATE.replace(':id', id), {
      method: 'PUT',
      body: JSON.stringify(jobData),
    });
  }

  async deleteJob(id: string) {
    return this.request(API_ENDPOINTS.JOBS.DELETE.replace(':id', id), {
      method: 'DELETE',
    });
  }

  // Job applications for posters
  async getJobApplications(jobId: string, params: {
    page?: number;
    limit?: number;
    status?: string;
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value.toString());
      }
    });

    return this.request(`${API_ENDPOINTS.JOBS.APPLICATIONS.replace(':id', jobId)}?${searchParams.toString()}`);
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

  // Payment methods
  async createPaymentIntent(jobId: string, amount: number, description?: string) {
    return this.request('/payments/create-intent', {
      method: 'POST',
      body: JSON.stringify({ jobId, amount, description }),
    });
  }

  async confirmPayment(paymentIntentId: string) {
    return this.request('/payments/confirm', {
      method: 'POST',
      body: JSON.stringify({ paymentIntentId }),
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
}

export const api = new ApiClient(API_BASE_URL);
export type { ApiResponse };
