import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface AuthResponse {
  session?: {
    access_token: string;
  };
  user?: any;
}

interface ApiResponseWrapper<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// Generic hook to access specific API methods (avoid exposing private properties)
export function useApi() {
  return {
    // Generic HTTP methods
    get: api.get.bind(api),
    post: api.post.bind(api),
    put: api.put.bind(api),
    delete: api.delete.bind(api),
    // Auth methods
    login: api.login.bind(api),
    register: api.register.bind(api),
    logout: api.logout.bind(api),
    // Job methods
    getMyJobs: api.getMyJobs.bind(api),
    getJob: api.getJob.bind(api),
    createJob: api.createJob.bind(api),
    updateJob: api.updateJob.bind(api),
    deleteJob: api.deleteJob.bind(api),
    // Application methods
    getJobApplications: api.getJobApplications.bind(api),
    acceptApplication: api.acceptApplication.bind(api),
    rejectApplication: api.rejectApplication.bind(api),
    // Profile methods
    getUserProfile: api.getUserProfile.bind(api),
    updateUserProfile: api.updateUserProfile.bind(api),
    // Payment methods
    createPaymentIntent: api.createPaymentIntent.bind(api),
    confirmPayment: api.confirmPayment.bind(api),
    // Token methods
    setToken: api.setToken.bind(api),
    clearToken: api.clearToken.bind(api),
  };
}

// Jobs hooks for posters
export function useMyJobs(params: {
  page?: number;
  limit?: number;
  status?: string;
} = {}) {
  return useQuery({
    queryKey: ['my-jobs', params],
    queryFn: () => api.getMyJobs(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useJob(id: string) {
  return useQuery({
    queryKey: ['job', id],
    queryFn: () => api.getJob(id),
    enabled: !!id,
  });
}

export function useCreateJob() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: api.createJob.bind(api),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-jobs'] });
    },
  });
}

export function useUpdateJob() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, jobData }: { id: string; jobData: any }) =>
      api.updateJob(id, jobData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['job'] });
    },
  });
}

export function useDeleteJob() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: api.deleteJob.bind(api),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-jobs'] });
    },
  });
}

// Applications hooks for job posters
export function useJobApplications(jobId: string, params: {
  page?: number;
  limit?: number;
  status?: string;
} = {}) {
  return useQuery({
    queryKey: ['job-applications', jobId, params],
    queryFn: () => api.getJobApplications(jobId, params),
    enabled: !!jobId,
  });
}

export function useAcceptApplication() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: api.acceptApplication.bind(api),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-applications'] });
      queryClient.invalidateQueries({ queryKey: ['my-jobs'] });
    },
  });
}

export function useRejectApplication() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: api.rejectApplication.bind(api),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-applications'] });
    },
  });
}

// User profile hooks
export function useUserProfile() {
  return useQuery({
    queryKey: ['user-profile'],
    queryFn: () => api.getUserProfile(),
  });
}

export function useUpdateUserProfile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: api.updateUserProfile.bind(api),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    },
  });
}

// Payment hooks
export function useCreatePaymentIntent() {
  return useMutation({
    mutationFn: ({ jobId, amount, description }: {
      jobId: string;
      amount: number;
      description?: string;
    }) => api.createPaymentIntent(jobId, amount, description),
  });
}

export function useConfirmPayment() {
  return useMutation({
    mutationFn: api.confirmPayment.bind(api),
  });
}

// Auth hooks
export function useLogin() {
  return useMutation<ApiResponseWrapper<AuthResponse>, unknown, { email: string; password: string }>({
    mutationFn: ({ email, password }) => api.login(email, password),
    onSuccess: (data: any) => {
      if (data.data?.session?.access_token) {
        api.setToken(data.data.session.access_token);
      }
    },
  });
}

export function useRegister() {
  return useMutation<ApiResponseWrapper<AuthResponse>, unknown, any>({
    mutationFn: api.register.bind(api),
    onSuccess: (data: any) => {
      if (data.data?.session?.access_token) {
        api.setToken(data.data.session.access_token);
      }
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: api.logout.bind(api),
    onSuccess: () => {
      api.clearToken();
      queryClient.clear();
    },
  });
}
