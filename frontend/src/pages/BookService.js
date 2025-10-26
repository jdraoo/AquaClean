import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
// import { useRazorpay } from 'react-razorpay';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Checkbox } from '../components/ui/checkbox';
import { ArrowLeft, ArrowRight, MapPin, Calendar as CalendarIcon, Package, CreditCard, CheckCircle2, Droplets } from 'lucide-react';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { format } from 'date-fns';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const BookService = () => {
  const navigate = useNavigate();
  const [Razorpay] = useRazorpay();
  const [step, setStep] = useState(1);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [selectedAddress, setSelectedAddress] = useState('');
  const [newAddress, setNewAddress] = useState({ name: '', address_line: '', landmark: '' });
  const [tankType, setTankType] = useState('overhead');
  const [tankCapacity, setTankCapacity] = useState('1000');
  const [serviceDate, setServiceDate] = useState(null);
  const [serviceTime, setServiceTime] = useState('09:00');
  const [packageType, setPackageType] = useState('manual');
  const [addDisinfection, setAddDisinfection] = useState(false);
  const [addMaintenance, setAddMaintenance] = useState(false);
  const [addRepair, setAddRepair] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('upi');

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      const response = await axios.get(`${API}/addresses`);
      setAddresses(response.data);
    } catch (error) {
      console.error('Failed to fetch addresses:', error);
    }
  };

  const handleAddAddress = async () => {
    if (!newAddress.name || !newAddress.address_line) {
      toast.error('Please fill in address details');
      return;
    }

    try {
      const response = await axios.post(`${API}/addresses`, newAddress);
      setAddresses([...addresses, response.data]);
      setSelectedAddress(response.data.id);
      setNewAddress({ name: '', address_line: '', landmark: '' });
      toast.success('Address added successfully');
    } catch (error) {
      toast.error('Failed to add address');
    }
  };

  const calculateTotal = () => {
    let total = packageType === 'manual' ? 1500 : 2500;
    if (addDisinfection) total += 500;
    if (addMaintenance) total += 750;
    if (addRepair) total += 1000;
    return total;
  };

  const handleNext = () => {
    if (step === 1 && !selectedAddress) {
      toast.error('Please select or add an address');
      return;
    }
    if (step === 3 && !serviceDate) {
      toast.error('Please select a service date');
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    if (step === 1) {
      navigate('/dashboard');
    } else {
      setStep(step - 1);
    }
  };

  const handleBooking = async () => {
    if (!serviceDate) {
      toast.error('Please select a service date');
      return;
    }

    setLoading(true);

    try {
      // Create booking
      const bookingResponse = await axios.post(`${API}/bookings`, {
        address_id: selectedAddress,
        tank_type: tankType,
        tank_capacity: tankCapacity,
        service_date: format(serviceDate, 'yyyy-MM-dd'),
        service_time: serviceTime,
        package_type: packageType,
        add_disinfection: addDisinfection,
        add_maintenance: addMaintenance,
        add_repair: addRepair,
        payment_method: paymentMethod,
      });

      const booking = bookingResponse.data;

      // Handle payment
      if (paymentMethod === 'cod') {
        await axios.post(`${API}/payments/create-order`, {
          booking_id: booking.id,
        });
        toast.success('Booking confirmed!');
        navigate(`/booking-confirmation/${booking.id}`);
      } else {
        // Create Razorpay order
        const paymentResponse = await axios.post(`${API}/payments/create-order`, {
          booking_id: booking.id,
        });

        const options = {
          key: paymentResponse.data.key_id,
          amount: paymentResponse.data.amount,
          currency: paymentResponse.data.currency,
          order_id: paymentResponse.data.order_id,
          name: 'AquaClean',
          description: 'Tank Cleaning Service',
          handler: async (response) => {
            try {
              await axios.post(`${API}/payments/verify`, {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                booking_id: booking.id,
              });
              toast.success('Payment successful!');
              navigate(`/booking-confirmation/${booking.id}`);
            } catch (error) {
              toast.error('Payment verification failed');
            }
          },
          modal: {
            ondismiss: () => {
              toast.error('Payment cancelled');
              setLoading(false);
            },
          },
        };

        const rzp = new Razorpay(options);
        rzp.open();
      }
    } catch (error) {
      toast.error('Booking failed');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-teal-100">
        <div className="container mx-auto px-4 py-4 flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={handleBack} data-testid="back-btn">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Droplets className="h-8 w-8 text-teal-600" />
          <span className="text-2xl font-bold text-teal-700">AquaClean</span>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="bg-white border-b border-teal-100 py-4">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center space-x-2 sm:space-x-4">
            {[1, 2, 3, 4, 5].map((s) => (
              <React.Fragment key={s}>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    s <= step ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-500'
                  }`}
                  data-testid={`step-${s}`}
                >
                  {s}
                </div>
                {s < 5 && (
                  <div
                    className={`h-1 w-8 sm:w-16 rounded ${
                      s < step ? 'bg-teal-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="text-center mt-2 text-sm text-gray-600">
            {step === 1 && 'Select Address'}
            {step === 2 && 'Tank Details'}
            {step === 3 && 'Date & Time'}
            {step === 4 && 'Select Package'}
            {step === 5 && 'Review & Payment'}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Card className="p-6 bg-white">
          {/* Step 1: Address */}
          {step === 1 && (
            <div data-testid="step-address">
              <h2 className="text-2xl font-bold mb-6">Select Service Address</h2>
              
              {addresses.length > 0 && (
                <div className="mb-6">
                  <Label className="mb-3 block">Saved Addresses</Label>
                  <RadioGroup value={selectedAddress} onValueChange={setSelectedAddress}>
                    {addresses.map((addr) => (
                      <div key={addr.id} className="flex items-center space-x-2 p-3 border rounded-lg mb-2">
                        <RadioGroupItem value={addr.id} id={addr.id} data-testid={`address-${addr.id}`} />
                        <Label htmlFor={addr.id} className="flex-1 cursor-pointer">
                          <div className="font-semibold">{addr.name}</div>
                          <div className="text-sm text-gray-600">{addr.address_line}</div>
                          {addr.landmark && <div className="text-xs text-gray-500">{addr.landmark}</div>}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              )}

              <div className="border-t pt-6">
                <Label className="mb-3 block">Add New Address</Label>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="address-name">Address Name</Label>
                    <Input
                      id="address-name"
                      placeholder="e.g., Home, Office"
                      value={newAddress.name}
                      onChange={(e) => setNewAddress({ ...newAddress, name: e.target.value })}
                      data-testid="address-name-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="address-line">Address</Label>
                    <Input
                      id="address-line"
                      placeholder="House no, Street, Area"
                      value={newAddress.address_line}
                      onChange={(e) => setNewAddress({ ...newAddress, address_line: e.target.value })}
                      data-testid="address-line-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="landmark">Landmark (Optional)</Label>
                    <Input
                      id="landmark"
                      placeholder="Near..."
                      value={newAddress.landmark}
                      onChange={(e) => setNewAddress({ ...newAddress, landmark: e.target.value })}
                      data-testid="landmark-input"
                    />
                  </div>
                  <Button onClick={handleAddAddress} variant="outline" className="w-full" data-testid="add-address-btn">
                    <MapPin className="mr-2 h-4 w-4" /> Add Address
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Tank Details */}
          {step === 2 && (
            <div data-testid="step-tank">
              <h2 className="text-2xl font-bold mb-6">Tank Details</h2>
              
              <div className="space-y-6">
                <div>
                  <Label className="mb-3 block">Tank Type</Label>
                  <RadioGroup value={tankType} onValueChange={setTankType}>
                    <div className="flex items-center space-x-2 p-3 border rounded-lg">
                      <RadioGroupItem value="overhead" id="overhead" data-testid="tank-overhead" />
                      <Label htmlFor="overhead" className="flex-1 cursor-pointer">Overhead Tank</Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 border rounded-lg">
                      <RadioGroupItem value="underground" id="underground" data-testid="tank-underground" />
                      <Label htmlFor="underground" className="flex-1 cursor-pointer">Underground/Sump Tank</Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 border rounded-lg">
                      <RadioGroupItem value="other" id="other" data-testid="tank-other" />
                      <Label htmlFor="other" className="flex-1 cursor-pointer">Other</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <Label htmlFor="capacity">Tank Capacity (Liters)</Label>
                  <Input
                    id="capacity"
                    type="text"
                    placeholder="e.g., 1000"
                    value={tankCapacity}
                    onChange={(e) => setTankCapacity(e.target.value)}
                    data-testid="tank-capacity-input"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Date & Time */}
          {step === 3 && (
            <div data-testid="step-datetime">
              <h2 className="text-2xl font-bold mb-6">Select Date & Time</h2>
              
              <div className="space-y-6">
                <div>
                  <Label className="mb-3 block">Service Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                        data-testid="date-picker-btn"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {serviceDate ? format(serviceDate, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={serviceDate}
                        onSelect={setServiceDate}
                        disabled={(date) => date < new Date()}
                        data-testid="calendar"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label htmlFor="time">Preferred Time Slot</Label>
                  <select
                    id="time"
                    className="w-full p-2 border rounded-md"
                    value={serviceTime}
                    onChange={(e) => setServiceTime(e.target.value)}
                    data-testid="time-select"
                  >
                    <option value="09:00">9:00 AM - 12:00 PM</option>
                    <option value="12:00">12:00 PM - 3:00 PM</option>
                    <option value="15:00">3:00 PM - 6:00 PM</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Package */}
          {step === 4 && (
            <div data-testid="step-package">
              <h2 className="text-2xl font-bold mb-6">Select Service Package</h2>
              
              <div className="space-y-6">
                <div>
                  <Label className="mb-3 block">Cleaning Method</Label>
                  <RadioGroup value={packageType} onValueChange={setPackageType}>
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <RadioGroupItem value="manual" id="manual" data-testid="package-manual" />
                        <Label htmlFor="manual" className="flex-1 cursor-pointer font-semibold">
                          Manual Cleaning - ₹1,500
                        </Label>
                      </div>
                      <p className="text-sm text-gray-600 ml-6">Traditional cleaning with eco-friendly products</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <RadioGroupItem value="automated" id="automated" data-testid="package-automated" />
                        <Label htmlFor="automated" className="flex-1 cursor-pointer font-semibold">
                          Automated Cleaning - ₹2,500
                        </Label>
                      </div>
                      <p className="text-sm text-gray-600 ml-6">High-pressure automated cleaning</p>
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <Label className="mb-3 block">Additional Services</Label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 p-3 border rounded-lg">
                      <Checkbox
                        id="disinfection"
                        checked={addDisinfection}
                        onCheckedChange={setAddDisinfection}
                        data-testid="addon-disinfection"
                      />
                      <Label htmlFor="disinfection" className="flex-1 cursor-pointer">
                        Disinfection (+₹500)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 border rounded-lg">
                      <Checkbox
                        id="maintenance"
                        checked={addMaintenance}
                        onCheckedChange={setAddMaintenance}
                        data-testid="addon-maintenance"
                      />
                      <Label htmlFor="maintenance" className="flex-1 cursor-pointer">
                        Maintenance Check (+₹750)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 border rounded-lg">
                      <Checkbox
                        id="repair"
                        checked={addRepair}
                        onCheckedChange={setAddRepair}
                        data-testid="addon-repair"
                      />
                      <Label htmlFor="repair" className="flex-1 cursor-pointer">
                        Minor Repairs (+₹1,000)
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Review & Payment */}
          {step === 5 && (
            <div data-testid="step-payment">
              <h2 className="text-2xl font-bold mb-6">Review & Payment</h2>
              
              <div className="space-y-6">
                {/* Summary */}
                <div className="bg-teal-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-3">Booking Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tank Type:</span>
                      <span className="font-medium">{tankType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Service Date:</span>
                      <span className="font-medium">{serviceDate && format(serviceDate, 'PPP')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Time Slot:</span>
                      <span className="font-medium">{serviceTime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Package:</span>
                      <span className="font-medium">{packageType}</span>
                    </div>
                    {(addDisinfection || addMaintenance || addRepair) && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Add-ons:</span>
                        <span className="font-medium">
                          {[addDisinfection && 'Disinfection', addMaintenance && 'Maintenance', addRepair && 'Repair']
                            .filter(Boolean)
                            .join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="border-t mt-3 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Total Amount:</span>
                      <span className="text-2xl font-bold text-teal-600" data-testid="total-amount">₹{calculateTotal()}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Method */}
                <div>
                  <Label className="mb-3 block">Payment Method</Label>
                  <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                    <div className="flex items-center space-x-2 p-3 border rounded-lg">
                      <RadioGroupItem value="upi" id="upi" data-testid="payment-upi" />
                      <Label htmlFor="upi" className="flex-1 cursor-pointer">UPI (PhonePe, PayTM, GPay)</Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 border rounded-lg">
                      <RadioGroupItem value="card" id="card" data-testid="payment-card" />
                      <Label htmlFor="card" className="flex-1 cursor-pointer">Credit/Debit Card</Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 border rounded-lg">
                      <RadioGroupItem value="cod" id="cod" data-testid="payment-cod" />
                      <Label htmlFor="cod" className="flex-1 cursor-pointer">Cash on Delivery</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t">
            <Button variant="outline" onClick={handleBack} data-testid="nav-back-btn">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            {step < 5 ? (
              <Button onClick={handleNext} className="bg-teal-600 hover:bg-teal-700" data-testid="nav-next-btn">
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleBooking}
                disabled={loading}
                className="bg-teal-600 hover:bg-teal-700"
                data-testid="confirm-booking-btn"
              >
                {loading ? 'Processing...' : 'Confirm Booking'}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default BookService;