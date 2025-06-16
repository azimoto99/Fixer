import { useState, ChangeEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Building2, Upload, Plus, BarChart3, Users, Calendar, MapPin } from 'lucide-react';
import { enterpriseApi, BulkJobRequest, csvHelpers, EnterpriseMetrics } from '@/lib/enterpriseApi'; // Added EnterpriseMetrics
import type { BulkJobOperation, JobTemplate, WorkerPool } from '@fixer/shared';

export default function EnterpriseDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPeriod] = useState('30d');
  
  const { data: metrics, isLoading: metricsLoading } = useQuery<EnterpriseMetrics>({
    queryKey: ['enterprise-metrics', selectedPeriod],
    queryFn: () => enterpriseApi.getMetrics(selectedPeriod),
    staleTime: 5 * 60 * 1000, 
  });

  const { data: templates, isLoading: templatesLoading } = useQuery<JobTemplate[]>({
    queryKey: ['enterprise-templates'],
    queryFn: () => enterpriseApi.getTemplates(),
    staleTime: 10 * 60 * 1000, 
  });

  const { data: workerPools, isLoading: poolsLoading } = useQuery<WorkerPool[]>({
    queryKey: ['enterprise-worker-pools'],
    queryFn: () => enterpriseApi.getWorkerPools(),
    staleTime: 10 * 60 * 1000, 
  });

  const { data: bulkOperations, isLoading: operationsLoading } = useQuery<BulkJobOperation[]>({
    queryKey: ['enterprise-bulk-operations'],
    queryFn: () => enterpriseApi.getBulkOperations(),
    staleTime: 5 * 60 * 1000, 
    refetchInterval: 15000, // Refetch operations periodically for status updates
  });

  const [activeTab, setActiveTab] = useState('overview');
  const [bulkJobsFile, setBulkJobsFile] = useState<File | null>(null);
  const [uploadMethod, setUploadMethod] = useState<'csv' | 'form' | 'template'>('csv');

  const uploadBulkJobsMutation = useMutation({
    mutationFn: async (data: { file?: File; jobs?: BulkJobRequest }) => {
      if (data.file) {
        const validation = await csvHelpers.validateCSV(data.file);
        if (!validation.valid) {
          toast({
            title: 'Invalid CSV File',
            description: validation.errors.join(', '),
            variant: 'destructive',
          });
          throw new Error('Invalid CSV file');
        }
        return enterpriseApi.uploadCSV(data.file);
      } else if (data.jobs) {
        return enterpriseApi.createBulkJobs(data.jobs);
      } else {
        throw new Error('No data provided for bulk job creation.');
      }
    },
    onSuccess: (data) => {
      toast({
        title: 'Bulk operation processing', // Changed title to reflect async nature
        description: `Operation ID: ${data.operationId}. Check the operations tab for status.`,
      });
      queryClient.invalidateQueries({ queryKey: ['enterprise-bulk-operations'] });
      // Optionally invalidate metrics if they are expected to change immediately
      // queryClient.invalidateQueries({ queryKey: ['enterprise-metrics'] }); 
      setBulkJobsFile(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Operation failed',
        description: error?.message || 'Failed to process bulk job operation',
        variant: 'destructive',
      });
    },
  });

  const handleFileUpload = () => {
    if (bulkJobsFile) {
      uploadBulkJobsMutation.mutate({ file: bulkJobsFile });
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setBulkJobsFile(event.target.files[0]);
    }
  };

  const downloadCsvTemplate = () => {
    csvHelpers.downloadTemplate();
  };

  // Helper to determine badge variant based on operation status
  const getOperationStatusBadgeVariant = (status: BulkJobOperation['status']) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'processing':
        return 'outline';
      case 'pending':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Building2 className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold">Enterprise Dashboard</h1>
            <p className="text-muted-foreground">
              Manage bulk job postings and enterprise operations
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Bulk Jobs
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Bulk Jobs</DialogTitle>
                <DialogDescription>
                  Upload a CSV file or use a template to create multiple jobs at once
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                <Tabs value={uploadMethod} onValueChange={(value: string) => setUploadMethod(value as 'csv' | 'form' | 'template')}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="csv">CSV Upload</TabsTrigger>
                    <TabsTrigger value="template" disabled>Template</TabsTrigger>
                    <TabsTrigger value="form" disabled>Manual Form</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="csv" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="csv-file">CSV File</Label>
                      <Input
                        id="csv-file"
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                      />
                      <p className="text-sm text-muted-foreground">
                        Upload a CSV file with job details. 
                        <Button variant="link" size="sm" onClick={downloadCsvTemplate} className="p-0 h-auto">
                          Download template
                        </Button>
                      </p>
                    </div>
                    <Button 
                      onClick={handleFileUpload} 
                      disabled={!bulkJobsFile || uploadBulkJobsMutation.isPending}
                      className="w-full"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {uploadBulkJobsMutation.isPending ? 'Uploading...' : 'Upload Jobs'}
                    </Button>
                  </TabsContent>
                  
                  <TabsContent value="template" className="space-y-4">
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="mx-auto h-12 w-12 mb-4" />
                      <p>Template-based job creation coming soon</p>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="form" className="space-y-4">
                    <div className="text-center py-8 text-muted-foreground">
                      <Plus className="mx-auto h-12 w-12 mb-4" />
                      <p>Manual bulk job form coming soon</p>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="worker-pools">Worker Pools</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Jobs Posted</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metricsLoading ? '...' : (metrics?.jobsPosted || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Last {metrics?.period || '30d'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Fill Rate</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metricsLoading ? '...' : `${metrics?.fillRate || 0}%`}
                </div>
                <p className="text-xs text-muted-foreground">
                  {/* Placeholder for comparison data */}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Time to Fill</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metricsLoading ? '...' : `${metrics?.avgTimeToFill || 0}h`}
                </div>
                <p className="text-xs text-muted-foreground">
                  {/* Placeholder for comparison data */}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Payout</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metricsLoading ? '...' : `$${(metrics?.totalPayout || 0).toLocaleString()}`}
                </div>
                <p className="text-xs text-muted-foreground">
                  {/* Placeholder for comparison data */}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Operations */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Bulk Operations</CardTitle>
              <CardDescription>
                Latest bulk job operations and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Jobs (Processed/Total)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date Started</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {operationsLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center">
                        Loading operations...
                      </TableCell>
                    </TableRow>
                  ) : bulkOperations && bulkOperations.length > 0 ? (
                    bulkOperations.slice(0, 5).map((operation: BulkJobOperation) => ( // Displaying latest 5
                      <TableRow key={operation.id}>
                        <TableCell className="capitalize">{operation.type}</TableCell>
                        <TableCell>
                          {operation.processedJobs || 0}/{operation.totalJobs || 0}
                          {(operation.failedJobs || 0) > 0 && (
                            <span className="text-red-500 ml-1">
                              ({operation.failedJobs} failed)
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getOperationStatusBadgeVariant(operation.status)}>
                            {operation.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(operation.startedAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No bulk operations found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Job Templates</h2>
              <p className="text-muted-foreground">
                Create and manage reusable job templates
              </p>
            </div>
            <Button disabled> {/* TODO: Implement New Template Dialog */}
              <Plus className="mr-2 h-4 w-4" />
              New Template
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templatesLoading ? (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                Loading templates...
              </div>
            ) : templates && templates.length > 0 ? (
              templates?.map((template: JobTemplate) => (
                <Card key={template.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription>{template.description || 'No description'}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>Category: {template.category}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Last updated: {new Date(template.updatedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      <span>{template.isActive ? 'Active' : 'Inactive'}</span>
                    </div>
                    <div className="flex space-x-2 pt-2">
                      <Button variant="outline" size="sm" className="flex-1" disabled> {/* TODO: Implement Edit */}
                        Edit
                      </Button>
                      <Button size="sm" className="flex-1" disabled> {/* TODO: Implement Use Template */}
                        Use Template
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                <Plus className="mx-auto h-12 w-12 mb-4" />
                <p>No templates found. Create your first template to get started.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="worker-pools" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Worker Pools</h2>
              <p className="text-muted-foreground">
                Manage preferred worker groups for automatic job assignment
              </p>
            </div>
            <Button disabled> {/* TODO: Implement New Pool Dialog */}
              <Plus className="mr-2 h-4 w-4" />
              New Pool
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {poolsLoading ? (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                Loading worker pools...
              </div>
            ) : workerPools && workerPools.length > 0 ? (
              workerPools.map((pool: WorkerPool) => (
                <Card key={pool.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{pool.name}</CardTitle>
                        <CardDescription>{pool.description || 'No description'}</CardDescription>
                      </div>
                      <Badge variant={pool.isActive ? 'default' : 'secondary'}>
                        {pool.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm">
                      <Users className="h-4 w-4" />
                      <span>{pool.workerIds.length || 0} workers</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <BarChart3 className="h-4 w-4" />
                      <span>Skills: {pool.skills.join(', ') || 'Any'}</span>
                    </div>
                    <div className="flex space-x-2 pt-2">
                      <Button variant="outline" size="sm" className="flex-1" disabled> {/* TODO: Implement Manage */}
                        Manage
                      </Button>
                      <Button size="sm" className="flex-1" disabled> {/* TODO: Implement View Workers */}
                        View Workers
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                <Users className="mx-auto h-12 w-12 mb-4" />
                <p>No worker pools found. Create your first pool to get started.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="operations" className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold">All Bulk Operations</h2>
            <p className="text-muted-foreground">
              Track and manage all bulk job operations
            </p>
          </div>

          <Card>
            <CardContent className="p-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Operation ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Processed</TableHead>
                    <TableHead>Failed</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {operationsLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center">
                        Loading operations...
                      </TableCell>
                    </TableRow>
                  ) : bulkOperations && bulkOperations.length > 0 ? (
                    bulkOperations.map((operation: BulkJobOperation) => (
                      <TableRow key={operation.id}>
                        <TableCell className="font-mono text-xs truncate" title={operation.id}>
                          {operation.id}
                        </TableCell>
                        <TableCell className="capitalize">{operation.type}</TableCell>
                        <TableCell>{operation.totalJobs || 0}</TableCell>
                        <TableCell className="text-blue-600">
                          {operation.processedJobs || 0}
                        </TableCell>
                        <TableCell className={(operation.failedJobs || 0) > 0 ? 'text-red-600' : ''}>
                          {operation.failedJobs || 0}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getOperationStatusBadgeVariant(operation.status)}>
                            {operation.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(operation.startedAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {operation.completedAt ? new Date(operation.completedAt).toLocaleString() : '-'}
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" disabled> {/* TODO: Implement View Details/Errors */}
                            Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground">
                        No bulk operations found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
