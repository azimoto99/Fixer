import { useState } from 'react';
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
import { enterpriseApi } from '@/lib/enterpriseApi';

export default function EnterpriseDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPeriod] = useState('30d');
  
  // Fetch enterprise metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['enterprise-metrics', selectedPeriod],
    queryFn: () => enterpriseApi.getMetrics(selectedPeriod),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch job templates
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ['enterprise-templates'],
    queryFn: () => enterpriseApi.getTemplates(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Fetch worker pools
  const { data: workerPools, isLoading: poolsLoading } = useQuery({
    queryKey: ['enterprise-worker-pools'],
    queryFn: () => enterpriseApi.getWorkerPools(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Fetch bulk operations
  const { data: bulkOperations, isLoading: operationsLoading } = useQuery({
    queryKey: ['enterprise-bulk-operations'],
    queryFn: () => enterpriseApi.getBulkOperations(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutation for creating bulk jobs (TODO: connect to UI)
  // const createBulkJobsMutation = useMutation({
  //   mutationFn: (data: any) => enterpriseApi.createBulkJobs(data),
  //   onSuccess: (response) => {
  //     toast({
  //       title: "Bulk Jobs Created",
  //       description: `Successfully created ${response.created} jobs.`,
  //     });
  //     queryClient.invalidateQueries({ queryKey: ['enterprise-metrics'] });
  //     queryClient.invalidateQueries({ queryKey: ['enterprise-bulk-operations'] });
  //   },
  //   onError: (error: any) => {
  //     toast({
  //       title: "Error",
  //       description: error.message || "Failed to create bulk jobs.",
  //       variant: "destructive",
  //     });
  //   },
  // });

  const [activeTab, setActiveTab] = useState('overview');
  const [bulkJobsFile, setBulkJobsFile] = useState<File | null>(null);
  const [uploadMethod, setUploadMethod] = useState<'csv' | 'form' | 'template'>('csv');

  const uploadBulkJobs = useMutation({
    mutationFn: async (file: File) => {
      // Parse CSV file and create bulk job request
      const formData = new FormData();
      formData.append('file', file);
      
      // For now, we'll create a simple bulk job request
      // In a real implementation, you'd parse the CSV and create proper job data
      const bulkJobRequest = {
        jobs: [], // This would be populated from CSV parsing
        publishImmediately: true,
        notifyWorkers: true
      };
      
      return await enterpriseApi.createBulkJobs(bulkJobRequest);
    },
    onSuccess: (data) => {
      toast({
        title: 'Bulk jobs created successfully',
        description: `Created ${data.created} jobs${data.failed > 0 ? `, ${data.failed} failed` : ''}`,
      });
      queryClient.invalidateQueries({ queryKey: ['enterprise-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['enterprise-bulk-operations'] });
      setBulkJobsFile(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Upload failed',
        description: error?.message || 'Failed to process bulk job upload',
        variant: 'destructive',
      });
    },
  });

  const handleFileUpload = () => {
    if (bulkJobsFile) {
      uploadBulkJobs.mutate(bulkJobsFile);
    }
  };

  const downloadTemplate = () => {
    const csvContent = [
      'title,description,category,address,city,state,zipCode,latitude,longitude,payAmount,payType,estimatedDuration,requirements,urgency,workerCount,backgroundCheckRequired,equipmentProvided,scheduledStart,clientNotes',
      'Office Cleaning,Daily office cleaning and maintenance,cleaning,"123 Main St, Suite 100",Springfield,IL,62701,39.7817,-89.6501,25.00,hourly,2,"vacuuming;dusting;trash removal",medium,1,false,true,2024-01-15T09:00:00Z,Please use eco-friendly products',
      'Lawn Maintenance,Weekly lawn mowing and edging,landscaping,"456 Oak Ave",Springfield,IL,62704,39.7990,-89.6540,150.00,fixed,3,"mowing;edging;leaf removal",low,2,false,true,2024-01-16T08:00:00Z,Equipment storage available in garage'
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk-jobs-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
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
                    <TabsTrigger value="template">Template</TabsTrigger>
                    <TabsTrigger value="form">Manual Form</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="csv" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="csv-file">CSV File</Label>
                      <Input
                        id="csv-file"
                        type="file"
                        accept=".csv"
                        onChange={(e) => setBulkJobsFile(e.target.files?.[0] || null)}
                      />
                      <p className="text-sm text-muted-foreground">
                        Upload a CSV file with job details. 
                        <Button variant="link" size="sm" onClick={downloadTemplate} className="p-0 h-auto">
                          Download template
                        </Button>
                      </p>
                    </div>
                    <Button 
                      onClick={handleFileUpload} 
                      disabled={!bulkJobsFile || uploadBulkJobs.isPending}
                      className="w-full"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {uploadBulkJobs.isPending ? 'Uploading...' : 'Upload Jobs'}
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
                  +2% from last month
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
                  -0.8h from last month
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
                  +12% from last month
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
                    <TableHead>Jobs</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
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
                    bulkOperations.map((operation) => (
                      <TableRow key={operation.id}>
                        <TableCell className="capitalize">{operation.type}</TableCell>
                        <TableCell>
                          {operation.successfulJobs || 0}/{operation.totalJobs || 0}
                          {(operation.failedJobs || 0) > 0 && (
                            <span className="text-red-500 ml-1">
                              ({operation.failedJobs} failed)
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            operation.status === 'completed' ? 'default' :
                            operation.status === 'partial' ? 'secondary' : 'destructive'
                          }>
                            {operation.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(operation.createdAt).toLocaleDateString()}
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
            <Button>
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
              templates?.map((template: any) => (
                <Card key={template.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription>{template.description || 'No description'}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{template.locations || 0} locations</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Last used: {template.lastUsed ? new Date(template.lastUsed).toLocaleDateString() : 'Never'}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      <span>{template.totalJobs || 0} jobs created</span>
                    </div>
                    <div className="flex space-x-2 pt-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        Edit
                      </Button>
                      <Button size="sm" className="flex-1">
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
            <Button>
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
              workerPools.map((pool) => (
                <Card key={pool.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{pool.name}</CardTitle>
                        <CardDescription>{pool.description || 'No description'}</CardDescription>
                      </div>
                      <Badge variant={pool.autoInvite ? 'default' : 'secondary'}>
                        {pool.autoInvite ? 'Auto-invite' : 'Manual'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm">
                      <Users className="h-4 w-4" />
                      <span>{pool.workerCount || 0} workers</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <BarChart3 className="h-4 w-4" />
                      <span>Avg rating: {pool.avgRating || 0}/5</span>
                    </div>
                    <div className="flex space-x-2 pt-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        Manage
                      </Button>
                      <Button size="sm" className="flex-1">
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
            <h2 className="text-2xl font-bold">Bulk Operations</h2>
            <p className="text-muted-foreground">
              Track and manage all bulk job operations
            </p>
          </div>

          <Card>
            <CardContent className="p-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Operation ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Total Jobs</TableHead>
                    <TableHead>Successful</TableHead>
                    <TableHead>Failed</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {operationsLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center">
                        Loading operations...
                      </TableCell>
                    </TableRow>
                  ) : bulkOperations && bulkOperations.length > 0 ? (
                    bulkOperations.map((operation) => (
                      <TableRow key={operation.id}>
                        <TableCell className="font-mono text-sm">
                          {operation.id}
                        </TableCell>
                        <TableCell className="capitalize">{operation.type}</TableCell>
                        <TableCell>{operation.totalJobs || 0}</TableCell>
                        <TableCell className="text-green-600">
                          {operation.successfulJobs || 0}
                        </TableCell>
                        <TableCell className={(operation.failedJobs || 0) > 0 ? 'text-red-600' : ''}>
                          {operation.failedJobs || 0}
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            operation.status === 'completed' ? 'default' :
                            operation.status === 'partial' ? 'secondary' : 'destructive'
                          }>
                            {operation.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(operation.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
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
