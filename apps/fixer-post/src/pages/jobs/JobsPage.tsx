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
  MoreHorizontal,
  Briefcase
} from 'lucide-react';
import { useMyJobs } from '@/hooks/useApi';
import { Job } from '@fixer/shared/types'; 

export function JobsPage() {
  const { data: jobsResponse, isLoading, isError, error } = useMyJobs();
  const jobs: Job[] = jobsResponse?.data || [];

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
    if (!budget) return 'N/A';
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
        {isLoading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your jobs...</p>
          </div>
        )}

        {isError && (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium mb-2 text-red-600">Error Loading Jobs</h3>
            <p className="text-muted-foreground mb-4">
              {error instanceof Error ? error.message : 'There was a problem loading your jobs. Please try again.'}
            </p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        )}

        {!isLoading && !isError && Array.isArray(jobs) && jobs.map((job: Job) => ( 
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
                    {job.location?.address || 'Remote'} 
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    {formatBudget(job.budget)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {job.applicationsCount ?? 0} applications 
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/jobs/${job.id}`}>View Details</Link>
                  </Button>
                  {job.status === 'open' && (
                    <Button size="sm" asChild>
                      <Link to={`/jobs/${job.id}/applications`}>
                        View Applications ({job.applicationsCount ?? 0})
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!isLoading && !isError && Array.isArray(jobs) && jobs.length === 0 && (
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
