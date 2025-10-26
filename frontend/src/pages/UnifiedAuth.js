import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Droplets, Mail, Lock, User, Phone } from 'lucide-react';
import { AuthContext } from '../App';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const UnifiedAuth = () => {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('customer-login');
  const [loading, setLoading] = useState(false);

  // Customer Login
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPassword, setCustomerPassword] = useState('');

  // Customer Register
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [showOtpVerify, setShowOtpVerify] = useState(false);
  const [otp, setOtp] = useState('');

  // Staff Login (Field Team & Admin)
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');

  const handleCustomerLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/login`, {
        email: customerEmail,
        password: customerPassword,
      });

      login(response.data.token, { ...response.data.user, role: 'customer' });
      toast.success('Login successful!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(`${API}/auth/register`, {
        name: registerName,
        email: registerEmail,
        phone: registerPhone,
        password: registerPassword,
      });

      const otpResponse = await axios.post(`${API}/auth/send-otp`, {
        email: registerEmail,
      });

      toast.success('OTP sent to your email!');
      toast.info(`Demo OTP: ${otpResponse.data.otp}`);
      setShowOtpVerify(true);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(`${API}/auth/verify-otp`, {
        email: registerEmail,
        otp: otp,
      });

      toast.success('Email verified! Please login.');
      setShowOtpVerify(false);
      setActiveTab('customer-login');
      setCustomerEmail(registerEmail);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleStaffLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Try field team login first
      let response;
      try {
        response = await axios.post(`${API}/field/login`, {
          email: staffEmail,
          password: staffPassword,
        });
      } catch (fieldError) {
        // If field login fails, try admin login
        response = await axios.post(`${API}/admin/login`, {
          email: staffEmail,
          password: staffPassword,
        });
      }

      login(response.data.token, response.data.user);
      toast.success('Login successful!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Droplets className="h-10 w-10 text-teal-600" />
            <span className="text-3xl font-bold text-teal-700">AquaClean</span>
          </div>
          <p className="text-gray-600">Tank & Sump Hygiene Platform</p>
        </div>

        <Card className="p-6 shadow-xl bg-white/90 backdrop-blur-sm">
          {!showOtpVerify ? (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="customer-login" data-testid="customer-tab">Customer</TabsTrigger>
                <TabsTrigger value="staff-login" data-testid="staff-tab">Staff</TabsTrigger>
              </TabsList>

              {/* Customer Login/Register */}
              <TabsContent value="customer-login">
                <Tabs defaultValue="login">
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="login">Login</TabsTrigger>
                    <TabsTrigger value="register">Sign Up</TabsTrigger>
                  </TabsList>

                  <TabsContent value="login">
                    <form onSubmit={handleCustomerLogin} className="space-y-4">
                      <div>
                        <Label htmlFor="customer-email">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                          <Input
                            id="customer-email"
                            type="email"
                            placeholder="your@email.com"
                            className="pl-10"
                            value={customerEmail}
                            onChange={(e) => setCustomerEmail(e.target.value)}
                            required
                            data-testid="customer-email-input"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="customer-password">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                          <Input
                            id="customer-password"
                            type="password"
                            placeholder="••••••••"
                            className="pl-10"
                            value={customerPassword}
                            onChange={(e) => setCustomerPassword(e.target.value)}
                            required
                            data-testid="customer-password-input"
                          />
                        </div>
                      </div>
                      <Button
                        type="submit"
                        className="w-full bg-teal-600 hover:bg-teal-700"
                        disabled={loading}
                        data-testid="customer-login-btn"
                      >
                        {loading ? 'Logging in...' : 'Login'}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="register">
                    <form onSubmit={handleCustomerRegister} className="space-y-4">
                      <div>
                        <Label htmlFor="register-name">Full Name</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                          <Input
                            id="register-name"
                            type="text"
                            placeholder="John Doe"
                            className="pl-10"
                            value={registerName}
                            onChange={(e) => setRegisterName(e.target.value)}
                            required
                            data-testid="register-name-input"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="register-email">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                          <Input
                            id="register-email"
                            type="email"
                            placeholder="your@email.com"
                            className="pl-10"
                            value={registerEmail}
                            onChange={(e) => setRegisterEmail(e.target.value)}
                            required
                            data-testid="register-email-input"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="register-phone">Phone Number</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                          <Input
                            id="register-phone"
                            type="tel"
                            placeholder="9876543210"
                            className="pl-10"
                            value={registerPhone}
                            onChange={(e) => setRegisterPhone(e.target.value)}
                            required
                            data-testid="register-phone-input"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="register-password">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                          <Input
                            id="register-password"
                            type="password"
                            placeholder="••••••••"
                            className="pl-10"
                            value={registerPassword}
                            onChange={(e) => setRegisterPassword(e.target.value)}
                            required
                            data-testid="register-password-input"
                          />
                        </div>
                      </div>
                      <Button
                        type="submit"
                        className="w-full bg-teal-600 hover:bg-teal-700"
                        disabled={loading}
                        data-testid="register-submit-btn"
                      >
                        {loading ? 'Creating account...' : 'Sign Up'}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </TabsContent>

              {/* Staff Login */}
              <TabsContent value="staff-login">
                <form onSubmit={handleStaffLogin} className="space-y-4">
                  <div className="text-center mb-4">
                    <p className="text-sm text-gray-600">For Field Team & Admin</p>
                  </div>
                  <div>
                    <Label htmlFor="staff-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <Input
                        id="staff-email"
                        type="email"
                        placeholder="staff@aquaclean.com"
                        className="pl-10"
                        value={staffEmail}
                        onChange={(e) => setStaffEmail(e.target.value)}
                        required
                        data-testid="staff-email-input"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="staff-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <Input
                        id="staff-password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10"
                        value={staffPassword}
                        onChange={(e) => setStaffPassword(e.target.value)}
                        required
                        data-testid="staff-password-input"
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={loading}
                    data-testid="staff-login-btn"
                  >
                    {loading ? 'Logging in...' : 'Staff Login'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          ) : (
            <div>
              <h3 className="text-xl font-semibold text-center mb-4">Verify Your Email</h3>
              <p className="text-sm text-gray-600 text-center mb-6">
                Enter the OTP sent to {registerEmail}
              </p>
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <Label htmlFor="otp">OTP Code</Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                    maxLength={6}
                    data-testid="otp-input"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-teal-600 hover:bg-teal-700"
                  disabled={loading}
                  data-testid="verify-otp-btn"
                >
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowOtpVerify(false)}
                  data-testid="back-btn"
                >
                  Back
                </Button>
              </form>
            </div>
          )}
        </Card>

        <div className="text-center mt-6">
          <Button
            variant="link"
            className="text-teal-600 hover:text-teal-700"
            onClick={() => navigate('/')}
            data-testid="back-to-home-btn"
          >
            ← Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UnifiedAuth;