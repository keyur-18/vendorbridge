import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { RecoilRoot, useRecoilValue } from 'recoil';
import { Toaster } from 'react-hot-toast';
import { Suspense } from 'react';

import { isAuthenticatedSelector, authUserAtom } from './atoms';
import { LoadingSpinner } from './components/ui';

import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import VendorsPage from './pages/VendorsPage';
import RFQsPage from './pages/RFQsPage';
import RFQDetailPage from './pages/RFQDetailPage';
import QuotationComparePage from './pages/QuotationComparePage';
import ApprovalsPage from './pages/ApprovalsPage';
import PurchaseOrdersPage from './pages/PurchaseOrdersPage';
import PODetailPage from './pages/PODetailPage';
import InvoicesPage from './pages/InvoicesPage';
import InvoiceDetailPage from './pages/InvoiceDetailPage';
import ActivityPage from './pages/ActivityPage';
import ReportsPage from './pages/ReportsPage';

// Protected Routes
function ProtectedRoute({ children, allowedRoles }) {
  const isAuth = useRecoilValue(isAuthenticatedSelector);
  const user = useRecoilValue(authUserAtom);

  if (!isAuth) return <Navigate to="/login" replace />;
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

// Public Routes
function PublicRoute({ children }) {
  const isAuth = useRecoilValue(isAuthenticatedSelector);
  if (isAuth) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><LoginPage /></PublicRoute>} />

      {/* Protected */}
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/rfqs" element={<ProtectedRoute><RFQsPage /></ProtectedRoute>} />
      <Route path="/rfqs/:id" element={<ProtectedRoute><RFQDetailPage /></ProtectedRoute>} />
      <Route path="/rfqs/:rfqId/compare" element={<ProtectedRoute allowedRoles={['admin','procurement_officer','manager']}><QuotationComparePage /></ProtectedRoute>} />
      <Route path="/activity" element={<ProtectedRoute><ActivityPage /></ProtectedRoute>} />

      {/* Admin, Procurement, Manager, Vendor Routes */}
      <Route path="/vendors" element={<ProtectedRoute allowedRoles={['admin','procurement_officer','manager']}><VendorsPage /></ProtectedRoute>} />
      <Route path="/approvals" element={<ProtectedRoute allowedRoles={['admin','procurement_officer','manager']}><ApprovalsPage /></ProtectedRoute>} />
      <Route path="/purchase-orders" element={<ProtectedRoute allowedRoles={['admin','procurement_officer','manager','vendor']}><PurchaseOrdersPage /></ProtectedRoute>} />
      <Route path="/purchase-orders/:id" element={<ProtectedRoute allowedRoles={['admin','procurement_officer','manager','vendor']}><PODetailPage /></ProtectedRoute>} />
      <Route path="/invoices" element={<ProtectedRoute allowedRoles={['admin','procurement_officer','manager','vendor']}><InvoicesPage /></ProtectedRoute>} />
      <Route path="/invoices/:id" element={<ProtectedRoute allowedRoles={['admin','procurement_officer','manager','vendor']}><InvoiceDetailPage /></ProtectedRoute>} />

      {/* Admin, Manager Routes */}
      <Route path="/reports" element={<ProtectedRoute allowedRoles={['admin','manager']}><ReportsPage /></ProtectedRoute>} />

      {/* Redirects */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <RecoilRoot>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              background: '#1E293B',
              color: '#F1F5F9',
              border: '1px solid #334155',
              borderRadius: '10px',
              fontSize: '14px',
              fontFamily: 'Inter, sans-serif',
            },
            success: {
              iconTheme: { primary: '#14B8A6', secondary: '#1E293B' },
              style: { border: '1px solid rgba(20,184,166,0.3)' },
            },
            error: {
              iconTheme: { primary: '#EF4444', secondary: '#1E293B' },
              style: { border: '1px solid rgba(239,68,68,0.3)' },
            },
          }}
        />
        <AppRoutes />
      </BrowserRouter>
    </RecoilRoot>
  );
}
