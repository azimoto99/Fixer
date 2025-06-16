import { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Set your Mapbox access token
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || 'pk.placeholder';

interface JobLocationMapProps {
  jobLocation: {
    lat: number;
    lng: number;
    address: string;
  };
  userLocation?: {
    lat: number;
    lng: number;
  };
}

export function JobLocationMap({ jobLocation, userLocation }: JobLocationMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [jobLocation.lng, jobLocation.lat],
      zoom: 14,
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

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
    };
  }, [jobLocation.lat, jobLocation.lng]);

  // Add markers when map is loaded
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Add job location marker
    const jobMarkerEl = document.createElement('div');
    jobMarkerEl.className = 'job-marker';
    jobMarkerEl.innerHTML = `
      <div class="marker-container">
        <div class="marker-pin"></div>
      </div>
    `;

    new mapboxgl.Marker(jobMarkerEl)
      .setLngLat([jobLocation.lng, jobLocation.lat])
      .setPopup(
        new mapboxgl.Popup({ offset: 25 }).setHTML(
          `<div class="p-2">
            <h3 class="font-medium text-sm">Job Location</h3>
            <p class="text-xs">${jobLocation.address}</p>
          </div>`
        )
      )
      .addTo(map.current);

    // Add user location marker if available
    if (userLocation) {
      const userMarkerEl = document.createElement('div');
      userMarkerEl.className = 'user-marker';
      userMarkerEl.innerHTML = `
        <div class="user-marker-container">
          <div class="user-marker-dot"></div>
          <div class="user-marker-pulse"></div>
        </div>
      `;

      new mapboxgl.Marker(userMarkerEl)
        .setLngLat([userLocation.lng, userLocation.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(
            `<div class="p-2">
              <h3 class="font-medium text-sm">Your Location</h3>
            </div>`
          )
        )
        .addTo(map.current);

      // Add a line between user and job location
      if (map.current.loaded()) {
        addRouteLine();
      } else {
        map.current.on('load', addRouteLine);
      }
    }

    // Fit bounds to include both markers
    const bounds = new mapboxgl.LngLatBounds()
      .extend([jobLocation.lng, jobLocation.lat]);
    
    if (userLocation) {
      bounds.extend([userLocation.lng, userLocation.lat]);
    }

    map.current.fitBounds(bounds, {
      padding: 70,
      maxZoom: 15
    });

    function addRouteLine() {
      if (!map.current || !userLocation) return;

      // Check if the source already exists
      if (map.current.getSource('route')) {
        return;
      }

      map.current.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: [
              [userLocation.lng, userLocation.lat],
              [jobLocation.lng, jobLocation.lat]
            ]
          }
        }
      });

      map.current.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#4A90E2',
          'line-width': 2,
          'line-dasharray': [2, 2]
        }
      });
    }
  }, [jobLocation, userLocation, mapLoaded]);

  return (
    <div className="relative">
      <div ref={mapContainer} className="h-[300px] rounded-lg overflow-hidden" />
      
      {/* Map loading indicator */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Loading map...</p>
          </div>
        </div>
      )}
      
      <style jsx>{`
        .job-marker {
          width: 30px;
          height: 40px;
        }
        .marker-container {
          position: relative;
        }
        .marker-pin {
          width: 30px;
          height: 30px;
          border-radius: 50% 50% 50% 0;
          background: #ef4444;
          position: absolute;
          transform: rotate(-45deg);
          left: 50%;
          top: 50%;
          margin: -15px 0 0 -15px;
        }
        .marker-pin::after {
          content: '';
          width: 20px;
          height: 20px;
          margin: 5px 0 0 5px;
          background: white;
          position: absolute;
          border-radius: 50%;
        }
        
        .user-marker-container {
          position: relative;
        }
        .user-marker-dot {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #4A90E2;
          border: 3px solid white;
          box-shadow: 0 0 5px rgba(0,0,0,0.3);
        }
        .user-marker-pulse {
          position: absolute;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(74, 144, 226, 0.2);
          border: 2px solid rgba(74, 144, 226, 0.5);
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0% {
            transform: translate(-50%, -50%) scale(0.5);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.5);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}