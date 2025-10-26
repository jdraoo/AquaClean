import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Checkbox } from '../components/ui/checkbox';
import { ArrowLeft, Wrench, Calendar, MapPin, User, Phone, CheckCircle2, Circle, AlertTriangle, Camera } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const JobExecution = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [address, setAddress] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showIncidentDialog, setShowIncidentDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  
  // Incident state
  const [incidentDesc, setIncidentDesc] = useState('');
  const [incidentSeverity, setIncidentSeverity] = useState('low');
  const [unableToProceed, setUnableToProceed] = useState(false);
  
  // Completion state
  const [beforePhotos, setBeforePhotos] = useState('');
  const [afterPhotos, setAfterPhotos] = useState('');
  const [signature, setSignature] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');

  useEffect(() => {
    fetchJobDetails();
  }, [jobId]);

  const fetchJobDetails = async () => {
    try {
      const response = await axios.get(`${API}/field/jobs/${jobId}`);
      setJob(response.data.job);
      setAddress(response.data.address);
      setCustomer(response.data.customer);
    } catch (error) {
      console.error('Failed to fetch job:', error);
      toast.error('Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const handleStartJob = async () => {
    try {
      await axios.post(`${API}/field/jobs/${jobId}/start`);
      toast.success('Job started!');
      fetchJobDetails();
    } catch (error) {
      toast.error('Failed to start job');
    }
  };

  const handleChecklistUpdate = async (stepName, status, notes = '') => {
    try {
      await axios.put(`${API}/field/jobs/${jobId}/checklist`, {
        step_name: stepName,
        status: status,
        notes: notes,
        timestamp: new Date().toISOString()
      });
      toast.success('Checklist updated');
      fetchJobDetails();
    } catch (error) {
      toast.error('Failed to update checklist');
    }
  };

  const handleReportIncident = async () => {
    if (!incidentDesc.trim()) {
      toast.error('Please describe the incident');
      return;
    }

    try {
      await axios.post(`${API}/field/jobs/${jobId}/incident`, {
        description: incidentDesc,
        severity: incidentSeverity,
        unable_to_proceed: unableToProceed
      });
      toast.success('Incident reported');
      setShowIncidentDialog(false);
      setIncidentDesc('');
      setIncidentSeverity('low');
      setUnableToProceed(false);
      fetchJobDetails();
    } catch (error) {
      toast.error('Failed to report incident');
    }
  };

  const handleCompleteJob = async () => {
    if (!beforePhotos.trim() || !afterPhotos.trim() || !signature.trim()) {
      toast.error('Please provide all required information');
      return;
    }

    try {
      await axios.post(`${API}/field/jobs/${jobId}/complete`, {
        before_photo_urls: beforePhotos.split(',').map(url => url.trim()),
        after_photo_urls: afterPhotos.split(',').map(url => url.trim()),
        customer_signature: signature,
        notes: completionNotes
      });
      toast.success('Job completed successfully!');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Failed to complete job');
    }
  };

  const getStepStatus = (stepData) => {
    if (!stepData) return 'pending';
    return stepData.status || 'pending';
  };

  const getStepIcon = (status) => {
    if (status === 'completed') return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    if (status === 'na') return <Circle className="h-5 w-5 text-gray-400" />;
    if (status === 'escalate') return <AlertTriangle className="h-5 w-5 text-red-600" />;
    return <Circle className="h-5 w-5 text-gray-300" />;
  };

  const checklistSteps = [
    { key: 'arrival', label: 'Arrival Photo', description: 'Take photo of site with timestamp' },
    { key: 'customer_verification', label: 'Customer Verification', description: 'Verify customer identity' },
    { key: 'pre_inspection', label: 'Pre-Clean Inspection', description: 'Document tank condition' },
    { key: 'drain', label: 'Drain Tank', description: 'Empty tank completely' },
    { key: 'scrub', label: 'Scrub Walls', description: 'Clean tank walls and floor' },
    { key: 'high_pressure_clean', label: 'High Pressure Clean', description: 'Use pressure washer' },
    { key: 'disinfection', label: 'Disinfection', description: 'Apply eco-friendly disinfectant' },
    { key: 'final_rinse', label: 'Final Rinse', description: 'Rinse thoroughly' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-xl text-blue-700">Loading job details...</div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <p className="text-xl text-gray-700 mb-4">Job not found</p>
          <Button onClick={() => navigate('/dashboard')} className="bg-blue-600 hover:bg-blue-700">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-blue-100 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/field/dashboard')} data-testid="back-btn">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Wrench className="h-8 w-8 text-blue-600" />
          <div>
            <span className="text-xl font-bold text-blue-700">Job Execution</span>
            <p className="text-xs text-gray-600">ID: {job.id.slice(0, 8).toUpperCase()}</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Job Info Card */}
        <Card className="p-6 bg-white mb-6" data-testid="job-info-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Job Details</h2>
            <Badge className={job.status === 'in-progress' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}>
              {job.status}
            </Badge>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center text-gray-700">
                <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Service Date & Time</p>
                  <p className="font-medium">{job.service_date} at {job.service_time}</p>
                </div>
              </div>
              
              {address && (
                <div className="flex items-start text-gray-700">
                  <MapPin className="h-5 w-5 mr-2 mt-1 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Location</p>
                    <p className="font-medium">{address.name}</p>
                    <p className="text-sm text-gray-600">{address.address_line}</p>
                    {address.landmark && <p className="text-xs text-gray-500">{address.landmark}</p>}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {customer && (
                <>
                  <div className="flex items-center text-gray-700">
                    <User className="h-5 w-5 mr-2 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-600">Customer</p>
                      <p className="font-medium">{customer.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center text-gray-700">
                    <Phone className="h-5 w-5 mr-2 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-600">Phone</p>
                      <p className="font-medium">{customer.phone}</p>
                    </div>
                  </div>
                </>
              )}
              
              <div>
                <p className="text-sm text-gray-600">Service Package</p>
                <p className="font-medium">{job.tank_type} - {job.package_type} cleaning</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {job.add_disinfection && <Badge variant="outline" className="text-xs">Disinfection</Badge>}
                  {job.add_maintenance && <Badge variant="outline" className="text-xs">Maintenance</Badge>}
                  {job.add_repair && <Badge variant="outline" className="text-xs">Repair</Badge>}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Start Job Button */}
        {job.status === 'confirmed' && (
          <Card className="p-6 bg-gradient-to-r from-blue-500 to-indigo-600 text-white mb-6">
            <h3 className="text-xl font-bold mb-2">Ready to Start?</h3>
            <p className="mb-4">Begin the service by starting the job checklist</p>
            <Button
              onClick={handleStartJob}
              className="bg-white text-blue-600 hover:bg-gray-100"
              data-testid="start-job-btn"
            >
              Start Job
            </Button>
          </Card>
        )}

        {/* Digital Checklist */}
        {job.status === 'in-progress' && job.checklist && (
          <Card className="p-6 bg-white mb-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Service Checklist</h2>
              <Button
                variant="outline"
                className="text-red-600 border-red-600 hover:bg-red-50"
                onClick={() => setShowIncidentDialog(true)}
                data-testid="report-incident-btn"
              >
                <AlertTriangle className="mr-2 h-4 w-4" />
                Report Incident
              </Button>
            </div>

            <Accordion type="single" collapsible className="space-y-2">
              {checklistSteps.map((step) => {
                const stepData = job.checklist?.steps?.[step.key];
                const status = getStepStatus(stepData);
                
                return (
                  <AccordionItem key={step.key} value={step.key} className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center space-x-3">
                        {getStepIcon(status)}
                        <div className="text-left">
                          <p className="font-medium">{step.label}</p>
                          <p className="text-sm text-gray-500">{step.description}</p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4 space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant={status === 'completed' ? 'default' : 'outline'}
                          className={status === 'completed' ? 'bg-green-600' : ''}
                          onClick={() => handleChecklistUpdate(step.key, 'completed')}
                          data-testid={`step-${step.key}-complete`}
                        >
                          <CheckCircle2 className="mr-1 h-4 w-4" /> Complete
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleChecklistUpdate(step.key, 'na')}
                          data-testid={`step-${step.key}-na`}
                        >
                          N/A
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600"
                          onClick={() => handleChecklistUpdate(step.key, 'escalate', 'Issue requires escalation')}
                          data-testid={`step-${step.key}-escalate`}
                        >
                          <AlertTriangle className="mr-1 h-4 w-4" /> Escalate
                        </Button>
                      </div>
                      
                      {stepData?.notes && (
                        <div className="p-3 bg-gray-50 rounded">
                          <p className="text-sm text-gray-600">Notes: {stepData.notes}</p>
                        </div>
                      )}
                      
                      {stepData?.timestamp && (
                        <p className="text-xs text-gray-500">
                          Updated: {new Date(stepData.timestamp).toLocaleString()}
                        </p>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>

            {/* Complete Job Button */}
            <div className="mt-6 pt-6 border-t">
              <Button
                onClick={() => setShowCompleteDialog(true)}
                className="w-full bg-green-600 hover:bg-green-700 text-lg py-6"
                data-testid="complete-job-btn"
              >
                <CheckCircle2 className="mr-2 h-5 w-5" />
                Complete Job
              </Button>
            </div>
          </Card>
        )}

        {/* Incidents */}
        {job.incident_reports && job.incident_reports.length > 0 && (
          <Card className="p-6 bg-white">
            <h3 className="text-xl font-bold mb-4">Incident Reports</h3>
            <div className="space-y-3">
              {job.incident_reports.map((incident, idx) => (
                <div key={idx} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <Badge className={`${
                      incident.severity === 'critical' ? 'bg-red-100 text-red-700' :
                      incident.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                      incident.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {incident.severity}
                    </Badge>
                    {incident.unable_to_proceed && (
                      <Badge className="bg-red-100 text-red-700">Unable to Proceed</Badge>
                    )}
                  </div>
                  <p className="text-gray-900 mb-2">{incident.description}</p>
                  <p className="text-xs text-gray-500">
                    Reported: {new Date(incident.reported_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Incident Dialog */}
      <Dialog open={showIncidentDialog} onOpenChange={setShowIncidentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Incident</DialogTitle>
            <DialogDescription>Document any issues encountered during the service</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="incident-desc">Description</Label>
              <Textarea
                id="incident-desc"
                placeholder="Describe the incident..."
                value={incidentDesc}
                onChange={(e) => setIncidentDesc(e.target.value)}
                data-testid="incident-desc-input"
              />
            </div>
            <div>
              <Label htmlFor="severity">Severity</Label>
              <select
                id="severity"
                className="w-full p-2 border rounded-md"
                value={incidentSeverity}
                onChange={(e) => setIncidentSeverity(e.target.value)}
                data-testid="incident-severity-select"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="unable-proceed"
                checked={unableToProceed}
                onCheckedChange={setUnableToProceed}
                data-testid="unable-proceed-checkbox"
              />
              <Label htmlFor="unable-proceed" className="cursor-pointer">
                Unable to proceed with job
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIncidentDialog(false)}>Cancel</Button>
            <Button onClick={handleReportIncident} className="bg-red-600 hover:bg-red-700" data-testid="submit-incident-btn">
              Report Incident
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Job Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Complete Job</DialogTitle>
            <DialogDescription>Provide final documentation and customer signature</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="before-photos">Before Photos (comma-separated URLs)</Label>
              <Input
                id="before-photos"
                placeholder="https://example.com/photo1.jpg, https://example.com/photo2.jpg"
                value={beforePhotos}
                onChange={(e) => setBeforePhotos(e.target.value)}
                data-testid="before-photos-input"
              />
            </div>
            <div>
              <Label htmlFor="after-photos">After Photos (comma-separated URLs)</Label>
              <Input
                id="after-photos"
                placeholder="https://example.com/photo1.jpg, https://example.com/photo2.jpg"
                value={afterPhotos}
                onChange={(e) => setAfterPhotos(e.target.value)}
                data-testid="after-photos-input"
              />
            </div>
            <div>
              <Label htmlFor="signature">Customer Signature</Label>
              <Input
                id="signature"
                placeholder="Customer signature or e-signature URL"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                data-testid="signature-input"
              />
            </div>
            <div>
              <Label htmlFor="completion-notes">Additional Notes (Optional)</Label>
              <Textarea
                id="completion-notes"
                placeholder="Any additional observations..."
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                data-testid="completion-notes-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompleteDialog(false)}>Cancel</Button>
            <Button onClick={handleCompleteJob} className="bg-green-600 hover:bg-green-700" data-testid="submit-completion-btn">
              Complete Job
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default JobExecution;