import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { CheckCircle2, Droplets, Calendar, MapPin, Package } from 'lucide-react';
import { format } from 'date-fns';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const BookingConfirmation = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [address, setAddress] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookingDetails();
  }, [bookingId]);

  const fetchBookingDetails = async () => {
    try {
      const bookingResponse = await axios.get(`${API}/bookings/${bookingId}`);
      setBooking(bookingResponse.data);

      const addressResponse = await axios.get(`${API}/addresses`);
      const addr = addressResponse.data.find((a) => a.id === bookingResponse.data.address_id);
      setAddress(addr);
    } catch (error) {
      console.error('Failed to fetch booking details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-cyan-50">
        <div className="text-xl text-teal-700">Loading...</div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-cyan-50">
        <div className="text-center">
          <p className="text-xl text-gray-700 mb-4">Booking not found</p>
          <Button onClick={() => navigate('/dashboard')} className="bg-teal-600 hover:bg-teal-700">
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-teal-100">
        <div className="container mx-auto px-4 py-4 flex items-center space-x-2">
          <Droplets className="h-8 w-8 text-teal-600" />
          <span className="text-2xl font-bold text-teal-700">AquaClean</span>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        {/* Success Icon */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
            <CheckCircle2 className="h-12 w-12 text-green-600" data-testid="success-icon" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2" data-testid="confirmation-title">
            Booking Confirmed!
          </h1>
          <p className="text-gray-600">Your tank cleaning service has been scheduled</p>
        </div>

        {/* Booking Details Card */}
        <Card className="p-6 bg-white mb-6" data-testid="booking-details-card">
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Booking Details</h2>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Calendar className="h-5 w-5 text-teal-600 mt-1" />
                  <div>
                    <p className="text-sm text-gray-600">Service Date & Time</p>
                    <p className="font-medium" data-testid="service-datetime">
                      {booking.service_date} at {booking.service_time}
                    </p>
                  </div>
                </div>

                {address && (
                  <div className="flex items-start space-x-3">
                    <MapPin className="h-5 w-5 text-teal-600 mt-1" />
                    <div>
                      <p className="text-sm text-gray-600">Service Address</p>
                      <p className="font-medium">{address.name}</p>
                      <p className="text-sm text-gray-600">{address.address_line}</p>
                      {address.landmark && <p className="text-xs text-gray-500">{address.landmark}</p>}
                    </div>
                  </div>
                )}

                <div className="flex items-start space-x-3">
                  <Package className="h-5 w-5 text-teal-600 mt-1" />
                  <div>
                    <p className="text-sm text-gray-600">Service Package</p>
                    <p className="font-medium">
                      {booking.tank_type.charAt(0).toUpperCase() + booking.tank_type.slice(1)} Tank -{' '}
                      {booking.package_type.charAt(0).toUpperCase() + booking.package_type.slice(1)} Cleaning
                    </p>
                    {(booking.add_disinfection || booking.add_maintenance || booking.add_repair) && (
                      <p className="text-sm text-gray-600 mt-1">
                        Add-ons: {[
                          booking.add_disinfection && 'Disinfection',
                          booking.add_maintenance && 'Maintenance',
                          booking.add_repair && 'Repair'
                        ].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Booking ID:</span>
                <span className="font-mono text-sm" data-testid="booking-id">{booking.id.slice(0, 8).toUpperCase()}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Payment Status:</span>
                <span className={`text-sm font-medium ${
                  booking.payment_status === 'completed' ? 'text-green-600' : 'text-yellow-600'
                }`} data-testid="payment-status">
                  {booking.payment_status === 'completed' ? 'Paid' : 'Pending'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold">Total Amount:</span>
                <span className="text-2xl font-bold text-teal-600" data-testid="booking-amount">
                  ₹{(booking.amount / 100).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Info Box */}
        <Card className="p-4 bg-blue-50 border-blue-200 mb-6">
          <p className="text-sm text-blue-900">
            <strong>What's next?</strong> Our technician will arrive at your location on the scheduled date.
            You'll receive real-time updates and can track the service progress.
          </p>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-teal-600 hover:bg-teal-700"
            data-testid="go-to-dashboard-btn"
          >
            Go to Dashboard
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/bookings')}
            className="w-full"
            data-testid="view-all-bookings-btn"
          >
            View All Bookings
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmation;