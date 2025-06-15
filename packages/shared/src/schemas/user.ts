import { z } from 'zod';

// Location schema
export const locationSchema = z.object({
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(2, 'State is required').max(2, 'State must be 2 characters'),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code format'),
  country: z.string().min(2, 'Country is required').max(2, 'Country must be 2 characters'),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

// User schemas
export const userRoleSchema = z.enum(['poster', 'worker', 'admin']);

export const availabilityStatusSchema = z.enum(['available', 'busy', 'unavailable']);

export const verificationDocumentSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['id', 'license', 'certification', 'insurance']),
  url: z.string().url(),
  status: z.enum(['pending', 'approved', 'rejected']),
  uploadedAt: z.string().datetime(),
  reviewedAt: z.string().datetime().optional(),
  reviewedBy: z.string().uuid().optional(),
  notes: z.string().optional(),
});

export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email('Invalid email format'),
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  avatar: z.string().url().optional(),
  phone: z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format').optional(),
  dateOfBirth: z.string().date().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const userProfileSchema = userSchema.extend({
  bio: z.string().max(500, 'Bio too long').optional(),
  location: locationSchema.optional(),
  skills: z.array(z.string()).max(20, 'Too many skills').optional(),
  hourlyRate: z.number().min(0, 'Hourly rate must be positive').max(1000, 'Hourly rate too high').optional(),
  availability: availabilityStatusSchema.optional(),
  rating: z.number().min(0).max(5).optional(),
  reviewCount: z.number().min(0).optional(),
  isVerified: z.boolean(),
  verificationDocuments: z.array(verificationDocumentSchema).optional(),
});

// Authentication schemas
export const loginRequestSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const registerRequestSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  role: userRoleSchema,
  phone: z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format').optional(),
});

export const updateProfileRequestSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long').optional(),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long').optional(),
  bio: z.string().max(500, 'Bio too long').optional(),
  phone: z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format').optional(),
  location: locationSchema.optional(),
  skills: z.array(z.string()).max(20, 'Too many skills').optional(),
  hourlyRate: z.number().min(0, 'Hourly rate must be positive').max(1000, 'Hourly rate too high').optional(),
  availability: availabilityStatusSchema.optional(),
});

export const changePasswordRequestSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const forgotPasswordRequestSchema = z.object({
  email: z.string().email('Invalid email format'),
});

export const resetPasswordRequestSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});
