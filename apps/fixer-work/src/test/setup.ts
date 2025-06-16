// Mock Mapbox GL
jest.mock('mapbox-gl', () => ({
  Map: jest.fn(() => ({
    on: jest.fn(),
    remove: jest.fn(),
    addControl: jest.fn(),
    getSource: jest.fn(),
    addSource: jest.fn(),
    addLayer: jest.fn(),
    loaded: jest.fn(() => true),
    fitBounds: jest.fn(),
  })),
  NavigationControl: jest.fn(),
  GeolocateControl: jest.fn(),
  Marker: jest.fn(() => ({
    setLngLat: jest.fn().mockReturnThis(),
    setPopup: jest.fn().mockReturnThis(),
    addTo: jest.fn().mockReturnThis(),
    remove: jest.fn(),
  })),
  Popup: jest.fn(() => ({
    setHTML: jest.fn().mockReturnThis(),
    remove: jest.fn(),
  })),
  LngLatBounds: jest.fn(() => ({
    extend: jest.fn().mockReturnThis(),
  })),
}));

// Mock environment variables
window.ENV = {
  VITE_MAPBOX_ACCESS_TOKEN: 'pk.test',
  VITE_API_BASE_URL: 'http://localhost:3001/api/v1',
  VITE_SUPABASE_URL: 'https://test.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'test-key',
};