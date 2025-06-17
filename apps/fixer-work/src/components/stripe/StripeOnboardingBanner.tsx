import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useUserProfile, useCreateStripeOnboardingLink, useRefreshStripeStatus } from '@/hooks/useApi';
import { toast } from '@/components/ui/toaster';

export function StripeOnboardingBanner() {
  const { data: profileData, refetch } = useUserProfile();
  const workerProfile = (profileData as any)?.data?.workerProfile;
  const status = workerProfile?.stripeAccountStatus ?? 'not_connected';

  const { mutateAsync: createLink, isLoading: creating } = useCreateStripeOnboardingLink();
  const { mutateAsync: refreshStatus } = useRefreshStripeStatus();

  // If redirected back from Stripe onboarding
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('stripe') || params.has('refresh')) {
      (async () => {
        try {
          await refreshStatus();
          await refetch();
        } catch (err) {
          console.error(err);
        }
      })();
    }
  }, []);

  if (status === 'verified') {
    return null;
  }

  const handleOnboard = async () => {
    try {
      const res = await createLink();
      const url = (res as any)?.data?.url;
      if (url) {
        window.location.href = url;
      } else {
        toast('Failed to get onboarding link');
      }
    } catch (e: any) {
      toast(String(e?.message ?? 'Error creating link'));
    }
  };

  return (
    <Card className="bg-yellow-100 border-yellow-300 text-yellow-900 dark:bg-yellow-900/20 dark:text-yellow-200 p-4 mb-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <AlertCircle className="h-5 w-5" />
        <span>
          {status === 'pending' ? 'Your Stripe account setup is not completed.' : 'You need to connect a Stripe account to receive payouts.'}
        </span>
      </div>
      <Button onClick={handleOnboard} disabled={creating} size="sm">
        {creating ? 'Redirecting…' : 'Set Up Payouts'}
      </Button>
    </Card>
  );
} 