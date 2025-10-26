import React, { useContext } from 'react';
import { AuthContext } from '../App';
import Dashboard from './Dashboard';
import FieldDashboard from './FieldDashboard';
import AdminDashboard from './AdminDashboard';

const UnifiedDashboard = () => {
  const { user } = useContext(AuthContext);

  if (!user) {
    return null;
  }

  // Render appropriate dashboard based on user role
  if (user.role === 'field_team') {
    return <FieldDashboard />;
  }

  if (user.role === 'admin') {
    return <AdminDashboard />;
  }

  // Default to customer dashboard
  return <Dashboard />;
};

export default UnifiedDashboard;