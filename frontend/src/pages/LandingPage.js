import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Droplets, Shield, Sparkles, Clock, CheckCircle2, Leaf } from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50">
      {/* Header */}
      <header className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-teal-100 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Droplets className="h-8 w-8 text-teal-600" />
            <span className="text-2xl font-bold text-teal-700">AquaClean</span>
          </div>
          <Button 
            onClick={() => navigate('/login')} 
            className="bg-teal-600 hover:bg-teal-700 text-white px-6"
            data-testid="header-login-btn"
          >
            Login / Sign Up
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center">
          <div className="inline-flex items-center space-x-2 bg-teal-100 text-teal-700 px-4 py-2 rounded-full mb-6">
            <Leaf className="h-4 w-4" />
            <span className="text-sm font-medium">Eco-Friendly Tank Hygiene</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Clean Water,
            <br />
            <span className="text-teal-600">Safe Families</span>
          </h1>
          <p className="text-base sm:text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Professional tank and sump cleaning services in Hyderabad.
            Book online, track in real-time, and ensure your water stays pure.
          </p>
          <Button
            size="lg"
            onClick={() => navigate('/login')}
            className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-6 text-lg rounded-full shadow-lg hover:shadow-xl"
            data-testid="hero-get-started-btn"
          >
            Get Started
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white/50">
        <div className="container mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-12">
            Why Choose AquaClean?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Shield className="h-12 w-12 text-teal-600" />}
              title="Safe & Certified"
              description="Trained professionals using eco-friendly, biodegradable cleaning agents"
            />
            <FeatureCard
              icon={<Clock className="h-12 w-12 text-teal-600" />}
              title="Real-Time Tracking"
              description="Track your service technician in real-time with live updates"
            />
            <FeatureCard
              icon={<Sparkles className="h-12 w-12 text-teal-600" />}
              title="Transparent Process"
              description="Before/after photos, digital checklists, and hygiene certificates"
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-12">
            Simple 3-Step Process
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <StepCard
              number="1"
              title="Book Online"
              description="Select your tank type, date, and preferred time slot"
            />
            <StepCard
              number="2"
              title="Track Service"
              description="Monitor technician arrival and cleaning progress in real-time"
            />
            <StepCard
              number="3"
              title="Verify & Pay"
              description="Review before/after photos and complete secure payment"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-teal-600 to-cyan-600">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Ready for Clean, Safe Water?
          </h2>
          <p className="text-lg text-teal-50 mb-8 max-w-2xl mx-auto">
            Join hundreds of satisfied customers in Hyderabad
          </p>
          <Button
            size="lg"
            onClick={() => navigate('/login')}
            className="bg-white text-teal-600 hover:bg-teal-50 px-8 py-6 text-lg rounded-full shadow-lg"
            data-testid="cta-book-now-btn"
          >
            Book Your Service Now
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12 px-4">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Droplets className="h-6 w-6 text-teal-400" />
            <span className="text-xl font-bold text-white">AquaClean</span>
          </div>
          <p className="text-sm mb-4">Professional Tank & Sump Hygiene Services</p>
          <div className="flex justify-center space-x-4 mb-4">
            <Button
              variant="link"
              className="text-teal-400 hover:text-teal-300"
              onClick={() => navigate('/field/auth')}
              data-testid="field-team-login-link"
            >
              Field Team Login
            </Button>
            <span className="text-gray-500">|</span>
            <Button
              variant="link"
              className="text-teal-400 hover:text-teal-300"
              onClick={() => navigate('/admin/auth')}
              data-testid="admin-login-link"
            >
              Admin Portal
            </Button>
          </div>
          <p className="text-xs text-gray-500">© 2025 AquaClean. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }) => (
  <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl border border-teal-100">
    <div className="mb-4">{icon}</div>
    <h3 className="text-xl font-semibold text-gray-900 mb-3">{title}</h3>
    <p className="text-gray-600">{description}</p>
  </div>
);

const StepCard = ({ number, title, description }) => (
  <div className="text-center">
    <div className="w-16 h-16 bg-teal-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
      {number}
    </div>
    <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-600">{description}</p>
  </div>
);

export default LandingPage;