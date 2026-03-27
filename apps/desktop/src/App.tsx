import { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { MainLayout } from '@/components/layout/MainLayout';
import { ToastContainer } from '@/components/ui/Toast';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { TicketListPage } from '@/pages/TicketListPage';
import { CreateTicketPage } from '@/pages/CreateTicketPage';
import { SettingsPage } from '@/pages/SettingsPage';

/**
 * Loading / splash screen while restoring session.
 */
function LoadingScreen() {
  return (
    <div className="loadingScreen">
      <div className="loadingScreen__content">
        <div className="loadingScreen__logo">TC</div>
        <div className="loadingScreen__spinner" />
        <p className="loadingScreen__text">Loading...</p>
      </div>
    </div>
  );
}

/**
 * Protected route wrapper — redirects to login if not authenticated.
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isRestoringSession, restoreSession, loadPersistedConfig } = useAuthStore();

  useEffect(() => {
    if (isRestoringSession && !isAuthenticated) {
      const init = async () => {
        await loadPersistedConfig();
        await restoreSession();
      };
      init();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (isRestoringSession) {
    return <LoadingScreen />;
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

/**
 * Wrapper that attempts session restore on mount, then redirects accordingly.
 */
function SessionRestorer() {
  const { restoreSession, isAuthenticated, isRestoringSession, loadPersistedConfig } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      await loadPersistedConfig();
      const restored = await restoreSession();
      if (restored) {
        navigate('/dashboard', { replace: true });
      }
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (isRestoringSession) {
    return <LoadingScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <LoginPage />;
}

export function App() {
  return (
    <HashRouter>
      <Routes>
        {/* Login route with session restore */}
        <Route path="/login" element={<SessionRestorer />} />

        {/* Protected routes with MainLayout */}
        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/tickets" element={<TicketListPage />} />
          <Route path="/create-ticket" element={<CreateTicketPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>

      {/* Global Toast Notifications */}
      <ToastContainer />
    </HashRouter>
  );
}
