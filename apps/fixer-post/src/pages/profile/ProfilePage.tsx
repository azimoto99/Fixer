import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';

export function ProfilePage() {
  const { user } = useAuth();

  return (
    <div className="container py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
          <CardDescription>
            Manage your account information and preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <h3 className="text-lg font-medium mb-2">Profile Management</h3>
            <p className="text-muted-foreground mb-4">
              Welcome, {user?.firstName} {user?.lastName}!
            </p>
            <p className="text-muted-foreground">
              This page will contain profile management features including:
            </p>
            <ul className="text-left mt-4 space-y-2 text-sm text-muted-foreground max-w-md mx-auto">
              <li>• Personal information editing</li>
              <li>• Avatar upload</li>
              <li>• Contact details</li>
              <li>• Notification preferences</li>
              <li>• Payment methods</li>
              <li>• Account security</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
