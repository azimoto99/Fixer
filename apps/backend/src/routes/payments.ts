import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { payments, jobs, workerProfiles } from '../db/schema';
import { validateRequest } from '../middleware/validation';
import { authMiddleware } from '../middleware/auth';
import { createPaymentIntentRequestSchema, confirmPaymentRequestSchema } from '@fixer/shared';
import { stripe } from '../config/stripe';
import { eq, and, desc, sql } from 'drizzle-orm';

const router = Router();

// ============================================================================
// PAYMENT ROUTES
// ============================================================================

/**
 * GET /payments
 * Get payments for current user
 */
const paymentsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
  status: z.enum(['pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded']).optional(),
  jobId: z.string().uuid().optional(),
  role: z.enum(['poster', 'worker']).optional(),
});

router.get('/', authMiddleware, validateRequest(paymentsQuerySchema, 'query'), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { page, limit, status, jobId, role } = req.query as any;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        }
      });
    }

    const offset = (page - 1) * limit;

    // Build where conditions
    let whereConditions = [];

    if (role === 'poster') {
      whereConditions.push(eq(payments.posterId, userId));
    } else if (role === 'worker') {
      whereConditions.push(eq(payments.workerId, userId));
    } else {
      // Get all payments for this user (as poster or worker)
      whereConditions.push(
        sql`(${payments.posterId} = ${userId} OR ${payments.workerId} = ${userId})`
      );
    }

    if (status) {
      whereConditions.push(eq(payments.status, status));
    }

    if (jobId) {
      whereConditions.push(eq(payments.jobId, jobId));
    }

    // Get payments with job details
    const paymentsQuery = db
      .select({
        id: payments.id,
        jobId: payments.jobId,
        posterId: payments.posterId,
        workerId: payments.workerId,
        amount: payments.amount,
        platformFee: payments.platformFee,
        workerAmount: payments.workerAmount,
        currency: payments.currency,
        status: payments.status,
        stripePaymentIntentId: payments.stripePaymentIntentId,
        stripeTransferId: payments.stripeTransferId,
        description: payments.description,
        createdAt: payments.createdAt,
        updatedAt: payments.updatedAt,
        job: {
          id: jobs.id,
          title: jobs.title,
          category: jobs.category,
          status: jobs.status,
        }
      })
      .from(payments)
      .leftJoin(jobs, eq(payments.jobId, jobs.id))
      .where(and(...whereConditions))
      .orderBy(desc(payments.createdAt))
      .limit(limit)
      .offset(offset);

    const paymentsList = await paymentsQuery;

    // Get total count
    const countQuery = db
      .select({ count: sql`count(*)`.as('count') })
      .from(payments)
      .where(and(...whereConditions));

    const [{ count }] = await countQuery;
    const totalCount = Number(count);
    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      data: paymentsList,
      meta: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      }
    });

  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get payments',
      }
    });
  }
});

/**
 * POST /payments/create-intent
 * Create a payment intent for a job
 */
router.post('/create-intent', authMiddleware, validateRequest(createPaymentIntentRequestSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { jobId, amount, description } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        }
      });
    }

    // Get job details and verify user is the poster
    const [job] = await db
      .select({
        id: jobs.id,
        posterId: jobs.posterId,
        workerId: jobs.workerId,
        title: jobs.title,
        status: jobs.status,
        price: jobs.price,
      })
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .limit(1);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'JOB_NOT_FOUND',
          message: 'Job not found',
        }
      });
    }

    if (job.posterId !== userId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only job posters can create payments',
        }
      });
    }

    if (!job.workerId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_WORKER_ASSIGNED',
          message: 'No worker assigned to this job',
        }
      });
    }

    if (job.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'JOB_NOT_COMPLETED',
          message: 'Job must be completed before payment',
        }
      });
    }

    // Check if payment already exists for this job
    const [existingPayment] = await db
      .select({ id: payments.id })
      .from(payments)
      .where(eq(payments.jobId, jobId))
      .limit(1);

    if (existingPayment) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'PAYMENT_EXISTS',
          message: 'Payment already exists for this job',
        }
      });
    }

    // Get worker's Stripe account
    const [workerProfile] = await db
      .select({
        stripeAccountId: workerProfiles.stripeAccountId,
        stripeAccountStatus: workerProfiles.stripeAccountStatus,
      })
      .from(workerProfiles)
      .where(eq(workerProfiles.userId, job.workerId))
      .limit(1);

    if (!workerProfile?.stripeAccountId || workerProfile.stripeAccountStatus !== 'verified') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'WORKER_STRIPE_NOT_SETUP',
          message: 'Worker has not set up their Stripe account',
        }
      });
    }

    // Calculate platform fee (5%)
    const platformFeeRate = 0.05;
    const platformFee = Math.round(amount * platformFeeRate);
    const workerAmount = amount - platformFee;

    // Create Stripe Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      description: description || `Payment for job: ${job.title}`,
      metadata: {
        jobId: job.id,
        posterId: job.posterId,
        workerId: job.workerId,
        platformFee: platformFee.toString(),
        workerAmount: workerAmount.toString(),
      },
      transfer_data: {
        destination: workerProfile.stripeAccountId,
        amount: Math.round(workerAmount * 100), // Worker amount in cents
      },
    });

    // Create payment record in database
    const [newPayment] = await db
      .insert(payments)
      .values({
        jobId,
        posterId: job.posterId,
        workerId: job.workerId,
        amount: amount.toString(),
        platformFee: platformFee.toString(),
        workerAmount: workerAmount.toString(),
        currency: 'usd',
        status: 'pending',
        stripePaymentIntentId: paymentIntent.id,
        description: description || `Payment for job: ${job.title}`,
      })
      .returning();

    res.status(201).json({
      success: true,
      data: {
        payment: newPayment,
        clientSecret: paymentIntent.client_secret,
      }
    });

  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create payment intent',
      }
    });
  }
});

/**
 * POST /payments/confirm
 * Confirm a payment
 */
router.post('/confirm', authMiddleware, validateRequest(confirmPaymentRequestSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { paymentIntentId } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        }
      });
    }

    // Get payment record
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.stripePaymentIntentId, paymentIntentId))
      .limit(1);

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PAYMENT_NOT_FOUND',
          message: 'Payment not found',
        }
      });
    }

    if (payment.posterId !== userId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only confirm your own payments',
        }
      });
    }

    // Get payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Update payment status based on Stripe status
    let status: string;
    switch (paymentIntent.status) {
      case 'succeeded':
        status = 'succeeded';
        break;
      case 'processing':
        status = 'processing';
        break;
      case 'requires_payment_method':
      case 'requires_confirmation':
      case 'requires_action':
        status = 'pending';
        break;
      case 'canceled':
        status = 'cancelled';
        break;
      default:
        status = 'failed';
    }

    // Update payment record
    const [updatedPayment] = await db
      .update(payments)
      .set({
        status: status as any,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, payment.id))
      .returning();

    res.json({
      success: true,
      data: {
        payment: updatedPayment,
        stripeStatus: paymentIntent.status,
      }
    });

  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to confirm payment',
      }
    });
  }
});

export default router;
