import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useCreateJob } from '@/hooks/useApi';

// Create a form schema based on the job schema
const formSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(100, 'Title must be less than 100 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters').max(2000, 'Description must be less than 2000 characters'),
  category: z.string().min(1, 'Please select a category'),
  locationAddress: z.string().min(1, 'Address is required'),
  locationCity: z.string().min(1, 'City is required'),
  locationState: z.string().min(1, 'State is required'),
  locationZip: z.string().min(1, 'ZIP code is required'),
  locationLat: z.number().min(-90).max(90),
  locationLng: z.number().min(-180).max(180),
  price: z.number().min(0, 'Price must be a positive number'),
  priceType: z.enum(['fixed', 'hourly']),
  requiredSkills: z.array(z.string()).optional(),
  urgency: z.enum(['low', 'normal', 'high', 'urgent']),
  estimatedDurationHours: z.number().min(1).max(168).optional(),
  scheduledStart: z.date().optional(),
});

// Job categories
const JOB_CATEGORIES = [
  'Home Repair',
  'Plumbing',
  'Electrical',
  'Carpentry',
  'Painting',
  'Cleaning',
  'Moving',
  'Landscaping',
  'Automotive',
  'Technology',
  'Other',
];

export function CreateJobPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const createJobMutation = useCreateJob();

  // Initialize form with default values
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      category: '',
      locationAddress: '',
      locationCity: '',
      locationState: '',
      locationZip: '',
      locationLat: 0,
      locationLng: 0,
      price: 0,
      priceType: 'fixed',
      requiredSkills: [],
      urgency: 'normal',
      estimatedDurationHours: 1,
    },
  });

  // Handle form submission
  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await createJobMutation.mutateAsync({
        title: values.title,
        description: values.description,
        category: values.category,
        location: {
          address: values.locationAddress,
          city: values.locationCity,
          state: values.locationState,
          zipCode: values.locationZip,
          latitude: values.locationLat,
          longitude: values.locationLng,
        },
        budget: {
          type: values.priceType,
          amount: values.price,
          currency: 'USD',
        },
        urgency: values.urgency,
        estimatedDuration: values.estimatedDurationHours?.toString() || '1',
        requiredSkills: values.requiredSkills || [],
        jobType: 'one_time',
      });
      
      toast({
        title: "Job Created",
        description: "Your job has been posted successfully.",
      });
      
      // Redirect to jobs page
      navigate('/jobs');
    } catch (error) {
      console.error('Error creating job:', error);
      toast({
        title: "Error",
        description: "Failed to create job. Please try again.",
        variant: "destructive",
      });
    }
  }

  // TODO: Implement geocoding for address to lat/lng conversion
  const handleAddressChange = (address: string) => {
    // For now, set dummy coordinates
    form.setValue('locationLat', 37.7749);
    form.setValue('locationLng', -122.4194);
  };

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

      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Post a New Job</CardTitle>
          <CardDescription>
            Create a job posting to find skilled workers for your task
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Job Details Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Job Details</h3>
                
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Fix leaking kitchen sink" {...field} />
                      </FormControl>
                      <FormDescription>
                        A clear, concise title for your job
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe the job in detail..." 
                          className="min-h-[120px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Include all relevant details about the job
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {JOB_CATEGORIES.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Choose the category that best fits your job
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Location Section */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-medium">Location</h3>
                
                <FormField
                  control={form.control}
                  name="locationAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="123 Main St" 
                          {...field} 
                          onChange={(e) => {
                            field.onChange(e);
                            handleAddressChange(e.target.value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="locationCity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="City" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="locationState"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Input placeholder="State" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="locationZip"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ZIP Code</FormLabel>
                      <FormControl>
                        <Input placeholder="ZIP Code" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Pricing Section */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-medium">Pricing & Timeline</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="0.00" 
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="priceType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price Type</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select price type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="fixed">Fixed Price</SelectItem>
                            <SelectItem value="hourly">Hourly Rate</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="urgency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Urgency</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select urgency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="estimatedDurationHours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estimated Duration (hours)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="1" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              {/* Submit Button */}
              <div className="pt-6 border-t">
                <Button type="submit" className="w-full" disabled={createJobMutation.isPending}>
                  {createJobMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Job...
                    </>
                  ) : (
                    'Post Job'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
