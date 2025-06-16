export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

// API endpoints for the fixer-post app
const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
  },
  JOBS: {
    MY_JOBS: '/jobs/my-jobs',
    DETAIL: '/jobs/:id',
    CREATE: '/jobs',
    UPDATE: '/jobs/:id',
    DELETE: '/jobs/:id',
    APPLICATIONS: '/jobs/:id/applications',
  },
  APPLICATIONS: {
    ACCEPT: '/applications/:id/accept',
    REJECT: '/applications/:id/reject',
  },
  USERS: {
    PROFILE: '/users/profile',
    UPDATE_PROFILE: '/users/profile',
  },
  PAYMENTS: {
    CREATE_INTENT: '/payments/create-intent',
    CONFIRM: '/payments/confirm',
  },
};

export interface ApiResponse<T> {
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
  public token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: Omit<RequestInit, 'body'> & { responseType?: 'json' | 'blob'; body?: any } = {}
  ): Promise<ApiResponse<T> | Blob> {
    const url = `${this.baseURL}${endpoint}`;
    const { responseType = 'json', body: requestBody, ...fetchOptions } = options;

    const headers: Record<string, string> = {
      ...(fetchOptions.headers as Record<string, string>),
    };

    if (!(requestBody instanceof FormData) && requestBody) {
      headers['Content-Type'] = 'application/json';
    }

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    let bodyToSend: BodyInit | null | undefined;
    if (requestBody instanceof FormData || typeof requestBody === 'string') {
      bodyToSend = requestBody;
    } else if (requestBody) {
      bodyToSend = JSON.stringify(requestBody);
    } else {
      bodyToSend = undefined;
    }

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        body: bodyToSend,
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          throw new Error(response.statusText || `HTTP ${response.status}`);
        }
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      if (responseType === 'blob') {
        return response.blob();
      }

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const text = await response.text();
        if (!text) {
          return { success: true, data: undefined } as ApiResponse<T>;
        }
        return JSON.parse(text) as ApiResponse<T>;
      } else {
        // For non-JSON, non-blob successful responses (e.g. 204 No Content from a DELETE)
        return { success: true } as unknown as ApiResponse<T>;
      }

    } catch (error) {
      console.error('API Request failed:', endpoint, error);
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error(String(error));
      }
    }
  }

  // Auth methods
  async login(email: string, password: string): Promise<ApiResponse<{token: string, user: any}>> {
    const response = await this.request<{token: string, user: any}>(API_ENDPOINTS.AUTH.LOGIN, {
      method: 'POST',
      body: { email, password },
    });
    const apiResponse = response as ApiResponse<{token: string, user: any}>;
    if (apiResponse.data?.token) {
      this.setToken(apiResponse.data.token);
    }
    return apiResponse;
  }

  async register(userData: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    role: 'worker' | 'poster';
  }): Promise<ApiResponse<any>> {
    return this.request(API_ENDPOINTS.AUTH.REGISTER, {
      method: 'POST',
      body: userData,
    }) as Promise<ApiResponse<any>>;
  }

  async logout(): Promise<ApiResponse<any>> {
    const result = await this.request(API_ENDPOINTS.AUTH.LOGOUT, {
      method: 'POST',
    });
    this.clearToken();
    return result as ApiResponse<any>;
  }

  // Jobs methods
  async getMyJobs(params: {
    page?: number;
    limit?: number;
    status?: string;
  } = {}): Promise<ApiResponse<any[]>> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const endpoint = API_ENDPOINTS.JOBS.MY_JOBS + (searchParams.toString() ? `?${searchParams.toString()}` : '');
    return this.request(endpoint) as Promise<ApiResponse<any[]>>;
  }

  async getJob(id: string): Promise<ApiResponse<any>> {
    return this.request(API_ENDPOINTS.JOBS.DETAIL.replace(':id', id)) as Promise<ApiResponse<any>>;
  }

  async createJob(jobData: any): Promise<ApiResponse<any>> {
    return this.request(API_ENDPOINTS.JOBS.CREATE, {
      method: 'POST',
      body: jobData,
    }) as Promise<ApiResponse<any>>;
  }

  async updateJob(id: string, jobData: any): Promise<ApiResponse<any>> {
    return this.request(API_ENDPOINTS.JOBS.UPDATE.replace(':id', id), {
      method: 'PUT',
      body: jobData,
    }) as Promise<ApiResponse<any>>;
  }

  async deleteJob(id: string): Promise<ApiResponse<any>> {
    return this.request(API_ENDPOINTS.JOBS.DELETE.replace(':id', id), {
      method: 'DELETE',
    }) as Promise<ApiResponse<any>>;
  }

  // Job applications for posters
  async getJobApplications(jobId: string, params: {
    page?: number;
    limit?: number;
    status?: string;
  } = {}): Promise<ApiResponse<any[]>> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const endpoint = API_ENDPOINTS.JOBS.APPLICATIONS.replace(':id', jobId) + (searchParams.toString() ? `?${searchParams.toString()}` : '');
    return this.request(endpoint) as Promise<ApiResponse<any[]>>;
  }

  async acceptApplication(id: string): Promise<ApiResponse<any>> {
    return this.request(API_ENDPOINTS.APPLICATIONS.ACCEPT.replace(':id', id), {
      method: 'PUT',
    }) as Promise<ApiResponse<any>>;
  }

  async rejectApplication(id: string): Promise<ApiResponse<any>> {
    return this.request(API_ENDPOINTS.APPLICATIONS.REJECT.replace(':id', id), {
      method: 'PUT',
    }) as Promise<ApiResponse<any>>;
  }

  // User profile methods
  async getUserProfile(): Promise<ApiResponse<any>> {
    return this.request(API_ENDPOINTS.USERS.PROFILE) as Promise<ApiResponse<any>>;
  }

  async updateUserProfile(profileData: any): Promise<ApiResponse<any>> {
    return this.request(API_ENDPOINTS.USERS.UPDATE_PROFILE, {
      method: 'PUT',
      body: profileData,
    }) as Promise<ApiResponse<any>>;
  }

  // Payment methods
  async createPaymentIntent(jobId: string, amount: number, description?: string): Promise<ApiResponse<any>> {
    return this.request('/payments/create-intent', {
      method: 'POST',
      body: { jobId, amount, description },
    }) as Promise<ApiResponse<any>>;
  }

  async confirmPayment(paymentIntentId: string): Promise<ApiResponse<any>> {
    return this.request('/payments/confirm', {
      method: 'POST',
      body: { paymentIntentId },
    }) as Promise<ApiResponse<any>>;
  }

  // Generic HTTP methods
  async get<T>(endpoint: string, options?: Omit<RequestInit, 'body'> & { responseType?: 'json'; params?: Record<string, string | number | boolean | string[] | undefined> }): Promise<ApiResponse<T>>;
  async get(endpoint: string, options: Omit<RequestInit, 'body'> & { responseType: 'blob'; params?: Record<string, string | number | boolean | string[] | undefined> }): Promise<Blob>;
  async get<T>(endpoint: string, options?: Omit<RequestInit, 'body'> & { responseType?: 'json' | 'blob'; params?: Record<string, string | number | boolean | string[] | undefined> }): Promise<ApiResponse<T> | Blob> {
    let url = endpoint;
    if (options?.params) {
      const queryParams = new URLSearchParams();
      for (const [key, value] of Object.entries(options.params)) {
        if (Array.isArray(value)) {
          value.forEach(v => queryParams.append(key, String(v)));
        } else if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      }
      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
      }
    }
    // Remove params from options before passing to request to avoid it being stringified in body
    const { params, ...restOptions } = options || {};
    return this.request<T>(url, { method: 'GET', ...restOptions });
  }

  async post<T>(endpoint: string, data?: any, options?: Omit<RequestInit, 'body'> & { responseType?: 'json' }): Promise<ApiResponse<T>>;
  async post<T>(endpoint: string, data: FormData, options?: Omit<RequestInit, 'body'> & { responseType?: 'json' }): Promise<ApiResponse<T>>;
  async post<T>(endpoint: string, data?: any, options?: Omit<RequestInit, 'body'> & { responseType?: 'json' | 'blob' }): Promise<ApiResponse<T> | Blob> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data,
      ...options,
    });
  }

  async put<T>(endpoint: string, data?: any, options?: Omit<RequestInit, 'body'> & { responseType?: 'json' }): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data,
      ...options,
    }) as Promise<ApiResponse<T>>;
  }

  async delete<T>(endpoint: string, data?: any, options?: Omit<RequestInit, 'body'> & { responseType?: 'json' }): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      body: data, // DELETE requests can have a body, though often they don't or use query params
      ...options,
    }) as Promise<ApiResponse<T>>;
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }
}

export const api = new ApiClient(API_BASE_URL);
// export type { ApiResponse }; // Export if needed elsewhere
