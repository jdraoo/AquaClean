import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Droplets, Calendar, History, User, LogOut, Sparkles, Shield, Clock } from 'lucide-react';
import { AuthContext } from '../App';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await axios.get(`${API}/bookings`);
      setBookings(response.data.slice(0, 3)); // Show only latest 3
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-teal-100 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Droplets className="h-8 w-8 text-teal-600" />
            <span className="text-2xl font-bold text-teal-700">AquaClean</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-gray-700 hidden sm:inline" data-testid="user-name">Hi, {user?.name}</span>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleLogout}
              data-testid="logout-btn"
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
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2" data-testid="dashboard-title">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-gray-600">Manage your tank cleaning services</p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <Card 
            className="p-8 bg-gradient-to-br from-teal-500 to-cyan-600 text-white cursor-pointer hover:shadow-xl border-0"
            onClick={() => navigate('/book-service')}
            data-testid="book-now-card"
          >
            <Calendar className="h-12 w-12 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Book Service</h2>
            <p className="text-teal-50">Schedule a new tank cleaning</p>
          </Card>

          <Card 
            className="p-8 bg-white hover:shadow-xl cursor-pointer border border-teal-100"
            onClick={() => navigate('/bookings')}
            data-testid="view-history-card"
          >
            <History className="h-12 w-12 text-teal-600 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking History</h2>
            <p className="text-gray-600">View all your past bookings</p>
          </Card>
        </div>

        {/* Recent Bookings */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Recent Bookings</h2>
            {bookings.length > 0 && (
              <Button 
                variant="link" 
                className="text-teal-600"
                onClick={() => navigate('/bookings')}
                data-testid="view-all-btn"
              >
                View All
              </Button>
            )}
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="text-gray-500">Loading bookings...</div>
            </div>
          ) : bookings.length === 0 ? (
            <Card className="p-12 text-center bg-white" data-testid="no-bookings-card">
              <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No bookings yet</h3>
              <p className="text-gray-600 mb-6">Book your first tank cleaning service</p>
              <Button 
                onClick={() => navigate('/book-service')} 
                className="bg-teal-600 hover:bg-teal-700"
                data-testid="book-first-service-btn"
              >
                Book Now
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => (
                <Card key={booking.id} className="p-6 bg-white hover:shadow-lg" data-testid="booking-item">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {booking.tank_type.charAt(0).toUpperCase() + booking.tank_type.slice(1)} Tank
                        </h3>
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(booking.status)}`}>
                          {booking.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {booking.service_date} at {booking.service_time}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Package: {booking.package_type}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-teal-600">
                        ₹{(booking.amount / 100).toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {booking.payment_status === 'completed' ? 'Paid' : 'Payment ' + booking.payment_status}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Hygiene Tips */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Hygiene Tips</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <TipCard
              icon={<Sparkles className="h-8 w-8 text-teal-600" />}
              title="Regular Cleaning"
              description="Clean your tank every 6 months to prevent bacterial growth"
            />
            <TipCard
              icon={<Shield className="h-8 w-8 text-teal-600" />}
              title="Water Quality"
              description="Check water color and smell regularly for early detection"
            />
            <TipCard
              icon={<Clock className="h-8 w-8 text-teal-600" />}
              title="Timely Service"
              description="Don't delay if you notice sediment or discoloration"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const TipCard = ({ icon, title, description }) => (
  <Card className="p-6 bg-white border border-teal-100">
    <div className="mb-3">{icon}</div>
    <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
    <p className="text-sm text-gray-600">{description}</p>
  </Card>
);

export default Dashboard;