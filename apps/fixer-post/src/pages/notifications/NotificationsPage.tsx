import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Briefcase, 
  Users, 
  DollarSign,
  Star,
  AlertCircle,
  Settings
} from 'lucide-react';

import type { Notification } from '@fixer/shared';

export function NotificationsPage() {
  const { user } = useAuth();
  const api = useApi();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState('all');

  // Fetch notifications
  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const response = await api.get('/notifications');
      return response.data;
    },
    enabled: !!user?.id,
  });

  const notifications = (notificationsData as any)?.notifications || [];
  const unreadCount = notifications.filter((n: Notification) => !n.read).length;

  // Mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await api.put(`/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Mark all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await api.put('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({
        title: 'Success',
        description: 'All notifications marked as read',
      });
    },
  });

  const filteredNotifications = notifications.filter((notification: Notification) => {
    if (selectedTab === 'unread') return !notification.read;
    if (selectedTab === 'jobs') return ['job_posted', 'job_assigned', 'job_started', 'job_completed'].includes(notification.type);
    if (selectedTab === 'applications') return ['application_received', 'application_accepted', 'application_rejected'].includes(notification.type);
    return true; // 'all' tab
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading notifications...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Notifications</h1>
            <p className="text-muted-foreground">
              Stay updated with your jobs, applications, and payments.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark All Read
              </Button>
            )}
            <Badge variant="secondary">
              {unreadCount} Unread
            </Badge>
          </div>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">Unread ({unreadCount})</TabsTrigger>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="settings" className="ml-auto">
            <Settings className="h-4 w-4" />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <NotificationsList 
            notifications={filteredNotifications} 
            onMarkAsRead={(id) => markAsReadMutation.mutate(id)}
          />
        </TabsContent>

        <TabsContent value="unread" className="space-y-4">
          <NotificationsList 
            notifications={filteredNotifications} 
            onMarkAsRead={(id) => markAsReadMutation.mutate(id)}
          />
        </TabsContent>

        <TabsContent value="jobs" className="space-y-4">
          <NotificationsList 
            notifications={filteredNotifications} 
            onMarkAsRead={(id) => markAsReadMutation.mutate(id)}
          />
        </TabsContent>

        <TabsContent value="applications" className="space-y-4">
          <NotificationsList 
            notifications={filteredNotifications} 
            onMarkAsRead={(id) => markAsReadMutation.mutate(id)}
          />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <NotificationSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function NotificationsList({ 
  notifications, 
  onMarkAsRead 
}: { 
  notifications: Notification[]; 
  onMarkAsRead: (id: string) => void;
}) {
  if (notifications.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No notifications</h3>
          <p className="text-muted-foreground">
            You're all caught up! New notifications will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {notifications.map((notification: Notification) => (
        <Card 
          key={notification.id} 
          className={`cursor-pointer transition-colors hover:bg-muted/50 ${
            !notification.read ? 'border-primary/50 bg-primary/5' : ''
          }`}
          onClick={() => !notification.read && onMarkAsRead(notification.id)}
        >
          <CardContent className="p-4">
            <div className="flex items-start space-x-4">
              <div className={`p-2 rounded-full ${
                !notification.read ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {getNotificationIcon(notification.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-semibold text-sm">
                    {getNotificationTitle(notification)}
                  </h4>
                  <div className="flex items-center space-x-2">
                    {!notification.read && (
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(notification.createdAt), 'MMM dd, HH:mm')}
                    </span>
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground mb-2">
                  {notification.content}
                </p>
                
                {notification.data && typeof notification.data === 'object' && (
                  <div className="flex items-center space-x-2">
                    {notification.data.jobTitle && (
                      <Badge variant="outline" className="text-xs">
                        {notification.data.jobTitle}
                      </Badge>
                    )}
                    {notification.data.amount && (
                      <Badge variant="outline" className="text-xs">
                        ${notification.data.amount}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function NotificationSettings() {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    jobNotifications: true,
    applicationNotifications: true,
    paymentNotifications: true,
    ratingNotifications: true,
  });

  const handleSettingChange = (key: string, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>
          Choose which notifications you'd like to receive and how you'd like to receive them.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h4 className="font-semibold">Delivery Methods</h4>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="email-notifications">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive notifications via email
              </p>
            </div>
            <Switch
              id="email-notifications"
              checked={settings.emailNotifications}
              onCheckedChange={(checked: boolean) => handleSettingChange('emailNotifications', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="push-notifications">Push Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive browser push notifications
              </p>
            </div>
            <Switch
              id="push-notifications"
              checked={settings.pushNotifications}
              onCheckedChange={(checked: boolean) => handleSettingChange('pushNotifications', checked)}
            />
          </div>
        </div>

        <div className="border-t pt-4 space-y-4">
          <h4 className="font-semibold">Notification Types</h4>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="job-notifications">Job Updates</Label>
              <p className="text-sm text-muted-foreground">
                Job assignments, status changes, and completions
              </p>
            </div>
            <Switch
              id="job-notifications"
              checked={settings.jobNotifications}
              onCheckedChange={(checked: boolean) => handleSettingChange('jobNotifications', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="application-notifications">Applications</Label>
              <p className="text-sm text-muted-foreground">
                New applications and application status updates
              </p>
            </div>
            <Switch
              id="application-notifications"
              checked={settings.applicationNotifications}
              onCheckedChange={(checked: boolean) => handleSettingChange('applicationNotifications', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="payment-notifications">Payments</Label>
              <p className="text-sm text-muted-foreground">
                Payment confirmations and transaction updates
              </p>
            </div>
            <Switch
              id="payment-notifications"
              checked={settings.paymentNotifications}
              onCheckedChange={(checked: boolean) => handleSettingChange('paymentNotifications', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="rating-notifications">Ratings & Reviews</Label>
              <p className="text-sm text-muted-foreground">
                New ratings and reviews from workers
              </p>
            </div>
            <Switch
              id="rating-notifications"
              checked={settings.ratingNotifications}
              onCheckedChange={(checked: boolean) => handleSettingChange('ratingNotifications', checked)}
            />
          </div>
        </div>

        <Button className="w-full">
          Save Preferences
        </Button>
      </CardContent>
    </Card>
  );
}

function getNotificationIcon(type: string) {
  const icons = {
    job_posted: Briefcase,
    application_received: Users,
    application_accepted: Check,
    application_rejected: AlertCircle,
    job_assigned: Briefcase,
    job_started: CheckCheck,
    job_completed: CheckCheck,
    payment_received: DollarSign,
    rating_received: Star,
  };
  
  const IconComponent = icons[type as keyof typeof icons] || Bell;
  return <IconComponent className="h-4 w-4" />;
}

function getNotificationTitle(notification: Notification) {
  const titles = {
    job_posted: 'New Job Posted',
    application_received: 'New Application',
    application_accepted: 'Application Accepted',
    application_rejected: 'Application Declined',
    job_assigned: 'Job Assigned',
    job_started: 'Job Started',
    job_completed: 'Job Completed',
    payment_received: 'Payment Received',
    rating_received: 'New Rating',
  };
  return titles[notification.type as keyof typeof titles] || 'Notification';
}
