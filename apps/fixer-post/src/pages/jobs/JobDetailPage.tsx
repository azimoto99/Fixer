import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export function JobDetailPage() {
  const { id } = useParams();

  return (
    <div className="container py-8">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link to="/jobs">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Jobs
          </Link>
        </Button>
      </div>

      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Job Details</CardTitle>
          <CardDescription>
            View and manage your job posting (ID: {id})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <h3 className="text-lg font-medium mb-2">Job Detail View</h3>
            <p className="text-muted-foreground">
              This page will display comprehensive job details including:
            </p>
            <ul className="text-left mt-4 space-y-2 text-sm text-muted-foreground max-w-md mx-auto">
              <li>• Complete job information</li>
              <li>• Application management</li>
              <li>• Worker communication</li>
              <li>• Payment processing</li>
              <li>• Job status updates</li>
              <li>• Review and rating system</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
