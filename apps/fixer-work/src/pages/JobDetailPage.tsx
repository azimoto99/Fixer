import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft, MapPin, Calendar, Clock, DollarSign, Tag, User, AlertCircle, Navigation } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { JobLocationMap } from "@/components/jobs/JobLocationMap";

// Extended mock job data with coordinates
const MOCK_JOBS = [
  {
    id: "1",
    title: "Fix Leaking Kitchen Sink",
    description: "Need a plumber to fix a leaking kitchen sink. The leak is coming from the pipe under the sink and causing water damage to the cabinet. I've tried tightening the connections but that didn't solve the issue. The sink is a standard double-basin stainless steel model, about 5 years old. Please bring appropriate tools and parts that might be needed for the repair.",
    category: "Plumbing",
    price: 120,
    priceType: "fixed",
    locationAddress: "123 Main St",
    locationCity: "San Francisco",
    locationState: "CA",
    locationZip: "94105",
    locationLat: 37.7749,
    locationLng: -122.4194,
    distance: 3.2,
    urgency: "high",
    createdAt: "2023-06-15T10:30:00Z",
    estimatedDurationHours: 2,
    requiredSkills: ["Plumbing", "Pipe Repair", "Sink Installation"],
    posterName: "John Smith",
    posterRating: 4.8,
  },
  {
    id: "2",
    title: "Install Ceiling Fan",
    description: "Looking for an electrician to install a ceiling fan in the living room. The wiring is already in place from a previous light fixture. The ceiling is about 10 feet high, so a ladder will be needed. The fan is a Hunter model with remote control and light kit. I have all the parts and instructions, just need someone with the expertise to install it safely.",
    category: "Electrical",
    price: 85,
    priceType: "fixed",
    locationAddress: "456 Oak Ave",
    locationCity: "Oakland",
    locationState: "CA",
    locationZip: "94610",
    locationLat: 37.8044,
    locationLng: -122.2711,
    distance: 5.7,
    urgency: "normal",
    createdAt: "2023-06-14T14:45:00Z",
    estimatedDurationHours: 1.5,
    requiredSkills: ["Electrical", "Ceiling Fan Installation", "Wiring"],
    posterName: "Sarah Johnson",
    posterRating: 4.5,
  },
];

