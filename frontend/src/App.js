import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { Toaster, toast } from 'sonner';
import '@/App.css';
import LandingPage from './pages/LandingPage';
import UnifiedAuth from './pages/UnifiedAuth';
import UnifiedDashboard from './pages/UnifiedDashboard';
import Dashboard from './pages/Dashboard';
import BookService from './pages/BookService';
import BookingConfirmation from './pages/BookingConfirmation';
import BookingsHistory from './pages/BookingsHistory';
import FieldDashboard from './pages/FieldDashboard';
import JobExecution from './pages/JobExecution';
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
      const user = JSON.parse(localStorage.getItem('user'));
      if (user && user.role) {
        // Fetch updated user data based on role
        let response;
        if (user.role === 'field_team') {
          response = await axios.get(`${API}/field/me`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
        } else if (user.role === 'admin') {
          response = await axios.get(`${API}/admin/me`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
        } else {
          response = await axios.get(`${API}/auth/me`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
        }
        setUser({ ...response.data, role: user.role });
      } else {
        // Fallback to old method
        const response = await axios.get(`${API}/auth/me`);
        setUser({ ...response.data, role: 'customer' });
      }
    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  };

  const login = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
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
          <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <UnifiedAuth />} />
          
          {/* Dashboard - Unified for all roles */}
          <Route
            path="/dashboard"
            element={user ? <UnifiedDashboard /> : <Navigate to="/login" />}
          />
          
          {/* Customer Routes */}
          <Route
            path="/book-service"
            element={user && user.role === 'customer' ? <BookService /> : <Navigate to="/login" />}
          />
          <Route
            path="/booking-confirmation/:bookingId"
            element={user && user.role === 'customer' ? <BookingConfirmation /> : <Navigate to="/login" />}
          />
          <Route
            path="/bookings"
            element={user && user.role === 'customer' ? <BookingsHistory /> : <Navigate to="/login" />}
          />
          
          {/* Field Team Routes */}
          <Route
            path="/job/:jobId"
            element={user && user.role === 'field_team' ? <JobExecution /> : <Navigate to="/login" />}
          />
          
          {/* Admin Routes */}
          <Route
            path="/admin/bookings"
            element={user && user.role === 'admin' ? <AdminBookings /> : <Navigate to="/login" />}
          />
          <Route
            path="/admin/users"
            element={user && user.role === 'admin' ? <AdminUsers /> : <Navigate to="/login" />}
          />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </AuthContext.Provider>
  );
}

export default App;