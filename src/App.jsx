import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AuthPage from './pages/AuthPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import VendorsPage from './pages/VendorsPage.jsx';
import RfqsPage from './pages/RfqsPage.jsx';
import QuotationsPage from './pages/QuotationsPage.jsx';
import ApprovalsPage from './pages/ApprovalsPage.jsx';
import PurchaseOrdersPage from './pages/PurchaseOrdersPage.jsx';
import ActivityPage from './pages/ActivityPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import './App.css';

// Protected Route Component (Requires Authentication)
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('vb_token');
  if (!token) {
    return <Navigate to="/auth" replace />;
  }
  return children;
};

// Admin Protected Route Component (Requires Auth + Admin Role)
const AdminProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('vb_token');
  const storedUser = localStorage.getItem('vb_user');
  
  if (!token || !storedUser) {
    return <Navigate to="/auth" replace />;
  }
  
  const user = JSON.parse(storedUser);
  if (user.role !== 'Admin') {
    // If not admin, redirect to general dashboard
    return <Navigate to="/" replace />;
  }
  
  return children;
};

// Manager Protected Route Component (Requires Auth + Admin or Manager Role)
const ManagerProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('vb_token');
  const storedUser = localStorage.getItem('vb_user');
  
  if (!token || !storedUser) {
    return <Navigate to="/auth" replace />;
  }
  
  const user = JSON.parse(storedUser);
  if (user.role !== 'Admin' && user.role !== 'Manager') {
    // If not admin/manager, redirect to general dashboard
    return <Navigate to="/" replace />;
  }
  
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public auth route */}
        <Route path="/auth" element={<AuthPage />} />
        
        {/* Authenticated user landing */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } 
        />
        
        {/* Admin only vendors management */}
        <Route 
          path="/vendors" 
          element={
            <AdminProtectedRoute>
              <VendorsPage />
            </AdminProtectedRoute>
          } 
        />
        
        {/* RFQs management */}
        <Route 
          path="/rfqs" 
          element={
            <ProtectedRoute>
              <RfqsPage />
            </ProtectedRoute>
          } 
        />

        {/* Quotations management */}
        <Route 
          path="/quotations" 
          element={
            <ProtectedRoute>
              <QuotationsPage />
            </ProtectedRoute>
          } 
        />

        {/* Approvals management */}
        <Route 
          path="/approvals" 
          element={
            <ManagerProtectedRoute>
              <ApprovalsPage />
            </ManagerProtectedRoute>
          } 
        />

        {/* Purchase Orders management */}
        <Route 
          path="/purchase-orders" 
          element={
            <ProtectedRoute>
              <PurchaseOrdersPage isInvoiceView={false} />
            </ProtectedRoute>
          } 
        />

        {/* Invoices management */}
        <Route 
          path="/invoices" 
          element={
            <ProtectedRoute>
              <PurchaseOrdersPage isInvoiceView={true} />
            </ProtectedRoute>
          } 
        />

        {/* Activity & Logs Audit trail */}
        <Route 
          path="/activity" 
          element={
            <ProtectedRoute>
              <ActivityPage />
            </ProtectedRoute>
          } 
        />

        {/* Profile Settings */}
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } 
        />

        {/* Reports & Analytics */}
        <Route 
          path="/reports" 
          element={
            <ProtectedRoute>
              <ReportsPage />
            </ProtectedRoute>
          } 
        />
        
        {/* Fallback routing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;

