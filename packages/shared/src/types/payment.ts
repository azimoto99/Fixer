export interface Payment {
  id: string;
  jobId: string;
  posterId: string;
  workerId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
  refundedAt?: string;
  disputedAt?: string;
}

export type PaymentStatus = 
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'disputed';

export interface PaymentIntent {
  id: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: string;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account';
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  bankAccount?: {
    bankName: string;
    last4: string;
    accountType: string;
  };
  isDefault: boolean;
  createdAt: string;
}

export interface CreatePaymentIntentRequest {
  jobId: string;
  amount: number;
  currency?: string;
  paymentMethodId?: string;
  savePaymentMethod?: boolean;
}

export interface ConfirmPaymentRequest {
  paymentIntentId: string;
  paymentMethodId?: string;
}

export interface RefundRequest {
  paymentId: string;
  amount?: number; // partial refund if specified
  reason?: string;
}

export interface PaymentHistory {
  payments: Payment[];
  totalEarnings: number;
  totalSpent: number;
  pendingPayments: number;
  currency: string;
}

export interface StripeAccount {
  id: string;
  userId: string;
  stripeAccountId: string;
  isVerified: boolean;
  hasPayoutMethod: boolean;
  requirements?: {
    currentlyDue: string[];
    eventuallyDue: string[];
    pastDue: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateStripeAccountRequest {
  type: 'express' | 'standard';
  country: string;
  email?: string;
}

export interface Payout {
  id: string;
  workerId: string;
  amount: number;
  currency: string;
  status: PayoutStatus;
  stripePayoutId?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  arrivedAt?: string;
}

export type PayoutStatus = 
  | 'pending'
  | 'in_transit'
  | 'paid'
  | 'failed'
  | 'cancelled';
