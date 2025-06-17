import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useJob, useCreatePaymentIntent, useConfirmPayment } from '@/hooks/useApi';
import { toast } from '@/hooks/use-toast';
import type { Job } from '@fixer/shared/types';

// Load Stripe outside component for best performance
const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
const stripePromise: Promise<import('@stripe/stripe-js').Stripe | null> = stripeKey ? loadStripe(stripeKey) : Promise.resolve(null);

function CheckoutForm({ clientSecret, paymentIntentId }: { clientSecret: string; paymentIntentId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const { mutateAsync: confirmPayment, isLoading: confirming } = useConfirmPayment();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { payment_method_data: { billing_details: {} } },
      redirect: 'if_required',
    });

    if (error) {
      toast({ title: 'Payment error', description: error.message, variant: 'destructive' });
      return;
    }

    if (paymentIntent) {
      await confirmPayment(paymentIntent.id);
      toast({ title: 'Payment successful', description: 'Worker has been paid ✅' });
      navigate('/payments');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement id="payment-element" />
      <Button type="submit" disabled={confirming || !stripe || !elements} className="w-full">
        {confirming ? 'Processing...' : 'Pay Now'}
      </Button>
    </form>
  );
}

export function PayJobPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: jobResponse, isLoading: loadingJob } = useJob(id as string);
  const job = jobResponse?.data as Job | undefined;

  const { mutateAsync: createIntent } = useCreatePaymentIntent();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!job || clientSecret) return;
    if (!job.budget?.amount) {
      setError('Job does not have a budget amount');
      return;
    }
    (async () => {
      try {
        const res = await createIntent({
          jobId: job.id,
          amount: job.budget.amount!,
          description: `Payment for job: ${job.title}`,
        });
        // @ts-ignore
        const { clientSecret: cs, payment } = res.data || {};
        if (cs) {
          setClientSecret(cs);
          setPaymentIntentId(payment?.stripePaymentIntentId);
        } else {
          setError('Failed to initiate payment');
        }
      } catch (e: any) {
        setError(e.message || 'Failed to initiate payment');
      }
    })();
  }, [job]);

  if (loadingJob) {
    return (
      <div className="container py-8 text-center">Loading job...</div>
    );
  }

  if (error) {
    return (
      <div className="container py-8 text-center text-red-600">{error}</div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="container py-8 text-center">Preparing payment...</div>
    );
  }

  if (!stripeKey) {
    return (
      <div className="container py-8 text-center text-red-600">
        Stripe publishable key is missing. Please set <code>VITE_STRIPE_PUBLISHABLE_KEY</code> in your environment.
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Pay Worker for "{job?.title}"</CardTitle>
        </CardHeader>
        <CardContent>
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CheckoutForm clientSecret={clientSecret} paymentIntentId={paymentIntentId!} />
          </Elements>
        </CardContent>
      </Card>
    </div>
  );
}

export default PayJobPage; 