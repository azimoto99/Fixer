import { Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { JobsPage } from './pages/JobsPage';
import { JobDetailPage } from './pages/JobDetailPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { useAuth } from './hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { StripeOnboardingBanner } from '@/components/stripe/StripeOnboardingBanner';

function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <StripeOnboardingBanner />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<JobsPage />} />
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/jobs/:id" element={<JobDetailPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Routes>
      </main>
      <Footer />
      <Toaster />
    </div>
  );
}

export default App;