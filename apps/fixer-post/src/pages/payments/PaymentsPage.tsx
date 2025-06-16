import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/hooks/useAuth';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard, DollarSign, Clock, CheckCircle, AlertCircle } from 'lucide-react';

import type { Payment } from '@fixer/shared';

export function PaymentsPage() {
  const { user } = useAuth();
  const api = useApi();
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  // Fetch payment history
  const { data: paymentsData, isLoading } = useQuery({
    queryKey: ['payments', user?.id],
    queryFn: async () => {
      const response = await api.get('/payments');
      return response.data;
    },
    enabled: !!user?.id,
  });

  const payments = (paymentsData as any)?.payments || [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'captured':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
      case 'authorized':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'failed':
      case 'disputed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      completed: 'default',
      captured: 'default',
      pending: 'secondary',
      authorized: 'secondary',
      failed: 'destructive',
      disputed: 'destructive',
      refunded: 'outline',
    };

    return (
      <Badge variant={variants[status] || 'outline'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading payments...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Payment Management</h1>
        <p className="text-muted-foreground">
          Manage your payments, view transaction history, and handle billing.
        </p>
      </div>

      <Tabs defaultValue="history" className="space-y-6">
        <TabsList>
          <TabsTrigger value="history">Payment History</TabsTrigger>
          <TabsTrigger value="methods">Payment Methods</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-6">
          {/* Payment Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${payments.reduce((sum: number, payment: Payment) => 
                    payment.status === 'succeeded' ? sum + Number(payment.amount) : sum, 0
                  ).toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Across {payments.filter((p: Payment) => p.status === 'succeeded').length} completed payments
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${payments.reduce((sum: number, payment: Payment) => 
                    ['pending', 'authorized'].includes(payment.status) ? sum + Number(payment.amount) : sum, 0
                  ).toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {payments.filter((p: Payment) => ['pending', 'authorized'].includes(p.status)).length} pending payments
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Month</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${payments.filter((p: Payment) => {
                    const paymentDate = new Date(p.createdAt);
                    const now = new Date();
                    return paymentDate.getMonth() === now.getMonth() && 
                           paymentDate.getFullYear() === now.getFullYear();
                  }).reduce((sum: number, payment: Payment) => 
                    payment.status === 'succeeded' ? sum + Number(payment.amount) : sum, 0
                  ).toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Current month spending
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Payment History */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Payments</CardTitle>
              <CardDescription>
                Your payment history and transaction details
              </CardDescription>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No payments yet</h3>
                  <p className="text-muted-foreground">
                    Your payment history will appear here once you start hiring workers.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {payments.map((payment: Payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => setSelectedPayment(payment)}
                    >
                      <div className="flex items-center space-x-4">
                        {getStatusIcon(payment.status)}
                        <div>
                          <p className="font-medium">${Number(payment.amount).toFixed(2)}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(payment.createdAt), 'MMM dd, yyyy')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(payment.status)}
                        {payment.stripePaymentIntentId && (
                          <Badge variant="outline" className="text-xs">
                            {payment.stripePaymentIntentId.slice(-8)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="methods" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Methods</CardTitle>
              <CardDescription>
                Manage your saved payment methods and billing information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No payment methods</h3>
                <p className="text-muted-foreground mb-4">
                  Add a payment method to make hiring workers faster and easier.
                </p>
                <Button>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Add Payment Method
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Settings</CardTitle>
              <CardDescription>
                Configure your payment preferences and notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="default-tip">Default Tip Percentage</Label>
                <Input
                  id="default-tip"
                  type="number"
                  placeholder="15"
                  min="0"
                  max="100"
                />
                <p className="text-xs text-muted-foreground">
                  Default tip percentage for completed jobs
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="auto-release">Auto-release Payment</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="auto-release"
                    type="number"
                    placeholder="24"
                    min="1"
                    max="168"
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">hours after job completion</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Automatically release payment to worker after specified hours
                </p>
              </div>

              <Button>Save Settings</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Billing Information</CardTitle>
              <CardDescription>
                Update your billing address and tax information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Billing information management coming soon.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment Detail Modal/Sidebar could go here */}
      {selectedPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-4 right-4"
                onClick={() => setSelectedPayment(null)}
              >
                ×
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Amount</Label>
                <p className="text-lg font-semibold">${Number(selectedPayment.amount).toFixed(2)}</p>
              </div>
              <div>
                <Label>Status</Label>
                <div className="mt-1">
                  {getStatusBadge(selectedPayment.status)}
                </div>
              </div>
              <div>
                <Label>Date</Label>
                <p>{format(new Date(selectedPayment.createdAt), 'PPP')}</p>
              </div>
              {selectedPayment.stripePaymentIntentId && (
                <div>
                  <Label>Transaction ID</Label>
                  <p className="text-sm font-mono">{selectedPayment.stripePaymentIntentId}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
