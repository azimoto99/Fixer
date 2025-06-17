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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Building2, Upload, Plus, BarChart3, Users, Calendar, Eye, CheckCircle, XCircle } from 'lucide-react';
import { enterpriseApi, BulkJobRequest, EnterpriseMetrics } from '@/lib/enterpriseApi';
import { csvHelpers } from '@/lib/csvHelpers';
import type { BulkJobOperation, JobTemplate, WorkerPool } from '@fixer/shared';

interface JobPreview {
  title: string;
  description: string;
  location: string;
  category: string;
  payRate: string;
  schedule: string;
  isValid: boolean;
  errors: string[];
}

export default function EnterpriseDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPeriod] = useState('30d');
  
  const { data: metrics, isLoading: metricsLoading, error: metricsError } = useQuery<EnterpriseMetrics>({
    queryKey: ['enterprise-metrics', selectedPeriod],
    queryFn: () => enterpriseApi.getMetrics(selectedPeriod),
    staleTime: 5 * 60 * 1000,
    retry: 1,
    // Provide fallback data to prevent white screen
    select: (data) => data || {
      jobsPosted: 0,
      fillRate: 0,
      avgTimeToFill: 0,
      totalPayout: 0,
      period: '30d'
    }
  });

  const { data: templates = [], isLoading: templatesLoading, error: templatesError } = useQuery<JobTemplate[]>({
    queryKey: ['enterprise-templates'],
    queryFn: () => enterpriseApi.getTemplates(),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const { data: workerPools = [], isLoading: poolsLoading, error: poolsError } = useQuery<WorkerPool[]>({
    queryKey: ['enterprise-worker-pools'],
    queryFn: () => enterpriseApi.getWorkerPools(),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const { data: bulkOperations = [], isLoading: operationsLoading, error: operationsError } = useQuery<BulkJobOperation[]>({
    queryKey: ['enterprise-bulk-operations'],
    queryFn: () => enterpriseApi.getBulkOperations(),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 15000, // Refetch operations periodically for status updates
    retry: 1,
  });

  const [activeTab, setActiveTab] = useState('overview');
  const [bulkJobsFile, setBulkJobsFile] = useState<File | null>(null);
  const [uploadMethod, setUploadMethod] = useState<'csv' | 'form' | 'template'>('csv');
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDescription, setNewTemplateDescription] = useState('');
  
  // Template-based job creation state
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [templateJobCount, setTemplateJobCount] = useState<number>(1);
  const [templateDateRange, setTemplateDateRange] = useState({
    start: '',
    end: ''
  });
  const [jobPreviews, setJobPreviews] = useState<JobPreview[]>([]);
  const [showJobPreview, setShowJobPreview] = useState(false);
  const [operationDetailsOpen, setOperationDetailsOpen] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<BulkJobOperation | null>(null);

  const uploadBulkJobsMutation = useMutation({
    mutationFn: async (data: { file?: File; jobs?: BulkJobRequest }) => {
      // CSV path: parse locally then send JSON to bulk API
      if (data.file) {
        const validation = await csvHelpers.validateCSV(data.file);
        if (!validation.valid || !validation.data) {
          toast({ title: 'Invalid CSV File', description: validation.errors.join(', '), variant: 'destructive' });
          throw new Error('Invalid CSV file');
        }
        // Send parsed jobs to bulk creation endpoint
        return enterpriseApi.createBulkJobs({
          jobs: validation.data,
          publishImmediately: true,
          notifyWorkers: true,
        });
      }
      // Direct JSON path
      if (data.jobs) {
        return enterpriseApi.createBulkJobs(data.jobs);
      }
      throw new Error('No data provided for bulk job creation.');
    },
    onSuccess: (data: any) => {
      toast({
        title: 'Bulk operation processing', 
        description: `Operation ID: ${data.operationId}. Check the operations tab for status.`,
      });
      queryClient.invalidateQueries({ queryKey: ['enterprise-bulk-operations'] });
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

  const createTemplateMutation = useMutation({
    mutationFn: (data: Partial<JobTemplate>) => enterpriseApi.createTemplate(data),
    onSuccess: (template: any) => {
      toast({title: 'Template created', description: template.name});
      queryClient.invalidateQueries(['enterprise-templates']);
      setTemplateDialogOpen(false);
      setNewTemplateName('');
      setNewTemplateDescription('');
    },
    onError: (error: any) => {
      toast({title: 'Error creating template', description: error?.message, variant: 'destructive'});
    },
  });

  // Template job creation mutation
  const createJobsFromTemplateMutation = useMutation({
    mutationFn: async ({ templateId, dateRange, count }: { templateId: string, dateRange: { start: string, end: string }, count: number }) => {
      const generatedJobs = await enterpriseApi.generateJobsFromTemplate(templateId, dateRange, undefined, { count });
      return enterpriseApi.createBulkJobs({
        jobs: generatedJobs.jobs,
        templateId,
        publishImmediately: true,
        notifyWorkers: true,
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: 'Template jobs created',
        description: `Operation ID: ${data.operationId}. Check the operations tab for status.`,
      });
      queryClient.invalidateQueries({ queryKey: ['enterprise-bulk-operations'] });
      setShowJobPreview(false);
      setSelectedTemplateId('');
      setTemplateJobCount(1);
      setTemplateDateRange({ start: '', end: '' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create jobs from template',
        description: error?.message || 'Error generating jobs from template',
        variant: 'destructive',
      });
    },
  });

  // Template selection handler
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (templateId && templates) {
      const selectedTemplate = templates.find((t: any) => t.id === templateId);
      if (selectedTemplate) {
        generateJobPreviews(selectedTemplate);
      }
    }
  };

  // Generate job previews from template
  const generateJobPreviews = (template: JobTemplate) => {
    const previews: JobPreview[] = [];
    for (let i = 0; i < templateJobCount; i++) {
      previews.push({
        title: template.template.title || template.name,
        description: template.template.description || template.description,
        location: 'To be specified',
        category: template.category || 'General',
        payRate: `$${template.defaultBudget || 0} (${template.defaultDuration || 1}h)`,
        schedule: templateDateRange.start ? `${templateDateRange.start} - ${templateDateRange.end || 'TBD'}` : 'To be scheduled',
        isValid: true,
        errors: []
      });
    }
    setJobPreviews(previews);
  };

  // Generate job previews when template job count or date range changes
  const handlePreviewJobs = () => {
    if (selectedTemplateId && templates) {
      const template = templates.find((t: any) => t.id === selectedTemplateId);
      if (template) {
        generateJobPreviews(template);
        setShowJobPreview(true);
      }
    }
  };

  // View operation details
  const handleViewOperationDetails = (operation: BulkJobOperation) => {
    setSelectedOperation(operation);
    setOperationDetailsOpen(true);
  };

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
      {/* Loading State */}
      {(metricsLoading || templatesLoading || poolsLoading || operationsLoading) && (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {(metricsError || templatesError || poolsError || operationsError) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <XCircle className="h-5 w-5 text-red-500 mr-2" />
            <div>
              <h3 className="text-red-800 font-medium">API Connection Error</h3>
              <p className="text-red-700 text-sm mt-1">
                Some features may not work properly. The backend server may be unavailable.
              </p>
            </div>
          </div>
        </div>
      )}

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
              <Button data-dialog-trigger="bulk-jobs">
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
                    {selectedTemplateId ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold">Configure Template Jobs</h3>
                          <Button variant="outline" onClick={() => setSelectedTemplateId('')}>
                            Change Template
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="job-count">Number of Jobs</Label>
                            <Input
                              id="job-count"
                              type="number"
                              min="1"
                              max="100"
                              value={templateJobCount}
                              onChange={(e) => setTemplateJobCount(parseInt(e.target.value) || 1)}
                            />
                          </div>
                          <div>
                            <Label htmlFor="start-date">Start Date</Label>
                            <Input
                              id="start-date"
                              type="date"
                              value={templateDateRange.start}
                              onChange={(e) => setTemplateDateRange((prev: any) => ({ ...prev, start: e.target.value }))}
                            />
                          </div>
                        </div>

                        <div className="flex space-x-2">
                          <Button variant="outline" onClick={handlePreviewJobs} className="flex-1">
                            <Eye className="mr-2 h-4 w-4" />
                            Preview Jobs
                          </Button>
                          <Button 
                            onClick={() => {
                              if (selectedTemplateId && templateDateRange.start) {
                                createJobsFromTemplateMutation.mutate({
                                  templateId: selectedTemplateId,
                                  dateRange: templateDateRange,
                                  count: templateJobCount
                                });
                              }
                            }}
                            disabled={!selectedTemplateId || !templateDateRange.start || createJobsFromTemplateMutation.isPending}
                            className="flex-1"
                          >
                            {createJobsFromTemplateMutation.isPending ? 'Creating...' : 'Create Jobs'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="template-select">Select Template</Label>
                          <Select onValueChange={handleTemplateSelect}>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a template..." />
                            </SelectTrigger>
                            <SelectContent>
                              {templates?.map((template: any) => (
                                <SelectItem key={template.id} value={template.id}>
                                  {template.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {!templates?.length && (
                          <div className="text-center py-8 text-muted-foreground">
                            <Calendar className="mx-auto h-12 w-12 mb-4" />
                            <p>No templates available. Create a template first.</p>
                          </div>
                        )}
                      </div>
                    )}
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

      {/* Job Preview Dialog */}
      <Dialog open={showJobPreview} onOpenChange={setShowJobPreview}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Job Preview</DialogTitle>
            <DialogDescription>
              Review the jobs that will be created from the template
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
              {jobPreviews.map((preview: any, index: any) => (
                <Card key={index} className={`p-4 ${preview.isValid ? 'border-green-200' : 'border-red-200'}`}>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">Job #{index + 1}</h4>
                      {preview.isValid ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <div className="text-sm space-y-1">
                      <div><span className="font-medium">Title:</span> {preview.title}</div>
                      <div><span className="font-medium">Category:</span> {preview.category}</div>
                      <div><span className="font-medium">Pay Rate:</span> {preview.payRate}</div>
                      <div><span className="font-medium">Schedule:</span> {preview.schedule}</div>
                    </div>
                    {preview.errors.length > 0 && (
                      <div className="text-xs text-red-600">
                        {preview.errors.join(', ')}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowJobPreview(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (selectedTemplateId && templateDateRange.start) {
                    createJobsFromTemplateMutation.mutate({
                      templateId: selectedTemplateId,
                      dateRange: templateDateRange,
                      count: templateJobCount
                    });
                  }
                }}
                disabled={!selectedTemplateId || jobPreviews.some((p: any) => !p.isValid) || createJobsFromTemplateMutation.isPending}
              >
                {createJobsFromTemplateMutation.isPending ? 'Creating Jobs...' : `Create ${jobPreviews.length} Jobs`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                    bulkOperations.slice(0, 5).map((operation: BulkJobOperation) => (
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
            <Button onClick={() => setTemplateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Template
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Date Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templatesLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center">Loading...</TableCell></TableRow>
              ) : templates && templates.length > 0 ? (
                templates.map((tmpl: any) => (
                  <TableRow key={tmpl.id}>
                    <TableCell className="font-medium">{tmpl.name}</TableCell>
                    <TableCell>{tmpl.description}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{tmpl.category}</Badge>
                    </TableCell>
                    <TableCell>{new Date(tmpl.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedTemplateId(tmpl.id);
                            setUploadMethod('template');
                            // Open the bulk jobs dialog with template tab selected
                            const trigger = document.querySelector('[data-dialog-trigger="bulk-jobs"]') as HTMLElement;
                            trigger?.click();
                          }}
                        >
                          Use Template
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            toast({ title: 'Template Management', description: 'Template management coming soon', variant: 'default' });
                          }}
                        >
                          Manage
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No templates found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          
          <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Job Template</DialogTitle>
                <DialogDescription>
                  Create a reusable template for bulk job creation
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="template-name">Name</Label>
                  <Input 
                    id="template-name" 
                    value={newTemplateName} 
                    onChange={e => setNewTemplateName(e.target.value)}
                    placeholder="e.g., Office Cleaning Template"
                  />
                </div>
                <div>
                  <Label htmlFor="template-desc">Description</Label>
                  <Textarea 
                    id="template-desc" 
                    value={newTemplateDescription} 
                    onChange={e => setNewTemplateDescription(e.target.value)}
                    placeholder="Describe what this template is used for..."
                    rows={3}
                  />
                </div>
                <Button 
                  className="w-full" 
                  onClick={() => createTemplateMutation.mutate({ 
                    name: newTemplateName, 
                    description: newTemplateDescription,
                    category: 'general',
                    defaultDuration: 2,
                    defaultBudget: 50,
                    requiredSkills: [],
                    template: {
                      title: newTemplateName,
                      description: newTemplateDescription,
                      requirements: [],
                      deliverables: [],
                      timeline: 'As needed'
                    },
                    isActive: true
                  })} 
                  disabled={!newTemplateName || createTemplateMutation.isPending}
                >
                  {createTemplateMutation.isPending ? 'Creating...' : 'Create Template'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="worker-pools" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Worker Pools</h2>
              <p className="text-muted-foreground">
                Manage preferred worker groups for automatic job assignment
              </p>
            </div>
            <Button disabled>
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
                      <Button variant="outline" size="sm" className="flex-1" disabled>
                        Manage
                      </Button>
                      <Button size="sm" className="flex-1" disabled>
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
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleViewOperationDetails(operation)}
                          >
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
      
      {/* Operation Details Dialog */}
      <Dialog open={operationDetailsOpen} onOpenChange={setOperationDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Operation Details</DialogTitle>
            <DialogDescription>
              Detailed information about the bulk operation
            </DialogDescription>
          </DialogHeader>
          {selectedOperation && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Operation Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <span className="font-medium">ID:</span>
                      <span className="font-mono text-xs ml-2">{selectedOperation.id}</span>
                    </div>
                    <div>
                      <span className="font-medium">Type:</span>
                      <span className="ml-2 capitalize">{selectedOperation.type}</span>
                    </div>
                    <div>
                      <span className="font-medium">Status:</span>
                      <Badge variant={getOperationStatusBadgeVariant(selectedOperation.status)} className="ml-2">
                        {selectedOperation.status}
                      </Badge>
                    </div>
                    <div>
                      <span className="font-medium">Started:</span>
                      <span className="ml-2">{new Date(selectedOperation.startedAt).toLocaleString()}</span>
                    </div>
                    {selectedOperation.completedAt && (
                      <div>
                        <span className="font-medium">Completed:</span>
                        <span className="ml-2">{new Date(selectedOperation.completedAt).toLocaleString()}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Progress</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <span className="font-medium">Total Jobs:</span>
                      <span className="ml-2">{selectedOperation.totalJobs || 0}</span>
                    </div>
                    <div>
                      <span className="font-medium">Processed:</span>
                      <span className="ml-2 text-blue-600">{selectedOperation.processedJobs || 0}</span>
                    </div>
                    <div>
                      <span className="font-medium">Failed:</span>
                      <span className={`ml-2 ${(selectedOperation.failedJobs || 0) > 0 ? 'text-red-600' : ''}`}>
                        {selectedOperation.failedJobs || 0}
                      </span>
                    </div>
                    <div className="pt-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>
                          {selectedOperation.totalJobs ? 
                            Math.round(((selectedOperation.processedJobs || 0) / selectedOperation.totalJobs) * 100) : 0
                          }%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ 
                            width: `${selectedOperation.totalJobs ? 
                              ((selectedOperation.processedJobs || 0) / selectedOperation.totalJobs) * 100 : 0
                            }%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {selectedOperation.errors && selectedOperation.errors.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg text-red-600">Errors</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-64 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Row</TableHead>
                            <TableHead>Field</TableHead>
                            <TableHead>Message</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedOperation.errors.map((error, index) => (
                            <TableRow key={index}>
                              <TableCell>{error.row}</TableCell>
                              <TableCell>{error.field}</TableCell>
                              <TableCell>{error.message}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {selectedOperation.metadata && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Metadata</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {selectedOperation.metadata.filename && (
                      <div>
                        <span className="font-medium">Filename:</span>
                        <span className="ml-2">{selectedOperation.metadata.filename}</span>
                      </div>
                    )}
                    <div>
                      <span className="font-medium">Source:</span>
                      <span className="ml-2">{selectedOperation.metadata.source}</span>
                    </div>
                    {selectedOperation.metadata.template && (
                      <div>
                        <span className="font-medium">Template:</span>
                        <span className="ml-2">{selectedOperation.metadata.template}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
