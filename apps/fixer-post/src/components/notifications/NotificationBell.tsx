import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/hooks/useAuth';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Bell, 
  Briefcase,
  Users,
  DollarSign,
  Star,
  Check,
  AlertCircle,
  CheckCheck,
  Settings
} from 'lucide-react';

import type { Notification } from '@fixer/shared';

const notificationIcons = {
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

export function NotificationBell() {
  const { user } = useAuth();
  const api = useApi();
  const [isOpen, setIsOpen] = useState(false);

  // Fetch recent notifications
  const { data: notificationsData } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const response = await api.get('/notifications?limit=5');
      return response.data;
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const notifications = (notificationsData as any)?.notifications || [];
  const unreadCount = notifications.filter((n: Notification) => !n.read).length;

  const getNotificationIcon = (type: string) => {
    const IconComponent = notificationIcons[type as keyof typeof notificationIcons] || Bell;
    return <IconComponent className="h-4 w-4" />;
  };

  const getNotificationTitle = (notification: Notification) => {
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
  };

  const truncateContent = (content: string, maxLength: number = 50) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {unreadCount} new
            </Badge>
          )}
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />

        {notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p>No notifications</p>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {notifications.slice(0, 5).map((notification: Notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`flex items-start space-x-3 p-3 cursor-pointer ${
                  !notification.read ? 'bg-primary/5' : ''
                }`}
                asChild
              >
                <Link to="/notifications" onClick={() => setIsOpen(false)}>
                  <div className={`p-1.5 rounded-full flex-shrink-0 ${
                    !notification.read 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium">
                        {getNotificationTitle(notification)}
                      </p>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                      )}
                    </div>
                    
                    <p className="text-xs text-muted-foreground mb-1">
                      {truncateContent(notification.content)}
                    </p>
                    
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(notification.createdAt), 'MMM dd, HH:mm')}
                    </p>
                  </div>
                </Link>
              </DropdownMenuItem>
            ))}
          </div>
        )}

        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link 
                to="/notifications" 
                className="flex items-center justify-center text-sm font-medium"
                onClick={() => setIsOpen(false)}
              >
                <Settings className="h-4 w-4 mr-2" />
                View All Notifications
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