export function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [applicationMessage, setApplicationMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | undefined>();
  const [proposedPrice, setProposedPrice] = useState<number>(0);
  
  // Find the job with the matching ID
  const job = MOCK_JOBS.find((job) => job.id === id);
  
  // Get user's location on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  }, []);
  
  // Set initial proposed price when job loads
  useEffect(() => {
    if (job) {
      setProposedPrice(job.price);
    }
  }, [job]);
  
  if (!job) {
    return (
      <div className="container py-8">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Job Not Found</h2>
          <p className="text-muted-foreground mb-6">
            The job you're looking for doesn't exist or has been removed.
          </p>
          <Button asChild>
            <Link to="/jobs">Browse Jobs</Link>
          </Button>
        </div>
      </div>
    );
  }
  
  // Determine urgency badge color
  const urgencyColor = {
    low: "bg-blue-100 text-blue-800",
    normal: "bg-green-100 text-green-800",
    high: "bg-orange-100 text-orange-800",
    urgent: "bg-red-100 text-red-800",
  }[job.urgency];
  
  const handleSubmitApplication = async () => {
    setIsSubmitting(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Show success message
      alert("Application submitted successfully!");
      
      // Reset form
      setApplicationMessage("");
    } catch (error) {
      console.error("Error submitting application:", error);
      alert("Failed to submit application. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Open directions in Google Maps
  const openDirections = () => {
    if (!userLocation) return;
    
    const url = `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${job.locationLat},${job.locationLng}`;
    window.open(url, '_blank');
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
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Job Details */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-2xl">{job.title}</CardTitle>
                <span className={`text-xs px-2 py-1 rounded-full ${urgencyColor} capitalize`}>
                  {job.urgency}
                </span>
              </div>
              <div className="flex items-center text-sm text-muted-foreground mt-2">
                <MapPin className="h-4 w-4 mr-1" />
                <span>{job.locationAddress}, {job.locationCity}, {job.locationState} {job.locationZip}</span>
                <span className="mx-1">•</span>
                <span>{job.distance.toFixed(1)} km away</span>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Job Location Map */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-medium">Location</h3>
                  {userLocation && (
                    <Button variant="outline" size="sm" onClick={openDirections}>
                      <Navigation className="h-4 w-4 mr-2" />
                      Get Directions
                    </Button>
                  )}
                </div>
                <JobLocationMap 
                  jobLocation={{
                    lat: job.locationLat,
                    lng: job.locationLng,
                    address: `${job.locationAddress}, ${job.locationCity}, ${job.locationState} ${job.locationZip}`
                  }}
                  userLocation={userLocation}
                />
              </div>
              
              {/* Job Description */}
              <div>
                <h3 className="text-lg font-medium mb-2">Description</h3>
                <p className="text-muted-foreground whitespace-pre-line">
                  {job.description}
                </p>
              </div>
              
              {/* Job Details */}
              <div>
                <h3 className="text-lg font-medium mb-2">Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start">
                    <DollarSign className="h-5 w-5 mr-2 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">{formatCurrency(job.price)}</p>
                      <p className="text-sm text-muted-foreground">
                        {job.priceType === 'hourly' ? 'Hourly Rate' : 'Fixed Price'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <Tag className="h-5 w-5 mr-2 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">{job.category}</p>
                      <p className="text-sm text-muted-foreground">Category</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <Clock className="h-5 w-5 mr-2 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">{job.estimatedDurationHours} hours</p>
                      <p className="text-sm text-muted-foreground">Estimated Duration</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <Calendar className="h-5 w-5 mr-2 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">
                        {new Date(job.createdAt).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-muted-foreground">Posted Date</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Required Skills */}
              {job.requiredSkills && job.requiredSkills.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-2">Required Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {job.requiredSkills.map((skill) => (
                      <span
                        key={skill}
                        className="bg-slate-100 text-slate-800 px-3 py-1 rounded-full text-sm"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Job Poster */}
              <div>
                <h3 className="text-lg font-medium mb-2">Posted By</h3>
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center mr-3">
                    <User className="h-5 w-5 text-slate-500" />
                  </div>
                  <div>
                    <p className="font-medium">{job.posterName}</p>
                    <div className="flex items-center">
                      <span className="text-amber-500">★</span>
                      <span className="text-sm ml-1">{job.posterRating} rating</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Application Form */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Apply for this Job</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Your Message
                  </label>
                  <Textarea
                    placeholder="Introduce yourself and explain why you're a good fit for this job..."
                    className="min-h-[150px]"
                    value={applicationMessage}
                    onChange={(e) => setApplicationMessage(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Include relevant experience and availability
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Your Proposed Price
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2">$</span>
                    <input
                      type="number"
                      className="w-full pl-7 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                      value={proposedPrice}
                      onChange={(e) => setProposedPrice(parseFloat(e.target.value))}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {job.priceType === 'hourly' ? 'Hourly rate' : 'Fixed price'} for the job
                  </p>
                </div>
                
                {/* Estimated Earnings */}
                <div className="bg-slate-50 p-3 rounded-md">
                  <h4 className="text-sm font-medium mb-2">Estimated Earnings</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Job Price:</span>
                      <span>{formatCurrency(proposedPrice)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Platform Fee (10%):</span>
                      <span>-{formatCurrency(proposedPrice * 0.1)}</span>
                    </div>
                    <div className="flex justify-between font-medium pt-1 border-t mt-1">
                      <span>You'll Receive:</span>
                      <span>{formatCurrency(proposedPrice * 0.9)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                onClick={handleSubmitApplication}
                disabled={isSubmitting || !applicationMessage.trim()}
              >
                {isSubmitting ? "Submitting..." : "Submit Application"}
              </Button>
            </CardFooter>
          </Card>
          
          <div className="mt-4 text-center text-sm text-muted-foreground">
            <p>You'll be notified when the job poster responds</p>
          </div>
        </div>
      </div>
    </div>
  );
}