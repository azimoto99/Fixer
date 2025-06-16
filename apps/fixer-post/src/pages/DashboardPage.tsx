import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Plus, 
  Briefcase, 
  Users, 
  DollarSign, 
  Clock,
  CheckCircle,
  Bell
} from 'lucide-react';

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening with your jobs today.
          </p>
        </div>
        <Button asChild>
          <Link to="/jobs/create">
            <Plus className="mr-2 h-4 w-4" />
            Post New Job
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">
              +1 from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Applications</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">
              +4 new this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$2,450</div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Jobs</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">
              +2 this month
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Jobs */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Jobs</CardTitle>
            <CardDescription>
              Your latest job postings and their status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Kitchen Sink Repair</h4>
                  <p className="text-sm text-muted-foreground">Posted 2 days ago</p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-green-600">3 Applications</div>
                  <div className="text-xs text-muted-foreground">$150 budget</div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">House Cleaning</h4>
                  <p className="text-sm text-muted-foreground">Posted 1 week ago</p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-blue-600">In Progress</div>
                  <div className="text-xs text-muted-foreground">$200 budget</div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Furniture Assembly</h4>
                  <p className="text-sm text-muted-foreground">Posted 2 weeks ago</p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-600">Completed</div>
                  <div className="text-xs text-muted-foreground">$100 budget</div>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <Button asChild variant="outline" className="w-full">
                <Link to="/jobs">View All Jobs</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks to help you manage your jobs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button asChild className="w-full justify-start" variant="outline">
                <Link to="/jobs/create">
                  <Plus className="mr-2 h-4 w-4" />
                  Post a New Job
                </Link>
              </Button>

              <Button asChild className="w-full justify-start" variant="outline">
                <Link to="/jobs?status=open">
                  <Clock className="mr-2 h-4 w-4" />
                  Review Applications
                </Link>
              </Button>

              <Button asChild className="w-full justify-start" variant="outline">
                <Link to="/payments">
                  <DollarSign className="mr-2 h-4 w-4" />
                  Payment History
                </Link>
              </Button>

              <Button asChild className="w-full justify-start" variant="outline">
                <Link to="/notifications">
                  <Bell className="mr-2 h-4 w-4" />
                  Notifications
                </Link>
              </Button>

              <Button asChild className="w-full justify-start" variant="outline">
                <Link to="/profile">
                  <Users className="mr-2 h-4 w-4" />
                  Update Profile
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
