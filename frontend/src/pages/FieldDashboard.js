import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Wrench, LogOut, ClipboardList, Calendar, MapPin, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { AuthContext } from '../App';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const FieldDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: contextUser, logout } = useContext(AuthContext);
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!contextUser || contextUser.role !== 'field_team') {
      navigate('/login');
      return;
    }
    fetchData();
  }, [contextUser, navigate, location]); // Added location to re-fetch when navigating back

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [jobsRes, statsRes] = await Promise.all([
        axios.get(`${API}/field/jobs`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/field/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setJobs(jobsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      if (error.response?.status === 401) {
        logout();
        navigate('/login');
      }
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
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status) => {
    if (status === 'in-progress') return <AlertCircle className="h-4 w-4" />;
    if (status === 'completed') return <CheckCircle2 className="h-4 w-4" />;
    return <ClipboardList className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-xl text-blue-700">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-blue-100 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Wrench className="h-8 w-8 text-blue-600" />
            <div>
              <span className="text-2xl font-bold text-blue-700">Field Team</span>
              <p className="text-xs text-gray-600">AquaClean Service Portal</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900" data-testid="field-user-name">{contextUser?.name}</p>
              <p className="text-xs text-gray-500">ID: {contextUser?.employee_id}</p>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleLogout}
              data-testid="field-logout-btn"
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
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2" data-testid="field-dashboard-title">
            Welcome, {contextUser?.name}!
          </h1>
          <p className="text-gray-600">Here are your assigned jobs</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="p-4 bg-white border border-blue-100">
              <div className="text-2xl font-bold text-blue-600" data-testid="stat-today-jobs">{stats.today_jobs}</div>
              <div className="text-sm text-gray-600">Today's Jobs</div>
            </Card>
            <Card className="p-4 bg-white border border-green-100">
              <div className="text-2xl font-bold text-green-600" data-testid="stat-completed">{stats.completed_today}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </Card>
            <Card className="p-4 bg-white border border-orange-100">
              <div className="text-2xl font-bold text-orange-600" data-testid="stat-in-progress">{stats.in_progress}</div>
              <div className="text-sm text-gray-600">In Progress</div>
            </Card>
            <Card className="p-4 bg-white border border-purple-100">
              <div className="text-2xl font-bold text-purple-600" data-testid="stat-total">{stats.total_jobs}</div>
              <div className="text-sm text-gray-600">Total Jobs</div>
            </Card>
          </div>
        )}

        {/* Jobs List */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Assigned Jobs</h2>

          {jobs.length === 0 ? (
            <Card className="p-12 text-center bg-white" data-testid="no-jobs-card">
              <ClipboardList className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No jobs assigned</h3>
              <p className="text-gray-600">Check back later for new assignments</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <Card
                  key={job.id}
                  className="p-6 bg-white hover:shadow-lg cursor-pointer border-l-4"
                  style={{
                    borderLeftColor: job.status === 'in-progress' ? '#3b82f6' : '#10b981'
                  }}
                  onClick={() => navigate(`/job/${job.id}`)}
                  data-testid="job-card"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {job.tank_type.charAt(0).toUpperCase() + job.tank_type.slice(1)} Tank Cleaning
                        </h3>
                        <Badge className={getStatusColor(job.status)}>
                          <span className="flex items-center space-x-1">
                            {getStatusIcon(job.status)}
                            <span>{job.status}</span>
                          </span>
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="h-4 w-4 mr-2" />
                          {job.service_date} at {job.service_time}
                        </div>
                        <div className="flex items-start text-sm text-gray-600">
                          <MapPin className="h-4 w-4 mr-2 mt-0.5" />
                          <span>Job ID: {job.id.slice(0, 8).toUpperCase()}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {job.package_type} cleaning
                          </Badge>
                          {job.add_disinfection && (
                            <Badge variant="outline" className="text-xs">Disinfection</Badge>
                          )}
                          {job.add_maintenance && (
                            <Badge variant="outline" className="text-xs">Maintenance</Badge>
                          )}
                          {job.add_repair && (
                            <Badge variant="outline" className="text-xs">Repair</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-left sm:text-right">
                      <Button
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/job/${job.id}`);
                        }}
                        data-testid="view-job-btn"
                      >
                        {job.status === 'in-progress' ? 'Continue Job' : 'View Details'}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FieldDashboard;