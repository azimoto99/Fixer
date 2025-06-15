import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  MapPin, 
  Clock, 
  DollarSign,
  Users,
  MoreHorizontal
} from 'lucide-react';

export function JobsPage() {
  // Mock data - in real app this would come from API
  const jobs = [
    {
      id: '1',
      title: 'Kitchen Sink Repair',
      description: 'Need someone to fix a leaky kitchen sink. The faucet is dripping and needs replacement.',
      category: 'Plumbing',
      location: 'San Francisco, CA',
      budget: { type: 'fixed', amount: 150 },
      urgency: 'medium',
      status: 'open',
      applicationsCount: 3,
      createdAt: '2024-01-15T10:00:00Z',
    },
    {
      id: '2',
      title: 'House Cleaning',
      description: 'Deep cleaning for a 3-bedroom house. Need someone reliable and thorough.',
      category: 'Cleaning',
      location: 'San Francisco, CA',
      budget: { type: 'fixed', amount: 200 },
      urgency: 'low',
      status: 'in_progress',
      applicationsCount: 5,
      createdAt: '2024-01-10T14:30:00Z',
    },
    {
      id: '3',
      title: 'Furniture Assembly',
      description: 'Need help assembling IKEA furniture - desk, bookshelf, and chair.',
      category: 'Assembly',
      location: 'San Francisco, CA',
      budget: { type: 'hourly', amount: 25 },
      urgency: 'high',
      status: 'completed',
      applicationsCount: 8,
      createdAt: '2024-01-05T09:15:00Z',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatBudget = (budget: any) => {
    if (budget.type === 'fixed') {
      return `$${budget.amount}`;
    } else if (budget.type === 'hourly') {
      return `$${budget.amount}/hr`;
    }
    return 'Negotiable';
  };

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Jobs</h1>
          <p className="text-muted-foreground">
            Manage your job postings and track their progress
          </p>
        </div>
        <Button asChild>
          <Link to="/jobs/create">
            <Plus className="mr-2 h-4 w-4" />
            Post New Job
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <Button variant="outline" size="sm">All Jobs</Button>
        <Button variant="ghost" size="sm">Open</Button>
        <Button variant="ghost" size="sm">In Progress</Button>
        <Button variant="ghost" size="sm">Completed</Button>
      </div>

      {/* Jobs List */}
      <div className="space-y-6">
        {jobs.map((job) => (
          <Card key={job.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl">
                      <Link 
                        to={`/jobs/${job.id}`}
                        className="hover:text-primary transition-colors"
                      >
                        {job.title}
                      </Link>
                    </CardTitle>
                    <Badge className={getStatusColor(job.status)}>
                      {job.status.replace('_', ' ')}
                    </Badge>
                    <Badge variant="outline" className={getUrgencyColor(job.urgency)}>
                      {job.urgency}
                    </Badge>
                  </div>
                  <CardDescription className="text-base">
                    {job.description}
                  </CardDescription>
                </div>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {job.location}
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    {formatBudget(job.budget)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {job.applicationsCount} applications
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {new Date(job.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/jobs/${job.id}`}>View Details</Link>
                  </Button>
                  {job.status === 'open' && (
                    <Button size="sm" asChild>
                      <Link to={`/jobs/${job.id}/applications`}>
                        View Applications ({job.applicationsCount})
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {jobs.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No jobs posted yet</h3>
            <p className="text-muted-foreground mb-4">
              Get started by posting your first job and connecting with skilled workers.
            </p>
            <Button asChild>
              <Link to="/jobs/create">
                <Plus className="mr-2 h-4 w-4" />
                Post Your First Job
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
