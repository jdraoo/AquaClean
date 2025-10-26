import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { ArrowLeft, Droplets, MapPin, Edit, Trash2, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import MapPicker from '../components/MapPicker';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AddressManagement = () => {
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address_line: '',
    landmark: '',
    lat: null,
    lng: null
  });

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      const response = await axios.get(`${API}/addresses`);
      setAddresses(response.data);
    } catch (error) {
      console.error('Failed to fetch addresses:', error);
      toast.error('Failed to load addresses');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setEditingAddress(null);
    setFormData({ name: '', address_line: '', landmark: '', lat: null, lng: null });
    setShowMapPicker(false);
    setShowDialog(true);
  };

  const handleEdit = (address) => {
    setEditingAddress(address);
    setFormData({
      name: address.name,
      address_line: address.address_line,
      landmark: address.landmark || '',
      lat: address.lat,
      lng: address.lng
    });
    setShowMapPicker(false);
    setShowDialog(true);
  };

  const handleDelete = async (addressId) => {
    if (!confirm('Are you sure you want to delete this address?')) return;

    try {
      await axios.delete(`${API}/addresses/${addressId}`);
      toast.success('Address deleted successfully');
      fetchAddresses();
    } catch (error) {
      toast.error('Failed to delete address');
    }
  };

  const handleLocationSelect = (location) => {
    setFormData({
      ...formData,
      address_line: location.address,
      lat: location.lat,
      lng: location.lng
    });
    toast.success('Location selected');
  };

  const handleSave = async () => {
    if (!formData.name || !formData.address_line) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!formData.lat || !formData.lng) {
      toast.error('Please select location on map');
      return;
    }

    try {
      if (editingAddress) {
        // Update existing address
        await axios.put(`${API}/addresses/${editingAddress.id}`, formData);
        toast.success('Address updated successfully');
      } else {
        // Create new address
        await axios.post(`${API}/addresses`, formData);
        toast.success('Address added successfully');
      }
      setShowDialog(false);
      fetchAddresses();
    } catch (error) {
      toast.error(editingAddress ? 'Failed to update address' : 'Failed to add address');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-cyan-50">
        <div className="text-xl text-teal-700">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-teal-100">
        <div className="container mx-auto px-4 py-4 flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} data-testid="back-btn">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Droplets className="h-8 w-8 text-teal-600" />
          <span className="text-2xl font-bold text-teal-700">AquaClean</span>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900" data-testid="addresses-title">My Addresses</h1>
            <p className="text-gray-600">Manage your service locations</p>
          </div>
          <Button
            onClick={handleAddNew}
            className="bg-teal-600 hover:bg-teal-700"
            data-testid="add-address-btn"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add New Address
          </Button>
        </div>

        {addresses.length === 0 ? (
          <Card className="p-12 text-center bg-white">
            <MapPin className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No addresses yet</h3>
            <p className="text-gray-600 mb-6">Add your first service location</p>
            <Button onClick={handleAddNew} className="bg-teal-600 hover:bg-teal-700">
              <Plus className="mr-2 h-4 w-4" />
              Add Address
            </Button>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {addresses.map((address) => (
              <Card key={address.id} className="p-6 bg-white hover:shadow-lg" data-testid="address-card">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-start space-x-3 flex-1">
                    <MapPin className="h-5 w-5 text-teal-600 mt-1" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{address.name}</h3>
                      <p className="text-sm text-gray-600">{address.address_line}</p>
                      {address.landmark && (
                        <p className="text-xs text-gray-500 mt-1">Near: {address.landmark}</p>
                      )}
                      {address.lat && address.lng && (
                        <p className="text-xs text-gray-400 mt-2">
                          {address.lat.toFixed(6)}, {address.lng.toFixed(6)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(address)}
                      data-testid="edit-address-btn"
                    >
                      <Edit className="h-4 w-4 text-blue-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(address.id)}
                      data-testid="delete-address-btn"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
                {address.lat && address.lng && (
                  <div className="mt-4 pt-4 border-t">
                    <a
                      href={`https://www.google.com/maps?q=${address.lat},${address.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-teal-600 hover:text-teal-700 flex items-center"
                    >
                      <MapPin className="h-3 w-3 mr-1" />
                      View on Google Maps
                    </a>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAddress ? 'Edit Address' : 'Add New Address'}</DialogTitle>
            <DialogDescription>
              {editingAddress ? 'Update your address details' : 'Add a new service location'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="address-name">Address Name *</Label>
              <Input
                id="address-name"
                placeholder="e.g., Home, Office"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                data-testid="dialog-address-name-input"
              />
            </div>

            {!showMapPicker ? (
              <>
                <div>
                  <Label htmlFor="address-line">Address *</Label>
                  <Input
                    id="address-line"
                    placeholder="House no, Street, Area"
                    value={formData.address_line}
                    onChange={(e) => setFormData({ ...formData, address_line: e.target.value })}
                    data-testid="dialog-address-line-input"
                  />
                </div>
                <div>
                  <Label htmlFor="landmark">Landmark</Label>
                  <Input
                    id="landmark"
                    placeholder="Near..."
                    value={formData.landmark}
                    onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                    data-testid="dialog-landmark-input"
                  />
                </div>
                <Button
                  onClick={() => setShowMapPicker(true)}
                  variant="outline"
                  className="w-full"
                  data-testid="dialog-select-on-map-btn"
                >
                  <MapPin className="mr-2 h-4 w-4" /> Select Location on Map
                </Button>
              </>
            ) : (
              <>
                <MapPicker
                  onLocationSelect={handleLocationSelect}
                  initialLocation={formData.lat && formData.lng ? { lat: formData.lat, lng: formData.lng } : null}
                />
                <Button
                  onClick={() => setShowMapPicker(false)}
                  variant="outline"
                  className="w-full"
                >
                  Enter Address Manually
                </Button>
              </>
            )}

            {formData.lat && formData.lng && (
              <div className="p-3 bg-teal-50 rounded-lg border border-teal-200">
                <p className="text-sm font-medium text-teal-900 mb-1">Location Selected</p>
                <p className="text-xs text-teal-700">{formData.address_line}</p>
                <p className="text-xs text-teal-600 mt-1">
                  Coordinates: {formData.lat.toFixed(6)}, {formData.lng.toFixed(6)}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button
              onClick={handleSave}
              className="bg-teal-600 hover:bg-teal-700"
              disabled={!formData.name || !formData.lat || !formData.lng}
              data-testid="dialog-save-btn"
            >
              {editingAddress ? 'Update Address' : 'Add Address'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AddressManagement;