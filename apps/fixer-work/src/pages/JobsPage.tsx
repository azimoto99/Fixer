import { useState, useEffect } from "react";
import { JobCard } from "@/components/jobs/JobCard";
import { MapView } from "@/components/jobs/MapView";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Filter, List, Map as MapIcon } from "lucide-react";

// Extended mock data for jobs with coordinates
const MOCK_JOBS = [
  {
    id: "1",
    title: "Fix Leaking Kitchen Sink",
    description: "Need a plumber to fix a leaking kitchen sink. The leak is coming from the pipe under the sink and causing water damage to the cabinet.",
    category: "Plumbing",
    price: 120,
    priceType: "fixed" as const,
    locationCity: "San Francisco",
    locationState: "CA",
    locationLat: 37.7749,
    locationLng: -122.4194,
    distance: 3.2,
    urgency: "high" as const,
    createdAt: "2023-06-15T10:30:00Z",
  },
  {
    id: "2",
    title: "Install Ceiling Fan",
    description: "Looking for an electrician to install a ceiling fan in the living room. The wiring is already in place from a previous light fixture.",
    category: "Electrical",
    price: 85,
    priceType: "fixed" as const,
    locationCity: "Oakland",
    locationState: "CA",
    locationLat: 37.8044,
    locationLng: -122.2711,
    distance: 5.7,
    urgency: "normal" as const,
    createdAt: "2023-06-14T14:45:00Z",
  },
  {
    id: "3",
    title: "Paint Living Room",
    description: "Need a painter to paint my living room (approximately 15x20 feet). Walls only, ceiling not included. Paint will be provided.",
    category: "Painting",
    price: 35,
    priceType: "hourly" as const,
    locationCity: "Berkeley",
    locationState: "CA",
    locationLat: 37.8715,
    locationLng: -122.2730,
    distance: 8.1,
    urgency: "low" as const,
    createdAt: "2023-06-13T09:15:00Z",
  },
  {
    id: "4",
    title: "Lawn Mowing and Garden Cleanup",
    description: "Looking for someone to mow the lawn and clean up the garden. Approximately 1/4 acre lot with some weeding needed.",
    category: "Landscaping",
    price: 100,
    priceType: "fixed" as const,
    locationCity: "San Jose",
    locationState: "CA",
    locationLat: 37.3382,
    locationLng: -121.8863,
    distance: 12.3,
    urgency: "normal" as const,
    createdAt: "2023-06-12T16:20:00Z",
  },
  {
    id: "5",
    title: "Computer Setup and Network Configuration",
    description: "Need help setting up a new computer and configuring the home network. Includes software installation and printer setup.",
    category: "Technology",
    price: 75,
    priceType: "fixed" as const,
    locationCity: "Palo Alto",
    locationState: "CA",
    locationLat: 37.4419,
    locationLng: -122.1430,
    distance: 15.8,
    urgency: "urgent" as const,
    createdAt: "2023-06-11T11:10:00Z",
  },
  {
    id: "6",
    title: "Moving Heavy Furniture",
    description: "Need help moving heavy furniture from one room to another. Includes a sofa, bookshelf, and dining table.",
    category: "Moving",
    price: 30,
    priceType: "hourly" as const,
    locationCity: "San Mateo",
    locationState: "CA",
    locationLat: 37.5630,
    locationLng: -122.3255,
    distance: 10.5,
    urgency: "high" as const,
    createdAt: "2023-06-10T13:25:00Z",
  },
];

