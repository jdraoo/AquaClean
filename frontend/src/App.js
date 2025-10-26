import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { Toaster, toast } from 'sonner';
import '@/App.css';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import BookService from './pages/BookService';
import BookingConfirmation from './pages/BookingConfirmation';
import BookingsHistory from './pages/BookingsHistory';
import Auth from './pages/Auth';
import FieldAuth from './pages/FieldAuth';
import FieldDashboard from './pages/FieldDashboard';
import JobExecution from './pages/JobExecution';
import AdminAuth from './pages/AdminAuth';
import AdminDashboard from './pages/AdminDashboard';
import AdminBookings from './pages/AdminBookings';
import AdminUsers from './pages/AdminUsers';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Axios interceptor for auth
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const AuthContext = React.createContext();

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const login = (token, userData) => {
    localStorage.setItem('token', token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-cyan-50">
        <div className="text-xl text-teal-700">Loading...</div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={user ? <Navigate to="/dashboard" /> : <LandingPage />} />
          <Route path="/auth" element={user ? <Navigate to="/dashboard" /> : <Auth />} />
          <Route
            path="/dashboard"
            element={user ? <Dashboard /> : <Navigate to="/auth" />}
          />
          <Route
            path="/book-service"
            element={user ? <BookService /> : <Navigate to="/auth" />}
          />
          <Route
            path="/booking-confirmation/:bookingId"
            element={user ? <BookingConfirmation /> : <Navigate to="/auth" />}
          />
          <Route
            path="/bookings"
            element={user ? <BookingsHistory /> : <Navigate to="/auth" />}
          />
          
          {/* Field Team Routes */}
          <Route path="/field/auth" element={<FieldAuth />} />
          <Route path="/field/dashboard" element={<FieldDashboard />} />
          <Route path="/field/job/:jobId" element={<JobExecution />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </AuthContext.Provider>
  );
}

export default App;