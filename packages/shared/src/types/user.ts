export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  phone?: string;
  dateOfBirth?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile extends User {
  bio?: string;
  location?: LocationData;
  skills?: string[];
  hourlyRate?: number;
  availability?: AvailabilityStatus;
  rating?: number;
  reviewCount?: number;
  isVerified: boolean;
  verificationDocuments?: VerificationDocument[];
}

export interface VerificationDocument {
  id: string;
  type: 'id' | 'license' | 'certification' | 'insurance';
  url: string;
  status: 'pending' | 'approved' | 'rejected';
  uploadedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  notes?: string;
}

export interface LocationData {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

export type AvailabilityStatus = 'available' | 'busy' | 'unavailable';

export type UserRole = 'poster' | 'worker' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  isVerified: boolean;
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phone?: string;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  bio?: string;
  phone?: string;
  location?: LocationData;
  skills?: string[];
  hourlyRate?: number;
  availability?: AvailabilityStatus;
}
