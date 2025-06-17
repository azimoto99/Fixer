import React, { useState } from 'react';
import { JobCard } from '../components/jobs/JobCard';
import { MapView } from '../components/jobs/MapView';
import { useJobs } from '../hooks/useApi';

export const JobsPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const { data: jobsResponse, isLoading: loading, error } = useJobs();
  
  const jobs = jobsResponse?.success ? (jobsResponse.data as any[]) : [];
  const errorMessage = error ? (error as any)?.message || 'Failed to load jobs' : null;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">Loading jobs...</div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Find Work</h1>
          <div className="bg-card rounded-lg p-8 mb-6">
            <h2 className="text-xl font-semibold mb-4">Currently Offline</h2>
            <p className="text-muted-foreground mb-4">
              We're working on connecting to our job database. Please check back soon!
            </p>
            <p className="text-destructive text-sm">Error: {errorMessage}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-card p-6 rounded-lg">
              <h3 className="font-semibold mb-2">🔧 Maintenance Jobs</h3>
              <p className="text-sm text-muted-foreground">HVAC, electrical, plumbing, and general maintenance work</p>
            </div>
            <div className="bg-card p-6 rounded-lg">
              <h3 className="font-semibold mb-2">🧹 Cleaning Services</h3>
              <p className="text-sm text-muted-foreground">Residential and commercial cleaning opportunities</p>
            </div>
            <div className="bg-card p-6 rounded-lg">
              <h3 className="font-semibold mb-2">🌿 Landscaping</h3>
              <p className="text-sm text-muted-foreground">Lawn care, gardening, and outdoor maintenance</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Find Work</h1>
          <div className="bg-card rounded-lg p-8 mb-6">
            <h2 className="text-xl font-semibold mb-4">No Jobs Available Right Now</h2>
            <p className="text-muted-foreground mb-4">
              Check back soon for new opportunities in your area!
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-card p-6 rounded-lg">
              <h3 className="font-semibold mb-2">🔧 Maintenance Jobs</h3>
              <p className="text-sm text-muted-foreground">HVAC, electrical, plumbing, and general maintenance work</p>
            </div>
            <div className="bg-card p-6 rounded-lg">
              <h3 className="font-semibold mb-2">🧹 Cleaning Services</h3>
              <p className="text-sm text-muted-foreground">Residential and commercial cleaning opportunities</p>
            </div>
            <div className="bg-card p-6 rounded-lg">
              <h3 className="font-semibold mb-2">🌿 Landscaping</h3>
              <p className="text-sm text-muted-foreground">Lawn care, gardening, and outdoor maintenance</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Available Jobs</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-md ${
              viewMode === 'list'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground'
            }`}
          >
            List View
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`px-4 py-2 rounded-md ${
              viewMode === 'map'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground'
            }`}
          >
            Map View
          </button>
        </div>
      </div>

      {viewMode === 'list' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.map((job: any) => (
            <JobCard key={job.id} {...job} />
          ))}
          {jobs.length === 0 && (
            <div className="col-span-full text-center text-muted-foreground py-8">
              No jobs available at the moment.
            </div>
          )}
        </div>
      ) : (
        <MapView jobs={jobs} />
      )}
    </div>
  );
};
