import { lazy, Suspense } from 'react';
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
import { STAFF_ROLES } from '@/lib/roles';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Layout from '@/components/Layout';
import Home from '@/pages/Home';
import Onboarding from '@/pages/Onboarding';
import Terms from '@/pages/Terms';

// Route-level code splitting: heavy secondary screens load on demand so the
// initial authenticated shell (Home + nav) stays fast. The auth guards
// (ProtectedRoute / RoleRoute) remain eager and fully evaluate before a lazy
// screen ever mounts, so route protection is unchanged.
const Program = lazy(() => import('@/pages/Program'));
const DealAnalyzer = lazy(() => import('@/pages/DealAnalyzer'));
const MarketAnalyzer = lazy(() => import('@/pages/MarketAnalyzer'));
const LandlordCRM = lazy(() => import('@/pages/LandlordCRM'));
const TemplateVault = lazy(() => import('@/pages/TemplateVault'));
const CoachConsole = lazy(() => import('@/pages/CoachConsole'));
const AdminPanel = lazy(() => import('@/pages/AdminPanel'));
const Graduation = lazy(() => import('@/pages/Graduation'));
const ExportData = lazy(() => import('@/pages/ExportData'));

const RouteFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-brand-ink">
    <div className="w-8 h-8 border-4 border-brand-line border-t-brand-gold rounded-full animate-spin"></div>
  </div>
);

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-brand-ink">
        <div className="w-8 h-8 border-4 border-brand-line border-t-brand-gold rounded-full animate-spin"></div>
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
          <Route path="/program" element={<Suspense fallback={<RouteFallback />}><Program /></Suspense>} />
          <Route path="/deals" element={<Suspense fallback={<RouteFallback />}><DealAnalyzer /></Suspense>} />
          <Route path="/markets" element={<Suspense fallback={<RouteFallback />}><MarketAnalyzer /></Suspense>} />
          <Route path="/landlords" element={<Suspense fallback={<RouteFallback />}><LandlordCRM /></Suspense>} />
          <Route path="/templates" element={<Suspense fallback={<RouteFallback />}><TemplateVault /></Suspense>} />
          <Route path="/export" element={<Suspense fallback={<RouteFallback />}><ExportData /></Suspense>} />
          <Route path="/graduation" element={<Suspense fallback={<RouteFallback />}><Graduation /></Suspense>} />
          <Route element={<RoleRoute allow={STAFF_ROLES} />}>
            <Route path="/coach" element={<Suspense fallback={<RouteFallback />}><CoachConsole /></Suspense>} />
          </Route>
          <Route element={<RoleRoute allow={STAFF_ROLES} />}>
            <Route path="/admin" element={<Suspense fallback={<RouteFallback />}><AdminPanel /></Suspense>} />
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