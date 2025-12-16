import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/layout/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Screening } from './pages/Screening';
import { Workflow } from './pages/Workflow';
import { Reports } from './pages/Reports';
import { AuditLog } from './pages/AuditLog';
import { Users } from './pages/Users';
import { SanctionsLists } from './pages/SanctionsLists';
import { Countries } from './pages/Countries';
import { Settings } from './pages/Settings';
import EntityGraph from './pages/EntityGraph';
import InvestigationDashboard from './pages/InvestigationDashboard';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Simple auth check
const isAuthenticated = () => {
  return localStorage.getItem('access_token') !== null;
};

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="command-center" element={<InvestigationDashboard />} />
            <Route path="screening" element={<Screening />} />
            <Route path="entity-graph" element={<EntityGraph />} />
            <Route path="workflow" element={<Workflow />} />
            <Route path="reports" element={<Reports />} />
            <Route path="audit" element={<AuditLog />} />
            <Route path="admin/users" element={<Users />} />
            <Route path="admin/lists" element={<SanctionsLists />} />
            <Route path="admin/countries" element={<Countries />} />
            <Route path="admin/settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
