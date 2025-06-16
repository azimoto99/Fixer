import React, { useState } from 'react';
import { JobCard } from '../components/jobs/JobCard';
import { MapView } from '../components/jobs/MapView';
import { useJobs } from '../hooks/useApi';

export const JobsPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const { data: jobsResponse, isLoading: loading, error } = useJobs();
  
  const jobs = (jobsResponse?.data as any[]) || [];
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
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-500">{errorMessage}</div>
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
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            List View
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`px-4 py-2 rounded-md ${
              viewMode === 'map'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700'
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
            <div className="col-span-full text-center text-gray-500 py-8">
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
