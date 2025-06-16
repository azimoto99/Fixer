import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Job } from '@fixer/shared';
import { JobLocationMap } from '../components/jobs/JobLocationMap';
import { Button } from '../components/ui/button';
import { api } from '../lib/api';

export const JobDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchJob = async () => {
      if (!id) {
        setError('No job ID provided');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await api.getJob(id);
        if (response.success && response.data) {
          setJob(response.data as Job);
        } else {
          setError(response.error?.message || 'Failed to load job');
        }
      } catch (err) {
        setError('Failed to load job details');
        console.error('Error fetching job:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchJob();
  }, [id]);

  const handleApplyToJob = async () => {
    if (!job) return;

    try {
      const response = await api.createApplication({
        jobId: job.id,
        message: 'I am interested in this job opportunity.',
      });
      
      if (response.success) {
        alert('Application submitted successfully!');
      } else {
        alert(response.error?.message || 'Failed to submit application');
      }
    } catch (err) {
      console.error('Error applying to job:', err);
      alert('Failed to submit application');
    }
  };

  if (!id) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Error</h1>
          <p className="mt-2">No job ID provided</p>
          <Button onClick={() => navigate('/jobs')} className="mt-4">
            Back to Jobs
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">Loading job details...</div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 mb-4">{error || 'Job not found'}</div>
          <button
            onClick={() => navigate('/jobs')}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Back to Jobs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <button
        onClick={() => navigate('/jobs')}
        className="mb-6 text-blue-500 hover:text-blue-700 flex items-center gap-2"
      >
        ← Back to Jobs
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h1 className="text-3xl font-bold mb-4">{job.title}</h1>
          
          <div className="bg-card rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Job Details</h2>
            <div className="space-y-3">
              <div>
                <span className="font-medium">Budget:</span>
                <span className="ml-2">
                  {job.budget.type === 'fixed' && job.budget.amount 
                    ? `$${job.budget.amount}` 
                    : job.budget.type === 'hourly' && job.budget.amount
                    ? `$${job.budget.amount}/hr`
                    : job.budget.type === 'negotiable'
                    ? 'Negotiable'
                    : job.budget.minAmount && job.budget.maxAmount
                    ? `$${job.budget.minAmount} - $${job.budget.maxAmount}`
                    : 'TBD'
                  }
                </span>
              </div>
              <div>
                <span className="font-medium">Location:</span>
                <span className="ml-2">{job.location.address}, {job.location.city}, {job.location.state}</span>
              </div>
              <div>
                <span className="font-medium">Urgency:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                  job.urgency === 'urgent' ? 'bg-red-100 text-red-800' :
                  job.urgency === 'high' ? 'bg-orange-100 text-orange-800' :
                  job.urgency === 'medium' ? 'bg-blue-100 text-blue-800' :
                  'bg-secondary text-secondary-foreground'
                }`}>
                  {job.urgency}
                </span>
              </div>
              <div>
                <span className="font-medium">Status:</span>
                <span className="ml-2 capitalize">{job.status}</span>
              </div>
              <div>
                <span className="font-medium">Posted:</span>
                <span className="ml-2">{new Date(job.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Description</h2>
            <p className="text-foreground whitespace-pre-wrap">{job.description}</p>
          </div>

          <button
            onClick={handleApplyToJob}
            className="w-full bg-primary text-primary-foreground py-3 px-6 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Apply for This Job
          </button>
        </div>

        <div>
          <div className="bg-card rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Location</h2>
            <JobLocationMap 
              jobLocation={{
                lat: job.location.latitude || 0,
                lng: job.location.longitude || 0,
                address: job.location.address
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
