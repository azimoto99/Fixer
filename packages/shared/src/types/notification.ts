// Notification types for the Fixer ecosystem
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  content: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: string;
}

export type NotificationType = 
  | 'job_posted'
  | 'application_received'
  | 'application_accepted'
  | 'application_rejected'
  | 'job_assigned'
  | 'job_started'
  | 'job_completed'
  | 'payment_received'
  | 'rating_received';

export interface NotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  jobNotifications: boolean;
  applicationNotifications: boolean;
  paymentNotifications: boolean;
  ratingNotifications: boolean;
}

export interface CreateNotificationRequest {
  userId: string;
  type: NotificationType;
  content: string;
  data?: Record<string, any>;
}
