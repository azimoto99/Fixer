import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export function CreateJobPage() {
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

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Post a New Job</CardTitle>
          <CardDescription>
            Create a job posting to find skilled workers for your task
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <h3 className="text-lg font-medium mb-2">Job Creation Form</h3>
            <p className="text-muted-foreground">
              This page will contain a comprehensive job creation form with fields for:
            </p>
            <ul className="text-left mt-4 space-y-2 text-sm text-muted-foreground max-w-md mx-auto">
              <li>• Job title and description</li>
              <li>• Category and subcategory</li>
              <li>• Location details</li>
              <li>• Budget and payment terms</li>
              <li>• Required skills</li>
              <li>• Job urgency and timeline</li>
              <li>• Photo uploads</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
