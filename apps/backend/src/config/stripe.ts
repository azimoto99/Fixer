import Stripe from 'stripe';
import { config } from './env';

// Initialize Stripe
export const stripe = new Stripe(config.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  typescript: true,
});

// Test Stripe connection
export async function testStripeConnection(): Promise<boolean> {
  try {
    await stripe.balance.retrieve();
    console.log('✅ Stripe connection successful');
    return true;
  } catch (error) {
    console.error('❌ Stripe connection failed:', error);
    return false;
  }
}

// Stripe webhook signature verification
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  try {
    return stripe.webhooks.constructEvent(
      payload,
      signature,
      config.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    throw new Error(`Webhook signature verification failed: ${error}`);
  }
}

// Helper functions for common Stripe operations
export const stripeHelpers = {
  // Create a payment intent
  async createPaymentIntent(params: {
    amount: number;
    currency: string;
    customerId?: string;
    paymentMethodId?: string;
    metadata?: Record<string, string>;
  }) {
    return await stripe.paymentIntents.create({
      amount: Math.round(params.amount * 100), // Convert to cents
      currency: params.currency,
      customer: params.customerId,
      payment_method: params.paymentMethodId,
      metadata: params.metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    });
  },

  // Confirm a payment intent
  async confirmPaymentIntent(
    paymentIntentId: string,
    paymentMethodId?: string
  ) {
    return await stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method: paymentMethodId,
    });
  },

  // Create a customer
  async createCustomer(params: {
    email: string;
    name?: string;
    metadata?: Record<string, string>;
  }) {
    return await stripe.customers.create({
      email: params.email,
      name: params.name,
      metadata: params.metadata,
    });
  },

  // Create a Connect account
  async createConnectAccount(params: {
    type: 'express' | 'standard';
    country: string;
    email?: string;
    metadata?: Record<string, string>;
  }) {
    return await stripe.accounts.create({
      type: params.type,
      country: params.country,
      email: params.email,
      metadata: params.metadata,
    });
  },

  // Create account link for Connect onboarding
  async createAccountLink(accountId: string, returnUrl: string, refreshUrl: string) {
    return await stripe.accountLinks.create({
      account: accountId,
      return_url: returnUrl,
      refresh_url: refreshUrl,
      type: 'account_onboarding',
    });
  },

  // Create a transfer to Connect account
  async createTransfer(params: {
    amount: number;
    currency: string;
    destination: string;
    metadata?: Record<string, string>;
  }) {
    return await stripe.transfers.create({
      amount: Math.round(params.amount * 100), // Convert to cents
      currency: params.currency,
      destination: params.destination,
      metadata: params.metadata,
    });
  },

  // Create a refund
  async createRefund(params: {
    paymentIntentId: string;
    amount?: number;
    reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
    metadata?: Record<string, string>;
  }) {
    return await stripe.refunds.create({
      payment_intent: params.paymentIntentId,
      amount: params.amount ? Math.round(params.amount * 100) : undefined,
      reason: params.reason,
      metadata: params.metadata,
    });
  },

  // Get account details
  async getAccount(accountId: string) {
    return await stripe.accounts.retrieve(accountId);
  },

  // Get payment intent
  async getPaymentIntent(paymentIntentId: string) {
    return await stripe.paymentIntents.retrieve(paymentIntentId);
  },

  // Get customer
  async getCustomer(customerId: string) {
    return await stripe.customers.retrieve(customerId);
  },

  // List payment methods for customer
  async listPaymentMethods(customerId: string, type: 'card' | 'us_bank_account' = 'card') {
    return await stripe.paymentMethods.list({
      customer: customerId,
      type,
    });
  },

  // Attach payment method to customer
  async attachPaymentMethod(paymentMethodId: string, customerId: string) {
    return await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });
  },

  // Detach payment method from customer
  async detachPaymentMethod(paymentMethodId: string) {
    return await stripe.paymentMethods.detach(paymentMethodId);
  },
};
