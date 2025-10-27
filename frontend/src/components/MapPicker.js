import React, { useState, useCallback, useRef } from 'react';
import { GoogleMap, LoadScript, Marker, Autocomplete } from '@react-google-maps/api';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { MapPin, Search, AlertTriangle } from 'lucide-react';

const libraries = ['places'];

const MapPicker = ({ onLocationSelect, initialLocation }) => {
  const [map, setMap] = useState(null);
  const [marker, setMarker] = useState(initialLocation || { lat: 17.385044, lng: 78.486671 }); // Hyderabad default
  const [address, setAddress] = useState('');
  const [mapError, setMapError] = useState(null);
  const autocompleteRef = useRef(null);

  const mapContainerStyle = {
    width: '100%',
    height: '400px',
    borderRadius: '8px'
  };

  const center = initialLocation || { lat: 17.385044, lng: 78.486671 };

  const onLoad = useCallback((map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const onMarkerDragEnd = (e) => {
    const newLat = e.latLng.lat();
    const newLng = e.latLng.lng();
    setMarker({ lat: newLat, lng: newLng });
    reverseGeocode(newLat, newLng);
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === 'OK' && results[0]) {
          setAddress(results[0].formatted_address);
        }
      });
    } catch (error) {
      console.error('Reverse geocoding error:', error);
    }
  };

  const onPlaceChanged = () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        setMarker({ lat, lng });
        setAddress(place.formatted_address || '');
        map?.panTo({ lat, lng });
        map?.setZoom(15);
      }
    }
  };

  const onAutocompleteLoad = (autocomplete) => {
    autocompleteRef.current = autocomplete;
  };

  const handleConfirmLocation = () => {
    if (onLocationSelect) {
      onLocationSelect({
        address: address,
        lat: marker.lat,
        lng: marker.lng
      });
    }
  };

  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <Card className="p-6 bg-yellow-50 border-yellow-200">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <p className="font-semibold text-yellow-900 mb-1">Google Maps API key not configured</p>
            <p className="text-sm text-yellow-800">Please add REACT_APP_GOOGLE_MAPS_API_KEY to your .env file.</p>
          </div>
        </div>
      </Card>
    );
  }

  const handleLoadError = (error) => {
    console.error('Google Maps Load Error:', error);
    setMapError(error.message || 'Failed to load Google Maps');
  };

  if (mapError) {
    return (
      <Card className="p-6 bg-red-50 border-red-200">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-red-900 mb-2">Google Maps Error</p>
            <p className="text-sm text-red-800 mb-3">
              Unable to load Google Maps. This usually means:
            </p>
            <ul className="text-sm text-red-700 space-y-1 mb-4 list-disc list-inside">
              <li>The API key may be invalid or restricted</li>
              <li>Required APIs not enabled (Maps JavaScript API, Places API, Geocoding API)</li>
              <li>Billing not enabled in Google Cloud Console</li>
              <li>Domain restrictions preventing access</li>
            </ul>
            <div className="bg-red-100 p-3 rounded text-xs text-red-900">
              <p className="font-semibold mb-1">To fix this:</p>
              <p>1. Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console</a></p>
              <p>2. Enable billing for your project</p>
              <p>3. Enable: Maps JavaScript API, Places API, Geocoding API</p>
              <p>4. Check API key restrictions (allow your domain)</p>
            </div>
            <Button
              onClick={() => {
                setMapError(null);
                window.location.reload();
              }}
              className="mt-4 bg-red-600 hover:bg-red-700"
              size="sm"
            >
              Retry Loading Maps
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4" data-testid="map-picker">
      <LoadScript 
        googleMapsApiKey={apiKey} 
        libraries={libraries}
        onError={handleLoadError}
      >
        <div className="space-y-4">
          {/* Search Box */}
          <div>
            <Label htmlFor="map-search">Search Location</Label>
            <Autocomplete
              onLoad={onAutocompleteLoad}
              onPlaceChanged={onPlaceChanged}
            >
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="map-search"
                  type="text"
                  placeholder="Search for a place..."
                  className="pl-10"
                  data-testid="map-search-input"
                />
              </div>
            </Autocomplete>
          </div>

          {/* Map */}
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={center}
            zoom={13}
            onLoad={onLoad}
            onUnmount={onUnmount}
            onClick={(e) => {
              const lat = e.latLng.lat();
              const lng = e.latLng.lng();
              setMarker({ lat, lng });
              reverseGeocode(lat, lng);
            }}
          >
            <Marker
              position={marker}
              draggable={true}
              onDragEnd={onMarkerDragEnd}
            />
          </GoogleMap>

          {/* Selected Address Display */}
          {address && (
            <Card className="p-4 bg-teal-50 border-teal-200">
              <div className="flex items-start space-x-2">
                <MapPin className="h-5 w-5 text-teal-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-teal-900">Selected Location</p>
                  <p className="text-sm text-teal-700">{address}</p>
                  <p className="text-xs text-teal-600 mt-1">
                    Coordinates: {marker.lat.toFixed(6)}, {marker.lng.toFixed(6)}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Confirm Button */}
          <Button
            onClick={handleConfirmLocation}
            className="w-full bg-teal-600 hover:bg-teal-700"
            disabled={!address}
            data-testid="confirm-location-btn"
          >
            <MapPin className="mr-2 h-4 w-4" />
            Confirm Location
          </Button>

          <p className="text-xs text-gray-500 text-center">
            Tip: Click on the map or drag the marker to adjust the location
          </p>
        </div>
      </LoadScript>
    </div>
  );
};

export default MapPicker;