import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import RoleRoute from '@/components/RoleRoute';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Layout from '@/components/Layout';
import Home from '@/pages/Home';
import Onboarding from '@/pages/Onboarding';
import Dashboard from '@/pages/Dashboard';
import Program from '@/pages/Program';
import DealAnalyzer from '@/pages/DealAnalyzer';
import MarketAnalyzer from '@/pages/MarketAnalyzer';
import LandlordCRM from '@/pages/LandlordCRM';
import TemplateVault from '@/pages/TemplateVault';
import CoachConsole from '@/pages/CoachConsole';
import AdminPanel from '@/pages/AdminPanel';
import Graduation from '@/pages/Graduation';
import Terms from '@/pages/Terms';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError && authError.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/terms" element={<Terms />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/program" element={<Program />} />
          <Route path="/deals" element={<DealAnalyzer />} />
          <Route path="/markets" element={<MarketAnalyzer />} />
          <Route path="/landlords" element={<LandlordCRM />} />
          <Route path="/templates" element={<TemplateVault />} />
          <Route path="/graduation" element={<Graduation />} />
          <Route element={<RoleRoute allow={['coach', 'admin']} />}>
            <Route path="/coach" element={<CoachConsole />} />
          </Route>
          <Route element={<RoleRoute allow={['admin']} />}>
            <Route path="/admin" element={<AdminPanel />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App