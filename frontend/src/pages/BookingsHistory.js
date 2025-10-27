import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { ArrowLeft, Droplets, Calendar, Edit, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const BookingsHistory = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('09:00');

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await axios.get(`${API}/bookings`);
      setBookings(response.data);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    } finally {
      setLoading(false);
    }
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
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-teal-100">
        <div className="container mx-auto px-4 py-4 flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} data-testid="back-to-dashboard-btn">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Droplets className="h-8 w-8 text-teal-600" />
          <span className="text-2xl font-bold text-teal-700">AquaClean</span>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-8" data-testid="history-title">Booking History</h1>

        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-500">Loading bookings...</div>
          </div>
        ) : bookings.length === 0 ? (
          <Card className="p-12 text-center bg-white" data-testid="no-bookings-message">
            <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No bookings yet</h3>
            <p className="text-gray-600 mb-6">Book your first tank cleaning service</p>
            <Button 
              onClick={() => navigate('/book-service')} 
              className="bg-teal-600 hover:bg-teal-700"
              data-testid="book-service-btn"
            >
              Book Service
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <Card
                key={booking.id}
                className="p-6 bg-white hover:shadow-lg cursor-pointer"
                onClick={() => navigate(`/booking-confirmation/${booking.id}`)}
                data-testid="booking-history-item"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {booking.tank_type.charAt(0).toUpperCase() + booking.tank_type.slice(1)} Tank
                      </h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(booking.status)}`}>
                        {booking.status}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600">
                        <Calendar className="inline h-4 w-4 mr-1" />
                        {booking.service_date} at {booking.service_time}
                      </p>
                      <p className="text-sm text-gray-500">
                        Package: {booking.package_type} cleaning
                      </p>
                      <p className="text-xs text-gray-400">
                        Booking ID: {booking.id.slice(0, 8).toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-2xl font-bold text-teal-600">
                      ₹{(booking.amount / 100).toFixed(2)}
                    </p>
                    <p className={`text-xs mt-1 ${
                      booking.payment_status === 'completed' ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {booking.payment_status === 'completed' ? 'Paid' : 'Payment ' + booking.payment_status}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingsHistory;