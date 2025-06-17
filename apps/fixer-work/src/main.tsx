import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AuthProvider } from './hooks/useAuth';
import App from './App';
import './styles/globals.css';
import './styles/mapbox.css';
import 'mapbox-gl/dist/mapbox-gl.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

const isDevelopment = import.meta.env.DEV;
const basename = isDevelopment ? '/' : '/work';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter basename={basename}>
          <App />
          {isDevelopment && <ReactQueryDevtools initialIsOpen={false} />}
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);