import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { ArrowLeft, Shield, Users, Briefcase, Search, Mail, Phone, Calendar, CheckCircle2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminUsers = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('customers');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [customersRes, techRes] = await Promise.all([
        axios.get(`${API}/admin/customers`),
        axios.get(`${API}/admin/field-teams`)
      ]);
      setCustomers(customersRes.data);
      setTechnicians(techRes.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTechnicians = technicians.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.employee_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="text-xl text-purple-700">Loading users...</div>
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
            <span className="text-xl font-bold text-purple-700">User Management</span>
            <p className="text-xs text-gray-600">Manage customers and field teams</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Search */}
        <Card className="p-6 bg-white mb-6">
          <div className="max-w-md">
            <Label htmlFor="search">Search Users</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="search"
                placeholder="Search by name, email, or employee ID"
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="search-users-input"
              />
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="customers" data-testid="customers-tab">
              <Users className="h-4 w-4 mr-2" />
              Customers ({filteredCustomers.length})
            </TabsTrigger>
            <TabsTrigger value="technicians" data-testid="technicians-tab">
              <Briefcase className="h-4 w-4 mr-2" />
              Field Teams ({filteredTechnicians.length})
            </TabsTrigger>
          </TabsList>

          {/* Customers Tab */}
          <TabsContent value="customers">
            <div className="grid md:grid-cols-2 gap-4">
              {filteredCustomers.map((customer) => (
                <Card key={customer.id} className="p-6 bg-white hover:shadow-lg" data-testid="customer-card">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{customer.name}</h3>
                      {customer.verified && (
                        <Badge className="bg-green-100 text-green-700">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-purple-600">
                        {customer.total_bookings || 0} bookings
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center text-gray-600">
                      <Mail className="h-4 w-4 mr-2" />
                      {customer.email}
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Phone className="h-4 w-4 mr-2" />
                      {customer.phone}
                    </div>
                    <div className="flex items-center text-gray-500 text-xs">
                      <Calendar className="h-3 w-3 mr-2" />
                      Joined: {new Date(customer.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {filteredCustomers.length === 0 && (
              <Card className="p-12 text-center bg-white">
                <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No customers found</h3>
                <p className="text-gray-600">Try adjusting your search</p>
              </Card>
            )}
          </TabsContent>

          {/* Technicians Tab */}
          <TabsContent value="technicians">
            <div className="grid md:grid-cols-2 gap-4">
              {filteredTechnicians.map((tech) => (
                <Card key={tech.id} className="p-6 bg-white hover:shadow-lg" data-testid="technician-card">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{tech.name}</h3>
                      <Badge className="bg-blue-100 text-blue-700">
                        #{tech.employee_id}
                      </Badge>
                      {tech.active && (
                        <Badge className="bg-green-100 text-green-700 ml-2">
                          Active
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex items-center text-gray-600">
                      <Mail className="h-4 w-4 mr-2" />
                      {tech.email}
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Phone className="h-4 w-4 mr-2" />
                      {tech.phone}
                    </div>
                    <div className="flex items-center text-gray-500 text-xs">
                      <Calendar className="h-3 w-3 mr-2" />
                      Joined: {new Date(tech.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{tech.total_jobs || 0}</p>
                      <p className="text-xs text-gray-600">Total Jobs</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{tech.completed_jobs || 0}</p>
                      <p className="text-xs text-gray-600">Completed</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {filteredTechnicians.length === 0 && (
              <Card className="p-12 text-center bg-white">
                <Briefcase className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No technicians found</h3>
                <p className="text-gray-600">Try adjusting your search</p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminUsers;