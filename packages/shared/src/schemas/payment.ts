import { z } from 'zod';

// Payment status schemas
export const paymentStatusSchema = z.enum([
  'pending',
  'processing',
  'succeeded',
  'failed',
  'cancelled',
  'refunded',
  'disputed',
]);

export const payoutStatusSchema = z.enum([
  'pending',
  'in_transit',
  'paid',
  'failed',
  'cancelled',
]);

// Payment schemas
export const paymentSchema = z.object({
  id: z.string().uuid(),
  jobId: z.string().uuid(),
  posterId: z.string().uuid(),
  workerId: z.string().uuid(),
  amount: z.number().min(0.5, 'Amount must be at least $0.50'),
  currency: z.string().length(3, 'Currency must be 3 characters').default('USD'),
  status: paymentStatusSchema,
  stripePaymentIntentId: z.string().optional(),
  stripeChargeId: z.string().optional(),
  description: z.string().max(500, 'Description too long').optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  paidAt: z.string().datetime().optional(),
  refundedAt: z.string().datetime().optional(),
  disputedAt: z.string().datetime().optional(),
});

export const paymentIntentSchema = z.object({
  id: z.string(),
  clientSecret: z.string(),
  amount: z.number().min(0.5, 'Amount must be at least $0.50'),
  currency: z.string().length(3, 'Currency must be 3 characters'),
  status: z.string(),
});

export const paymentMethodSchema = z.object({
  id: z.string(),
  type: z.enum(['card', 'bank_account']),
  card: z.object({
    brand: z.string(),
    last4: z.string().length(4),
    expMonth: z.number().min(1).max(12),
    expYear: z.number().min(new Date().getFullYear()),
  }).optional(),
  bankAccount: z.object({
    bankName: z.string(),
    last4: z.string().length(4),
    accountType: z.string(),
  }).optional(),
  isDefault: z.boolean(),
  createdAt: z.string().datetime(),
});

// Payment request schemas
export const createPaymentIntentRequestSchema = z.object({
  jobId: z.string().uuid(),
  amount: z.number().min(0.5, 'Amount must be at least $0.50'),
  currency: z.string().length(3, 'Currency must be 3 characters').default('USD').optional(),
  paymentMethodId: z.string().optional(),
  savePaymentMethod: z.boolean().default(false).optional(),
});

export const confirmPaymentRequestSchema = z.object({
  paymentIntentId: z.string().min(1, 'Payment intent ID is required'),
  paymentMethodId: z.string().optional(),
});

export const refundRequestSchema = z.object({
  paymentId: z.string().uuid(),
  amount: z.number().min(0.5, 'Refund amount must be at least $0.50').optional(),
  reason: z.string().max(500, 'Reason too long').optional(),
});

export const paymentHistorySchema = z.object({
  payments: z.array(paymentSchema),
  totalEarnings: z.number().min(0),
  totalSpent: z.number().min(0),
  pendingPayments: z.number().min(0),
  currency: z.string().length(3, 'Currency must be 3 characters'),
});

// Stripe account schemas
export const stripeAccountSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  stripeAccountId: z.string(),
  isVerified: z.boolean(),
  hasPayoutMethod: z.boolean(),
  requirements: z.object({
    currentlyDue: z.array(z.string()),
    eventuallyDue: z.array(z.string()),
    pastDue: z.array(z.string()),
  }).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createStripeAccountRequestSchema = z.object({
  type: z.enum(['express', 'standard']).default('express'),
  country: z.string().length(2, 'Country must be 2 characters').default('US'),
  email: z.string().email('Invalid email format').optional(),
});

// Payout schemas
export const payoutSchema = z.object({
  id: z.string().uuid(),
  workerId: z.string().uuid(),
  amount: z.number().min(1, 'Payout amount must be at least $1.00'),
  currency: z.string().length(3, 'Currency must be 3 characters').default('USD'),
  status: payoutStatusSchema,
  stripePayoutId: z.string().optional(),
  description: z.string().max(500, 'Description too long').optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  arrivedAt: z.string().datetime().optional(),
});

export const createPayoutRequestSchema = z.object({
  amount: z.number().min(1, 'Payout amount must be at least $1.00'),
  currency: z.string().length(3, 'Currency must be 3 characters').default('USD').optional(),
  description: z.string().max(500, 'Description too long').optional(),
});

// Webhook schemas
export const stripeWebhookEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.object({
    object: z.record(z.any()),
  }),
  created: z.number(),
  livemode: z.boolean(),
});
