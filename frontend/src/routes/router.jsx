import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { Login } from '../pages/Login';
import { Register } from '../pages/Register';
import { Dashboard } from '../pages/Dashboard';
import { Upload } from '../pages/Upload';
import { Reports } from '../pages/Reports';
import { ReportDetail } from '../pages/ReportDetail';
import { Admin } from '../pages/Admin';
import { useAuth } from '../hooks/useAuth';

function Protected({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function PublicOnly({ children }) {
  const { user } = useAuth();
  return user ? <Navigate to="/" replace /> : children;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Protected><AppLayout /></Protected>,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'upload', element: <Upload /> },
      { path: 'reports', element: <Reports /> },
      { path: 'reports/:id', element: <ReportDetail /> },
      { path: 'admin', element: <Admin /> },
    ],
  },
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <PublicOnly><Login /></PublicOnly> },
      { path: '/register', element: <PublicOnly><Register /></PublicOnly> },
    ],
  },
]);

