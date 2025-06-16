import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// Jobs hooks
export function useJobs(params: {
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
  return useQuery({
    queryKey: ['jobs', params],
    queryFn: () => api.getJobs(params),
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

// Applications hooks
export function useApplications(params: {
  page?: number;
  limit?: number;
  status?: string;
  jobId?: string;
  role?: 'worker' | 'poster';
} = {}) {
  return useQuery({
    queryKey: ['applications', params],
    queryFn: () => api.getApplications(params),
  });
}

export function useCreateApplication() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: api.createApplication.bind(api),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });
}

export function useAcceptApplication() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: api.acceptApplication.bind(api),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
}

export function useRejectApplication() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: api.rejectApplication.bind(api),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });
}

export function useWithdrawApplication() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: api.withdrawApplication.bind(api),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
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

export function useCreateWorkerProfile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: api.createWorkerProfile.bind(api),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    },
  });
}

// Auth hooks
export function useLogin() {
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      api.login(email, password),
    onSuccess: (data: any) => {
      if (data?.data?.session?.access_token) {
        api.setToken(data.data.session.access_token);
      }
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: api.register.bind(api),
    onSuccess: (data: any) => {
      if (data?.data?.session?.access_token) {
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
