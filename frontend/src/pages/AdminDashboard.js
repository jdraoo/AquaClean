import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Shield, LogOut, Users, Calendar, TrendingUp, DollarSign, Briefcase, AlertCircle } from 'lucide-react';
import { Badge } from '../components/ui/badge';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Axios interceptor for admin
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token');
    if (token && config.url?.includes('/admin/')) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = localStorage.getItem('admin_user');
    if (!userData) {
      navigate('/admin/auth');
      return;
    }
    setUser(JSON.parse(userData));
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await axios.get(`${API}/admin/dashboard-stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      if (error.response?.status === 401) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    navigate('/admin/auth');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-700';
      case 'in-progress':
        return 'bg-blue-100 text-blue-700';
      case 'completed':
        return 'bg-teal-100 text-teal-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="text-xl text-purple-700">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-violet-50 to-pink-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-purple-100 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Shield className="h-8 w-8 text-purple-600" />
            <div>
              <span className="text-2xl font-bold text-purple-700">Admin Portal</span>
              <p className="text-xs text-gray-600">Management System</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900" data-testid="admin-user-name">{user?.name}</p>
              <p className="text-xs text-gray-500">Administrator</p>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleLogout}
              data-testid="admin-logout-btn"
            >
              <LogOut className="h-5 w-5 text-gray-600" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2" data-testid="admin-dashboard-title">
            Welcome, {user?.name}!
          </h1>
          <p className="text-gray-600">Manage your service platform</p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card 
            className="p-6 bg-gradient-to-br from-purple-500 to-violet-600 text-white cursor-pointer hover:shadow-xl border-0"
            onClick={() => navigate('/admin/bookings')}
            data-testid="manage-bookings-card"
          >
            <Calendar className="h-10 w-10 mb-3" />
            <h2 className="text-xl font-bold mb-1">Manage Bookings</h2>
            <p className="text-purple-100 text-sm">View and assign jobs</p>
          </Card>

          <Card 
            className="p-6 bg-white hover:shadow-xl cursor-pointer border border-purple-100"
            onClick={() => navigate('/admin/users')}
            data-testid="manage-users-card"
          >
            <Users className="h-10 w-10 text-purple-600 mb-3" />
            <h2 className="text-xl font-bold text-gray-900 mb-1">User Management</h2>
            <p className="text-gray-600 text-sm">Customers & field teams</p>
          </Card>

          <Card className="p-6 bg-white hover:shadow-xl border border-purple-100">
            <TrendingUp className="h-10 w-10 text-purple-600 mb-3" />
            <h2 className="text-xl font-bold text-gray-900 mb-1">Analytics</h2>
            <p className="text-gray-600 text-sm">Performance metrics</p>
          </Card>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="p-6 bg-white border border-purple-100">
              <div className="flex items-center justify-between mb-2">
                <Users className="h-8 w-8 text-purple-600" />
              </div>
              <div className="text-3xl font-bold text-purple-600" data-testid="stat-customers">{stats.total_customers}</div>
              <div className="text-sm text-gray-600">Total Customers</div>
            </Card>

            <Card className="p-6 bg-white border border-blue-100">
              <div className="flex items-center justify-between mb-2">
                <Briefcase className="h-8 w-8 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-blue-600" data-testid="stat-technicians">{stats.total_technicians}</div>
              <div className="text-sm text-gray-600">Field Technicians</div>
            </Card>

            <Card className="p-6 bg-white border border-green-100">
              <div className="flex items-center justify-between mb-2">
                <Calendar className="h-8 w-8 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-green-600" data-testid="stat-bookings">{stats.total_bookings}</div>
              <div className="text-sm text-gray-600">Total Bookings</div>
            </Card>

            <Card className="p-6 bg-white border border-orange-100">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="h-8 w-8 text-orange-600" />
              </div>
              <div className="text-3xl font-bold text-orange-600" data-testid="stat-revenue">
                ₹{(stats.total_revenue / 100).toFixed(0)}
              </div>
              <div className="text-sm text-gray-600">Total Revenue</div>
            </Card>
          </div>
        )}

        {/* Status Overview */}
        {stats && (
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <Card className="p-4 bg-yellow-50 border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-700">{stats.pending_bookings}</div>
              <div className="text-sm text-yellow-600">Pending</div>
            </Card>
            <Card className="p-4 bg-green-50 border border-green-200">
              <div className="text-2xl font-bold text-green-700">{stats.confirmed_bookings}</div>
              <div className="text-sm text-green-600">Confirmed</div>
            </Card>
            <Card className="p-4 bg-blue-50 border border-blue-200">
              <div className="text-2xl font-bold text-blue-700">{stats.in_progress_bookings}</div>
              <div className="text-sm text-blue-600">In Progress</div>
            </Card>
            <Card className="p-4 bg-teal-50 border border-teal-200">
              <div className="text-2xl font-bold text-teal-700">{stats.completed_bookings}</div>
              <div className="text-sm text-teal-600">Completed</div>
            </Card>
          </div>
        )}

        {/* Recent Bookings */}
        {stats && stats.recent_bookings && stats.recent_bookings.length > 0 && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Recent Bookings</h2>
              <Button 
                variant="link" 
                className="text-purple-600"
                onClick={() => navigate('/admin/bookings')}
                data-testid="view-all-bookings-btn"
              >
                View All
              </Button>
            </div>

            <div className="space-y-3">
              {stats.recent_bookings.map((booking) => (
                <Card key={booking.id} className="p-4 bg-white hover:shadow-lg" data-testid="recent-booking-item">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-semibold text-gray-900">
                          {booking.tank_type.charAt(0).toUpperCase() + booking.tank_type.slice(1)} Tank
                        </h3>
                        <Badge className={getStatusColor(booking.status)}>
                          {booking.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        {booking.service_date} at {booking.service_time} | {booking.package_type} cleaning
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-purple-600">₹{(booking.amount / 100).toFixed(2)}</p>
                      <p className="text-xs text-gray-500">{booking.payment_status}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;