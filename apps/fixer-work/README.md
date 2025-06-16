# Fixer Work App

The worker-facing application for the Fixer platform, allowing workers to find and apply for jobs.

## Features

- **Map-based Job Search**: Find jobs near you with an interactive map interface
- **Job Filtering**: Filter jobs by category, price range, distance, and urgency
- **Job Applications**: Apply to jobs with custom proposals
- **Location Services**: Get directions to job locations
- **Profile Management**: Manage your worker profile and skills

## Mapbox Integration

This application uses Mapbox for map visualization and location-based features:

- **Job Map View**: See all available jobs on a map with color-coded markers
- **Job Detail Map**: View the exact location of a job and get directions
- **Distance Calculation**: See how far jobs are from your current location
- **Route Visualization**: View the route between your location and the job

### Setup

1. Create a Mapbox account at [mapbox.com](https://www.mapbox.com/)
2. Get your public access token from the Mapbox dashboard
3. Add your token to the `.env` file:

```
VITE_MAPBOX_ACCESS_TOKEN=your-mapbox-access-token
```

## Development

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at http://localhost:5174

## Building for Production

```bash
# Build the application
npm run build

# Preview the production build
npm run preview
```

## Project Structure

- `src/components/jobs/` - Job-related components including MapView
- `src/components/ui/` - Reusable UI components
- `src/pages/` - Main application pages
- `src/lib/` - Utility functions and helpers