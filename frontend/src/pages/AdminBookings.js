import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { ArrowLeft, Shield, Calendar, MapPin, User, Search, Filter } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminBookings = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedTechnician, setSelectedTechnician] = useState('');
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('09:00');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterBookings();
  }, [bookings, searchTerm, statusFilter]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [bookingsRes, techRes] = await Promise.all([
        axios.get(`${API}/admin/bookings`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/admin/field-teams`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setBookings(bookingsRes.data);
      setTechnicians(techRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const filterBookings = () => {
    let filtered = [...bookings];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(b => b.status === statusFilter);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(b => 
        b.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.customer?.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredBookings(filtered);
  };

  const handleAssignTechnician = async () => {
    if (!selectedTechnician) {
      toast.error('Please select a technician');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/admin/bookings/${selectedBooking.id}/assign`, {
        technician_id: selectedTechnician
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Technician assigned successfully');
      setShowAssignDialog(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to assign technician');
    }
  };

  const handleStatusChange = async (bookingId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/admin/bookings/${bookingId}/status`, {
        status: newStatus
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Status updated successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleDate) {
      toast.error('Please select a date');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/admin/bookings/${selectedBooking.id}/reschedule`, null, {
        params: {
          service_date: rescheduleDate,
          service_time: rescheduleTime
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Booking rescheduled successfully');
      setShowRescheduleDialog(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to reschedule booking');
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/admin/bookings/${bookingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Booking cancelled successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to cancel booking');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-700';
      case 'in-progress': return 'bg-blue-100 text-blue-700';
      case 'completed': return 'bg-teal-100 text-teal-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="text-xl text-purple-700">Loading bookings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-violet-50 to-pink-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-purple-100 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/dashboard')} data-testid="back-btn">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Shield className="h-8 w-8 text-purple-600" />
          <div>
            <span className="text-xl font-bold text-purple-700">Bookings Management</span>
            <p className="text-xs text-gray-600">Assign and manage all bookings</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Filters */}
        <Card className="p-6 bg-white mb-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by ID, customer name, email"
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="search-input"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="status-filter">Status Filter</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <div className="text-sm text-gray-600">
                Showing {filteredBookings.length} of {bookings.length} bookings
              </div>
            </div>
          </div>
        </Card>

        {/* Bookings List */}
        <div className="space-y-4">
          {filteredBookings.length === 0 ? (
            <Card className="p-12 text-center bg-white">
              <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No bookings found</h3>
              <p className="text-gray-600">Try adjusting your filters</p>
            </Card>
          ) : (
            filteredBookings.map((booking) => (
              <Card key={booking.id} className="p-6 bg-white hover:shadow-lg" data-testid="booking-item">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {booking.tank_type.charAt(0).toUpperCase() + booking.tank_type.slice(1)} Tank
                      </h3>
                      <Badge className={getStatusColor(booking.status)}>
                        {booking.status}
                      </Badge>
                      {booking.payment_status === 'completed' && (
                        <Badge className="bg-emerald-100 text-emerald-700">Paid</Badge>
                      )}
                    </div>

                    <div className="grid md:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center text-gray-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        {booking.service_date} at {booking.service_time}
                      </div>
                      {booking.customer && (
                        <div className="flex items-center text-gray-600">
                          <User className="h-4 w-4 mr-2" />
                          {booking.customer.name} ({booking.customer.email})
                        </div>
                      )}
                      {booking.address && (
                        <div className="flex items-start text-gray-600">
                          <MapPin className="h-4 w-4 mr-2 mt-0.5" />
                          <span>{booking.address.address_line}</span>
                        </div>
                      )}
                      <div className="text-gray-600">
                        ID: {booking.id.slice(0, 8).toUpperCase()}
                      </div>
                    </div>

                    {booking.technician && (
                      <div className="mt-2 p-2 bg-blue-50 rounded inline-block">
                        <p className="text-sm text-blue-700">
                          Assigned: {booking.technician.name} (#{booking.technician.employee_id})
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col space-y-2 lg:w-48">
                    <div className="text-right mb-2">
                      <p className="text-2xl font-bold text-purple-600">
                        ₹{(booking.amount / 100).toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">{booking.package_type} cleaning</p>
                    </div>

                    {!booking.assigned_technician_id && booking.status !== 'completed' && booking.status !== 'cancelled' && (
                      <Button
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700"
                        onClick={() => {
                          setSelectedBooking(booking);
                          setShowAssignDialog(true);
                        }}
                        data-testid="assign-technician-btn"
                      >
                        Assign Technician
                      </Button>
                    )}

                    {booking.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusChange(booking.id, 'confirmed')}
                        data-testid="confirm-booking-btn"
                      >
                        Confirm Booking
                      </Button>
                    )}

                    {booking.status !== 'completed' && booking.status !== 'cancelled' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-blue-600 text-blue-600 hover:bg-blue-50"
                        onClick={() => {
                          setSelectedBooking(booking);
                          setRescheduleDate(booking.service_date);
                          setRescheduleTime(booking.service_time);
                          setShowRescheduleDialog(true);
                        }}
                        data-testid="reschedule-btn"
                      >
                        Reschedule
                      </Button>
                    )}

                    {booking.status !== 'completed' && booking.status !== 'cancelled' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-600 text-red-600 hover:bg-red-50"
                        onClick={() => handleCancelBooking(booking.id)}
                        data-testid="cancel-booking-btn"
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Assign Technician Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Technician</DialogTitle>
            <DialogDescription>
              Select a field technician for this booking
            </DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded">
                <p className="text-sm font-medium text-gray-900">Booking Details</p>
                <p className="text-sm text-gray-600">
                  {selectedBooking.tank_type} - {selectedBooking.service_date}
                </p>
                <p className="text-sm text-gray-600">
                  Customer: {selectedBooking.customer?.name}
                </p>
              </div>
              <div>
                <Label htmlFor="technician">Select Technician</Label>
                <Select value={selectedTechnician} onValueChange={setSelectedTechnician}>
                  <SelectTrigger data-testid="technician-select">
                    <SelectValue placeholder="Choose a technician" />
                  </SelectTrigger>
                  <SelectContent>
                    {technicians.filter(t => t.active).map((tech) => (
                      <SelectItem key={tech.id} value={tech.id}>
                        {tech.name} (#{tech.employee_id}) - {tech.total_jobs || 0} jobs
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>Cancel</Button>
            <Button onClick={handleAssignTechnician} className="bg-purple-600 hover:bg-purple-700" data-testid="confirm-assign-btn">
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={showRescheduleDialog} onOpenChange={setShowRescheduleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Booking</DialogTitle>
            <DialogDescription>
              Change the service date and time for this booking
            </DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded">
                <p className="text-sm font-medium text-gray-900">Booking Details</p>
                <p className="text-sm text-gray-600">
                  {selectedBooking.tank_type} - Customer: {selectedBooking.customer?.name}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Current: {selectedBooking.service_date} at {selectedBooking.service_time}
                </p>
              </div>
              <div>
                <Label htmlFor="reschedule-date">New Service Date</Label>
                <Input
                  id="reschedule-date"
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  data-testid="reschedule-date-input"
                />
              </div>
              <div>
                <Label htmlFor="reschedule-time">New Service Time</Label>
                <Select value={rescheduleTime} onValueChange={setRescheduleTime}>
                  <SelectTrigger data-testid="reschedule-time-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="09:00">9:00 AM - 12:00 PM</SelectItem>
                    <SelectItem value="12:00">12:00 PM - 3:00 PM</SelectItem>
                    <SelectItem value="15:00">3:00 PM - 6:00 PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRescheduleDialog(false)}>Cancel</Button>
            <Button onClick={handleReschedule} className="bg-blue-600 hover:bg-blue-700" data-testid="confirm-reschedule-btn">
              Reschedule Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminBookings;