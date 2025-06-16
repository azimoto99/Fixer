import { Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/hooks/useAuth';
import { Layout } from '@/components/layout/Layout';

// Pages
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { JobsPage } from '@/pages/jobs/JobsPage';
import { CreateJobPage } from '@/pages/jobs/CreateJobPage';
import { JobDetailPage } from '@/pages/jobs/JobDetailPage';
import { ProfilePage } from '@/pages/profile/ProfilePage';
import { PaymentsPage } from '@/pages/payments/PaymentsPage';
import { NotificationsPage } from '@/pages/notifications/NotificationsPage';
import EnterpriseDashboard from '@/pages/EnterpriseDashboard';
import { NotFoundPage } from '@/pages/NotFoundPage';

// Protected route wrapper
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-background">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            
            {/* Protected routes */}
            <Route path="dashboard" element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } />
            
            <Route path="jobs" element={
              <ProtectedRoute>
                <JobsPage />
              </ProtectedRoute>
            } />
            
            <Route path="jobs/create" element={
              <ProtectedRoute>
                <CreateJobPage />
              </ProtectedRoute>
            } />
            
            <Route path="jobs/:id" element={
              <ProtectedRoute>
                <JobDetailPage />
              </ProtectedRoute>
            } />
            
            <Route path="profile" element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            } />
            
            <Route path="payments" element={
              <ProtectedRoute>
                <PaymentsPage />
              </ProtectedRoute>
            } />
            
            <Route path="notifications" element={
              <ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>
            } />
            
            <Route path="enterprise" element={
              <ProtectedRoute>
                <EnterpriseDashboard />
              </ProtectedRoute>
            } />
            
            {/* 404 page */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
        
        <Toaster />
      </div>
    </AuthProvider>
  );
}

export default App;