// Available job categories
const JOB_CATEGORIES = [
  'All Categories',
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

export function JobsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredJobs, setFilteredJobs] = useState(MOCK_JOBS);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories');
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500]);
  const [maxDistance, setMaxDistance] = useState<number>(50);
  const [urgencyFilter, setUrgencyFilter] = useState<string[]>([]);

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

  // Filter jobs based on search term and filters
  const handleSearch = () => {
    let filtered = [...MOCK_JOBS];
    
    // Apply search term filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (job) =>
          job.title.toLowerCase().includes(term) ||
          job.description.toLowerCase().includes(term) ||
          job.category.toLowerCase().includes(term) ||
          job.locationCity.toLowerCase().includes(term) ||
          job.locationState.toLowerCase().includes(term)
      );
    }
    
    // Apply category filter
    if (selectedCategory !== 'All Categories') {
      filtered = filtered.filter(job => job.category === selectedCategory);
    }
    
    // Apply price range filter
    filtered = filtered.filter(
      job => job.price >= priceRange[0] && job.price <= priceRange[1]
    );
    
    // Apply distance filter
    if (maxDistance < 50) {
      filtered = filtered.filter(job => job.distance <= maxDistance);
    }
    
    // Apply urgency filter
    if (urgencyFilter.length > 0) {
      filtered = filtered.filter(job => urgencyFilter.includes(job.urgency));
    }
    
    setFilteredJobs(filtered);
  };

  // Toggle urgency filter
  const toggleUrgencyFilter = (urgency: string) => {
    if (urgencyFilter.includes(urgency)) {
      setUrgencyFilter(urgencyFilter.filter(u => u !== urgency));
    } else {
      setUrgencyFilter([...urgencyFilter, urgency]);
    }
  };

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Find Jobs Near You</h1>

      {/* Search and Filter Section */}
      <div className="bg-slate-50 p-4 rounded-lg mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-grow flex gap-2">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search jobs..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch}>Search</Button>
          </div>
          
          <div className="flex gap-2">
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input 
                placeholder="Location" 
                className="pl-9 w-[180px]" 
                value={userLocation ? "Current Location" : ""}
                readOnly
              />
            </div>
            <Button 
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>
        </div>
        
        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t">
            <h3 className="font-medium mb-3">Filters</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select 
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  {JOB_CATEGORIES.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              
              {/* Price Range Filter */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Price Range: ${priceRange[0]} - ${priceRange[1]}
                </label>
                <div className="flex items-center gap-2">
                  <input 
                    type="range" 
                    min="0" 
                    max="500" 
                    step="10"
                    value={priceRange[0]}
                    onChange={(e) => setPriceRange([parseInt(e.target.value), priceRange[1]])}
                    className="w-full"
                  />
                  <span>-</span>
                  <input 
                    type="range" 
                    min="0" 
                    max="500" 
                    step="10"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                    className="w-full"
                  />
                </div>
              </div>
              
              {/* Distance Filter */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Max Distance: {maxDistance} km
                </label>
                <input 
                  type="range" 
                  min="1" 
                  max="50" 
                  value={maxDistance}
                  onChange={(e) => setMaxDistance(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
            
            {/* Urgency Filter */}
            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">Urgency</label>
              <div className="flex flex-wrap gap-2">
                {['low', 'normal', 'high', 'urgent'].map(urgency => (
                  <button
                    key={urgency}
                    className={`px-3 py-1 text-xs rounded-full capitalize ${
                      urgencyFilter.includes(urgency)
                        ? `bg-${urgency === 'low' ? 'blue' : urgency === 'normal' ? 'green' : urgency === 'high' ? 'orange' : 'red'}-500 text-white`
                        : 'bg-slate-200 text-slate-700'
                    }`}
                    onClick={() => toggleUrgencyFilter(urgency)}
                  >
                    {urgency}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="mt-4 flex justify-end">
              <Button 
                variant="outline" 
                className="mr-2"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedCategory('All Categories');
                  setPriceRange([0, 500]);
                  setMaxDistance(50);
                  setUrgencyFilter([]);
                  setFilteredJobs(MOCK_JOBS);
                }}
              >
                Reset
              </Button>
              <Button onClick={handleSearch}>Apply Filters</Button>
            </div>
          </div>
        )}
      </div>

      {/* View Toggle and Results Count */}
      <div className="flex justify-between items-center mb-6">
        <p className="text-muted-foreground">
          Showing {filteredJobs.length} jobs in your area
        </p>
        
        <div className="flex border rounded-md overflow-hidden">
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            className="rounded-none border-0"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4 mr-2" />
            List
          </Button>
          <Button
            variant={viewMode === 'map' ? 'default' : 'outline'}
            className="rounded-none border-0"
            onClick={() => setViewMode('map')}
          >
            <MapIcon className="h-4 w-4 mr-2" />
            Map
          </Button>
        </div>
      </div>

      {/* Map View */}
      {viewMode === 'map' && (
        <div className="mb-8">
          <MapView jobs={filteredJobs} userLocation={userLocation} />
          
          {/* Job List Below Map */}
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-4">Available Jobs</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredJobs.slice(0, 4).map((job) => (
                <JobCard key={job.id} {...job} />
              ))}
            </div>
            {filteredJobs.length > 4 && (
              <div className="text-center mt-4">
                <Button variant="outline" onClick={() => setViewMode('list')}>
                  View All {filteredJobs.length} Jobs
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredJobs.map((job) => (
            <JobCard key={job.id} {...job} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {filteredJobs.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium mb-2">No jobs found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search or filters to find more jobs
          </p>
        </div>
      )}
    </div>
  );
}