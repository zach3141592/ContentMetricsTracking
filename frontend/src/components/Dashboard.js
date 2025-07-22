import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import AdminDashboard from './AdminDashboard';
import InternDashboard from './InternDashboard';

export default function Dashboard() {
  const { user, isAdmin, isIntern } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Redirect based on user role for better URL organization
    if (isAdmin()) {
      navigate('/admin', { replace: true });
    } else if (isIntern()) {
      navigate('/intern', { replace: true });
    }
  }, [user, isAdmin, isIntern, navigate]);

  // While redirecting, show the appropriate dashboard
  if (isAdmin()) {
    return <AdminDashboard />;
  } else if (isIntern()) {
    return <InternDashboard />;
  }

  // Fallback loading state
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading dashboard...</p>
      </div>
    </div>
  );
} 