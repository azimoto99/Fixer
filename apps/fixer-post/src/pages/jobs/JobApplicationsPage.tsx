import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, User, Calendar, DollarSign, Clock, CheckCircle, X } from 'lucide-react';
import { useJobApplications, useAcceptApplication, useRejectApplication } from '@/hooks/useApi';

export function JobApplicationsPage() {
  const { id: jobId } = useParams<{ id: string }>();
  const { data: applicationsResponse, isLoading, error } = useJobApplications(jobId!);
  const acceptApplicationMutation = useAcceptApplication();
  const rejectApplicationMutation = useRejectApplication();
  
  const applications = (applicationsResponse as any)?.applications || [];

  const handleAcceptApplication = async (applicationId: string) => {
    try {
      await acceptApplicationMutation.mutateAsync(applicationId);
      alert('Application accepted successfully!');
    } catch (error) {
      console.error('Error accepting application:', error);
      alert('Failed to accept application');
    }
  };

  const handleRejectApplication = async (applicationId: string) => {
    try {
      await rejectApplicationMutation.mutateAsync(applicationId);
      alert('Application rejected');
    } catch (error) {
      console.error('Error rejecting application:', error);
      alert('Failed to reject application');
    }
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading applications...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-8">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium mb-2 text-red-600">Error Loading Applications</h3>
          <p className="text-muted-foreground mb-4">
            There was a problem loading applications. Please try again.
          </p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'withdrawn':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container py-8">
      {/* Back Button */}
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link to="/jobs">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Jobs
          </Link>
        </Button>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">Job Applications</h1>
        <p className="text-muted-foreground mt-2">
          Review and manage applications for this job
        </p>
      </div>

      {applications.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Applications Yet</h3>
            <p className="text-muted-foreground">
              When workers apply to your job, their applications will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {applications.map((application: any) => (
            <Card key={application.id} className="overflow-hidden">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-4">
                    <Avatar>
                      <AvatarFallback>
                        {application.worker?.fullName?.[0] || 'W'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-lg font-medium">
                        {application.worker?.fullName || 'Unknown Worker'}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          Applied {new Date(application.appliedAt).toLocaleDateString()}
                        </div>
                        {application.proposedPrice && (
                          <div className="flex items-center">
                            <DollarSign className="h-4 w-4 mr-1" />
                            ${application.proposedPrice}
                          </div>
                        )}
                        {application.estimatedCompletionTime && (
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {application.estimatedCompletionTime} hours
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <Badge className={getStatusColor(application.status)}>
                    {application.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Application Message</h4>
                    <p className="text-muted-foreground whitespace-pre-line">
                      {application.message}
                    </p>
                  </div>
                  
                  {application.status === 'pending' && (
                    <div className="flex space-x-3 pt-4 border-t">
                      <Button
                        onClick={() => handleAcceptApplication(application.id)}
                        disabled={acceptApplicationMutation.isPending}
                        className="flex-1"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {acceptApplicationMutation.isPending ? 'Accepting...' : 'Accept'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleRejectApplication(application.id)}
                        disabled={rejectApplicationMutation.isPending}
                        className="flex-1"
                      >
                        <X className="h-4 w-4 mr-2" />
                        {rejectApplicationMutation.isPending ? 'Rejecting...' : 'Reject'}
                      </Button>
                    </div>
                  )}
                  
                  {application.status === 'accepted' && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-green-800 font-medium">
                        ✅ Application Accepted
                      </p>
                      <p className="text-green-700 text-sm mt-1">
                        This worker has been assigned to your job. You can now coordinate directly with them.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
