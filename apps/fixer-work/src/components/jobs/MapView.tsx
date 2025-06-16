import { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useNavigate } from 'react-router-dom';
import { JobCardProps } from './JobCard';

// Set your Mapbox access token
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || 'pk.placeholder';

interface MapViewProps {
  jobs: JobCardProps[];
  userLocation?: { lat: number; lng: number };
}

export function MapView({ jobs, userLocation }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const popupsRef = useRef<mapboxgl.Popup[]>([]);
  const navigate = useNavigate();
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;

    // Default center if user location not provided
    const defaultCenter = [-122.4194, 37.7749]; // San Francisco
    const center = userLocation 
      ? [userLocation.lng, userLocation.lat] 
      : defaultCenter;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: center as [number, number],
      zoom: 11,
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add geolocate control
    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: true,
        showUserHeading: true
      }),
      'top-right'
    );

    // Set map loaded state when map is ready
    map.current.on('load', () => {
      setMapLoaded(true);
    });

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      popupsRef.current.forEach(popup => popup.remove());
      popupsRef.current = [];
    };
  }, []);

  // Add markers for jobs
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
    popupsRef.current.forEach(popup => popup.remove());
    popupsRef.current = [];

    // Add markers for each job
    jobs.forEach(job => {
      // Create custom marker element
      const el = document.createElement('div');
      el.className = 'job-marker';
      
      // Style based on urgency
      const urgencyColors: Record<string, string> = {
        low: '#3b82f6', // blue
        medium: '#22c55e', // green
        high: '#f97316', // orange
        urgent: '#ef4444', // red
      };
      
      // Get price from budget object
      const displayPrice = job.budget?.amount || 0;
      const budgetSuffix = job.budget?.type === 'hourly' ? '/hr' : '';
      
      el.innerHTML = `
        <div class="marker-container" style="background-color: ${urgencyColors[job.urgency] || urgencyColors.medium};">
          <div class="marker-price">$${Math.round(displayPrice)}</div>
        </div>
      `;
      
      // Create popup
      const popup = new mapboxgl.Popup({ offset: 25, closeButton: false })
        .setHTML(`
          <div class="map-popup">
            <h3 class="font-medium text-sm">${job.title}</h3>
            <div class="text-xs text-gray-500">${job.category}</div>
            <div class="text-xs font-medium mt-1">$${displayPrice}${budgetSuffix}</div>
          </div>
        `);
      
      popupsRef.current.push(popup);
      
      // Create marker
      const marker = new mapboxgl.Marker(el)
        .setLngLat([job.location.longitude || -122.4194, job.location.latitude || 37.7749])
        .setPopup(popup)
        .addTo(map.current!);
      
      // Add click event to navigate to job detail
      el.addEventListener('click', () => {
        navigate(`/jobs/${job.id}`);
      });
      
      markersRef.current.push(marker);
    });

    // Fit bounds to include all markers if we have jobs
    if (jobs.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      
      jobs.forEach(job => {
        bounds.extend([job.location.longitude || -122.4194, job.location.latitude || 37.7749]);
      });
      
      // Add user location to bounds if available
      if (userLocation) {
        bounds.extend([userLocation.lng, userLocation.lat]);
      }
      
      map.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 15
      });
    }
  }, [jobs, mapLoaded, navigate]);

  return (
    <div className="relative">
      <div ref={mapContainer} className="h-[500px] rounded-lg overflow-hidden" />
      
      {/* Map loading indicator */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Loading map...</p>
          </div>
        </div>
      )}
      
      <style>{`
        .job-marker {
          cursor: pointer;
        }
        .marker-container {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          transition: transform 0.2s;
        }
        .marker-container:hover {
          transform: scale(1.1);
        }
        .marker-price {
          font-size: 12px;
        }
        .map-popup {
          padding: 5px;
        }
      `}</style>
    </div>
  );
}