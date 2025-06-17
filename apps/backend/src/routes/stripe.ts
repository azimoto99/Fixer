import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { db } from '../db';
import { users, workerProfiles } from '../db/schema';
import { stripeHelpers } from '../config/stripe';
import { eq } from 'drizzle-orm';
import { config } from '../config';

const router = Router();

/**
 * POST /stripe/onboard
 * Create or fetch a worker's Connect account and generate an onboarding link
 */
router.post('/onboard', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
    }

    // Get user + worker profile
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user || user.role !== 'worker') {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only workers can onboard to Stripe' } });
    }

    let [profile] = await db.select().from(workerProfiles).where(eq(workerProfiles.userId, userId)).limit(1);

    // If no worker profile, create basic one
    if (!profile) {
      const [created] = await db.insert(workerProfiles).values({ userId }).returning();
      profile = created;
    }

    let accountId = profile.stripeAccountId;

    // Create Stripe Connect account if missing
    if (!accountId) {
      const account = await stripeHelpers.createConnectAccount({
        type: 'express',
        country: 'US',
        email: user.email,
      });
      accountId = account.id;
      await db.update(workerProfiles).set({ stripeAccountId: accountId, stripeAccountStatus: 'pending' }).where(eq(workerProfiles.id, profile.id));
    }

    // Create onboarding link
    const returnUrl = `${config.FIXER_WORK_URL}/stripe/return`;
    const refreshUrl = `${config.FIXER_WORK_URL}/stripe/return?refresh=true`;
    const link = await stripeHelpers.createAccountLink(accountId, returnUrl, refreshUrl);

    res.json({ success: true, data: { url: link.url } });
  } catch (error) {
    console.error('Stripe onboard error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create Stripe onboarding link' } });
  }
});

/**
 * POST /stripe/refresh-status
 * Check the worker's Connect account and update status
 */
router.post('/refresh-status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
    }

    let [profile] = await db.select().from(workerProfiles).where(eq(workerProfiles.userId, userId)).limit(1);
    if (!profile?.stripeAccountId) {
      return res.status(400).json({ success: false, error: { code: 'NO_STRIPE_ACCOUNT', message: 'Stripe account not connected' } });
    }

    const account = await stripeHelpers.getAccount(profile.stripeAccountId);
    const isVerified = account.charges_enabled && account.payouts_enabled && account.details_submitted;
    const newStatus = isVerified ? 'verified' : 'pending';

    if (newStatus !== profile.stripeAccountStatus) {
      await db.update(workerProfiles).set({ stripeAccountStatus: newStatus }).where(eq(workerProfiles.id, profile.id));
    }

    res.json({ success: true, data: { stripeAccountStatus: newStatus } });
  } catch (error) {
    console.error('Stripe status refresh error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to refresh Stripe status' } });
  }
});

export default router; 